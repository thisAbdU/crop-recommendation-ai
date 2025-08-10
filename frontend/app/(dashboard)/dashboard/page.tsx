"use client";

import { useEffect, useState } from "react";
import { loadAuth } from "@/lib/auth";
import { Role } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  MapPin,
  Users,
  Wifi,
  Building2,
  Crop,
  AlertTriangle,
  Calendar,
  TrendingUp,
  FileText,
  DollarSign,
  Target,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<Role | null>("central_admin");
  const [userName, setUserName] = useState<string>("");

  // useEffect(() => {
  //   const auth = loadAuth();
  //   if (auth) {
  //     setUserRole(auth.user.role);
  //     setUserName(auth.user.name);
  //   }
  // }, []);

  const getRoleDisplayName = (role: Role) => {
    switch (role) {
      case "central_admin":
        return "Central Administrator";
      case "zone_admin":
        return "Zone Administrator";
      case "investor":
        return "Investor";
      default:
        return "Zone Administrator";
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case "central_admin":
        return "bg-purple-100 text-purple-600 border-purple-200";
      case "zone_admin":
        return "bg-blue-100 text-blue-600 border-blue-200";
      case "investor":
        return "bg-green-100 text-green-600 border-green-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const renderCentralAdminDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Central Administration Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage all zones, users, and system operations
          </p>
        </div>
        <Badge className={getRoleColor("central_admin")}>
          {getRoleDisplayName("central_admin")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">+5 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IoT Devices</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">98% operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/zones">
                <MapPin className="mr-2 h-4 w-4" />
                Manage Zones
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/users">
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/iot-devices">
                <Wifi className="mr-2 h-4 w-4" />
                IoT Device Management
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New zone added: Zone 13</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  User registration: John Doe
                </p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  IoT device maintenance scheduled
                </p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderZoneAdminDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zone Administration Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your assigned zone
          </p>
        </div>
        <Badge className={getRoleColor("zone_admin")}>
          {getRoleDisplayName("zone_admin")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zone Health</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">Optimal conditions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Crops</CardTitle>
            <Crop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Wheat, Corn, Soybeans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Next Maintenance
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3d</div>
            <p className="text-xs text-muted-foreground">
              Scheduled irrigation
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Zone Overview</CardTitle>
            <CardDescription>Current zone status and metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Soil Moisture</span>
              <span className="text-sm font-medium">65%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Temperature</span>
              <span className="text-sm font-medium">24°C</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">pH Level</span>
              <span className="text-sm font-medium">6.8</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Humidity</span>
              <span className="text-sm font-medium">72%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common zone management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/crop-recommendations">
                <Crop className="mr-2 h-4 w-4" />
                View Crop Recommendations
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/alerts">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Check Alerts
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/schedule">
                <Calendar className="mr-2 h-4 w-4" />
                Maintenance Schedule
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderInvestorDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investment Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your agricultural investments and returns
          </p>
        </div>
        <Badge className={getRoleColor("investor")}>
          {getRoleDisplayName("investor")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Investment
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground">
              +12% from last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.5%</div>
            <p className="text-xs text-muted-foreground">
              +2.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">All performing well</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$156K</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Investment performance by zone</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Zone A - Wheat</span>
              <span className="text-sm font-medium text-green-600">+22%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Zone B - Corn</span>
              <span className="text-sm font-medium text-green-600">+18%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Zone C - Soybeans</span>
              <span className="text-sm font-medium text-green-600">+15%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Zone D - Rice</span>
              <span className="text-sm font-medium text-orange-600">+8%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Investment management tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/portfolio">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Portfolio
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/performance">
                <TrendingUp className="mr-2 h-4 w-4" />
                Performance Analytics
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/reports">
                <FileText className="mr-2 h-4 w-4" />
                Financial Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  switch (userRole) {
    case "central_admin":
      return renderCentralAdminDashboard();
    case "zone_admin":
      return renderZoneAdminDashboard();
    case "investor":
      return renderInvestorDashboard();
    default:
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access this dashboard.
            </p>
          </div>
        </div>
      );
  }
}
