import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

// Permission mappings
const PERMISSIONS = {
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
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function usePermissions() {
  const { user, loading } = useAuth();
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());

  useEffect(() => {
    if (user) {
      const userPermissions = new Set<Permission>();
      
      // Add permissions based on user role
      Object.entries(PERMISSIONS).forEach(([permission, allowedRoles]) => {
        if (allowedRoles.includes(user.role)) {
          userPermissions.add(permission as Permission);
        }
      });
      
      setPermissions(userPermissions);
    } else {
      setPermissions(new Set());
    }
  }, [user]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.has(permission);
  };

  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some(permission => permissions.has(permission));
  };

  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every(permission => permissions.has(permission));
  };

  const canAccessResource = (resourceType: string, action: string, resourceZoneId?: string): boolean => {
    if (!user) return false;

    // Zone-specific access control
    if (resourceZoneId && user.role === "zone_admin" && user.zoneId !== resourceZoneId) {
      return false;
    }

    // Permission-based access control
    const permission = `${resourceType}:${action}` as Permission;
    return hasPermission(permission);
  };

  return {
    user,
    loading,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    isZoneAdmin: user?.role === "zone_admin",
    isCentralAdmin: user?.role === "central_admin",
    isInvestor: user?.role === "investor",
  };
}

// Hook for conditional rendering based on permissions
export function useConditionalRender() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const renderIf = (permission: Permission, component: React.ReactNode) => {
    return hasPermission(permission) ? component : null;
  };

  const renderIfAny = (permissions: Permission[], component: React.ReactNode) => {
    return hasAnyPermission(permissions) ? component : null;
  };

  const renderIfAll = (permissions: Permission[], component: React.ReactNode) => {
    return hasAllPermissions(permissions) ? component : null;
  };

  return {
    renderIf,
    renderIfAny,
    renderIfAll,
  };
}
