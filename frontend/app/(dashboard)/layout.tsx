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
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log(" Dashboard Layout - Auth Check:", { 
      loading, 
      isAuthenticated, 
      user: user?.role,
      hasUser: !!user 
    });
    
    if (!loading && !isAuthenticated) {
      console.log(" Dashboard Layout - Redirecting to login (not authenticated)");
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

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

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Zones</span>
                    <span className="font-medium">
                      {user.role === "zone_admin" && user.zone_id
                        ? "1"
                        : user.role === "central_admin"
                        ? "3"
                        : "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Navigation Menu */}
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Dashboard */}
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
                          <span>Zones</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/recommendations"
                          className="flex items-center gap-3"
                        >
                          <Crop className="w-4 h-4" />
                          <span>Recommendations</span>
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
                  </>
                )}

                {/* Zone Admin Navigation */}
                {user.role === "zone_admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/zone-admin-dashboard"
                          className="flex items-center gap-3"
                        >
                          <Leaf className="w-4 h-4" />
                          <span>AI Zone Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/zone-data"
                          className="flex items-center gap-3"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Zone Data</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/farmers"
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
                          <span>Recommendations</span>
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
                          href="/dashboard/zone-opportunities"
                          className="flex items-center gap-3"
                        >
                          <Target className="w-4 h-4" />
                          <span>Zone Opportunities</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/portfolio"
                          className="flex items-center gap-3"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>Portfolio</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-3"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
