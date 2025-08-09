"use client"

import { useEffect, useState } from "react";
import { loadAuth } from "@/lib/auth";
import { Role } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Target,
  Eye
} from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const auth = loadAuth();
    if (auth) {
      setUserRole(auth.user.role);
      setUserName(auth.user.name);
    }
  }, []);

  const getRoleDisplayName = (role: Role) => {
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
          <h1 className="text-3xl font-bold">Central Administration Dashboard</h1>
          <p className="text-muted-foreground">Manage all zones, users, and system operations</p>
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
            <p className="text-xs text-muted-foreground">All systems operational</p>
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
                <p className="text-sm font-medium">User registration: John Doe</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">IoT device maintenance scheduled</p>
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
          <p className="text-muted-foreground">Monitor and manage your assigned zone</p>
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
            <p className="text-xs text-muted-foreground">Wheat, Corn, Soybeans</p>
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
            <CardTitle className="text-sm font-medium">Next Maintenance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3d</div>
            <p className="text-xs text-muted-foreground">Scheduled irrigation</p>
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
          <p className="text-muted-foreground">Monitor your agricultural investments and zones</p>
        </div>
        <Badge className={getRoleColor("investor")}>
          {getRoleDisplayName("investor")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium">Total Crops</CardTitle>
            <Crop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Across all zones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Suitability</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">Optimal conditions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Investment Zones</CardTitle>
          <CardDescription>Overview of all zones associated with your investments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Recommended Crop</TableHead>
                <TableHead>Suitability Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Green Valley</TableCell>
                <TableCell>North Region</TableCell>
                <TableCell>Maize</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    82%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/zone/z1/chat">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Sun Plains</TableCell>
                <TableCell>East Region</TableCell>
                <TableCell>Rice</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    90%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/zone/z2/chat">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">River Bend</TableCell>
                <TableCell>West Region</TableCell>
                <TableCell>Wheat</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    76%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/zone/z3/chat">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Mountain View</TableCell>
                <TableCell>South Region</TableCell>
                <TableCell>Soybeans</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    88%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/zone/z4/chat">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Desert Oasis</TableCell>
                <TableCell>Central Region</TableCell>
                <TableCell>Millet</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    65%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/zone/z5/chat">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Coastal Fields</TableCell>
                <TableCell>Coastal Region</TableCell>
                <TableCell>Coconut</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    92%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/zone/z6/chat">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Highland Farms</TableCell>
                <TableCell>Highland Region</TableCell>
                <TableCell>Tea</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    87%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/zone/z7/chat">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Valley Gardens</TableCell>
                <TableCell>Valley Region</TableCell>
                <TableCell>Tomatoes</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    78%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/zone/z8/chat">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Investment management tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/zones">
                <MapPin className="mr-2 h-4 w-4" />
                View All Zones
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/crop-recommendations">
                <Crop className="mr-2 h-4 w-4" />
                Crop Recommendations
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/zone-data">
                <BarChart3 className="mr-2 h-4 w-4" />
                Zone Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Zone Updates</CardTitle>
            <CardDescription>Latest zone performance and recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New crop recommendation for Green Valley</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sun Plains suitability score improved to 90%</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">River Bend irrigation system maintenance scheduled</p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
            </div>
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
            <p className="text-muted-foreground">You don't have permission to access this dashboard.</p>
          </div>
        </div>
      );
  }
}

