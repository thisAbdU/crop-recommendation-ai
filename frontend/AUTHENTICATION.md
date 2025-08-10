# Authentication & Authorization System

This document describes the secure authentication and role-based authorization system implemented in the Crop Recommendation AI platform.

## Overview

The system implements a multi-layered security approach with:
- JWT-based authentication
- Role-based access control (RBAC)
- Route-level protection
- API-level authorization
- Zone-level data filtering

## User Roles & Permissions

### 1. Investor (Exporter)
**Purpose**: Evaluates crop recommendations and zone opportunities for investment/export purposes.

**Access**:
- Dashboard (Investor view)
- Zone Opportunities
- Portfolio analytics
- Performance reports
- Investment analytics

**Restrictions**:
- Read-only access to recommendations
- No administrative actions
- Cannot access zone management or IoT devices

### 2. Zone Admin
**Purpose**: Manages farmers in their assigned zone, views sensor data, and generates/reviews recommendations.

**Access**:
- Dashboard (Zone Admin view)
- Zone Data (environmental readings)
- Farmers CRUD operations
- My Zone dashboard
- Crop recommendations
- Alerts and scheduling
- Zone analytics

**Restrictions**:
- Can only access data for their assigned zone
- Cannot view other zones or global data
- Limited to zone-specific operations

### 3. Central Admin
**Purpose**: Oversees the entire platform, manages zones, recommendations, and IoT devices.

**Access**:
- Dashboard (Central Admin view)
- Zones CRUD operations
- IoT Devices management
- User management
- Global recommendations
- System reports
- Platform analytics

**Restrictions**:
- Full system access
- Cannot access investor private data

## Authentication Flow

### 1. Login Process
```typescript
// User submits credentials
const result = await loginWithJwtMock(email, password);

if (result) {
  const { token, user } = result;
  // Token is stored securely (HttpOnly cookie in production)
  saveAuth({ token, user });
}
```

### 2. JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "user-123",
    "email": "user@example.com",
    "role": "zone_admin",
    "zoneId": "zone-456",
    "iat": 1234567890,
    "exp": 1234654290
  }
}
```

### 3. Token Storage
- **Development**: localStorage (for demo purposes)
- **Production**: HttpOnly cookies with Secure and SameSite flags

## Route Protection

### 1. Middleware Protection
The `middleware.ts` file provides server-side route protection:

```typescript
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check authentication
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Check authorization
  const userRole = extractUserRoleFromToken(token);
  if (!hasRouteAccess(userRole, pathname)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
}
```

### 2. Client-Side Protection
Components can be wrapped with protection:

```typescript
// Route-level protection
<RouteGuard requiredRole="zone_admin">
  <ZoneDataPage />
</RouteGuard>

// Component-level protection
<ProtectedRoute requiredRole="central_admin">
  <ZonesManagementPage />
</ProtectedRoute>
```

### 3. Higher-Order Components
```typescript
// Protect component with specific role
const ProtectedZonePage = withRoleProtection(ZonePage, "zone_admin");

// Protect component with any of multiple roles
const ProtectedFarmerPage = withAnyRoleProtection(FarmerPage, ["zone_admin", "central_admin"]);
```

## Permission System

### 1. Permission Structure
```typescript
const PERMISSIONS = {
  "zones:read": ["central_admin"],
  "zones:write": ["central_admin"],
  "farmers:read": ["zone_admin", "central_admin"],
  "recommendations:read": ["zone_admin", "central_admin", "investor"],
  // ... more permissions
};
```

### 2. Using Permissions in Components
```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, canAccessResource } = usePermissions();
  
  if (!hasPermission("farmers:read")) {
    return <AccessDenied />;
  }
  
  // Check zone-specific access
  if (!canAccessResource("farmers", "read", zoneId)) {
    return <ZoneAccessDenied />;
  }
  
  return <FarmerList />;
}
```

### 3. Conditional Rendering
```typescript
import { useConditionalRender } from '@/hooks/usePermissions';

function AdminPanel() {
  const { renderIf, renderIfAny } = useConditionalRender();
  
  return (
    <div>
      {renderIf("zones:read", <ZonesList />)}
      {renderIfAny(["users:read", "users:write"], <UserManagement />)}
    </div>
  );
}
```

## API Authorization

### 1. Resource-Level Access Control
```typescript
export async function getZoneById(id: string): Promise<Zone | undefined> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");
  
  const zone = mockZones.find((z) => z.id === id);
  if (!zone) return undefined;
  
  // Zone admin can only access their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== zone.id) {
    throw new Error("Access denied: Zone not assigned to user");
  }
  
  return zone;
}
```

### 2. Permission-Based API Access
```typescript
export async function createFarmer(farmer: Omit<Farmer, "id">): Promise<Farmer> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");
  
  // Only zone_admin can create farmers
  if (user.role !== "zone_admin") {
    throw new Error("Access denied: Insufficient permissions");
  }
  
  // Zone admin can only create farmers in their assigned zone
  if (user.zoneId !== farmer.zoneId) {
    throw new Error("Access denied: Cannot create farmer in different zone");
  }
  
  // ... create farmer logic
}
```

## Security Features

### 1. Token Security
- JWT tokens with expiration (24 hours)
- Secure token storage (HttpOnly cookies in production)
- Automatic token validation on each request

### 2. Route Security
- Server-side middleware protection
- Client-side route guards
- Automatic redirects for unauthorized access

### 3. Data Security
- Zone-level data isolation
- Role-based data filtering
- Permission-based feature access

### 4. Session Management
- Automatic session expiration
- Secure logout functionality
- Token refresh mechanism

## Usage Examples

### 1. Protecting a Page
```typescript
// app/zones/page.tsx
import { withRoleProtection } from '@/components/ProtectedRoute';

function ZonesPage() {
  return <div>Zones Management</div>;
}

export default withRoleProtection(ZonesPage, "central_admin");
```

### 2. Conditional UI Elements
```typescript
import { usePermissions } from '@/hooks/usePermissions';

function Dashboard() {
  const { isZoneAdmin, isCentralAdmin, hasPermission } = usePermissions();
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {isZoneAdmin && <ZoneOverview />}
      {isCentralAdmin && <SystemOverview />}
      
      {hasPermission("recommendations:approve") && (
        <RecommendationApprovalPanel />
      )}
    </div>
  );
}
```

### 3. API Calls with Authorization
```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { getZones } from '@/lib/api';

function ZonesList() {
  const { hasPermission } = usePermissions();
  const [zones, setZones] = useState([]);
  
  useEffect(() => {
    if (hasPermission("zones:read")) {
      getZones().then(setZones);
    }
  }, [hasPermission]);
  
  if (!hasPermission("zones:read")) {
    return <AccessDenied />;
  }
  
  return <ZonesTable zones={zones} />;
}
```

## Best Practices

### 1. Always Check Permissions
- Check permissions before rendering components
- Validate permissions before making API calls
- Use route guards for page-level protection

### 2. Zone-Level Security
- Always filter data by user's zone when applicable
- Validate zone access before operations
- Use zone-specific API endpoints when possible

### 3. Error Handling
- Provide clear error messages for access denied
- Log unauthorized access attempts
- Redirect users to appropriate pages

### 4. Testing
- Test all role combinations
- Verify zone-level access control
- Test permission-based features

## Production Considerations

### 1. Security Enhancements
- Implement proper JWT signing with secret keys
- Use HTTPS for all communications
- Implement rate limiting
- Add CSRF protection

### 2. Token Management
- Implement token refresh mechanism
- Add token blacklisting for logout
- Monitor token usage and expiration

### 3. Monitoring
- Log authentication events
- Monitor failed login attempts
- Track permission violations

## Troubleshooting

### Common Issues

1. **"Access Denied" errors**
   - Check user role and permissions
   - Verify zone assignments for zone admins
   - Check route access configuration

2. **Authentication failures**
   - Verify JWT token validity
   - Check token expiration
   - Ensure proper token storage

3. **Permission issues**
   - Verify permission mappings
   - Check role assignments
   - Validate zone access for zone admins

### Debug Mode
Enable debug logging by setting environment variables:
```bash
DEBUG_AUTH=true
DEBUG_PERMISSIONS=true
```

This will provide detailed information about authentication and authorization decisions.
