import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function InvestorStats({
  totalZones,
  cropsThisMonth,
  pctChange,
}: {
  totalZones: number
  cropsThisMonth: number
  pctChange: number
}) {
  const changeColor = pctChange >= 0 ? "text-green-600" : "text-red-600"
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total zones monitored</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{totalZones}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Crops recommended this month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{cropsThisMonth}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>% change from last month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-semibold ${changeColor}`}>{pctChange}%</div>
        </CardContent>
      </Card>
    </div>
  )
}


