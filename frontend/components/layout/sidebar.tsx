"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Map, Bot, LogOut } from "lucide-react"
import { loadAuth, logout } from "@/lib/auth"

type NavItem = { href: string; label: string; icon: any }

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const auth = loadAuth()
    setRole(auth?.user.role ?? null)
  }, [])

  const items: NavItem[] = useMemo(() => {
    if (role === "central_admin") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/dashboard", label: "Zones", icon: Map },
      ]
    }
    if (role === "zone_admin") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/dashboard", label: "My Zone", icon: Map },
      ]
    }
    return [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/dashboard", label: "Zones", icon: Map },
    ]
  }, [role])

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <div className="px-2 py-3 text-sm font-semibold">Crop AI</div>
      <nav className="flex-1 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link key={href} href={href} onClick={onNavigate} className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent",
              active ? "bg-accent" : undefined
            )}>
              <Icon className="size-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
      <button
        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
        onClick={() => {
          logout();
          window.location.href = "/login";
        }}
      >
        <LogOut className="size-4" />
        <span className="hidden md:inline">Logout</span>
      </button>
    </div>
  )
}


