"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth } from "@/lib/auth";
import { getSensorDataByZone } from "@/lib/api";
import { SensorDataPoint, User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ZoneDataPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<SensorDataPoint[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    if (auth.user.role !== "zone_admin") {
      router.replace("/dashboard");
      return;
    }
    setUser(auth.user);
  }, [router]);

  useEffect(() => {
    async function run() {
      if (!user?.zoneId) return;
      const res = await getSensorDataByZone(user.zoneId, from || undefined, to || undefined);
      setData(res);
      setPage(1);
    }
    run();
  }, [user, from, to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((d) => {
      return [
        d.ph.toString(),
        d.soil_moisture.toString(),
        d.temperature.toString(),
        d.humidity.toString(),
        d.rainfall.toString(),
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function exportCsv() {
    const headers = [
      "Timestamp",
      "Soil Moisture",
      "pH",
      "Temperature",
      "Humidity",
      "Phosphorus",
      "Potassium",
      "Nitrogen",
      "Rainfall",
    ];
    const rows = filtered.map((d) => [
      d.read_from_iot_at,
      d.soil_moisture,
      d.ph,
      d.temperature,
      d.humidity,
      d.phosphorus,
      d.potassium,
      d.nitrogen,
      d.rainfall,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zone-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zone Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => exportCsv()} className="w-full sm:w-auto">Export CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environmental Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Input
              placeholder="Quick filter (e.g. 6.5, 30, 24)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Soil Moisture (%)</TableHead>
                <TableHead>pH</TableHead>
                <TableHead>Temperature (°C)</TableHead>
                <TableHead>Humidity (%)</TableHead>
                <TableHead>Phosphorus (ppm)</TableHead>
                <TableHead>Potassium (ppm)</TableHead>
                <TableHead>Nitrogen (ppm)</TableHead>
                <TableHead>Rainfall (mm)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{new Date(d.read_from_iot_at).toLocaleString()}</TableCell>
                  <TableCell>{d.soil_moisture}</TableCell>
                  <TableCell>{d.ph}</TableCell>
                  <TableCell>{d.temperature}</TableCell>
                  <TableCell>{d.humidity}</TableCell>
                  <TableCell>{d.phosphorus}</TableCell>
                  <TableCell>{d.potassium}</TableCell>
                  <TableCell>{d.nitrogen}</TableCell>
                  <TableCell>{d.rainfall}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


