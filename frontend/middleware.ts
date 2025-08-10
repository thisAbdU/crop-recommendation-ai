import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Role-based route access mapping
const roleAccess = {
  investor: [
    "/dashboard",
    "/zone-opportunities",
    "/dashboard/portfolio",
    "/dashboard/performance",
    "/dashboard/reports",
    "/dashboard/analytics",
  ],
  zone_admin: [
    "/dashboard",
    "/zone-data",
    "/farmers",
    "/dashboard/my-zone",
    "/dashboard/crop-recommendations",
    "/dashboard/alerts",
    "/dashboard/schedule",
    "/dashboard/analytics",
  ],
  central_admin: [
    "/dashboard",
    "/dashboard/zones",
    "/dashboard/iot-devices",
    "/dashboard/users",
    "/dashboard/reports",
    "/dashboard/analytics",
    "/dashboard/recommendations",
  ],
} as const;

// Public routes that don't require authentication
const publicRoutes = ["/login", "/", "/dashboard", "/unauthorized"];

// Check if user has access to a specific route
function hasRouteAccess(userRole: string, route: string): boolean {
  const allowedRoutes = roleAccess[userRole as keyof typeof roleAccess] || [];
  return allowedRoutes.some(
    (allowedRoute) =>
      route === allowedRoute || route.startsWith(allowedRoute + "/")
  );
}

// Extract user role from JWT token (basic implementation)
function extractUserRoleFromToken(token: string): string | null {
  try {
    // In production, properly verify JWT signature
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for authentication token
  const token =
    request.cookies.get("auth_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Extract user role from token
  const userRole = extractUserRoleFromToken(token);

  if (!userRole) {
    // Invalid token, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check if user has access to the requested route
  if (!hasRouteAccess(userRole, pathname)) {
    // User doesn't have access, redirect to unauthorized page
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // User is authenticated and authorized, proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
