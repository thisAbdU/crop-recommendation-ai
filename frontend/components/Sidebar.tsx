"use client"

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/components/RouteGuard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  roles: string[];
  permissions?: string[];
}

const sidebarItems: SidebarItem[] = [
  // Dashboard - accessible by all authenticated users
  {
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['investor', 'zone_admin', 'central_admin'],
  },
  
  // Investor-specific items
  {
    label: 'Zone Opportunities',
    href: '/zone-opportunities',
    roles: ['investor'],
  },
  {
    label: 'Portfolio',
    href: '/dashboard/portfolio',
    roles: ['investor'],
  },
  {
    label: 'Performance',
    href: '/dashboard/performance',
    roles: ['investor'],
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    roles: ['investor'],
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    roles: ['investor'],
  },
  
  // Zone Admin specific items
  {
    label: 'My Zone',
    href: '/dashboard/my-zone',
    roles: ['zone_admin'],
  },
  {
    label: 'Zone Data',
    href: '/zone-data',
    roles: ['zone_admin'],
    permissions: ['zone_data:read'],
  },
  {
    label: 'Farmers',
    href: '/farmers',
    roles: ['zone_admin'],
    permissions: ['farmers:read'],
  },
  {
    label: 'Crop Recommendations',
    href: '/dashboard/crop-recommendations',
    roles: ['zone_admin'],
    permissions: ['recommendations:read'],
  },
  {
    label: 'Alerts',
    href: '/dashboard/alerts',
    roles: ['zone_admin'],
  },
  {
    label: 'Schedule',
    href: '/dashboard/schedule',
    roles: ['zone_admin'],
  },
  
  // Central Admin specific items
  {
    label: 'Zones',
    href: '/dashboard/zones',
    roles: ['central_admin'],
    permissions: ['zones:read'],
  },
  {
    label: 'IoT Devices',
    href: '/dashboard/iot-devices',
    roles: ['central_admin'],
    permissions: ['iot:read'],
  },
  {
    label: 'Users',
    href: '/dashboard/users',
    roles: ['central_admin'],
    permissions: ['users:read'],
  },
  {
    label: 'Recommendations',
    href: '/dashboard/recommendations',
    roles: ['central_admin'],
    permissions: ['recommendations:read'],
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    roles: ['central_admin'],
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    roles: ['central_admin'],
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  // Filter sidebar items based on user role and permissions
  const visibleItems = sidebarItems.filter(item => {
    // Check if user has the required role
    if (!item.roles.includes(user.role)) {
      return false;
    }
    
    // Check if user has the required permissions
    if (item.permissions) {
      return item.permissions.every(permission => hasPermission(permission));
    }
    
    return true;
  });

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Crop AI</h2>
        <p className="text-sm text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
      </div>
      
      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {item.icon && <span className="mr-3">{item.icon}</span>}
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="px-3 py-2">
          <p className="text-xs text-gray-500">Logged in as</p>
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
