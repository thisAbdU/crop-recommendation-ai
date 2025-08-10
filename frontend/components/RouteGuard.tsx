"use client"

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, hasRouteAccess, isAuthenticated } from '@/lib/auth';
import { User, Role } from '@/lib/types';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: Role;
  fallback?: React.ReactNode;
}

export default function RouteGuard({ 
  children, 
  requiredRole, 
  fallback = <div>Loading...</div> 
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
          router.push('/login');
          return;
        }

        const user = getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        setCurrentUser(user);

        // Check if user has access to the current route
        if (!hasRouteAccess(user.role, pathname)) {
          router.push('/unauthorized');
          return;
        }

        // Check if specific role is required
        if (requiredRole && user.role !== requiredRole) {
          router.push('/unauthorized');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [pathname, requiredRole, router]);

  // Show loading while checking auth
  if (isAuthorized === null) {
    return <>{fallback}</>;
  }

  // Show unauthorized message if not authorized
  if (!isAuthorized) {
    return null; // Router will handle redirect
  }

  // User is authorized, render children
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
export function usePermissions() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setUser(user);
    setLoading(false);
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Define permission mappings
    const permissions = {
      // Zone management permissions
      "zones:read": ["central_admin"],
      "zones:write": ["central_admin"],
      "zones:delete": ["central_admin"],
      
      // IoT device permissions
      "iot:read": ["central_admin"],
      "iot:write": ["central_admin"],
      "iot:delete": ["central_admin"],
      
      // Farmer management permissions
      "farmers:read": ["zone_admin", "central_admin"],
      "farmers:write": ["zone_admin", "central_admin"],
      "farmers:delete": ["zone_admin", "central_admin"],
      
      // Recommendation permissions
      "recommendations:read": ["zone_admin", "central_admin", "investor"],
      "recommendations:write": ["zone_admin", "central_admin"],
      "recommendations:approve": ["zone_admin", "central_admin"],
      
      // Zone data permissions
      "zone_data:read": ["zone_admin", "central_admin"],
      "zone_data:write": ["zone_admin", "central_admin"],
      
      // User management permissions
      "users:read": ["central_admin"],
      "users:write": ["central_admin"],
      "users:delete": ["central_admin"]
    };
    
    const allowedRoles = permissions[permission as keyof typeof permissions];
    return allowedRoles ? allowedRoles.includes(user.role) : false;
  };

  return { user, loading, hasPermission };
}
