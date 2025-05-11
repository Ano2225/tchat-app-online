import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
//import router from 'next/router'; 

// Create an axios instance
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — Automatically adds the token to each request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — Handles auth errors (missing or invalid token)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.warn('Invalid or expired token. Logging out...');
      const logout = useAuthStore.getState().logout; 
      if (logout) logout(); 
      if (typeof window !== 'undefined') {
        window.location.href = '/anonymous'; 
      } else {
        console.error("Attempted to redirect on server, but router is not available.");
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
