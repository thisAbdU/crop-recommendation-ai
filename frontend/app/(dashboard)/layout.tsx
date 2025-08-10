"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import {
  Home,
  BarChart3,
  User,
  Settings,
  Leaf,
  MapPin,
  TrendingUp,
  Clock,
  Wifi,
  Users,
  Building2,
  Crop,
  AlertTriangle,
  FileText,
  Calendar,
  Shield,
  Database,
  Target,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const user = {
    role: "central_admin",
    zoneId: 1,
    name: "anwar",
  };
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  const handleLogout = () => {
    // The logout function is available from useAuth
    // We'll handle this in the Topbar component
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "central_admin":
        return "Central Administrator";
      case "zone_admin":
        return "Zone Administrator";
      case "investor":
        return "Investor";
      default:
        return "User";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "central_admin":
        return "bg-purple-100 text-purple-600";
      case "zone_admin":
        return "bg-blue-100 text-blue-600";
      case "investor":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect to login)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard" className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-lg">CropAI</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="space-y-6">
          {/* User Info Section */}
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-3 py-4 glass-effect rounded-lg mx-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p
                      className={`text-xs px-2 py-1 rounded-full inline-block ${getRoleColor(
                        user.role
                      )}`}
                    >
                      {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Active Zones</span>
                    <span className="font-medium">
                      {user.role === "zone_admin" && user.zoneId
                        ? "1"
                        : user.role === "central_admin"
                        ? "3"
                        : "0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">This Month</span>
                    <span className="font-medium text-green-600">+12%</span>
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Quick Stats */}
          <SidebarGroup>
            <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                <div className="sidebar-stats-item flex items-center gap-2 p-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Monitored Zones</p>
                    <p className="text-xs text-muted-foreground">
                      {user.role === "zone_admin"
                        ? "1 active location"
                        : user.role === "central_admin"
                        ? "3 active locations"
                        : "View opportunities"}
                    </p>
                  </div>
                </div>

                <div className="sidebar-stats-item flex items-center gap-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Avg. Suitability</p>
                    <p className="text-xs text-muted-foreground">
                      82% across zones
                    </p>
                  </div>
                </div>

                <div className="sidebar-stats-item flex items-center gap-2 p-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Last Update</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard" className="flex items-center gap-3">
                      <Home className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Central Admin Navigation */}
                {user.role === "central_admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/zones"
                          className="flex items-center gap-3"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Zones Management</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/iot-devices"
                          className="flex items-center gap-3"
                        >
                          <Wifi className="w-4 h-4" />
                          <span>IoT Devices</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/users"
                          className="flex items-center gap-3"
                        >
                          <Users className="w-4 h-4" />
                          <span>User Management</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/recommendations"
                          className="flex items-center gap-3"
                        >
                          <Target className="w-4 h-4" />
                          <span>All Recommendations</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/reports"
                          className="flex items-center gap-3"
                        >
                          <FileText className="w-4 h-4" />
                          <span>System Reports</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {/* Zone Admin Navigation */}
                {user.role === "zone_admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/zone-data"
                          className="flex items-center gap-3"
                        >
                          <Database className="w-4 h-4" />
                          <span>Zone Data</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/farmers"
                          className="flex items-center gap-3"
                        >
                          <Users className="w-4 h-4" />
                          <span>Farmers</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/crop-recommendations"
                          className="flex items-center gap-3"
                        >
                          <Crop className="w-4 h-4" />
                          <span>Crop Recommendations</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/alerts"
                          className="flex items-center gap-3"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Alerts & Notifications</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/schedule"
                          className="flex items-center gap-3"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>Maintenance Schedule</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {/* Investor Navigation */}
                {user.role === "investor" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/portfolio"
                          className="flex items-center gap-3"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Investment Portfolio</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/performance"
                          className="flex items-center gap-3"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>Performance Analytics</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/reports"
                          className="flex items-center gap-3"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Financial Reports</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {/* Common Navigation for All Roles */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      href="/dashboard/analytics"
                      className="flex items-center gap-3"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/profile" className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/settings" className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="flex items-center gap-3 text-red-600 hover:text-red-700"
              >
                <Shield className="w-4 h-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div className="sticky top-0 z-10 glass-effect border-b border-border/50">
          <div className="flex items-center gap-2 p-2">
            <SidebarTrigger />
            <Topbar />
          </div>
        </div>
        <div className="interactive-bg min-h-screen">
          <div className="p-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
