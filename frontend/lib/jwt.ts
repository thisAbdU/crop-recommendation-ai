// JWT utility functions for token handling
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  zoneId?: string;
  iat: number;
  exp: number;
}

// Decode JWT token (base64 decode the payload)
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Check if JWT token is expired
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

// Validate JWT token structure and expiration
export function validateJWT(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  if (isTokenExpired(token)) return false;
  
  return true;
}

// Get token expiration time in milliseconds
export function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload) return null;
  
  return payload.exp * 1000; // Convert to milliseconds
}

// Check if token expires soon (within 5 minutes)
export function isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
  const payload = decodeJWT(token);
  if (!payload) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const thresholdSeconds = thresholdMinutes * 60;
  
  return (payload.exp - currentTime) < thresholdSeconds;
}
