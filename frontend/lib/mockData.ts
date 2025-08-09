import { Recommendation, SensorDataPoint, Technician, User, Zone, Farmer, Device } from "./types";

export const mockUsers: User[] = [
  { id: "u1", name: "Ivy Investor", email: "ivy@example.com", role: "investor" },
  { id: "u2", name: "Zane Admin", email: "zane@example.com", role: "zone_admin", zoneId: "z1" },
  { id: "u3", name: "Cora Central", email: "cora@example.com", role: "central_admin" },
];

export const mockZones: Zone[] = [
  { id: "z1", name: "Green Valley", region: "North" },
  { id: "z2", name: "Sun Plains", region: "East" },
  { id: "z3", name: "River Bend", region: "West" },
];

export const mockTechnicians: Technician[] = [
  { id: "t1", name: "Tech One", assignedZoneIds: ["z1"] },
  { id: "t2", name: "Tech Two", assignedZoneIds: ["z2", "z3"] },
];

export const mockFarmers: Farmer[] = [
  { id: "f1", name: "Alice Mwangi", phone: "+254700111222", language: "English", zoneId: "z1" },
  { id: "f2", name: "Babu Singh", phone: "+919811223344", language: "Hindi", zoneId: "z1" },
  { id: "f3", name: "Chidi Okeke", phone: "+2348012345678", language: "Igbo", zoneId: "z2" },
  { id: "f4", name: "Diana Mensah", phone: "+233201234567", language: "Twi", zoneId: "z3" },
];

export const mockDevices: Device[] = [
  { id: "d1", zoneId: "z1", status: "online" },
  { id: "d2", zoneId: "z1", status: "offline" },
  { id: "d3", zoneId: "z2", status: "online" },
  { id: "d4", zoneId: "z3", status: "online" },
];

const now = Date.now();
function daysAgo(n: number) {
  return new Date(now - n * 24 * 60 * 60 * 1000).toISOString();
}

export const mockSensorData: SensorDataPoint[] = Array.from({ length: 60 }).flatMap((_, idx) => {
  const zoneId = idx % 3 === 0 ? "z1" : idx % 3 === 1 ? "z2" : "z3";
  const ph = 5.5 + (idx % 10) * 0.1;
  const moisture = 30 + (idx % 20);
  return {
    id: `s${idx + 1}`,
    zoneId,
    read_from_iot_at: daysAgo(idx),
    soil_moisture: moisture,
    ph,
    temperature: 18 + (idx % 10),
    phosphorus: 20 + (idx % 15),
    potassium: 30 + (idx % 10),
    humidity: 50 + (idx % 30),
    nitrogen: 10 + (idx % 20),
    rainfall: (idx % 5) * 2,
  };
});

export const mockRecommendations: Recommendation[] = [
  {
    id: "r1",
    zoneId: "z1",
    crop_name: "Maize",
    suitability_score: 82,
    key_environmental_factors: {
      soil_type: "Loam",
      ph: 6.5,
      moisture_range: "30-45%",
      rainfall_forecast: "Moderate (50-80mm)"
    },
    rationale: "Maize thrives with current moisture and near-neutral pH.",
    status: "approved",
    createdAt: daysAgo(7),
  },
  {
    id: "r2",
    zoneId: "z1",
    crop_name: "Wheat",
    suitability_score: 76,
    key_environmental_factors: {
      soil_type: "Sandy Loam",
      ph: 6.2,
      moisture_range: "25-35%",
      rainfall_forecast: "Low (20-40mm)"
    },
    rationale: "Wheat tolerance aligns with forecasted dry spell.",
    status: "pending",
    createdAt: daysAgo(3),
  },
  {
    id: "r3",
    zoneId: "z2",
    crop_name: "Rice",
    suitability_score: 90,
    key_environmental_factors: {
      soil_type: "Clay",
      ph: 6.8,
      moisture_range: "60-80%",
      rainfall_forecast: "High (120-180mm)"
    },
    rationale: "High rainfall and clay soil support rice cultivation.",
    status: "pending",
    createdAt: daysAgo(1),
  },
];



