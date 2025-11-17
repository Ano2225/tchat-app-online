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
    try {
      if (!data.username?.trim() || !data.password?.trim()) {
        throw new Error('Username and password are required');
      }
      const response = await axiosInstance.post('/auth/login', data);
      return response.data;
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    try {
      const response = await axiosInstance.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw new Error(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async requestPasswordReset(data: PasswordResetRequest) {
    try {
      if (!data.email?.trim()) {
        throw new Error('Email is required');
      }
      const response = await axiosInstance.post('/auth/request-password-reset', data);
      return response.data;
    } catch (error) {
      throw new Error(`Password reset request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async resetPassword(data: PasswordReset) {
    const response = await axiosInstance.post('/auth/reset-password', data);
    return response.data;
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