"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Bell, Shield, Palette, Globe } from "lucide-react";

interface SettingsData {
  notifications: {
    email: boolean;
    push: boolean;
    weekly: boolean;
  };
  preferences: {
    theme: string;
    language: string;
    timezone: string;
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: number;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }

    // Simulate settings data
    setSettings({
      notifications: {
        email: true,
        push: false,
        weekly: true,
      },
      preferences: {
        theme: "light",
        language: "en",
        timezone: "UTC",
      },
      security: {
        twoFactor: false,
        sessionTimeout: 30,
      },
    });
  }, [router]);

  const updateNotification = (key: keyof SettingsData['notifications'], value: boolean) => {
    if (settings) {
      setSettings({
        ...settings,
        notifications: {
          ...settings.notifications,
          [key]: value,
        },
      });
    }
  };

  const updatePreference = (key: keyof SettingsData['preferences'], value: string) => {
    if (settings) {
      setSettings({
        ...settings,
        preferences: {
          ...settings.preferences,
          [key]: value,
        },
      });
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your account preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notifications */}
        <Card className="enhanced-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-semibold">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                checked={settings.notifications.email}
                onCheckedChange={(checked) => updateNotification('email', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Get real-time alerts</p>
              </div>
              <Switch
                checked={settings.notifications.push}
                onCheckedChange={(checked) => updateNotification('push', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">Receive weekly summaries</p>
              </div>
              <Switch
                checked={settings.notifications.weekly}
                onCheckedChange={(checked) => updateNotification('weekly', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="enhanced-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100">
                <Palette className="w-4 h-4 text-green-600" />
              </div>
              <CardTitle className="text-xl font-semibold">Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={settings.preferences.theme}
                onValueChange={(value) => updatePreference('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={settings.preferences.language}
                onValueChange={(value) => updatePreference('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={settings.preferences.timezone}
                onValueChange={(value) => updatePreference('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="EST">Eastern Time</SelectItem>
                  <SelectItem value="PST">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="enhanced-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold">Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Switch
                checked={settings.security.twoFactor}
                onCheckedChange={(checked) => 
                  setSettings(prev => prev ? {
                    ...prev,
                    security: { ...prev.security, twoFactor: checked }
                  } : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => 
                  setSettings(prev => prev ? {
                    ...prev,
                    security: { ...prev.security, sessionTimeout: parseInt(e.target.value) || 30 }
                  } : null)
                }
                min="5"
                max="120"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="enhanced-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <CardTitle className="text-xl font-semibold">Data & Privacy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data Export</Label>
              <p className="text-sm text-muted-foreground">Download your data</p>
              <Button variant="outline" size="sm">
                Export Data
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Account Deletion</Label>
              <p className="text-sm text-muted-foreground">Permanently delete your account</p>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button className="gap-2">
          Save Changes
        </Button>
        <Button variant="outline">
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
} 