"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ZoneFilter = {
  cropName: string;
  soilType: string | null;
  minScore: number | null;
  maxScore: number | null;
};

export function ZoneFilters({
  value,
  onChange,
  soilTypeOptions,
}: {
  value: ZoneFilter;
  onChange: (v: ZoneFilter) => void;
  soilTypeOptions: string[];
}) {
  const [cropName, setCropName] = useState(value.cropName);
  const [soilType, setSoilType] = useState<string | null>(value.soilType);
  const [minScore, setMinScore] = useState<string>(
    value.minScore?.toString() ?? ""
  );
  const [maxScore, setMaxScore] = useState<string>(
    value.maxScore?.toString() ?? ""
  );

  function emit(next: Partial<ZoneFilter>) {
    onChange({
      cropName,
      soilType,
      minScore: minScore ? Number(minScore) : null,
      maxScore: maxScore ? Number(maxScore) : null,
      ...next,
    });
  }

  return (
    <div className="grid gap-3 md:grid-cols-4 items-end">
      <div>
        <div className="text-sm mb-1">Crop name</div>
        <Input
          value={cropName}
          onChange={(e) => {
            setCropName(e.target.value);
            emit({ cropName: e.target.value });
          }}
          placeholder="e.g. Maize"
        />
      </div>
      <div>
        <div className="text-sm mb-1">Soil type</div>
        {soilType && (
          <Select
            value={soilType ?? ""}
            onValueChange={(v) => {
              const nv = v || null;
              setSoilType(nv);
              emit({ soilType: nv });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              {soilTypeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div>
        <div className="text-sm mb-1">Min score</div>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={minScore}
          onChange={(e) => {
            setMinScore(e.target.value);
            emit({ minScore: e.target.value ? Number(e.target.value) : null });
          }}
          placeholder="0"
        />
      </div>
      <div>
        <div className="text-sm mb-1">Max score</div>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={maxScore}
          onChange={(e) => {
            setMaxScore(e.target.value);
            emit({ maxScore: e.target.value ? Number(e.target.value) : null });
          }}
          placeholder="100"
        />
      </div>
    </div>
  );
}

