import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

const responseErrorInterceptor = (error: AxiosError) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    console.warn('Invalid or expired token. Logging out...');
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/anonymous';
    }
  }
  return Promise.reject(error);
};

axiosInstance.interceptors.request.use(requestInterceptor, (e) => Promise.reject(e));
axiosInstance.interceptors.response.use((response) => response, responseErrorInterceptor);

export default axiosInstance;
