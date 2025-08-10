import { apiClient, LoginCredentials, LoginResponse, SignupCredentials, SignupResponse } from './api';

export interface User {
  name: string;
  zone_id?: string;
  role: string;
}

export interface AuthState {
  user: User;
  token: string;
}

export class AuthService {
  // Login user
  static async login(credentials: LoginCredentials): Promise<AuthState | null> {
    const response = await apiClient.login(credentials);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Login failed');
    }

    const { user, token } = response.data;
    
    // Store token in localStorage
    localStorage.setItem('auth_token', token);
    
    return { user, token };
  }

  // Signup user
  static async signup(credentials: SignupCredentials): Promise<SignupResponse | null> {
    const response = await apiClient.signup(credentials);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Signup failed');
    }

    return response.data;
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth_token');
    }
  }

  // Get current user from token
  static getCurrentUser(): User | null {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      // In a real app, you'd decode the JWT token to get user info
      // For now, we'll store user info in localStorage as well
      const userStr = localStorage.getItem('user_info');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error('Error parsing user info:', error);
    }

    return null;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  // Get auth token
  static getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}
