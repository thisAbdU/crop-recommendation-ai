"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crop, Search, Eye, CheckCircle, XCircle, Clock, TrendingUp, Thermometer, Droplets } from "lucide-react";
import { useState } from "react";

// Mock data for crop recommendations
const mockRecommendations = [
  {
    id: "1",
    crop_name: "Wheat",
    suitability_score: 92,
    status: "approved",
    createdAt: "2024-01-15T10:30:00Z",
    key_factors: {
      soil_type: "Loamy",
      ph: 6.8,
      moisture_range: "60-70%",
      rainfall_forecast: "Normal"
    },
    rationale: "Optimal soil conditions and weather patterns support wheat cultivation with high yield potential."
  },
  {
    id: "2",
    crop_name: "Corn",
    suitability_score: 78,
    status: "pending",
    createdAt: "2024-01-14T14:20:00Z",
    key_factors: {
      soil_type: "Clay",
      ph: 6.2,
      moisture_range: "65-75%",
      rainfall_forecast: "Above Average"
    },
    rationale: "Good soil moisture and favorable rainfall forecast, though pH levels need monitoring."
  },
  {
    id: "3",
    crop_name: "Soybeans",
    suitability_score: 85,
    status: "approved",
    createdAt: "2024-01-13T09:15:00Z",
    key_factors: {
      soil_type: "Sandy Loam",
      ph: 6.5,
      moisture_range: "55-65%",
      rainfall_forecast: "Normal"
    },
    rationale: "Excellent soil type and balanced environmental conditions for soybean production."
  },
  {
    id: "4",
    crop_name: "Rice",
    suitability_score: 45,
    status: "declined",
    createdAt: "2024-01-12T16:45:00Z",
    key_factors: {
      soil_type: "Clay",
      ph: 5.8,
      moisture_range: "40-50%",
      rainfall_forecast: "Below Average"
    },
    rationale: "Insufficient water availability and suboptimal soil conditions for rice cultivation."
  }
];

export default function CropRecommendationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRecommendations = mockRecommendations.filter(rec => {
    const matchesSearch = rec.crop_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSuitabilityClass = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    total: mockRecommendations.length,
    approved: mockRecommendations.filter(r => r.status === 'approved').length,
    pending: mockRecommendations.filter(r => r.status === 'pending').length,
    avgScore: Math.round(mockRecommendations.reduce((acc, r) => acc + r.suitability_score, 0) / mockRecommendations.length)
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Crop Recommendations</h1>
          <p className="text-muted-foreground">AI-powered crop suggestions for your zone</p>
        </div>
        <Button className="gap-2">
          <Crop className="w-4 h-4" />
          New Recommendation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recommendations</CardTitle>
            <Crop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Suitability</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}%</div>
            <p className="text-xs text-muted-foreground">Across all crops</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search crops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>AI-generated crop suggestions with environmental analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead>
                <TableHead>Suitability Score</TableHead>
                <TableHead>Environmental Factors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecommendations.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100">
                        <Crop className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">{rec.crop_name}</div>
                        <div className="text-sm text-muted-foreground">AI Recommendation</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getSuitabilityClass(rec.suitability_score)}`}>
                      {rec.suitability_score}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>pH: {rec.key_factors.ph}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Droplets className="w-3 h-3 text-blue-500" />
                        <span>{rec.key_factors.moisture_range}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Thermometer className="w-3 h-3 text-orange-500" />
                        <span>{rec.key_factors.rainfall_forecast}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(rec.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(rec.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {rec.status === 'pending' && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest recommendation updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockRecommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <Crop className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {rec.crop_name} recommendation {rec.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(rec.createdAt)}
                  </p>
                </div>
                <Badge className={`${getSuitabilityClass(rec.suitability_score)}`}>
                  {rec.suitability_score}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 