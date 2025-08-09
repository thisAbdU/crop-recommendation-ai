"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, DollarSign, TrendingUp, MapPin, Eye, Download, Calendar, Target, Users } from "lucide-react";
import { useState } from "react";

// Mock data for investment portfolio
const mockPortfolio = [
  {
    id: "1",
    zoneName: "Green Valley",
    crop: "Wheat",
    investment: 450000,
    currentValue: 549000,
    roi: 22.0,
    status: "active",
    lastUpdate: "2024-01-15T10:30:00Z",
    technician: "John Smith",
    suitability: 92
  },
  {
    id: "2",
    zoneName: "Sun Plains",
    crop: "Corn",
    investment: 380000,
    currentValue: 448400,
    roi: 18.0,
    status: "active",
    lastUpdate: "2024-01-14T14:20:00Z",
    technician: "Sarah Johnson",
    suitability: 78
  },
  {
    id: "3",
    zoneName: "River Bend",
    crop: "Soybeans",
    investment: 320000,
    currentValue: 368000,
    roi: 15.0,
    status: "active",
    lastUpdate: "2024-01-13T09:15:00Z",
    technician: "Mike Davis",
    suitability: 85
  },
  {
    id: "4",
    zoneName: "Mountain View",
    crop: "Rice",
    investment: 280000,
    currentValue: 302400,
    roi: 8.0,
    status: "active",
    lastUpdate: "2024-01-12T16:45:00Z",
    technician: "Lisa Wilson",
    suitability: 45
  }
];

export default function PortfolioPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("1y");

  const totalInvestment = mockPortfolio.reduce((acc, item) => acc + item.investment, 0);
  const totalCurrentValue = mockPortfolio.reduce((acc, item) => acc + item.currentValue, 0);
  const totalROI = ((totalCurrentValue - totalInvestment) / totalInvestment) * 100;
  const avgSuitability = Math.round(mockPortfolio.reduce((acc, item) => acc + item.suitability, 0) / mockPortfolio.length);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getROIClass = (roi: number) => {
    if (roi >= 15) return "text-green-600 bg-green-100";
    if (roi >= 10) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getSuitabilityClass = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investment Portfolio</h1>
          <p className="text-muted-foreground">Monitor your agricultural investments and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="gap-2">
            <BarChart3 className="w-4 h-4" />
            New Investment
          </Button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestment)}</div>
            <p className="text-xs text-muted-foreground">Across all zones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</div>
            <p className="text-xs text-green-600">+{totalROI.toFixed(1)}% total ROI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPortfolio.length}</div>
            <p className="text-xs text-muted-foreground">All performing well</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Suitability</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSuitability}%</div>
            <p className="text-xs text-muted-foreground">Across portfolio</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portfolio Performance</CardTitle>
              <CardDescription>Investment growth over time</CardDescription>
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Performance chart will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Table */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
          <CardDescription>Detailed breakdown of your agricultural investments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Investment</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>Suitability</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPortfolio.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{item.zoneName}</div>
                        <div className="text-sm text-muted-foreground">Zone #{item.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.crop}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(item.investment)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(item.currentValue)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getROIClass(item.roi)}`}>
                      +{item.roi.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getSuitabilityClass(item.suitability)}`}>
                      {item.suitability}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-sm">{item.technician}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(item.lastUpdate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Best performing investments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockPortfolio
              .sort((a, b) => b.roi - a.roi)
              .slice(0, 3)
              .map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.zoneName}</p>
                      <p className="text-xs text-muted-foreground">{item.crop}</p>
                    </div>
                  </div>
                  <Badge className={`${getROIClass(item.roi)}`}>
                    +{item.roi.toFixed(1)}%
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest portfolio updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockPortfolio.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {item.zoneName} value updated
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.lastUpdate)}
                  </p>
                </div>
                <Badge className={`${getROIClass(item.roi)}`}>
                  +{item.roi.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Important dates and milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Quarterly Review</p>
                <p className="text-xs text-muted-foreground">Jan 31, 2024</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                <Target className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Harvest Season</p>
                <p className="text-xs text-muted-foreground">Mar 15, 2024</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                <DollarSign className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Profit Distribution</p>
                <p className="text-xs text-muted-foreground">Apr 1, 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 