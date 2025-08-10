"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, AuthState } from "@/services/authService";
import { AuthService } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  demoLogin: (
    role: "EXPORTER" | "zone_admin" | "central_admin"
  ) => Promise<boolean>;
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
        console.error("Failed to initialize auth:", error);
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
        const { user, access_token } = result;
        // Store user info in localStorage for easy access
        localStorage.setItem("user_info", JSON.stringify(user));
        setUser(user);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (
    role: "EXPORTER" | "zone_admin" | "central_admin"
  ): Promise<boolean> => {
    try {
      setLoading(true);

      // Create demo users without API calls
      let demoUser: User;

      switch (role) {
        case "EXPORTER":
          demoUser = {
            first_name: "Sample Zone Admin",
            zone_id: 2,
            id: 1,
            role: "zone_admin",
            last_name: "sth",
            phone_number: "09689445",
          };
          break;
        case "zone_admin":
          demoUser = {
            first_name: "Sample Zone Admin",
            zone_id: 2,
            id: 1,
            role: "zone_admin",
            last_name: "sth",
            phone_number: "09689445",
          };
          break;
        case "central_admin":
          demoUser = {
            first_name: "Sample Zone Admin",
            zone_id: 2,
            id: 1,
            role: "zone_admin",
            last_name: "sth",
            phone_number: "09689445",
          };
          break;
        default:
          return false;
      }

      // Store demo user info and token
      localStorage.setItem("user_info", JSON.stringify(demoUser));
      localStorage.setItem("auth_token", `demo_token_${role}`);

      // ALSO SET A COOKIE for middleware to see
      document.cookie = `auth_token=demo_token_${role}; path=/; max-age=86400; SameSite=Lax`;

      setUser(demoUser);
      return true;
    } catch (error) {
      console.error("Demo login failed:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user_info");
      // ALSO CLEAR THE COOKIE
      document.cookie =
        "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
    demoLogin,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
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
