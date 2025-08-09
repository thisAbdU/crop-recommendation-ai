"use client"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { loadAuth } from "@/lib/auth"

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const [name, setName] = useState<string>("")
  useEffect(() => {
    const auth = loadAuth()
    setName(auth?.user.name ?? "")
  }, [])

  return (
    <div className="flex h-14 items-center gap-3 border-b px-4">
      <button className="md:hidden text-sm rounded-md px-2 py-1 border" onClick={onMenu}>Menu</button>
      <div className="flex-1 max-w-xl">
        <Input placeholder="Search..." />
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground hidden sm:block">{name}</div>
        <Image src="/vercel.svg" alt="avatar" width={24} height={24} className="rounded-full" />
      </div>
    </div>
  )
}


