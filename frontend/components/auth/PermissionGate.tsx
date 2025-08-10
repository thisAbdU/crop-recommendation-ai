"use client"

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/lib/types';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  allowedRoles?: Role[];
  requiredRole?: Role;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export function PermissionGate({
  children,
  permission,
  allowedRoles,
  requiredRole,
  fallback = null,
  showFallback = false
}: PermissionGateProps) {
  const { user } = useAuth();

  // Check permission if specified
  if (permission) {
    // For now, we'll implement basic permission checking
    // In a real app, you'd have a more sophisticated permission system
    const hasPermission = user?.role === "central_admin" || 
                         (user?.role === "zone_admin" && permission.includes("zone")) ||
                         (user?.role === "investor" && permission.includes("view"));
    
    if (!hasPermission) {
      return showFallback ? <>{fallback}</> : null;
    }
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    return showFallback ? <>{fallback}</> : null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role as Role)) {
    return showFallback ? <>{fallback}</> : null;
  }

  // If no restrictions or all checks passed, render children
  return <>{children}</>;
}

// Convenience components for common permission checks
export function CentralAdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate requiredRole="central_admin" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function ZoneAdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate requiredRole="zone_admin" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function InvestorOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate requiredRole="investor" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate allowedRoles={["central_admin", "zone_admin"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function ZoneAccessOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate allowedRoles={["zone_admin", "central_admin"]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

// Component for showing different content based on role
interface RoleBasedContentProps {
  centralAdmin?: ReactNode;
  zoneAdmin?: ReactNode;
  investor?: ReactNode;
  default?: ReactNode;
}

export function RoleBasedContent({ centralAdmin, zoneAdmin, investor, default: defaultContent }: RoleBasedContentProps) {
  const { user } = useAuth();

  switch (user?.role) {
    case "central_admin":
      return <>{centralAdmin || defaultContent}</>;
    case "zone_admin":
      return <>{zoneAdmin || defaultContent}</>;
    case "investor":
      return <>{investor || defaultContent}</>;
    default:
      return <>{defaultContent}</>;
  }
}
