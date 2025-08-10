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

    // For testing purposes, return a sample zone_admin user if no user is found
    // This allows access to the zone admin dashboard without setting up full authentication
    const sampleUser: User = {
      name: "Sample Zone Admin",
      zone_id: "zone_001",
      role: "zone_admin"
    };

    // Store the sample user in localStorage for consistency
    localStorage.setItem('user_info', JSON.stringify(sampleUser));
    
    return sampleUser;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    if (token) return true;
    
    // For testing purposes, also check if we have a sample user
    const user = this.getCurrentUser();
    return !!user;
  }

  // Get auth token
  static getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Set up sample user for testing (zone_admin)
  static setupSampleUser(): void {
    const sampleUser: User = {
      name: "Sample Zone Admin",
      zone_id: "zone_001",
      role: "zone_admin"
    };
    
    // Store sample user info
    localStorage.setItem('user_info', JSON.stringify(sampleUser));
    
    // Store a dummy token for authentication
    localStorage.setItem('auth_token', 'sample_token_for_testing');
    
    console.log('Sample zone_admin user set up successfully');
  }

  // Clear sample user (for testing cleanup)
  static clearSampleUser(): void {
    localStorage.removeItem('user_info');
    localStorage.removeItem('auth_token');
    console.log('Sample user cleared');
  }
}

// Global function for easy testing from browser console
declare global {
  interface Window {
    setupZoneAdmin: () => void;
    clearZoneAdmin: () => void;
  }
}

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  window.setupZoneAdmin = () => {
    AuthService.setupSampleUser();
    console.log('✅ Zone Admin user set up! You can now access /dashboard/zone-data');
    console.log('📧 Sample credentials: zane@example.com / password123');
  };
  
  window.clearZoneAdmin = () => {
    AuthService.clearSampleUser();
    console.log('🗑️ Zone Admin user cleared');
  };
}
