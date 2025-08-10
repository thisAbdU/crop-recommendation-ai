import {
  mockRecommendations,
  mockSensorData,
  mockTechnicians,
  mockUsers,
  mockZones,
  mockFarmers,
  mockDevices,
} from "./mockData";
import {
  Recommendation,
  Role,
  SensorDataPoint,
  Technician,
  User,
  Zone,
  Farmer,
} from "./types";
import { getCurrentUser, hasRouteAccess } from "./auth";

// Helper function to get auth headers from cookies
function getAuthHeaders(): HeadersInit {
  // In a real implementation, this would be handled by the server-side
  // For now, we'll keep the localStorage approach but add a note
  const auth = localStorage.getItem("auth_state");
  if (!auth) throw new Error("Not authenticated");

  const { token } = JSON.parse(auth);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Helper function to check if user has access to a specific resource
function checkResourceAccess(
  requiredRole: Role,
  resourceZoneId?: string
): boolean {
  const user = getCurrentUser();
  if (!user || user.role !== requiredRole) return false;

  // For zone_admin, check if they can access the specific zone
  if (
    user.role === "zone_admin" &&
    resourceZoneId &&
    user.zoneId !== resourceZoneId
  ) {
    return false;
  }

  return true;
}

// Generate a mock JWT token with expiration
function generateMockJWT(user: User): string {
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + 24 * 60 * 60; // 24 hours from now

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    zoneId: user.zoneId,
    iat: now,
    exp: expiration,
  };

  // In production, this would be signed with a secret key
  // For demo purposes, we'll create a mock JWT structure
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const signature = btoa(`mock-signature-${user.id}-${expiration}`);

  return `${header}.${payloadEncoded}.${signature}`;
}

// Set HttpOnly cookie for JWT token
function setAuthCookie(token: string, user: User) {
  // In production, this should be handled server-side
  // For now, we'll use localStorage but add a note about HttpOnly cookies
  const authData = { token, user, timestamp: Date.now() };
  localStorage.setItem("auth_state", JSON.stringify(authData));

  // TODO: In production, implement HttpOnly cookie setting:
  // document.cookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`;
}

export async function loginWithJwtMock(
  email: string,
  _password: string
): Promise<{ token: string; user: User } | null> {
  const user = mockUsers.find((u) => u.email === email);
  if (!user) return null;
  console.log("user", user);

  // Generate a proper JWT token with expiration
  const token = generateMockJWT(user);

  // Set the auth cookie/token
  setAuthCookie(token, user);

  return { token, user };
}

export async function getZones(): Promise<Zone[]> {
  // Only central_admin can access all zones
  if (!checkResourceAccess("central_admin")) {
    throw new Error("Access denied: Insufficient permissions");
  }

  try {
    getAuthHeaders(); // Verify authentication
    return mockZones;
  } catch (error) {
    throw new Error("Authentication required");
  }
}

export async function getZoneById(id: string): Promise<Zone | undefined> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  const zone = mockZones.find((z) => z.id === id);
  if (!zone) return undefined;

  // zone_admin can only access their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== zone.id) {
    throw new Error("Access denied: Zone not assigned to user");
  }

  return zone;
}

export async function getRecommendationsByZone(
  zoneId: string
): Promise<Recommendation[]> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // zone_admin can only access their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== zoneId) {
    throw new Error("Access denied: Zone not assigned to user");
  }

  return mockRecommendations
    .filter((r) => r.zoneId === zoneId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function getApprovedRecommendationsByZone(
  zoneId: string
): Promise<Recommendation[]> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // zone_admin can only access their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== zoneId) {
    throw new Error("Access denied: Zone not assigned to user");
  }

  return mockRecommendations.filter(
    (r) => r.zoneId === zoneId && r.status === "approved"
  );
}

export async function getRecommendationById(
  id: string
): Promise<Recommendation | undefined> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  const recommendation = mockRecommendations.find((r) => r.id === id);
  if (!recommendation) return undefined;

  // zone_admin can only access recommendations from their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== recommendation.zoneId) {
    throw new Error("Access denied: Recommendation not from assigned zone");
  }

  return recommendation;
}

export async function getSensorDataByZone(
  zoneId: string,
  from?: string,
  to?: string
): Promise<SensorDataPoint[]> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // zone_admin can only access data from their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== zoneId) {
    throw new Error("Access denied: Zone not assigned to user");
  }

  let data = mockSensorData.filter((d) => d.zoneId === zoneId);
  if (from) {
    const fromTime = new Date(from).getTime();
    data = data.filter(
      (d) => new Date(d.read_from_iot_at).getTime() >= fromTime
    );
  }
  if (to) {
    const toTime = new Date(to).getTime();
    data = data.filter((d) => new Date(d.read_from_iot_at).getTime() <= toTime);
  }
  return data;
}

export async function updateRecommendationStatus(
  id: string,
  status: "approved" | "declined"
): Promise<Recommendation | null> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // Only zone_admin and central_admin can update recommendation status
  if (!["zone_admin", "central_admin"].includes(user.role)) {
    throw new Error("Access denied: Insufficient permissions");
  }

  const recommendation = mockRecommendations.find((r) => r.id === id);
  if (!recommendation) return null;

  // zone_admin can only update recommendations from their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== recommendation.zoneId) {
    throw new Error("Access denied: Recommendation not from assigned zone");
  }

  const idx = mockRecommendations.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  mockRecommendations[idx] = { ...mockRecommendations[idx], status };
  return mockRecommendations[idx];
}

export async function regenerateRecommendation(
  id: string
): Promise<Recommendation | null> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // Only zone_admin and central_admin can regenerate recommendations
  if (!["zone_admin", "central_admin"].includes(user.role)) {
    throw new Error("Access denied: Insufficient permissions");
  }

  const recommendation = mockRecommendations.find((r) => r.id === id);
  if (!recommendation) return null;

  // zone_admin can only regenerate recommendations from their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== recommendation.zoneId) {
    throw new Error("Access denied: Recommendation not from assigned zone");
  }

  const rec = mockRecommendations.find((r) => r.id === id);
  if (!rec) return null;
  rec.suitability_score = Math.min(
    100,
    Math.max(50, Math.round(rec.suitability_score + (Math.random() * 10 - 5)))
  );
  rec.rationale = `Regenerated rationale at ${new Date().toISOString()}.`;
  rec.status = "pending";
  return rec;
}

export async function getTechnicians(): Promise<Technician[]> {
  // Only central_admin can access technician data
  if (!checkResourceAccess("central_admin")) {
    throw new Error("Access denied: Insufficient permissions");
  }

  try {
    getAuthHeaders(); // Verify authentication
    return mockTechnicians;
  } catch (error) {
    throw new Error("Authentication required");
  }
}

export async function assignTechnicianToZone(
  technicianId: string,
  zoneId: string
): Promise<Technician | null> {
  // Only central_admin can assign technicians
  if (!checkResourceAccess("central_admin")) {
    throw new Error("Access denied: Insufficient permissions");
  }

  try {
    getAuthHeaders(); // Verify authentication
    const tech = mockTechnicians.find((t) => t.id === technicianId);
    if (!tech) return null;
    if (!tech.assignedZoneIds.includes(zoneId))
      tech.assignedZoneIds.push(zoneId);
    return tech;
  } catch (error) {
    throw new Error("Authentication required");
  }
}

export async function getDashboardDataForRole(role: Role, user?: User) {
  const currentUser = user || getCurrentUser();
  if (!currentUser) throw new Error("Authentication required");

  // Verify the user can access data for the requested role
  if (currentUser.role !== role) {
    throw new Error("Access denied: Role mismatch");
  }

  if (role === "investor") {
    return Promise.all(
      mockZones.map(async (zone) => {
        const recs = mockRecommendations
          .filter((r) => r.zoneId === zone.id)
          .sort((a, b) => b.suitability_score - a.suitability_score);

        const data = mockSensorData.filter((d) => d.zoneId === zone.id);
        const avg = (arr: number[]) =>
          arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const avgPh = Number(avg(data.map((d) => d.ph)).toFixed(2));
        const avgMoisture = Number(
          avg(data.map((d) => d.soil_moisture)).toFixed(2)
        );
        const avgTemp = Number(avg(data.map((d) => d.temperature)).toFixed(2));
        const lastSensorUpdate = data.length
          ? new Date(
              Math.max(
                ...data.map((d) => new Date(d.read_from_iot_at).getTime())
              )
            ).toISOString()
          : "";
        const topSoilType =
          recs[0]?.key_environmental_factors.soil_type ?? "Unknown";
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

  if (role === "zone_admin") {
    if (!currentUser.zoneId)
      throw new Error("Zone admin must have assigned zone");

    const zone = mockZones.find((z) => z.id === currentUser.zoneId);
    if (!zone) throw new Error("Assigned zone not found");

    const farmers = mockFarmers.filter((f) => f.zoneId === currentUser.zoneId);
    const devices = mockDevices.filter((d) => d.zoneId === currentUser.zoneId);
    const recommendations = mockRecommendations
      .filter((r) => r.zoneId === currentUser.zoneId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const activeDevices = devices.filter((d) => d.status === "online").length;
    const latestRecommendation = recommendations[0];

    return {
      stats: {
        totalFarmers: farmers.length,
        activeDevices,
        latestRecommendationStatus: latestRecommendation?.status || "none",
      },
      recentRecommendations: recommendations.slice(0, 5),
      zone,
    };
  }

  if (role === "central_admin") {
    const totalZones = mockZones.length;
    const totalDevices = mockDevices.length;
    const totalUsers = mockUsers.length;
    const pendingRecommendations = mockRecommendations.filter(
      (r) => r.status === "pending"
    ).length;

    return {
      stats: {
        totalZones,
        totalDevices,
        totalUsers,
        pendingRecommendations,
      },
      recentRecommendations: mockRecommendations
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    };
  }

  throw new Error("Invalid role");
}

export async function getFarmersByZone(zoneId: string): Promise<Farmer[]> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // zone_admin can only access farmers from their assigned zone
  if (user.role === "zone_admin" && user.zoneId !== zoneId) {
    throw new Error("Access denied: Zone not assigned to user");
  }

  return mockFarmers.filter((f) => f.zoneId === zoneId);
}

export async function createFarmer(
  farmer: Omit<Farmer, "id">
): Promise<Farmer> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // Only zone_admin can create farmers
  if (user.role !== "zone_admin") {
    throw new Error("Access denied: Insufficient permissions");
  }

  // zone_admin can only create farmers in their assigned zone
  if (user.zoneId !== farmer.zoneId) {
    throw new Error("Access denied: Cannot create farmer in different zone");
  }

  const newFarmer: Farmer = {
    ...farmer,
    id: `farmer-${Date.now()}`,
  };
  mockFarmers.push(newFarmer);
  return newFarmer;
}

export async function updateFarmer(
  id: string,
  updates: Partial<Omit<Farmer, "id">>
): Promise<Farmer | null> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // Only zone_admin can update farmers
  if (user.role !== "zone_admin") {
    throw new Error("Access denied: Insufficient permissions");
  }

  const farmer = mockFarmers.find((f) => f.id === id);
  if (!farmer) return null;

  // zone_admin can only update farmers in their assigned zone
  if (user.zoneId !== farmer.zoneId) {
    throw new Error("Access denied: Cannot update farmer in different zone");
  }

  const idx = mockFarmers.findIndex((f) => f.id === id);
  if (idx === -1) return null;

  mockFarmers[idx] = { ...mockFarmers[idx], ...updates };
  return mockFarmers[idx];
}

export async function deleteFarmer(id: string): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // Only zone_admin can delete farmers
  if (user.role !== "zone_admin") {
    throw new Error("Access denied: Insufficient permissions");
  }

  const farmer = mockFarmers.find((f) => f.id === id);
  if (!farmer) return false;

  // zone_admin can only delete farmers in their assigned zone
  if (user.zoneId !== farmer.zoneId) {
    throw new Error("Access denied: Cannot delete farmer in different zone");
  }

  const idx = mockFarmers.findIndex((f) => f.id === id);
  if (idx === -1) return false;

  mockFarmers.splice(idx, 1);
  return true;
}

// New API functions for central admin
export async function getAllRecommendations(): Promise<Recommendation[]> {
  if (!checkResourceAccess("central_admin")) {
    throw new Error("Access denied: Insufficient permissions");
  }

  try {
    getAuthHeaders();
    return mockRecommendations.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    throw new Error("Authentication required");
  }
}

export async function getAllDevices(): Promise<any[]> {
  if (!checkResourceAccess("central_admin")) {
    throw new Error("Access denied: Insufficient permissions");
  }

  try {
    getAuthHeaders();
    return mockDevices;
  } catch (error) {
    throw new Error("Authentication required");
  }
}

export async function getAllUsers(): Promise<User[]> {
  if (!checkResourceAccess("central_admin")) {
    throw new Error("Access denied: Insufficient permissions");
  }

  try {
    getAuthHeaders();
    return mockUsers;
  } catch (error) {
    throw new Error("Authentication required");
  }
}
