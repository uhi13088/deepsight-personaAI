"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle,
  XCircle,
  Globe,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatNumber, formatCurrency } from "@/lib/utils"

// Mock data
const usageOverview = {
  totalCalls: 156789,
  successfulCalls: 155234,
  failedCalls: 1555,
  averageLatency: 142,
  p95Latency: 285,
  p99Latency: 412,
  totalCost: 312.45,
  quotaUsed: 65,
  quotaLimit: 500000,
}

const dailyUsage = [
  { date: "Jan 10", calls: 22100, success: 21890, failed: 210, cost: 44.2 },
  { date: "Jan 11", calls: 24250, success: 24100, failed: 150, cost: 48.5 },
  { date: "Jan 12", calls: 19800, success: 19650, failed: 150, cost: 39.6 },
  { date: "Jan 13", calls: 26400, success: 26200, failed: 200, cost: 52.8 },
  { date: "Jan 14", calls: 25380, success: 25100, failed: 280, cost: 50.76 },
  { date: "Jan 15", calls: 21200, success: 21050, failed: 150, cost: 42.4 },
  { date: "Jan 16", calls: 17659, success: 17244, failed: 415, cost: 33.32 },
]

const endpointUsage = [
  { endpoint: "/v1/match", calls: 98500, percentage: 62.8, avgLatency: 156, successRate: 99.1 },
  { endpoint: "/v1/personas", calls: 35200, percentage: 22.4, avgLatency: 45, successRate: 99.8 },
  { endpoint: "/v1/feedback", calls: 18400, percentage: 11.7, avgLatency: 32, successRate: 99.5 },
  { endpoint: "/v1/batch-match", calls: 4689, percentage: 3.0, avgLatency: 890, successRate: 98.2 },
]

const errorBreakdown = [
  { code: 400, count: 890, description: "Bad Request", percentage: 57.2 },
  { code: 401, count: 234, description: "Unauthorized", percentage: 15.0 },
  { code: 429, count: 312, description: "Rate Limited", percentage: 20.1 },
  { code: 500, count: 119, description: "Internal Error", percentage: 7.7 },
]

const hourlyDistribution = [
  { hour: "00", calls: 2100 },
  { hour: "01", calls: 1800 },
  { hour: "02", calls: 1500 },
  { hour: "03", calls: 1200 },
  { hour: "04", calls: 1100 },
  { hour: "05", calls: 1300 },
  { hour: "06", calls: 2500 },
  { hour: "07", calls: 4200 },
  { hour: "08", calls: 6800 },
  { hour: "09", calls: 9200 },
  { hour: "10", calls: 11500 },
  { hour: "11", calls: 12100 },
  { hour: "12", calls: 10800 },
  { hour: "13", calls: 11200 },
  { hour: "14", calls: 12500 },
  { hour: "15", calls: 11800 },
  { hour: "16", calls: 10200 },
  { hour: "17", calls: 8500 },
  { hour: "18", calls: 7200 },
  { hour: "19", calls: 6100 },
  { hour: "20", calls: 5200 },
  { hour: "21", calls: 4500 },
  { hour: "22", calls: 3800 },
  { hour: "23", calls: 2900 },
]

const regionUsage = [
  { region: "Asia Pacific", calls: 89500, percentage: 57.1 },
  { region: "North America", calls: 42300, percentage: 27.0 },
  { region: "Europe", calls: 18900, percentage: 12.1 },
  { region: "Others", calls: 6089, percentage: 3.9 },
]

export default function UsagePage() {
  const [dateRange, setDateRange] = React.useState("7d")
  const maxDailyCalls = Math.max(...dailyUsage.map((d) => d.calls))
  const maxHourlyCalls = Math.max(...hourlyDistribution.map((h) => h.calls))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="text-muted-foreground">API 사용량과 성능 지표를 분석하세요</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(usageOverview.totalCalls)}</div>
            <div className="text-muted-foreground mt-1 flex items-center text-xs">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              <span className="text-green-500">+12.5%</span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((usageOverview.successfulCalls / usageOverview.totalCalls) * 100).toFixed(2)}%
            </div>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              <span className="text-green-500">
                {formatNumber(usageOverview.successfulCalls)} success
              </span>
              <span>/</span>
              <span className="text-red-500">{formatNumber(usageOverview.failedCalls)} failed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageOverview.averageLatency}ms</div>
            <div className="text-muted-foreground mt-1 flex items-center text-xs">
              <span>P95: {usageOverview.p95Latency}ms</span>
              <span className="mx-2">|</span>
              <span>P99: {usageOverview.p99Latency}ms</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(usageOverview.totalCost)}</div>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              <Progress value={usageOverview.quotaUsed} className="h-2 flex-1" />
              <span>{usageOverview.quotaUsed}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-7">
            {/* Daily Usage Chart */}
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>Daily API Calls</CardTitle>
                <CardDescription>일별 API 호출 추이</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-[300px] items-end gap-2">
                  {dailyUsage.map((day, i) => {
                    const successHeight = (day.success / maxDailyCalls) * 100
                    const failedHeight = (day.failed / maxDailyCalls) * 100
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex w-full flex-col" style={{ height: "260px" }}>
                          <div className="flex-1" />
                          <div
                            className="w-full rounded-t bg-red-500"
                            style={{
                              height: `${failedHeight}%`,
                              minHeight: day.failed > 0 ? "2px" : "0",
                            }}
                          />
                          <div
                            className="bg-primary w-full"
                            style={{ height: `${successHeight}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {day.date.split(" ")[1]}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary h-3 w-3 rounded" />
                    <span className="text-muted-foreground text-sm">Success</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-red-500" />
                    <span className="text-muted-foreground text-sm">Failed</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quota Usage */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Quota Usage</CardTitle>
                <CardDescription>이번 달 사용량</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative pt-1">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">API Calls</span>
                    <span className="text-muted-foreground text-sm">
                      {formatNumber(usageOverview.totalCalls)} /{" "}
                      {formatNumber(usageOverview.quotaLimit)}
                    </span>
                  </div>
                  <Progress value={usageOverview.quotaUsed} className="h-3" />
                  <p className="text-muted-foreground mt-2 text-xs">
                    {formatNumber(usageOverview.quotaLimit - usageOverview.totalCalls)} calls
                    remaining
                  </p>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-medium">Daily Statistics</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Avg Daily</p>
                      <p className="font-medium">
                        {formatNumber(Math.round(usageOverview.totalCalls / 7))}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Peak Day</p>
                      <p className="font-medium">
                        {formatNumber(Math.max(...dailyUsage.map((d) => d.calls)))}
                      </p>
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link href="/billing">Upgrade Plan</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Daily Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Breakdown</CardTitle>
              <CardDescription>일별 상세 사용량</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Calls</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyUsage.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell className="text-right">{formatNumber(day.calls)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatNumber(day.success)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatNumber(day.failed)}
                      </TableCell>
                      <TableCell className="text-right">
                        {((day.success / day.calls) * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(day.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Endpoint</CardTitle>
              <CardDescription>엔드포인트별 사용량 및 성능</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead>Share</TableHead>
                    <TableHead className="text-right">Avg Latency</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpointUsage.map((endpoint) => (
                    <TableRow key={endpoint.endpoint}>
                      <TableCell>
                        <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                          {endpoint.endpoint}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(endpoint.calls)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={endpoint.percentage} className="h-2 w-20" />
                          <span className="text-muted-foreground w-12 text-sm">
                            {endpoint.percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{endpoint.avgLatency}ms</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={endpoint.successRate >= 99 ? "success" : "secondary"}>
                          {endpoint.successRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Endpoint Distribution Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>API Distribution</CardTitle>
                <CardDescription>API 호출 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {endpointUsage.map((endpoint) => (
                    <div key={endpoint.endpoint} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <code className="font-mono">{endpoint.endpoint}</code>
                        <span className="text-muted-foreground">
                          {formatNumber(endpoint.calls)} ({endpoint.percentage}%)
                        </span>
                      </div>
                      <Progress value={endpoint.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latency Comparison</CardTitle>
                <CardDescription>엔드포인트별 평균 응답 시간</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {endpointUsage.map((endpoint) => {
                    const maxLatency = Math.max(...endpointUsage.map((e) => e.avgLatency))
                    const latencyPercent = (endpoint.avgLatency / maxLatency) * 100
                    return (
                      <div key={endpoint.endpoint} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <code className="font-mono">{endpoint.endpoint}</code>
                          <span className="font-medium">{endpoint.avgLatency}ms</span>
                        </div>
                        <div className="bg-muted h-2 overflow-hidden rounded-full">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              endpoint.avgLatency < 100
                                ? "bg-green-500"
                                : endpoint.avgLatency < 300
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            )}
                            style={{ width: `${latencyPercent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(usageOverview.failedCalls)}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {((usageOverview.failedCalls / usageOverview.totalCalls) * 100).toFixed(2)}% of
                  total calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Common</CardTitle>
                <Zap className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">400</div>
                <p className="text-muted-foreground mt-1 text-xs">Bad Request (57.2%)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Limit Hits</CardTitle>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(312)}</div>
                <p className="text-muted-foreground mt-1 text-xs">429 responses</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Error Breakdown</CardTitle>
              <CardDescription>HTTP 상태 코드별 에러 분석</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead>Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorBreakdown.map((error) => (
                    <TableRow key={error.code}>
                      <TableCell>
                        <Badge variant="destructive">{error.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{error.description}</TableCell>
                      <TableCell className="text-right">{formatNumber(error.count)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={error.percentage} className="h-2 w-20" />
                          <span className="text-muted-foreground w-12 text-sm">
                            {error.percentage}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hourly Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Distribution</CardTitle>
                <CardDescription>시간대별 API 호출 분포 (UTC)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-[200px] items-end gap-1">
                  {hourlyDistribution.map((hour, i) => {
                    const heightPercent = (hour.calls / maxHourlyCalls) * 100
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="bg-primary hover:bg-primary/80 w-full rounded-t transition-all"
                          style={{ height: `${heightPercent}%`, minHeight: "2px" }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </CardContent>
            </Card>

            {/* Regional Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Regional Distribution</CardTitle>
                <CardDescription>지역별 API 호출 분포</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {regionUsage.map((region) => (
                    <div key={region.region} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Globe className="text-muted-foreground h-4 w-4" />
                          <span>{region.region}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {formatNumber(region.calls)} ({region.percentage}%)
                        </span>
                      </div>
                      <Progress value={region.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Peak Hours Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours Analysis</CardTitle>
              <CardDescription>피크 시간대 분석</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Peak Hour</p>
                  <p className="text-2xl font-bold">11:00 UTC</p>
                  <p className="text-muted-foreground mt-1 text-sm">{formatNumber(12100)} calls</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Low Hour</p>
                  <p className="text-2xl font-bold">04:00 UTC</p>
                  <p className="text-muted-foreground mt-1 text-sm">{formatNumber(1100)} calls</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Peak/Low Ratio</p>
                  <p className="text-2xl font-bold">11x</p>
                  <p className="text-muted-foreground mt-1 text-sm">Consider load balancing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
