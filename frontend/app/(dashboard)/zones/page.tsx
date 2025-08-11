"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Plus, Edit, Trash2, Users, Eye, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Zone {
  id: number;
  name: string;
  region: string;
  description: string;
  technician: string;
  iotHealth: string;
  crops: string[];
  suitability: number;
  area: number;
  soilType: string;
  climate: string;
  lastUpdate: string;
}

interface Technician {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
}

const mockZones: Zone[] = [
  {
    id: 1,
    name: "Green Valley",
    region: "North",
    description: "High-altitude agricultural zone with excellent soil quality",
    technician: "John Smith",
    iotHealth: "healthy",
    crops: ["Maize", "Wheat"],
    suitability: 82,
    area: 150,
    soilType: "Loam",
    climate: "Temperate",
    lastUpdate: "2 hours ago"
  },
  {
    id: 2,
    name: "Sun Plains",
    region: "South",
    description: "Flat plains with rich alluvial soil",
    technician: "Sarah Johnson",
    iotHealth: "warning",
    crops: ["Rice"],
    suitability: 90,
    area: 200,
    soilType: "Clay",
    climate: "Tropical",
    lastUpdate: "1 hour ago"
  },
  {
    id: 3,
    name: "River Bend",
    region: "East",
    description: "Riverside agricultural area with irrigation systems",
    technician: "Mike Davis",
    iotHealth: "critical",
    crops: [],
    suitability: 0,
    area: 120,
    soilType: "Silt",
    climate: "Subtropical",
    lastUpdate: "5 hours ago"
  },
  {
    id: 4,
    name: "Mountain View",
    region: "West",
    description: "Mountainous terrain with terraced farming",
    technician: "Lisa Wilson",
    iotHealth: "healthy",
    crops: ["Corn", "Soybeans"],
    suitability: 75,
    area: 180,
    soilType: "Rocky",
    climate: "Alpine",
    lastUpdate: "30 minutes ago"
  },
];

const mockTechnicians: Technician[] = [
  { id: 1, name: "John Smith", email: "john.smith@cropai.com", phone: "+1-555-0123", status: "active" },
  { id: 2, name: "Sarah Johnson", email: "sarah.johnson@cropai.com", phone: "+1-555-0124", status: "active" },
  { id: 3, name: "Mike Davis", email: "mike.davis@cropai.com", phone: "+1-555-0125", status: "active" },
  { id: 4, name: "Lisa Wilson", email: "lisa.wilson@cropai.com", phone: "+1-555-0126", status: "active" },
  { id: 5, name: "David Brown", email: "david.brown@cropai.com", phone: "+1-555-0127", status: "inactive" },
];

export default function ZonesPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>(mockZones);
  const [technicians, setTechnicians] = useState<Technician[]>(mockTechnicians);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    region: "",
    description: "",
    technician: "",
    area: "",
    soilType: "",
    climate: ""
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "central_admin") {
      router.replace("/login");
      return;
    }
  }, [router]);

  const getHealthStatus = (health: string) => {
    switch (health) {
      case 'healthy':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'critical':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: AlertTriangle, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const getSuitabilityClass = (score: number) => {
    if (score >= 80) return "high";
    if (score >= 50) return "medium";
    return "low";
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    zone.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
    zone.technician.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddZone = () => {
    const newZone: Zone = {
      id: zones.length + 1,
      name: formData.name,
      region: formData.region,
      description: formData.description,
      technician: formData.technician,
      iotHealth: "healthy",
      crops: [],
      suitability: 0,
      area: parseFloat(formData.area),
      soilType: formData.soilType,
      climate: formData.climate,
      lastUpdate: "Just now"
    };
    setZones([...zones, newZone]);
    setIsAddDialogOpen(false);
    setFormData({ name: "", region: "", description: "", technician: "", area: "", soilType: "", climate: "" });
  };

  const handleEditZone = () => {
    if (!editingZone) return;
    const updatedZones = zones.map(zone =>
      zone.id === editingZone.id
        ? { ...zone, ...formData, area: parseFloat(formData.area) }
        : zone
    );
    setZones(updatedZones);
    setIsEditDialogOpen(false);
    setEditingZone(null);
    setFormData({ name: "", region: "", description: "", technician: "", area: "", soilType: "", climate: "" });
  };

  const handleDeleteZone = (zoneId: number) => {
    setZones(zones.filter(zone => zone.id !== zoneId));
  };

  const openEditDialog = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      region: zone.region,
      description: zone.description,
      technician: zone.technician,
      area: zone.area.toString(),
      soilType: zone.soilType,
      climate: zone.climate
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Zones Management</h1>
          <p className="text-muted-foreground mt-1">Manage agricultural zones and assign technicians</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Zone</DialogTitle>
              <DialogDescription>
                Create a new agricultural zone with its specifications and assign a technician.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Zone Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Green Valley"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="North">North</SelectItem>
                      <SelectItem value="South">South</SelectItem>
                      <SelectItem value="East">East</SelectItem>
                      <SelectItem value="West">West</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the zone characteristics..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="technician">Assigned Technician</Label>
                  <Select value={formData.technician} onValueChange={(value) => setFormData({ ...formData, technician: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.filter(t => t.status === "active").map(tech => (
                        <SelectItem key={tech.id} value={tech.name}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Area (hectares)</Label>
                  <Input
                    id="area"
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="150"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="soilType">Soil Type</Label>
                  <Select value={formData.soilType} onValueChange={(value) => setFormData({ ...formData, soilType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select soil type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Loam">Loam</SelectItem>
                      <SelectItem value="Clay">Clay</SelectItem>
                      <SelectItem value="Silt">Silt</SelectItem>
                      <SelectItem value="Sandy">Sandy</SelectItem>
                      <SelectItem value="Rocky">Rocky</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="climate">Climate</Label>
                  <Select value={formData.climate} onValueChange={(value) => setFormData({ ...formData, climate: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select climate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Temperate">Temperate</SelectItem>
                      <SelectItem value="Tropical">Tropical</SelectItem>
                      <SelectItem value="Subtropical">Subtropical</SelectItem>
                      <SelectItem value="Alpine">Alpine</SelectItem>
                      <SelectItem value="Arid">Arid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddZone}>Add Zone</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search zones by name, region, or technician..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      <Card className="enhanced-card">
        <CardContent className="p-0">
          <Table className="enhanced-table">
            <TableHeader>
              <TableRow>
                <TableHead>Zone Details</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>IoT Health</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Suitability</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredZones.map((zone) => {
                const healthStatus = getHealthStatus(zone.iotHealth);
                const HealthIcon = healthStatus.icon;
                
                return (
                  <TableRow key={zone.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{zone.name}</div>
                          <div className="text-sm text-muted-foreground">{zone.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {zone.soilType} • {zone.climate}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="zone-badge">{zone.region}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm">{zone.technician}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${healthStatus.bg} flex items-center justify-center`}>
                          <HealthIcon className={`w-4 h-4 ${healthStatus.color}`} />
                        </div>
                        <span className="capitalize text-sm">{zone.iotHealth}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{zone.area} ha</span>
                    </TableCell>
                    <TableCell>
                      <span className={`suitability-score ${getSuitabilityClass(zone.suitability)}`}>
                        {zone.suitability}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(zone)} className="gap-2">
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteZone(zone.id)}
                          className="gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Zone</DialogTitle>
            <DialogDescription>
              Update zone information and technician assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Zone Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-region">Region</Label>
                <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-technician">Assigned Technician</Label>
                <Select value={formData.technician} onValueChange={(value) => setFormData({ ...formData, technician: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.filter(t => t.status === "active").map(tech => (
                      <SelectItem key={tech.id} value={tech.name}>{tech.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-area">Area (hectares)</Label>
                <Input
                  id="edit-area"
                  type="number"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-soilType">Soil Type</Label>
                <Select value={formData.soilType} onValueChange={(value) => setFormData({ ...formData, soilType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Loam">Loam</SelectItem>
                    <SelectItem value="Clay">Clay</SelectItem>
                    <SelectItem value="Silt">Silt</SelectItem>
                    <SelectItem value="Sandy">Sandy</SelectItem>
                    <SelectItem value="Rocky">Rocky</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-climate">Climate</Label>
                <Select value={formData.climate} onValueChange={(value) => setFormData({ ...formData, climate: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Temperate">Temperate</SelectItem>
                    <SelectItem value="Tropical">Tropical</SelectItem>
                    <SelectItem value="Subtropical">Subtropical</SelectItem>
                    <SelectItem value="Alpine">Alpine</SelectItem>
                    <SelectItem value="Arid">Arid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditZone}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 