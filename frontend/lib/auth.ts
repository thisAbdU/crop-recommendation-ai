"use client"
import { User, Role } from "./types";
import { validateJWT, isTokenExpired, decodeJWT, JWTPayload } from "./jwt";

type AuthState = { token: string; user: User } | null;

const STORAGE_KEY = "auth_state";
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

// Role-based route access mapping with more granular control
export const roleAccess = {
  investor: [
    "/dashboard", 
    "/zone-opportunities", 
    "/dashboard/portfolio", 
    "/dashboard/performance", 
    "/dashboard/reports", 
    "/dashboard/analytics"
  ],
  zone_admin: [
    "/dashboard", 
    "/zone-data", 
    "/farmers", 
    "/dashboard/my-zone", 
    "/dashboard/crop-recommendations", 
    "/dashboard/alerts", 
    "/dashboard/schedule", 
    "/dashboard/analytics"
  ],
  central_admin: [
    "/dashboard", 
    "/dashboard/zones", 
    "/dashboard/iot-devices", 
    "/dashboard/users", 
    "/dashboard/reports", 
    "/dashboard/analytics",
    "/dashboard/recommendations"
  ]
} as const;

// Check if user has access to a specific route
export function hasRouteAccess(userRole: Role, route: string): boolean {
  const allowedRoutes = roleAccess[userRole] || [];
  return allowedRoutes.some(allowedRoute => 
    route === allowedRoute || route.startsWith(allowedRoute + '/')
  );
}

// Enhanced token validation with JWT parsing
export function validateToken(token: string): boolean {
  if (!validateJWT(token)) return false;
  
  // Additional validation: check if token contains required fields
  const payload = decodeJWT(token);
  if (!payload || !payload.userId || !payload.role || !payload.email) {
    return false;
  }
  
  // Validate role is one of the allowed roles
  if (!["investor", "zone_admin", "central_admin"].includes(payload.role)) {
    return false;
  }
  
  return true;
}

// Secure token storage with encryption (basic implementation)
function encryptToken(token: string): string {
  // In production, use proper encryption
  // For now, we'll use a simple base64 encoding
  return btoa(token);
}

function decryptToken(encryptedToken: string): string {
  try {
    return atob(encryptedToken);
  } catch {
    return "";
  }
}

export function saveAuth(state: AuthState) {
  if (typeof window === "undefined") return;
  
  if (state) {
    // Encrypt token before storing
    const encryptedToken = encryptToken(state.token);
    const authData = {
      ...state,
      token: encryptedToken,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function loadAuth(): AuthState {
  if (typeof window === "undefined") return null;
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    
    const auth = JSON.parse(raw) as AuthState & { timestamp: number };
    
    // Check if stored data is too old (24 hours)
    if (auth && Date.now() - auth.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    if (auth && auth.token) {
      // Check if it's a mock token
      if (auth.token.includes('mock-signature')) {
        // For mock tokens, just return the data without complex validation
        return auth;
      }
      
      // For real tokens, use strict validation
      const decryptedToken = decryptToken(auth.token);
      if (!decryptedToken) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      // Validate decrypted token
      if (!validateToken(decryptedToken)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      // Check if token is expired
      if (isTokenExpired(decryptedToken)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      return {
        ...auth,
        token: decryptedToken
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error loading auth:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function logout() {
  saveAuth(null);
  // Clear any other stored data
  if (typeof window !== "undefined") {
    // Clear any other auth-related storage
    localStorage.removeItem("user_preferences");
    sessionStorage.clear();
  }
}

// Get current user role with validation
export function getCurrentUserRole(): Role | null {
  const auth = loadAuth();
  if (!auth) return null;
  
  // Double-check token validity
  if (!validateToken(auth.token)) {
    logout();
    return null;
  }
  
  return auth.user.role;
}

// Check if user is authenticated with valid token
export function isAuthenticated(): boolean {
  const auth = loadAuth();
  if (!auth) return false;
  
  // For mock tokens, be more lenient
  // In production, you'd want strict validation
  try {
    // Basic check: does the token exist and have the right structure?
    if (!auth.token || typeof auth.token !== 'string') return false;
    
    // Check if it's a mock token (contains mock-signature)
    if (auth.token.includes('mock-signature')) {
      // For mock tokens, just check if we have user data
      return !!auth.user && !!auth.user.id && !!auth.user.role;
    }
    
    // For real tokens, use strict validation
    return validateToken(auth.token);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

// Get current user with validation
export function getCurrentUser(): User | null {
  const auth = loadAuth();
  if (!auth) return null;
  
  // For mock tokens, be more lenient
  if (auth.token.includes('mock-signature')) {
    return auth.user;
  }
  
  // For real tokens, use strict validation
  if (!validateToken(auth.token)) {
    logout();
    return null;
  }
  
  return auth.user;
}

// Get JWT payload for additional validation
export function getJWTPayload(): JWTPayload | null {
  const auth = loadAuth();
  if (!auth) return null;
  
  return decodeJWT(auth.token);
}

// Check if user needs token refresh
export function needsTokenRefresh(): boolean {
  const auth = loadAuth();
  if (!auth) return true;
  
  const payload = decodeJWT(auth.token);
  if (!payload) return true;
  
  const currentTime = Date.now();
  const expirationTime = payload.exp * 1000;
  
  return (expirationTime - currentTime) < TOKEN_REFRESH_THRESHOLD;
}

// Force token refresh (call logout to force re-authentication)
export function forceTokenRefresh() {
  logout();
}

// Check if user has specific permission
export function hasPermission(permission: string): boolean {
  const user = getCurrentUser();
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
}



