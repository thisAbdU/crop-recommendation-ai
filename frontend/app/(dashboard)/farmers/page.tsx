"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFarmersByZone, createFarmer, updateFarmer, deleteFarmer } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { Farmer } from "@/lib/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Plus, Search, Edit, Trash2, User } from "lucide-react";

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Partial<Farmer> | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "zone_admin") return;
    
    setUser(currentUser);
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    if (!user?.zoneId) return;
    
    try {
      const data = await getFarmersByZone(user.zoneId);
      setFarmers(data);
    } catch (error) {
      console.error("Failed to load farmers:", error);
    }
  };

  const filteredFarmers = farmers.filter((farmer) =>
    farmer.name.toLowerCase().includes(search.toLowerCase()) ||
    farmer.phone.includes(search) ||
    farmer.language.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.zoneId) return;

    try {
      if (editingFarmer?.id) {
        // Update existing farmer
        await updateFarmer(editingFarmer.id, editingFarmer);
      } else {
        // Create new farmer
        await createFarmer({
          ...editingFarmer!,
          zoneId: user.zoneId,
        } as Omit<Farmer, "id">);
      }
      
      setModal(false);
      setEditingFarmer(null);
      loadFarmers();
    } catch (error) {
      console.error("Failed to save farmer:", error);
    }
  };

  const handleEdit = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this farmer?")) return;
    
    try {
      await deleteFarmer(id);
      loadFarmers();
    } catch (error) {
      console.error("Failed to delete farmer:", error);
    }
  };

  const openCreateModal = () => {
    setEditingFarmer({
      name: "",
      phone: "",
      language: "English",
      zoneId: user?.zoneId || "",
    });
    setModal(true);
  };

  return (
    <RouteGuard requiredRole="zone_admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Farmers Management</h1>
            <p className="text-muted-foreground">
              Manage farmers in your assigned zone
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Farmer
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search farmers by name, phone, or language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Farmers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Farmers</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? 's' : ''} found
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFarmers.map((farmer) => (
                    <TableRow key={farmer.id}>
                      <TableCell className="font-medium">{farmer.name}</TableCell>
                      <TableCell>{farmer.phone}</TableCell>
                      <TableCell>{farmer.language}</TableCell>
                      <TableCell>{farmer.zoneId}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(farmer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(farmer.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Modal */}
        <Dialog open={modal} onOpenChange={setModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFarmer?.id ? "Edit Farmer" : "Add New Farmer"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingFarmer?.name || ""}
                  onChange={(e) => setEditingFarmer({ ...editingFarmer, name: e.target.value })}
                  placeholder="Farmer's full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={editingFarmer?.phone || ""}
                  onChange={(e) => setEditingFarmer({ ...editingFarmer, phone: e.target.value })}
                  placeholder="Phone number"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <Select
                  value={editingFarmer?.language || "English"}
                  onValueChange={(value) => setEditingFarmer({ ...editingFarmer, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Chinese">Chinese</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModal(false);
                    setEditingFarmer(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingFarmer?.id ? "Update" : "Create"} Farmer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}


