import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  withCredentials: true, // send httpOnly session_token cookie with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── CSRF token cache ──────────────────────────────────────────────────────────
// Fetched once per session, refreshed automatically on expiry (1h TTL on server)
let csrfToken: string | null = null;
let csrfFetchPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  // Reuse in-flight request if one is already running
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = (async () => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) return null;
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/auth/csrf-token`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      csrfToken = res.data.csrfToken ?? null;
      return csrfToken;
    } catch {
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

// Invalidate cached token (e.g. after logout or 403 CSRF_INVALID)
export function clearCsrfToken() {
  csrfToken = null;
}

// ── Request interceptor ───────────────────────────────────────────────────────
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

const requestInterceptor = async (config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach CSRF token on mutating requests
  if (config.method && MUTATING_METHODS.includes(config.method.toLowerCase())) {
    const csrf = csrfToken ?? await fetchCsrfToken();
    if (csrf && config.headers) {
      config.headers['x-csrf-token'] = csrf;
    }
  }

  return config;
};

// ── Response error interceptor ────────────────────────────────────────────────
const responseErrorInterceptor = (error: AxiosError) => {
  if (error.response?.status === 401) {
    console.warn('Invalid or expired token. Logging out...');
    clearCsrfToken();
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  // CSRF token expired — clear cache so next request fetches a fresh one
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (error.response?.status === 403 && data?.code === 'CSRF_INVALID') {
    clearCsrfToken();
  }

  return Promise.reject(error);
};

axiosInstance.interceptors.request.use(requestInterceptor, (e) => Promise.reject(e));
axiosInstance.interceptors.response.use((response) => response, responseErrorInterceptor);

export default axiosInstance;
