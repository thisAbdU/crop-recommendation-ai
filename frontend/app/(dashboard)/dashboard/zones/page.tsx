"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Plus, Users, Wifi, Eye, Edit, Trash2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useState } from "react";

// Mock data for zones
const mockZones = [
  {
    id: "1",
    name: "Green Valley",
    region: "North",
    technician: "John Smith",
    iotHealth: "healthy",
    crops: ["Wheat", "Corn"],
    suitability: 82,
    status: "active",
    lastUpdate: "2 hours ago"
  },
  {
    id: "2",
    name: "Sun Plains",
    region: "South",
    technician: "Sarah Johnson",
    iotHealth: "warning",
    crops: ["Rice"],
    suitability: 90,
    status: "active",
    lastUpdate: "1 hour ago"
  },
  {
    id: "3",
    name: "River Bend",
    region: "East",
    technician: "Mike Davis",
    iotHealth: "critical",
    crops: [],
    suitability: 0,
    status: "inactive",
    lastUpdate: "5 hours ago"
  },
  {
    id: "4",
    name: "Mountain View",
    region: "West",
    technician: "Lisa Wilson",
    iotHealth: "healthy",
    crops: ["Corn", "Soybeans"],
    suitability: 75,
    status: "active",
    lastUpdate: "30 minutes ago"
  }
];

export default function ZonesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");

  const filteredZones = mockZones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.technician.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = selectedRegion === "all" || zone.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const getHealthStatus = (health: string) => {
    switch (health) {
      case 'healthy':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Healthy' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Warning' };
      case 'critical':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Critical' };
      default:
        return { icon: AlertTriangle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Unknown' };
    }
  };

  const getSuitabilityClass = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 50) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const regions = ["all", ...Array.from(new Set(mockZones.map(zone => zone.region)))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zones Management</h1>
          <p className="text-muted-foreground">Manage agricultural zones and their representatives</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Zone
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockZones.length}</div>
            <p className="text-xs text-muted-foreground">Active zones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockZones.filter(z => z.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Currently operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Technicians</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(mockZones.map(z => z.technician)).size}</div>
            <p className="text-xs text-muted-foreground">Assigned technicians</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Suitability</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(mockZones.reduce((acc, zone) => acc + zone.suitability, 0) / mockZones.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all zones</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter zones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search zones or technicians..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              {regions.map(region => (
                <option key={region} value={region}>
                  {region === "all" ? "All Regions" : region}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Zones Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zones</CardTitle>
          <CardDescription>Manage agricultural zones and their configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>IoT Health</TableHead>
                <TableHead>Active Crops</TableHead>
                <TableHead>Suitability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredZones.map((zone) => {
                const healthStatus = getHealthStatus(zone.iotHealth);
                const HealthIcon = healthStatus.icon;
                
                return (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{zone.name}</div>
                          <div className="text-sm text-muted-foreground">Zone #{zone.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{zone.region}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm">{zone.technician}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${healthStatus.bg} flex items-center justify-center`}>
                          <HealthIcon className={`w-4 h-4 ${healthStatus.color}`} />
                        </div>
                        <span className="text-sm">{healthStatus.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {zone.crops.length > 0 ? (
                          zone.crops.map((crop, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {crop}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getSuitabilityClass(zone.suitability)}`}>
                        {zone.suitability}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.status === 'active' ? 'default' : 'secondary'}>
                        {zone.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{zone.lastUpdate}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 