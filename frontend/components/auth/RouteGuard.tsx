"use client"

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { hasRouteAccess } from "@/lib/auth";
import { Role } from "@/lib/types";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: Role;
  fallback?: React.ReactNode;
}

export function RouteGuard({ 
  children, 
  requiredRole, 
  fallback 
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    const checkAuthorization = () => {
      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        setIsAuthorized(false);
        setIsLoading(false);
        router.replace("/login");
        return;
      }

      // If no specific role is required, just check route access
      if (!requiredRole) {
        const userRole = user.role;
        if (!userRole) {
          setIsAuthorized(false);
          setIsLoading(false);
          router.replace("/login");
          return;
        }

        // Check if user has access to the current route
        const hasAccess = hasRouteAccess(userRole, pathname);
        if (!hasAccess) {
          setIsAuthorized(false);
          setIsLoading(false);
          router.replace("/unauthorized");
          return;
        }

        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Check specific role requirement
      const userRole = user.role;
      if (!userRole || userRole !== requiredRole) {
        setIsAuthorized(false);
        setIsLoading(false);
        router.replace("/unauthorized");
        return;
      }

      // Check route access for the specific role
      const hasAccess = hasRouteAccess(userRole, pathname);
      if (!hasAccess) {
        setIsAuthorized(false);
        setIsLoading(false);
        router.replace("/unauthorized");
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuthorization();
  }, [router, pathname, requiredRole, isAuthenticated, user, authLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // Show fallback or unauthorized message
  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Render children if authorized
  return <>{children}</>;
}

// Higher-order component for role-based route protection
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: Role
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteGuard requiredRole={requiredRole}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}

// Hook for checking permissions in components
export function usePermission(permission: string): boolean {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      // Import dynamically to avoid SSR issues
      const { hasPermission: checkPerm } = await import("@/lib/auth");
      setHasPermission(checkPerm(permission));
      setIsLoading(false);
    };

    checkPermission();
  }, [permission]);

  return hasPermission;
}
