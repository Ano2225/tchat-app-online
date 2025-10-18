import axiosInstance from '@/utils/axiosInstance';

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  age: number;
  sexe: string;
  ville?: string;
}

export interface AnonymousData {
  username: string;
  age: number;
  sexe: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

class AuthService {
  async login(data: LoginData) {
    const response = await axiosInstance.post('/auth/login', data);
    return response.data;
  }

  async register(data: RegisterData) {
    const response = await axiosInstance.post('/auth/register', data);
    return response.data;
  }

  async anonymousLogin(data: AnonymousData) {
    const response = await axiosInstance.post('/auth/anonymous', data);
    return response.data;
  }

  async logout() {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  }

  async requestPasswordReset(data: PasswordResetRequest) {
    const response = await axiosInstance.post('/auth/request-password-reset', data);
    return response.data;
  }

  async resetPassword(data: PasswordReset) {
    const response = await axiosInstance.post('/auth/reset-password', data);
    return response.data;
  }

  async getMe() {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
  }
}

export default new AuthService();