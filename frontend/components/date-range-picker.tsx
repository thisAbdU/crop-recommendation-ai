"use client"
import { useState } from "react";
import { Input } from "@/components/ui/input";

export type DateRange = { from?: string; to?: string };

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");

  return (
    <div className="flex gap-2 items-center">
      <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); onChange({ from: e.target.value, to }); }} />
      <span className="text-sm text-muted-foreground">to</span>
      <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); onChange({ from, to: e.target.value }); }} />
    </div>
  );
}



