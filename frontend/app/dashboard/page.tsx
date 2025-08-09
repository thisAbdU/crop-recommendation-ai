"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardDataForRole } from "@/lib/api";
import { Recommendation, Role, User } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>("zone_admin");
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setUser(auth.user);
    setRole(auth.user.role);
  }, [router]);

  useEffect(() => {
    async function fetchData() {
      if (!role) return;
      const res = await getDashboardDataForRole(role, user ?? undefined);
      setData(res);
    }
    fetchData();
  }, [role, user]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!role) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>

      {role === "investor" && Array.isArray(data) ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item: any) => (
            <Card key={item.zone.id}>
              <CardHeader>
                <CardTitle>{item.zone.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Avg pH: {item.metrics.avgPh} · Moisture:{" "}
                  {item.metrics.avgMoisture}% · Temp: {item.metrics.avgTemp}°C
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">
                    Top recommendations
                  </div>
                  <div className="space-y-1">
                    {item.topRecommendations.map((r: Recommendation) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{r.crop_name}</span>
                        <span className="text-muted-foreground">
                          {r.suitability_score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() =>
                    router.push(`/zone/${item.zone.id}/opportunities`)
                  }
                >
                  View zone
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {role === "zone_admin" && Array.isArray(data) ? (
        <Card>
          <CardHeader>
            <CardTitle>Your zone recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Input
                placeholder="Filter by crop name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crop</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data
                  .filter((r: Recommendation) =>
                    r.crop_name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((r: Recommendation) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.crop_name}
                      </TableCell>
                      <TableCell className="capitalize">{r.status}</TableCell>
                      <TableCell>{r.suitability_score}%</TableCell>
                      <TableCell>
                        {new Date(r.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              router.push(`/recommendation/${r.id}`)
                            }
                          >
                            Open
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {role === "central_admin" && data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Zones</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>IoT Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.zones.map((z: any) => (
                    <TableRow key={z.id}>
                      <TableCell>{z.name}</TableCell>
                      <TableCell>{z.region}</TableCell>
                      <TableCell className="capitalize">
                        {
                          data.iotHealth.find((h: any) => h.zoneId === z.id)
                            ?.status
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technicians</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Assigned Zones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.technicians.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.assignedZoneIds.join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
