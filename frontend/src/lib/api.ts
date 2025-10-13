import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const addAuthToken = (config: any) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
};

const handleAuthError = (error: any) => {
  if (error.response?.status === 401) {
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
};

api.interceptors.request.use(addAuthToken, Promise.reject);
api.interceptors.response.use((response) => response, handleAuthError);

export default api;