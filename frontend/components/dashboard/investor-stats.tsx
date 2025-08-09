import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function InvestorStats({
  totalZones,
  totalRecommendedCrops,
  lastUpdate,
}: {
  totalZones: number
  totalRecommendedCrops: number
  lastUpdate: string
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total monitored zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{totalZones}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total recommended crops</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{totalRecommendedCrops}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Last update</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg text-muted-foreground">{lastUpdate || "—"}</div>
        </CardContent>
      </Card>
    </div>
  )
}


