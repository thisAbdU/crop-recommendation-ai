"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Building, Shield } from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  role: string;
  organization: string;
  joinDate: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile | null>(null);

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }

    // Simulate profile data
    setProfile({
      name: "Ivy Investor",
      email: "ivy.investor@example.com",
      role: "Investor",
      organization: "Green Ventures Capital",
      joinDate: "2024-01-15"
    });
    setFormData({
      name: "Ivy Investor",
      email: "ivy.investor@example.com",
      role: "Investor",
      organization: "Green Ventures Capital",
      joinDate: "2024-01-15"
    });
  }, [router]);

  const handleSave = () => {
    setProfile(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="enhanced-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={formData?.name || ""}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{profile.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData?.email || ""}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, email: e.target.value } : null)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              {isEditing ? (
                <Input
                  id="organization"
                  value={formData?.organization || ""}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, organization: e.target.value } : null)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{profile.organization}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="enhanced-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-semibold">Account Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2">
                <span className="zone-badge">{profile.role}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Member Since</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(profile.joinDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Account Status</Label>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600 font-medium">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        {isEditing ? (
          <>
            <Button onClick={handleSave} className="gap-2">
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
} 