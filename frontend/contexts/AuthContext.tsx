"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Role } from '@/lib/types';
import { 
  getCurrentUser, 
  isAuthenticated, 
  logout as logoutUser,
  saveAuth,
  loadAuth
} from '@/lib/auth';
import { loginWithJwtMock } from '@/lib/api';

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
        const auth = loadAuth();
        if (auth && isAuthenticated()) {
          setUser(auth.user);
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
      const result = await loginWithJwtMock(email, password);
      
      if (result) {
        const { token, user } = result;
        saveAuth({ token, user });
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

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const refreshUser = () => {
    const currentUser = getCurrentUser();
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
export function useRole(requiredRole: Role): boolean {
  const { user } = useAuth();
  return user?.role === requiredRole;
}

// Hook for checking if user has any of the specified roles
export function useAnyRole(requiredRoles: Role[]): boolean {
  const { user } = useAuth();
  return user ? requiredRoles.includes(user.role) : false;
}
