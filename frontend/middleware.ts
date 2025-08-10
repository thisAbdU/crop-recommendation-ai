import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/dashboard/zones',
  '/dashboard/recommendations',
  '/dashboard/iot-devices',
  '/dashboard/zone-data',
  '/dashboard/farmers',
  '/dashboard/crop-recommendations',
  '/dashboard/zone-opportunities',
  '/dashboard/portfolio',
  '/dashboard/profile'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Get token from cookies or headers
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      // Redirect to login if no token
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // In a real app, you'd verify the JWT token here
      // For now, we'll check if it's a valid token format
      if (token.length < 10) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Extract user role from token (in a real app, decode JWT)
      // For now, we'll allow access and let the frontend handle role-based routing
      
    } catch (error) {
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Allow access to public routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*'
  ],
};
