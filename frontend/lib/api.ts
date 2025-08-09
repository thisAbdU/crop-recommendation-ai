import { mockRecommendations, mockSensorData, mockTechnicians, mockUsers, mockZones } from "./mockData";
import { Recommendation, Role, SensorDataPoint, Technician, User, Zone } from "./types";

export async function loginWithJwtMock(email: string, _password: string): Promise<{ token: string; user: User } | null> {
  const user = mockUsers.find((u) => u.email === email);
  if (!user) return null;
  return { token: `mock-token-${user.id}`, user };
}

export async function getZones(): Promise<Zone[]> {
  return mockZones;
}

export async function getZoneById(id: string): Promise<Zone | undefined> {
  return mockZones.find((z) => z.id === id);
}

export async function getRecommendationsByZone(zoneId: string): Promise<Recommendation[]> {
  return mockRecommendations.filter((r) => r.zoneId === zoneId);
}

export async function getApprovedRecommendationsByZone(zoneId: string): Promise<Recommendation[]> {
  return mockRecommendations.filter((r) => r.zoneId === zoneId && r.status === "approved");
}

export async function getRecommendationById(id: string): Promise<Recommendation | undefined> {
  return mockRecommendations.find((r) => r.id === id);
}

export async function getSensorDataByZone(zoneId: string, from?: string, to?: string): Promise<SensorDataPoint[]> {
  let data = mockSensorData.filter((d) => d.zoneId === zoneId);
  if (from) {
    const fromTime = new Date(from).getTime();
    data = data.filter((d) => new Date(d.read_from_iot_at).getTime() >= fromTime);
  }
  if (to) {
    const toTime = new Date(to).getTime();
    data = data.filter((d) => new Date(d.read_from_iot_at).getTime() <= toTime);
  }
  return data;
}

export async function updateRecommendationStatus(id: string, status: "approved" | "declined"): Promise<Recommendation | null> {
  const rec = mockRecommendations.find((r) => r.id === id);
  if (!rec) return null;
  rec.status = status;
  return rec;
}

export async function regenerateRecommendation(id: string): Promise<Recommendation | null> {
  const rec = mockRecommendations.find((r) => r.id === id);
  if (!rec) return null;
  rec.suitability_score = Math.min(100, Math.max(50, Math.round(rec.suitability_score + (Math.random() * 10 - 5))));
  rec.rationale = `Regenerated rationale at ${new Date().toISOString()}.`;
  rec.status = "pending";
  return rec;
}

export async function getTechnicians(): Promise<Technician[]> {
  return mockTechnicians;
}

export async function assignTechnicianToZone(technicianId: string, zoneId: string): Promise<Technician | null> {
  const tech = mockTechnicians.find((t) => t.id === technicianId);
  if (!tech) return null;
  if (!tech.assignedZoneIds.includes(zoneId)) tech.assignedZoneIds.push(zoneId);
  return tech;
}

export async function getDashboardDataForRole(role: Role, user?: User) {
  if (role === "investor") {
    return Promise.all(
      mockZones.map(async (zone) => {
        const recs = mockRecommendations
          .filter((r) => r.zoneId === zone.id)
          .sort((a, b) => b.suitability_score - a.suitability_score);

        const data = mockSensorData.filter((d) => d.zoneId === zone.id);
        const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
        const avgPh = Number(avg(data.map((d) => d.ph)).toFixed(2));
        const avgMoisture = Number(avg(data.map((d) => d.soil_moisture)).toFixed(2));
        const avgTemp = Number(avg(data.map((d) => d.temperature)).toFixed(2));
        const lastSensorUpdate = data.length ? new Date(Math.max(...data.map((d) => new Date(d.read_from_iot_at).getTime()))).toISOString() : "";
        const topSoilType = recs[0]?.key_environmental_factors.soil_type ?? "Unknown";
        const bestScore = recs[0]?.suitability_score ?? 0;
        const location = zone.region;

        return {
          zone,
          topRecommendations: recs.slice(0, 3),
          metrics: { avgPh, avgMoisture, avgTemp },
          lastSensorUpdate,
          topSoilType,
          bestScore,
          location,
        };
      })
    );
  }

  if (role === "zone_admin" && user?.zoneId) {
    const recs = mockRecommendations.filter((r) => r.zoneId === user.zoneId);
    return recs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (role === "central_admin") {
    return {
      zones: mockZones,
      technicians: mockTechnicians,
      iotHealth: mockZones.map((z) => ({ zoneId: z.id, status: Math.random() > 0.2 ? "online" : "degraded" })),
    };
  }

  return null;
}


