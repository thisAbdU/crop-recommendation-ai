"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState } from '@/services/authService';
import { AuthService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        if (AuthService.isAuthenticated()) {
          const currentUser = AuthService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await AuthService.login({ email, password });
      
      if (result) {
        const { user, token } = result;
        // Store user info in localStorage for easy access
        localStorage.setItem('user_info', JSON.stringify(user));
        setUser(user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user_info');
    }
  };

  const refreshUser = () => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking if user has specific role
export function useRole(requiredRole: string): boolean {
  const { user } = useAuth();
  return user?.role === requiredRole;
}

// Hook for checking if user has any of the specified roles
export function useAnyRole(requiredRoles: string[]): boolean {
  const { user } = useAuth();
  return user ? requiredRoles.includes(user.role) : false;
}
