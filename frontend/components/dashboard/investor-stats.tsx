import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, TrendingUp, Clock, MapPin } from "lucide-react"

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
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="enhanced-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold">Monitored Zones</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{totalZones}</div>
          <p className="text-sm text-muted-foreground mt-1">Active farm locations</p>
        </CardContent>
      </Card>
      
      <Card className="enhanced-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
              <Leaf className="w-5 h-5 text-green-600" />
            </div>
            <CardTitle className="text-lg font-semibold">Recommended Crops</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{totalRecommendedCrops}</div>
          <p className="text-sm text-muted-foreground mt-1">This month</p>
        </CardContent>
      </Card>
      
      <Card className="enhanced-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg font-semibold">Last Update</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold text-blue-600">
            {lastUpdate || "—"}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Sensor data refresh</p>
        </CardContent>
      </Card>
    </div>
  )
}


