"use client"
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRecommendationById, regenerateRecommendation, updateRecommendationStatus } from "@/lib/api";
import { Recommendation } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIChat } from "@/components/chat/ai-chat";

export default function RecommendationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      const r = await getRecommendationById(id);
      setRec(r ?? null);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function handleApprove() {
    if (!rec) return;
    const updated = await updateRecommendationStatus(rec.id, "approved");
    if (updated) setRec({ ...updated });
  }

  async function handleDecline() {
    if (!rec) return;
    const updated = await updateRecommendationStatus(rec.id, "declined");
    if (updated) setRec({ ...updated });
  }

  async function handleRegenerate() {
    if (!rec) return;
    const regen = await regenerateRecommendation(rec.id);
    if (regen) setRec({ ...regen });
  }

  if (loading || !rec) return null;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{rec.crop_name} · {rec.suitability_score}%</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <div>Soil type: {rec.key_environmental_factors.soil_type}</div>
            <div>pH: {rec.key_environmental_factors.ph}</div>
            <div>Moisture: {rec.key_environmental_factors.moisture_range}</div>
            <div>Rainfall: {rec.key_environmental_factors.rainfall_forecast}</div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">AI rationale</div>
            <p className="text-sm leading-6">{rec.rationale}</p>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button onClick={handleApprove} disabled={rec.status === "approved"}>Approve</Button>
          <Button variant="outline" onClick={handleRegenerate}>Regenerate</Button>
          <Button variant="outline" onClick={handleDecline} disabled={rec.status === "declined"}>Decline</Button>
        </CardFooter>
      </Card>

      <div>
        <AIChat seed="Ask follow-up questions about this recommendation." />
      </div>
    </div>
  );
}


