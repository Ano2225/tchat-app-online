/**
 * Axios Interceptor for automatic token refresh
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { isAuthError } from './errorHandler';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - Add auth token (read from Zustand store, not directly from localStorage)
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lazy import to avoid circular dependency; falls back gracefully if store unavailable
    let token: string | null = null;
    try {
      const { useAuthStore } = require('@/store/authStore');
      token = useAuthStore.getState().token;
    } catch {
      // store not available in SSR context
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is auth-related and we haven't retried yet
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      isAuthError(error)
    ) {
      if (isRefreshing) {
        // Wait for the refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Read refresh token from Zustand store, not directly from localStorage
      let refreshToken: string | null = null;
      try {
        const { useAuthStore } = require('@/store/authStore');
        refreshToken = useAuthStore.getState().session?.token ?? null;
      } catch {
        // store not available
      }

      if (!refreshToken) {
        handleLogout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/token/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;

        // Update token in Zustand store
        try {
          const { useAuthStore } = require('@/store/authStore');
          const state = useAuthStore.getState();
          if (state.session) {
            useAuthStore.setState({ token: accessToken, session: { ...state.session, token: accessToken } });
          }
        } catch {
          // store not available
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Handle logout - clear Zustand store and redirect
 */
function handleLogout() {
  try {
    const { useAuthStore } = require('@/store/authStore');
    useAuthStore.getState().logout();
  } catch {
    // store not available in SSR
  }

  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

export default axiosInstance;

