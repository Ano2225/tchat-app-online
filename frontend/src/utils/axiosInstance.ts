import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// Création d'une instance axios
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajoute automatiquement le token avant chaque requête
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

export default axiosInstance;
