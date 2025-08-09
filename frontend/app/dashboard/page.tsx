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
import { InvestorStats } from "@/components/dashboard/investor-stats";
import { ZoneFilters, type ZoneFilter } from "@/components/dashboard/zone-filters";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>("zone_admin");
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ZoneFilter>({ cropName: "", soilType: null, minScore: null, maxScore: null });

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
        <div className="space-y-6">
          <InvestorStats totalZones={data.length} cropsThisMonth={Math.max(1, Math.round(data.length * 1.5))} pctChange={12} />

          <ZoneFilters value={filters} onChange={setFilters} soilTypeOptions={[...new Set(data.map((d: any) => d.topSoilType))]} />

          <Card>
            <CardHeader>
              <CardTitle>Zones</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Top crops</TableHead>
                    <TableHead>Suitability</TableHead>
                    <TableHead>Soil type</TableHead>
                    <TableHead>Last update</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data
                    .filter((item: any) => {
                      const nameMatch = filters.cropName ? item.topRecommendations.some((r: Recommendation) => r.crop_name.toLowerCase().includes(filters.cropName.toLowerCase())) : true;
                      const soilMatch = filters.soilType ? item.topSoilType === filters.soilType : true;
                      const minMatch = filters.minScore != null ? item.bestScore >= filters.minScore : true;
                      const maxMatch = filters.maxScore != null ? item.bestScore <= filters.maxScore : true;
                      return nameMatch && soilMatch && minMatch && maxMatch;
                    })
                    .map((item: any) => (
                      <TableRow key={item.zone.id}>
                        <TableCell className="font-medium">{item.zone.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.topRecommendations.map((r: Recommendation) => r.crop_name).join(", ")}
                          </div>
                        </TableCell>
                        <TableCell>{item.bestScore}%</TableCell>
                        <TableCell>{item.topSoilType}</TableCell>
                        <TableCell>{item.lastSensorUpdate ? new Date(item.lastSensorUpdate).toLocaleString() : "—"}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => router.push(`/zone/${item.zone.id}/opportunities`)}>View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
