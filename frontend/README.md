# Crop Recommendation AI - Frontend

A Next.js application with secure authentication and role-based authorization for agricultural management.

## Features

- **Secure Authentication**: JWT-based login system
- **Role-Based Access Control**: Three user roles with different permissions
- **Modular Services**: Clean separation of API calls and business logic
- **Responsive Design**: Modern UI with Tailwind CSS

## User Roles

### 1. Investor (Exporter)
- Views crop recommendations and zone opportunities
- Access to investment portfolio
- Read-only access to specific dashboards

### 2. Zone Admin
- Manages farmers in assigned zone
- Views sensor data and generates recommendations
- Access restricted to assigned zone

### 3. Central Admin
- Full system access
- Manages zones, recommendations, and IoT devices
- Oversees entire platform

## Authentication Flow

1. **Login**: User enters email/password
2. **JWT Token**: Backend returns JWT with user info
3. **Role-Based Routing**: Frontend renders appropriate dashboard
4. **Protected Routes**: Middleware validates tokens
5. **API Calls**: Services include auth tokens automatically

## Project Structure

```
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   ├── login/               # Login page
│   └── layout.tsx          # Root layout with AuthProvider
├── components/
│   ├── auth/               # Authentication components
│   ├── layout/             # Layout components
│   └── ui/                 # UI components
├── contexts/
│   └── AuthContext.tsx     # Authentication state management
├── hooks/
│   └── usePermissions.ts   # Permission checking hooks
├── services/
│   ├── api.ts              # Base API client
│   ├── authService.ts      # Authentication service
│   └── dataService.ts      # Data fetching service
└── middleware.ts            # Route protection
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## API Integration

The application is designed to work with a backend API that provides:

- **Authentication**: `POST /api/auth/login/`
- **Zones**: `GET /api/zones/`
- **Recommendations**: `GET /api/recommendations/`
- **IoT Devices**: `GET /api/devices/`
- **Farmers**: `GET /api/farmers/`
- **Dashboard Stats**: `GET /api/dashboard/{role}/`

## Security Features

- JWT token validation
- Role-based route protection
- Middleware authentication checks
- Secure token storage
- Automatic token inclusion in API calls

## Customization

### Adding New Roles
1. Update `usePermissions.ts` with new permissions
2. Add role-specific navigation in dashboard layout
3. Update middleware route protection

### Adding New API Endpoints
1. Create new methods in `DataService`
2. Use the base `apiClient` for HTTP requests
3. Update types and interfaces as needed

## Troubleshooting

### Common Issues

1. **Login not working**: Check backend API URL and endpoints
2. **Role-based content not showing**: Verify user role in AuthContext
3. **API calls failing**: Check authentication token and backend connectivity

### Debug Mode
Enable console logging in development to see authentication flow:
```typescript
// In AuthContext.tsx
console.log('Auth state:', { user, loading, isAuthenticated });
```

## Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Implement proper error handling
4. Test role-based access control
5. Update documentation for new features

## License

This project is licensed under the MIT License.
