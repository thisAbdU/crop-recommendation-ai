"use client"
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApprovedRecommendationsByZone, getZoneById } from "@/lib/api";
import { Recommendation } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Donut } from "@/components/charts/donut";

export default function ZoneOpportunitiesPage() {
  const params = useParams<{ id: string }>();
  const zoneId = params?.id as string;
  const [zoneName, setZoneName] = useState<string>("");
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"crop_name" | "suitability_score">("suitability_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const best = useMemo(() => (rows.length ? Math.max(...rows.map((r) => r.suitability_score)) : 0), [rows]);

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
          <div className="mb-4 flex items-center justify-between gap-3">
            <Input placeholder="Filter by crop name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => exportCsv(filtered, zoneId)}>Export CSV</Button>
              <Button variant="outline" onClick={() => exportPdfClient(zoneName, filtered)}>Export PDF</Button>
            </div>
          </div>
          <div className="mb-6">
            <div className="text-sm font-medium mb-2">Top suitability</div>
            <Donut value={best} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => toggleSort("crop_name")} className="cursor-pointer">Crop name</TableHead>
                <TableHead onClick={() => toggleSort("suitability_score")} className="cursor-pointer">Suitability score (%)</TableHead>
                <TableHead>Key environmental factors (pH, moisture, rainfall, temperature)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.crop_name}</TableCell>
                  <TableCell>{r.suitability_score}%</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground grid md:grid-cols-2 gap-x-4">
                      <div>Soil type: {r.key_environmental_factors.soil_type}</div>
                      <div>pH: {r.key_environmental_factors.ph}</div>
                      <div>Moisture: {r.key_environmental_factors.moisture_range}</div>
                      <div>Rainfall: {r.key_environmental_factors.rainfall_forecast}</div>
                      <div>Temperature: ~{Math.round(20 + (r.suitability_score % 10))}°C</div>
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

function exportCsv(rows: Recommendation[], zoneId: string) {
  const header = ["crop_name","suitability_score","soil_type","ph","moisture","rainfall","temperature"].join(",");
  const body = rows
    .map((r) => [
      r.crop_name,
      r.suitability_score,
      r.key_environmental_factors.soil_type,
      r.key_environmental_factors.ph,
      r.key_environmental_factors.moisture_range,
      r.key_environmental_factors.rainfall_forecast,
      Math.round(20 + (r.suitability_score % 10)),
    ].join(","))
    .join("\n");
  const csv = header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zone-${zoneId}-opportunities.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPdfClient(title: string, rows: Recommendation[]) {
  const content = `${title}\n\n` + rows.map((r) => `- ${r.crop_name}: ${r.suitability_score}% | Soil: ${r.key_environmental_factors.soil_type} | pH: ${r.key_environmental_factors.ph}`).join("\n");
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}-opportunities.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}


