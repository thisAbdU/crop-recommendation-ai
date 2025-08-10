"use client"

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Role } from '@/lib/types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: Role;
  fallback?: ReactNode;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback = <div>Loading...</div> 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!loading && user && requiredRole && user.role !== requiredRole) {
      router.push('/unauthorized');
    }
  }, [loading, user, requiredRole, router]);

  // Show loading while checking auth
  if (loading) {
    return <>{fallback}</>;
  }

  // Show loading while redirecting
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return <>{fallback}</>;
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

// Higher-order component for role-based protection
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: Role
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Higher-order component for any role protection
export function withAnyRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: Role[]
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
