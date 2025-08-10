import { AuthService } from '@/services/authService';

// Re-export functions from AuthService
export const getCurrentUser = AuthService.getCurrentUser;
export const isAuthenticated = AuthService.isAuthenticated;
export const getToken = AuthService.getToken;

// Get current user role
export const getCurrentUserRole = (): string | null => {
  const user = getCurrentUser();
  return user?.role || null;
};

// Check if user has access to a specific route
export const hasRouteAccess = (userRole: string, pathname: string): boolean => {
  // Define role-based route access
  const roleAccess = {
    central_admin: [
      '/dashboard',
      '/dashboard/zones',
      '/dashboard/recommendations',
      '/dashboard/iot-devices',
      '/dashboard/profile'
    ],
    zone_admin: [
      '/dashboard',
      '/dashboard/zone-data',
      '/dashboard/farmers',
      '/dashboard/crop-recommendations',
      '/dashboard/profile'
    ],
    investor: [
      '/dashboard',
      '/dashboard/zone-opportunities',
      '/dashboard/portfolio',
      '/dashboard/profile'
    ]
  };

  const allowedRoutes = roleAccess[userRole as keyof typeof roleAccess] || [];
  return allowedRoutes.some(route => pathname.startsWith(route));
};

// Load authentication (placeholder function for now)
export const loadAuth = async (): Promise<void> => {
  // This function can be used to initialize authentication state
  // For now, it's a no-op since we're using localStorage
  return Promise.resolve();
};

// Check if user has a specific permission
export const hasPermission = (permission: string): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Basic permission checking based on role
  const rolePermissions = {
    central_admin: ['manage_zones', 'manage_users', 'view_all_data', 'manage_recommendations'],
    zone_admin: ['view_zone_data', 'manage_farmers', 'view_recommendations'],
    investor: ['view_opportunities', 'view_portfolio']
  };
  
  const permissions = rolePermissions[user.role as keyof typeof rolePermissions] || [];
  return permissions.includes(permission);
}; 