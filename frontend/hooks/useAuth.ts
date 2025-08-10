"use client"

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  isAuthenticated, 
  getCurrentUser, 
  getCurrentUserRole, 
  logout as logoutAuth,
  needsTokenRefresh,
  forceTokenRefresh
} from "@/lib/auth";
import { User, Role } from "@/lib/types";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  userRole: Role | null;
  isLoading: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    userRole: null,
    isLoading: true
  });

  const checkAuth = useCallback(() => {
    try {
      const authenticated = isAuthenticated();
      const user = getCurrentUser();
      const userRole = getCurrentUserRole();

      setAuthState({
        isAuthenticated: authenticated,
        user,
        userRole,
        isLoading: false
      });

      // Check if token needs refresh
      if (authenticated && needsTokenRefresh()) {
        console.warn("Token will expire soon, consider refreshing");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        userRole: null,
        isLoading: false
      });
    }
  }, []);

  const logout = useCallback(() => {
    logoutAuth();
    setAuthState({
      isAuthenticated: false,
      user: null,
      userRole: null,
      isLoading: false
    });
    router.replace("/login");
  }, [router]);

  const refreshAuth = useCallback(() => {
    checkAuth();
  }, [checkAuth]);

  // Check authentication on mount and when auth state changes
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set up periodic auth checks (every 5 minutes)
  useEffect(() => {
    if (authState.isAuthenticated) {
      const interval = setInterval(() => {
        checkAuth();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated, checkAuth]);

  // Auto-logout if token expires
  useEffect(() => {
    if (authState.isAuthenticated && needsTokenRefresh()) {
      const timeout = setTimeout(() => {
        if (needsTokenRefresh()) {
          console.log("Token expired, logging out");
          logout();
        }
      }, 1000); // Check again in 1 second

      return () => clearTimeout(timeout);
    }
  }, [authState.isAuthenticated, logout]);

  return {
    ...authState,
    logout,
    refreshAuth,
    checkAuth
  };
}

// Hook for checking specific permissions
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Import dynamically to avoid SSR issues
  const [hasPermission, setHasPermission] = useState(false);
  
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { hasPermission: checkPerm } = await import("@/lib/auth");
        setHasPermission(checkPerm(permission));
      } catch (error) {
        console.error("Error checking permission:", error);
        setHasPermission(false);
      }
    };
    
    checkPermission();
  }, [permission, user]);
  
  return hasPermission;
}

// Hook for checking if user has any of the specified roles
export function useHasRole(allowedRoles: Role[]): boolean {
  const { userRole } = useAuth();
  
  if (!userRole) return false;
  
  return allowedRoles.includes(userRole);
}

// Hook for checking if user has a specific role
export function useIsRole(role: Role): boolean {
  const { userRole } = useAuth();
  
  return userRole === role;
}
