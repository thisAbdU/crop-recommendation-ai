"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { Home, List, Settings, Map, Users } from "lucide-react";
import { loadAuth } from "@/lib/auth";
import { Role } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>("zone_admin");

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setRole(auth.user.role);
  }, [router]);

  const navItems = useMemo(() => {
    if (role === "investor") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        {
          href: "/dashboard?view=opportunities",
          label: "Zone Opportunities",
          icon: List,
        },
      ];
    }
    if (role === "zone_admin") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/zone-data", label: "Zone Data", icon: Map },
        { href: "/farmers", label: "Farmers", icon: Users },
      ];
    }
    if (role === "central_admin") {
      return [{ href: "/dashboard", label: "Dashboard", icon: Home }];
    }
    return [] as { href: string; label: string; icon: any }[];
  }, [role]);

  const groupLabel =
    role === "investor"
      ? "Investor"
      : role === "zone_admin"
      ? "Zone Admin"
      : role === "central_admin"
      ? "Central Admin"
      : "";

  if (!role) return null;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="#">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div className="sticky top-0 z-10 bg-background">
          <div className="flex items-center gap-2 p-2 border-b">
            <SidebarTrigger />
            <Topbar />
          </div>
        </div>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
