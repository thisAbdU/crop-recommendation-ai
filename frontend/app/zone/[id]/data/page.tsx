"use client"
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSensorDataByZone, getZoneById } from "@/lib/api";
import { SensorDataPoint } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker, DateRange } from "@/components/date-range-picker";
import { Button } from "@/components/ui/button";

function toCsv(rows: SensorDataPoint[]) {
  const header = ["read_from_iot_at","soil_moisture","ph","temperature","phosphorus","potassium","humidity","nitrogen","rainfall"].join(",");
  const body = rows
    .map((r) => [r.read_from_iot_at, r.soil_moisture, r.ph, r.temperature, r.phosphorus, r.potassium, r.humidity, r.nitrogen, r.rainfall].join(","))
    .join("\n");
  return header + "\n" + body;
}

export default function ZoneDataPage() {
  const params = useParams<{ id: string }>();
  const zoneId = params?.id as string;
  const [zoneName, setZoneName] = useState<string>("");
  const [rows, setRows] = useState<SensorDataPoint[]>([]);
  const [range, setRange] = useState<DateRange>({});

  useEffect(() => {
    async function load() {
      const zone = await getZoneById(zoneId);
      setZoneName(zone?.name ?? "");
      const data = await getSensorDataByZone(zoneId, range.from, range.to);
      setRows(data);
    }
    if (zoneId) load();
  }, [zoneId, range]);

  function handleExportCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zone-${zoneId}-sensor-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sensor data · {zoneName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 mb-4">
            <DateRangePicker value={range} onChange={setRange} />
            <Button variant="outline" onClick={handleExportCsv}>Export CSV</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>read_from_iot_at</TableHead>
                  <TableHead>soil_moisture</TableHead>
                  <TableHead>ph</TableHead>
                  <TableHead>temperature</TableHead>
                  <TableHead>phosphorus</TableHead>
                  <TableHead>potassium</TableHead>
                  <TableHead>humidity</TableHead>
                  <TableHead>nitrogen</TableHead>
                  <TableHead>rainfall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.read_from_iot_at).toLocaleString()}</TableCell>
                    <TableCell>{r.soil_moisture}</TableCell>
                    <TableCell>{r.ph}</TableCell>
                    <TableCell>{r.temperature}</TableCell>
                    <TableCell>{r.phosphorus}</TableCell>
                    <TableCell>{r.potassium}</TableCell>
                    <TableCell>{r.humidity}</TableCell>
                    <TableCell>{r.nitrogen}</TableCell>
                    <TableCell>{r.rainfall}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


