import { useAuth } from '@/contexts/AuthContext';

// Permission mapping for different roles
const PERMISSIONS = {
  // Zone management
  MANAGE_ZONES: ['central_admin'],
  VIEW_ZONES: ['central_admin', 'zone_admin', 'investor'],
  
  // Recommendations
  MANAGE_RECOMMENDATIONS: ['central_admin', 'zone_admin'],
  VIEW_RECOMMENDATIONS: ['central_admin', 'zone_admin', 'investor'],
  
  // IoT Devices
  MANAGE_DEVICES: ['central_admin'],
  VIEW_DEVICES: ['central_admin', 'zone_admin'],
  
  // Farmers
  MANAGE_FARMERS: ['central_admin', 'zone_admin'],
  VIEW_FARMERS: ['central_admin', 'zone_admin'],
  
  // Sensor Data
  VIEW_SENSOR_DATA: ['central_admin', 'zone_admin'],
  
  // Zone-specific data access
  ZONE_DATA_ACCESS: ['zone_admin', 'central_admin'],
  
  // Investment/Portfolio
  VIEW_OPPORTUNITIES: ['investor'],
  MANAGE_PORTFOLIO: ['investor'],
};

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!user) return false;
    return PERMISSIONS[permission]?.includes(user.role) || false;
  };

  const hasAnyPermission = (permissions: (keyof typeof PERMISSIONS)[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: (keyof typeof PERMISSIONS)[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const canAccessResource = (resourceType: string, resourceZoneId?: string): boolean => {
    if (!user) return false;
    
    // Central admin can access all resources
    if (user.role === 'central_admin') return true;
    
    // Zone admin can only access resources in their zone
    if (user.role === 'zone_admin' && user.zone_id) {
      return resourceZoneId === user.zone_id;
    }
    
    // Investor has limited access
    if (user.role === 'investor') {
      return ['VIEW_OPPORTUNITIES', 'VIEW_RECOMMENDATIONS'].includes(resourceType);
    }
    
    return false;
  };

  // Role-specific boolean flags
  const isCentralAdmin = user?.role === 'central_admin';
  const isZoneAdmin = user?.role === 'zone_admin';
  const isInvestor = user?.role === 'investor';
  const isAdmin = isCentralAdmin || isZoneAdmin;

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    isCentralAdmin,
    isZoneAdmin,
    isInvestor,
    isAdmin,
    user,
  };
}

// Hook for conditional rendering based on permissions
export function useConditionalRender() {
  const permissions = usePermissions();

  const renderIf = (permission: keyof typeof PERMISSIONS, content: React.ReactNode) => {
    return permissions.hasPermission(permission) ? content : null;
  };

  const renderIfRole = (role: string, content: React.ReactNode) => {
    return permissions.user?.role === role ? content : null;
  };

  const renderIfAnyRole = (roles: string[], content: React.ReactNode) => {
    return roles.includes(permissions.user?.role || '') ? content : null;
  };

  return {
    renderIf,
    renderIfRole,
    renderIfAnyRole,
  };
}

