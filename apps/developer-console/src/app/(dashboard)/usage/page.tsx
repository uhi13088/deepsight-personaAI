"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  TrendingUp,
  Clock,
  DollarSign,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Zap,
  CheckCircle,
  XCircle,
  Globe,
  Loader2,
  ChevronDown,
  Calculator,
  FileBarChart,
} from "lucide-react"
import { toast } from "sonner"
import {
  usageService,
  type UsageData,
  type EndpointDetail,
  type CostAnalysis,
  type CostSimulationResult,
} from "@/services/usage-service"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { cn, formatNumber, formatCurrency } from "@/lib/utils"
import { downloadCSV, downloadJSON, generateFilename } from "@/lib/export"

// Helper function to get HTTP status code descriptions
function getStatusCodeDescription(code: number): string {
  const descriptions: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    408: "Request Timeout",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  }
  return descriptions[code] ?? `HTTP ${code}`
}

export default function UsagePage() {
  const [dateRange, setDateRange] = React.useState("7d")
  const [isLoading, setIsLoading] = React.useState(true)
  const [usageData, setUsageData] = React.useState<UsageData | null>(null)

  // Endpoint detail (§6.2)
  const [selectedEndpoint, setSelectedEndpoint] = React.useState<string | null>(null)
  const [endpointDetail, setEndpointDetail] = React.useState<EndpointDetail | null>(null)
  const [endpointDetailLoading, setEndpointDetailLoading] = React.useState(false)

  // Cost analysis (§6.2.4)
  const [costAnalysis, setCostAnalysis] = React.useState<CostAnalysis | null>(null)
  const [costLoading, setCostLoading] = React.useState(false)
  const [simDailyCalls, setSimDailyCalls] = React.useState("")
  const [simResults, setSimResults] = React.useState<CostSimulationResult[]>([])
  const [simLoading, setSimLoading] = React.useState(false)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const data = await usageService.getUsage(dateRange)
        setUsageData(data)
      } catch (error) {
        console.error("Failed to fetch usage data:", error)
        toast.error("사용량 데이터를 불러오는데 실패했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [dateRange])

  // Fetch endpoint detail when selected
  React.useEffect(() => {
    if (!selectedEndpoint) {
      setEndpointDetail(null)
      return
    }
    const fetchDetail = async () => {
      try {
        setEndpointDetailLoading(true)
        const data = await usageService.getEndpointDetail(selectedEndpoint, dateRange)
        setEndpointDetail(data)
      } catch {
        toast.error("엔드포인트 상세 데이터를 불러오는데 실패했습니다.")
      } finally {
        setEndpointDetailLoading(false)
      }
    }
    fetchDetail()
  }, [selectedEndpoint, dateRange])

  // Fetch cost analysis
  const fetchCostAnalysis = React.useCallback(async () => {
    try {
      setCostLoading(true)
      const data = await usageService.getCostAnalysis(dateRange)
      setCostAnalysis(data)
    } catch {
      toast.error("비용 분석 데이터를 불러오는데 실패했습니다.")
    } finally {
      setCostLoading(false)
    }
  }, [dateRange])

  const handleSimulate = async () => {
    const calls = parseInt(simDailyCalls)
    if (!calls || calls <= 0) {
      toast.error("유효한 일일 호출 수를 입력하세요.")
      return
    }
    try {
      setSimLoading(true)
      const results = await usageService.simulateCost(calls)
      setSimResults(results)
    } catch {
      toast.error("비용 시뮬레이션에 실패했습니다.")
    } finally {
      setSimLoading(false)
    }
  }

  const usageOverview = usageData?.overview ?? {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    totalCost: 0,
    quotaUsed: 0,
    quotaLimit: 50000,
  }
  const dailyUsage = usageData?.dailyUsage ?? []
  const endpointUsage = usageData?.byEndpoint ?? []
  const errorBreakdown = usageData?.byStatusCode ?? []
  const hourlyDistribution = usageData?.hourlyDistribution ?? []
  const regionUsage = usageData?.byRegion ?? []

  const maxDailyCalls = dailyUsage.length > 0 ? Math.max(...dailyUsage.map((d) => d.calls)) : 0
  const maxHourlyCalls =
    hourlyDistribution.length > 0 ? Math.max(...hourlyDistribution.map((h) => h.calls)) : 0

  const handleExportCSV = () => {
    const columns = [
      { key: "date", label: "Date" },
      { key: "calls", label: "Total Calls" },
      { key: "success", label: "Success" },
      { key: "failed", label: "Failed" },
      { key: "cost", label: "Cost" },
    ]
    downloadCSV(dailyUsage, generateFilename("usage_data"), columns)
    toast.success("CSV 파일이 다운로드되었습니다.")
  }

  const handleExportJSON = () => {
    const exportData = {
      overview: usageOverview,
      dailyUsage,
      byEndpoint: endpointUsage,
      byStatusCode: errorBreakdown,
      hourlyDistribution,
      byRegion: regionUsage,
      exportedAt: new Date().toISOString(),
    }
    downloadJSON(exportData, generateFilename("usage_data"))
    toast.success("JSON 파일이 다운로드되었습니다.")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <p className="text-muted-foreground mt-1 text-xs">선택 기간 총 호출 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageOverview.totalCalls > 0
                ? ((usageOverview.successfulCalls / usageOverview.totalCalls) * 100).toFixed(2)
                : "0.00"}
              %
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
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cost" onClick={fetchCostAnalysis}>
            Cost
          </TabsTrigger>
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
                {dailyUsage.length > 0 ? (
                  <>
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
                  </>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                      <p className="text-muted-foreground">사용 데이터가 없습니다</p>
                    </div>
                  </div>
                )}
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
                        {formatNumber(
                          dailyUsage.length > 0 ? Math.max(...dailyUsage.map((d) => d.calls)) : 0
                        )}
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
              {dailyUsage.length > 0 ? (
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
                          {day.calls > 0 ? ((day.success / day.calls) * 100).toFixed(2) : "0.00"}%
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(day.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center">
                  <Activity className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground">일별 사용 데이터가 없습니다</p>
                </div>
              )}
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
              {endpointUsage.length > 0 ? (
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
              ) : (
                <div className="py-12 text-center">
                  <Activity className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground">엔드포인트 사용 데이터가 없습니다</p>
                </div>
              )}
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
                {endpointUsage.length > 0 ? (
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
                ) : (
                  <div className="py-8 text-center">
                    <PieChart className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">데이터가 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latency Comparison</CardTitle>
                <CardDescription>엔드포인트별 평균 응답 시간</CardDescription>
              </CardHeader>
              <CardContent>
                {endpointUsage.length > 0 ? (
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
                ) : (
                  <div className="py-8 text-center">
                    <Clock className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">데이터가 없습니다</p>
                  </div>
                )}
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
                  {usageOverview.totalCalls > 0
                    ? ((usageOverview.failedCalls / usageOverview.totalCalls) * 100).toFixed(2)
                    : 0}
                  % of total calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Common</CardTitle>
                <Zap className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {errorBreakdown.length > 0 ? errorBreakdown[0].code : "-"}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {errorBreakdown.length > 0
                    ? `${getStatusCodeDescription(errorBreakdown[0].code)} (${errorBreakdown[0].percentage}%)`
                    : "에러 없음"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Limit Hits</CardTitle>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(errorBreakdown.find((e) => e.code === 429)?.count || 0)}
                </div>
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
              {errorBreakdown.length > 0 ? (
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
                        <TableCell className="font-medium">
                          {getStatusCodeDescription(error.code)}
                        </TableCell>
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
              ) : (
                <div className="py-12 text-center">
                  <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-500/30" />
                  <p className="text-muted-foreground">에러가 없습니다</p>
                </div>
              )}
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
                {hourlyDistribution.length > 0 ? (
                  <>
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
                  </>
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <div className="text-center">
                      <Clock className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                      <p className="text-muted-foreground text-sm">시간대별 데이터가 없습니다</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Regional Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Regional Distribution</CardTitle>
                <CardDescription>지역별 API 호출 분포</CardDescription>
              </CardHeader>
              <CardContent>
                {regionUsage.length > 0 ? (
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
                ) : (
                  <div className="py-8 text-center">
                    <Globe className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">지역별 데이터가 없습니다</p>
                  </div>
                )}
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
              {hourlyDistribution.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Peak Hour</p>
                    <p className="text-2xl font-bold">
                      {
                        hourlyDistribution.reduce(
                          (max, h) => (h.calls > max.calls ? h : max),
                          hourlyDistribution[0]
                        ).hour
                      }
                      :00 UTC
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatNumber(Math.max(...hourlyDistribution.map((h) => h.calls)))} calls
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Low Hour</p>
                    <p className="text-2xl font-bold">
                      {
                        hourlyDistribution.reduce(
                          (min, h) => (h.calls < min.calls ? h : min),
                          hourlyDistribution[0]
                        ).hour
                      }
                      :00 UTC
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatNumber(Math.min(...hourlyDistribution.map((h) => h.calls)))} calls
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Peak/Low Ratio</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        Math.max(...hourlyDistribution.map((h) => h.calls)) /
                          Math.max(Math.min(...hourlyDistribution.map((h) => h.calls)), 1)
                      )}
                      x
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">Consider load balancing</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <BarChart3 className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">분석할 데이터가 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab (§6.2) */}
        <TabsContent value="performance" className="space-y-6">
          {/* Endpoint Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Performance Analysis</CardTitle>
              <CardDescription>엔드포인트별 상세 성능 분석 (§6.2.1~§6.2.2)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select
                  value={selectedEndpoint ?? ""}
                  onValueChange={(v) => setSelectedEndpoint(v || null)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="엔드포인트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {endpointUsage.map((ep) => (
                      <SelectItem key={ep.endpoint} value={ep.endpoint}>
                        {ep.endpoint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {endpointDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              ) : endpointDetail ? (
                <div className="space-y-6">
                  {/* Latency Percentiles (§6.2.2) */}
                  <div>
                    <h4 className="mb-3 text-sm font-medium">Response Time Percentiles</h4>
                    <div className="grid gap-4 md:grid-cols-5">
                      {(
                        [
                          { label: "Average", value: endpointDetail.latency.avg },
                          { label: "P50", value: endpointDetail.latency.p50 },
                          { label: "P90", value: endpointDetail.latency.p90 },
                          { label: "P95", value: endpointDetail.latency.p95 },
                          { label: "P99", value: endpointDetail.latency.p99 },
                        ] as const
                      ).map((metric) => (
                        <div key={metric.label} className="rounded-lg border p-3 text-center">
                          <p className="text-muted-foreground text-xs">{metric.label}</p>
                          <p
                            className={cn(
                              "text-xl font-bold",
                              metric.value < 200
                                ? "text-green-600"
                                : metric.value < 500
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            )}
                          >
                            {metric.value}ms
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Total Calls</p>
                      <p className="text-lg font-bold">{formatNumber(endpointDetail.totalCalls)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Success Rate</p>
                      <p className="text-lg font-bold">{endpointDetail.successRate}%</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Endpoint</p>
                      <code className="text-sm font-medium">{endpointDetail.endpoint}</code>
                    </div>
                  </div>

                  {/* Hourly Pattern (§6.2.1) */}
                  {endpointDetail.hourlyPattern.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-medium">Hourly Call Pattern</h4>
                      <div className="flex h-[150px] items-end gap-1">
                        {endpointDetail.hourlyPattern.map((h, i) => {
                          const maxCalls = Math.max(
                            ...endpointDetail.hourlyPattern.map((p) => p.calls)
                          )
                          const heightPercent = maxCalls > 0 ? (h.calls / maxCalls) * 100 : 0
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
                      <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>23:00</span>
                      </div>
                    </div>
                  )}

                  {/* Error Types (§6.2.3) */}
                  {endpointDetail.errorTypes.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-medium">Error Types</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status Code</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {endpointDetail.errorTypes.map((err) => (
                            <TableRow key={err.code}>
                              <TableCell>
                                <Badge variant="destructive">{err.code}</Badge>
                              </TableCell>
                              <TableCell>{err.message}</TableCell>
                              <TableCell className="text-right">
                                {formatNumber(err.count)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <FileBarChart className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground">
                    엔드포인트를 선택하면 상세 성능 분석을 확인할 수 있습니다
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Tab (§6.2.4) */}
        <TabsContent value="cost" className="space-y-6">
          {costLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Cost Overview */}
              {costAnalysis && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Current Monthly Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">
                          {formatCurrency(costAnalysis.currentMonthly)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">
                          Projected Monthly Cost
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-blue-600">
                          {formatCurrency(costAnalysis.projectedMonthly)}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">예상 월말 비용</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cost by Endpoint */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost by Endpoint</CardTitle>
                      <CardDescription>엔드포인트별 비용 분석</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {costAnalysis.byEndpoint.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Endpoint</TableHead>
                              <TableHead className="text-right">Calls</TableHead>
                              <TableHead className="text-right">Cost</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {costAnalysis.byEndpoint.map((ep) => (
                              <TableRow key={ep.endpoint}>
                                <TableCell>
                                  <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                                    {ep.endpoint}
                                  </code>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatNumber(ep.calls)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(ep.cost)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="py-8 text-center">
                          <DollarSign className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                          <p className="text-muted-foreground text-sm">비용 데이터가 없습니다</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Daily Cost Trend */}
                  {costAnalysis.dailyCost.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Daily Cost Trend</CardTitle>
                        <CardDescription>일별 비용 추이</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex h-[200px] items-end gap-2">
                          {costAnalysis.dailyCost.map((day, i) => {
                            const maxCost = Math.max(...costAnalysis.dailyCost.map((d) => d.cost))
                            const heightPercent = maxCost > 0 ? (day.cost / maxCost) * 100 : 0
                            return (
                              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                                <div
                                  className="w-full rounded-t bg-emerald-500 transition-all hover:bg-emerald-400"
                                  style={{ height: `${heightPercent}%`, minHeight: "2px" }}
                                />
                                <span className="text-muted-foreground text-xs">
                                  {day.date.slice(-5)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {!costAnalysis && !costLoading && (
                <div className="py-12 text-center">
                  <DollarSign className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground">
                    비용 분석 탭을 클릭하면 데이터를 불러옵니다
                  </p>
                </div>
              )}

              {/* Cost Simulator (§6.2.4) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    <CardTitle>Cost Simulator</CardTitle>
                  </div>
                  <CardDescription>
                    예상 일일 호출 수를 입력하여 플랜별 비용을 비교하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-2">
                    <Input
                      type="number"
                      placeholder="예상 일일 API 호출 수"
                      value={simDailyCalls}
                      onChange={(e) => setSimDailyCalls(e.target.value)}
                      className="w-[250px]"
                    />
                    <Button onClick={handleSimulate} disabled={simLoading}>
                      {simLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Calculator className="mr-2 h-4 w-4" />
                      )}
                      시뮬레이션
                    </Button>
                  </div>

                  {simResults.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan</TableHead>
                          <TableHead className="text-right">Monthly Fee</TableHead>
                          <TableHead className="text-right">Included Calls</TableHead>
                          <TableHead className="text-right">Overage Rate</TableHead>
                          <TableHead className="text-right">Overage Cost</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simResults.map((plan) => (
                          <TableRow key={plan.planName}>
                            <TableCell className="font-medium">{plan.planName}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(plan.monthlyCost)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(plan.included)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(plan.overageRate)}/call
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(plan.overageCost)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(plan.totalCost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
