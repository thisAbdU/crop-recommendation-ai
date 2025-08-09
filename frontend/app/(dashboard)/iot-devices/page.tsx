"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Wifi, Plus, Edit, Trash2, Users, Eye, AlertTriangle, CheckCircle, XCircle, RefreshCw, Signal } from "lucide-react";

interface IoTDevice {
  id: number;
  name: string;
  serial: string;
  type: string;
  zone: string;
  technician: string;
  health: string;
  lastUpdate: string;
  battery: number;
  signal: number;
  firmware: string;
  location: string;
}

interface Technician {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
}

const mockIoTDevices: IoTDevice[] = [
  {
    id: 1,
    name: "Soil Sensor 001",
    serial: "SS-2024-001",
    type: "Soil Moisture",
    zone: "Green Valley",
    technician: "John Smith",
    health: "healthy",
    lastUpdate: "2 hours ago",
    battery: 85,
    signal: 92,
    firmware: "v2.1.4",
    location: "Field A1"
  },
  {
    id: 2,
    name: "Weather Station 001",
    serial: "WS-2024-001",
    type: "Weather",
    zone: "Sun Plains",
    technician: "Sarah Johnson",
    health: "warning",
    lastUpdate: "1 hour ago",
    battery: 45,
    signal: 78,
    firmware: "v1.9.2",
    location: "Field B3"
  },
  {
    id: 3,
    name: "Moisture Sensor 001",
    serial: "MS-2024-001",
    type: "Soil Moisture",
    zone: "River Bend",
    technician: "Mike Davis",
    health: "critical",
    lastUpdate: "5 hours ago",
    battery: 12,
    signal: 35,
    firmware: "v2.0.1",
    location: "Field C2"
  },
  {
    id: 4,
    name: "Temperature Sensor 001",
    serial: "TS-2024-001",
    type: "Temperature",
    zone: "Mountain View",
    technician: "Lisa Wilson",
    health: "healthy",
    lastUpdate: "30 minutes ago",
    battery: 92,
    signal: 95,
    firmware: "v2.2.0",
    location: "Field D1"
  },
  {
    id: 5,
    name: "pH Sensor 001",
    serial: "PH-2024-001",
    type: "pH Level",
    zone: "Green Valley",
    technician: "John Smith",
    health: "healthy",
    lastUpdate: "3 hours ago",
    battery: 78,
    signal: 88,
    firmware: "v1.8.5",
    location: "Field A2"
  },
];

const mockTechnicians: Technician[] = [
  { id: 1, name: "John Smith", email: "john.smith@cropai.com", phone: "+1-555-0123", status: "active" },
  { id: 2, name: "Sarah Johnson", email: "sarah.johnson@cropai.com", phone: "+1-555-0124", status: "active" },
  { id: 3, name: "Mike Davis", email: "mike.davis@cropai.com", phone: "+1-555-0125", status: "active" },
  { id: 4, name: "Lisa Wilson", email: "lisa.wilson@cropai.com", phone: "+1-555-0126", status: "active" },
];

const deviceTypes = [
  "Soil Moisture",
  "Temperature",
  "Weather",
  "pH Level",
  "Humidity",
  "Light Sensor",
  "Rain Gauge",
  "Wind Speed"
];

export default function IoTDevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<IoTDevice[]>(mockIoTDevices);
  const [technicians, setTechnicians] = useState<Technician[]>(mockTechnicians);
  const [searchTerm, setSearchTerm] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<IoTDevice | null>(null);
  const [assigningDevice, setAssigningDevice] = useState<IoTDevice | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    serial: "",
    type: "",
    zone: "",
    technician: "",
    location: ""
  });

  useEffect(() => {
    const auth = loadAuth();
    if (!auth || auth.user.role !== "central_admin") {
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

  const getBatteryStatus = (battery: number) => {
    if (battery >= 80) return "text-green-600";
    if (battery >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getSignalStatus = (signal: number) => {
    if (signal >= 80) return "text-green-600";
    if (signal >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.technician.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesHealth = healthFilter === "all" || device.health === healthFilter;
    
    return matchesSearch && matchesHealth;
  });

  const handleAddDevice = () => {
    const newDevice: IoTDevice = {
      id: devices.length + 1,
      name: formData.name,
      serial: formData.serial,
      type: formData.type,
      zone: formData.zone,
      technician: formData.technician,
      health: "healthy",
      lastUpdate: "Just now",
      battery: 100,
      signal: 95,
      firmware: "v1.0.0",
      location: formData.location
    };
    setDevices([...devices, newDevice]);
    setIsAddDialogOpen(false);
    setFormData({ name: "", serial: "", type: "", zone: "", technician: "", location: "" });
  };

  const handleEditDevice = () => {
    if (!editingDevice) return;
    const updatedDevices = devices.map(device =>
      device.id === editingDevice.id
        ? { ...device, ...formData }
        : device
    );
    setDevices(updatedDevices);
    setIsEditDialogOpen(false);
    setEditingDevice(null);
    setFormData({ name: "", serial: "", type: "", zone: "", technician: "", location: "" });
  };

  const handleAssignTechnician = () => {
    if (!assigningDevice || !formData.technician) return;
    const updatedDevices = devices.map(device =>
      device.id === assigningDevice.id
        ? { ...device, technician: formData.technician }
        : device
    );
    setDevices(updatedDevices);
    setIsAssignDialogOpen(false);
    setAssigningDevice(null);
    setFormData({ name: "", serial: "", type: "", zone: "", technician: "", location: "" });
  };

  const handleDeleteDevice = (deviceId: number) => {
    setDevices(devices.filter(device => device.id !== deviceId));
  };

  const openEditDialog = (device: IoTDevice) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      serial: device.serial,
      type: device.type,
      zone: device.zone,
      technician: device.technician,
      location: device.location
    });
    setIsEditDialogOpen(true);
  };

  const openAssignDialog = (device: IoTDevice) => {
    setAssigningDevice(device);
    setFormData({ ...formData, technician: device.technician });
    setIsAssignDialogOpen(true);
  };

  const refreshDevice = (deviceId: number) => {
    // Simulate device refresh
    const updatedDevices = devices.map(device =>
      device.id === deviceId
        ? { ...device, lastUpdate: "Just now", battery: Math.min(100, device.battery + 5) }
        : device
    );
    setDevices(updatedDevices);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">IoT Devices Management</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage IoT devices across all zones</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New IoT Device</DialogTitle>
              <DialogDescription>
                Register a new IoT device and assign it to a zone and technician.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Device Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Soil Sensor 001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input
                    id="serial"
                    value={formData.serial}
                    onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                    placeholder="e.g., SS-2024-001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Device Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone">Zone</Label>
                  <Select value={formData.zone} onValueChange={(value) => setFormData({ ...formData, zone: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Green Valley">Green Valley</SelectItem>
                      <SelectItem value="Sun Plains">Sun Plains</SelectItem>
                      <SelectItem value="River Bend">River Bend</SelectItem>
                      <SelectItem value="Mountain View">Mountain View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Field A1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDevice}>Add Device</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search devices by name, serial, zone, or technician..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health Status</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="enhanced-card">
        <CardContent className="p-0">
          <Table className="enhanced-table">
            <TableHeader>
              <TableRow>
                <TableHead>Device Details</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Health Status</TableHead>
                <TableHead>Battery & Signal</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => {
                const healthStatus = getHealthStatus(device.health);
                const HealthIcon = healthStatus.icon;
                
                return (
                  <TableRow key={device.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                          <Wifi className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{device.name}</div>
                          <div className="text-sm text-muted-foreground">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{device.serial}</code>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {device.type} • {device.location}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="zone-badge">{device.zone}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-sm">{device.technician}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${healthStatus.bg} flex items-center justify-center`}>
                          <HealthIcon className={`w-4 h-4 ${healthStatus.color}`} />
                        </div>
                        <span className="capitalize text-sm">{device.health}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span>🔋</span>
                          <span className={getBatteryStatus(device.battery)}>{device.battery}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Signal className="w-3 h-3" />
                          <span className={getSignalStatus(device.signal)}>{device.signal}%</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{device.lastUpdate}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => refreshDevice(device.id)}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Refresh
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openAssignDialog(device)}
                          className="gap-2"
                        >
                          <Users className="w-4 h-4" />
                          Assign
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openEditDialog(device)}
                          className="gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteDevice(device.id)}
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
            <DialogTitle>Edit IoT Device</DialogTitle>
            <DialogDescription>
              Update device information and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Device Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-serial">Serial Number</Label>
                <Input
                  id="edit-serial"
                  value={formData.serial}
                  onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Device Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zone">Zone</Label>
                <Select value={formData.zone} onValueChange={(value) => setFormData({ ...formData, zone: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Green Valley">Green Valley</SelectItem>
                    <SelectItem value="Sun Plains">Sun Plains</SelectItem>
                    <SelectItem value="River Bend">River Bend</SelectItem>
                    <SelectItem value="Mountain View">Mountain View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDevice}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Technician Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
            <DialogDescription>
              Assign a technician to manage this IoT device.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Device</Label>
              <p className="text-sm text-muted-foreground">{assigningDevice?.name} ({assigningDevice?.serial})</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-technician">Select Technician</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTechnician}>Assign Technician</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 