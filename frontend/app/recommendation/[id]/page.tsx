"use client"
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRecommendationById, regenerateRecommendation, updateRecommendationStatus } from "@/lib/api";
import { Recommendation } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommendation</CardTitle>
            <CardDescription>{new Date(rec.createdAt).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="text-2xl font-semibold">{rec.crop_name}</div>
              <div className="text-muted-foreground">Suitability score: {rec.suitability_score}%</div>
              <div className="text-muted-foreground">Soil type: {rec.key_environmental_factors.soil_type}</div>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button onClick={handleApprove} disabled={rec.status === "approved"}>Approve</Button>
            <Button variant="outline" onClick={handleRegenerate}>Regenerate</Button>
            <Button variant="outline" onClick={handleDecline} disabled={rec.status === "declined"}>Decline</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environmental Factors</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div>pH: {rec.key_environmental_factors.ph}</div>
            <div>Moisture: {rec.key_environmental_factors.moisture_range}</div>
            <div>Rainfall: {rec.key_environmental_factors.rainfall_forecast}</div>
            <div>Soil Type: {rec.key_environmental_factors.soil_type}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Rationale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{rec.rationale}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chat with AI</CardTitle>
        </CardHeader>
        <CardContent>
          <AIChat seed="Ask follow-up questions about this recommendation." />
        </CardContent>
      </Card>
    </div>
  );
}


