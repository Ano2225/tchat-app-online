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
  gender: string;
  city?: string;
}

export interface AnonymousData {
  username: string;
  age: number;
  gender: string;
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
    if (!data.username?.trim() || !data.password?.trim()) {
      throw new Error('Nom d\'utilisateur et mot de passe requis');
    }
    
    try {
      const response = await axiosInstance.post('/auth/login', data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erreur de connexion';
      throw new Error(message);
    }
  }

  async register(data: RegisterData) {
    try {
      const response = await axiosInstance.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erreur d\'inscription';
      throw new Error(message);
    }
  }

  async anonymousLogin(data: AnonymousData) {
    try {
      const response = await axiosInstance.post('/auth/anonymous', data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erreur de connexion anonyme';
      throw new Error(message);
    }
  }

  async logout() {
    try {
      const response = await axiosInstance.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw new Error(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async requestPasswordReset(data: PasswordResetRequest) {
    if (!data.email?.trim()) {
      throw new Error('Email requis');
    }
    
    try {
      const response = await axiosInstance.post('/auth/request-password-reset', data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erreur de réinitialisation';
      throw new Error(message);
    }
  }

  async resetPassword(data: PasswordReset) {
    try {
      const response = await axiosInstance.post('/auth/reset-password', data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erreur de réinitialisation';
      throw new Error(message);
    }
  }

  async getMe() {
    try {
      const response = await axiosInstance.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new AuthService();