"use client"
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApprovedRecommendationsByZone, getZoneById } from "@/lib/api";
import { Recommendation } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function ZoneOpportunitiesPage() {
  const params = useParams<{ id: string }>();
  const zoneId = params?.id as string;
  const [zoneName, setZoneName] = useState<string>("");
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"crop_name" | "suitability_score">("suitability_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function load() {
      const zone = await getZoneById(zoneId);
      setZoneName(zone?.name ?? "");
      const recs = await getApprovedRecommendationsByZone(zoneId);
      setRows(recs);
    }
    if (zoneId) load();
  }, [zoneId]);

  const filtered = useMemo(() => {
    let data = rows.filter((r) => r.crop_name.toLowerCase().includes(search.toLowerCase()));
    data = data.sort((a, b) => {
      const valA = sortKey === "suitability_score" ? a.suitability_score : a.crop_name.localeCompare(b.crop_name);
      const valB = sortKey === "suitability_score" ? b.suitability_score : b.crop_name.localeCompare(a.crop_name);
      // When comparing strings, valA/valB will be numbers already due to localeCompare
      const comp = typeof valA === "number" && typeof valB === "number" ? valA - valB : (valA as number) - (valB as number);
      return sortDir === "asc" ? comp : -comp;
    });
    return data;
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: "crop_name" | "suitability_score") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Opportunities · {zoneName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-3">
            <Input placeholder="Filter by crop name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => toggleSort("crop_name")} className="cursor-pointer">Crop name</TableHead>
                <TableHead onClick={() => toggleSort("suitability_score")} className="cursor-pointer">Suitability score (%)</TableHead>
                <TableHead>Key environmental factors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.crop_name}</TableCell>
                  <TableCell>{r.suitability_score}%</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      <div>Soil type: {r.key_environmental_factors.soil_type}</div>
                      <div>pH: {r.key_environmental_factors.ph}</div>
                      <div>Moisture: {r.key_environmental_factors.moisture_range}</div>
                      <div>Rainfall: {r.key_environmental_factors.rainfall_forecast}</div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


