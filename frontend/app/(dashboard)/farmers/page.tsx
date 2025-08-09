"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth } from "@/lib/auth";
import { createFarmer, deleteFarmer, getFarmersByZone, updateFarmer } from "@/lib/api";
import { Farmer, User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type FormState = {
  id?: string;
  name: string;
  phone: string;
  language: string;
};

export default function FarmersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", phone: "", language: "" });

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setUser(auth.user);
  }, [router]);

  async function refresh() {
    if (!user?.zoneId) return;
    const res = await getFarmersByZone(user.zoneId);
    setFarmers(res);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return farmers.filter((f) =>
      [f.name, f.phone, f.language].some((v) => v.toLowerCase().includes(q))
    );
  }, [farmers, search]);

  function openCreate() {
    setForm({ name: "", phone: "", language: "" });
    setOpen(true);
  }

  function openEdit(f: Farmer) {
    setForm({ id: f.id, name: f.name, phone: f.phone, language: f.language });
    setOpen(true);
  }

  async function save() {
    if (!user?.zoneId) return;
    if (!form.name.trim()) return;
    if (form.id) {
      await updateFarmer(form.id, { name: form.name, phone: form.phone, language: form.language });
    } else {
      await createFarmer({ name: form.name, phone: form.phone, language: form.language, zoneId: user.zoneId });
    }
    setOpen(false);
    await refresh();
  }

  async function remove(id: string) {
    await deleteFarmer(id);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Farmers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Input placeholder="Search by name, phone, or language" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={openCreate}>Add Farmer</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Farmers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>{f.phone}</TableCell>
                  <TableCell>{f.language}</TableCell>
                  <TableCell>{f.zoneId}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(f)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(f.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Farmer" : "Add Farmer"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Language</label>
              <Input value={form.language} onChange={(e) => setForm((s) => ({ ...s, language: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{form.id ? "Save Changes" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


