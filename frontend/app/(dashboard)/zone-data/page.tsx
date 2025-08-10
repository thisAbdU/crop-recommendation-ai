"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSensorDataByZone } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { SensorDataPoint } from "@/lib/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Download, Search, Calendar } from "lucide-react";

export default function ZoneDataPage() {
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "zone_admin") return;
    
    setUser(currentUser);
    loadSensorData();
  }, []);

  const loadSensorData = async () => {
    if (!user?.zoneId) return;
    
    try {
      const data = await getSensorDataByZone(user.zoneId, startDate || undefined, endDate || undefined);
      setSensorData(data);
    } catch (error) {
      console.error("Failed to load sensor data:", error);
    }
  };

  useEffect(() => {
    if (user?.zoneId) {
      loadSensorData();
    }
  }, [startDate, endDate, user]);

  const filteredData = sensorData.filter((item) =>
    Object.values(item).some((value) =>
      value.toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  const paginatedData = filteredData.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  const totalPages = Math.ceil(filteredData.length / pagination.limit);

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Soil Moisture (%)",
      "pH",
      "Temperature (°C)",
      "Phosphorus (ppm)",
      "Potassium (ppm)",
      "Humidity (%)",
      "Nitrogen (ppm)",
      "Rainfall (mm)",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredData.map((item) =>
        [
          new Date(item.read_from_iot_at).toLocaleDateString(),
          item.soil_moisture,
          item.ph,
          item.temperature,
          item.phosphorus,
          item.potassium,
          item.humidity,
          item.nitrogen,
          item.rainfall,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zone-data-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <RouteGuard requiredRole="zone_admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Zone Data</h1>
            <p className="text-muted-foreground">
              Monitor environmental readings and sensor data from your zone
            </p>
          </div>
          <Button onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search data..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environmental Readings</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {paginatedData.length} of {filteredData.length} records
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Soil Moisture (%)</TableHead>
                    <TableHead>pH</TableHead>
                    <TableHead>Temperature (°C)</TableHead>
                    <TableHead>Rainfall (mm)</TableHead>
                    <TableHead>Phosphorus (ppm)</TableHead>
                    <TableHead>Potassium (ppm)</TableHead>
                    <TableHead>Humidity (%)</TableHead>
                    <TableHead>Nitrogen (ppm)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.read_from_iot_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{item.soil_moisture}%</TableCell>
                      <TableCell>{item.ph}</TableCell>
                      <TableCell>{item.temperature}°C</TableCell>
                      <TableCell>{item.rainfall}mm</TableCell>
                      <TableCell>{item.phosphorus}</TableCell>
                      <TableCell>{item.potassium}</TableCell>
                      <TableCell>{item.humidity}%</TableCell>
                      <TableCell>{item.nitrogen}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}


