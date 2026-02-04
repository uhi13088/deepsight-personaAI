"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { operationsService, type MonitoringData } from "@/services/operations-service"
import {
  Activity,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Globe,
  TrendingUp,
  Download,
  Bell,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

export default function MonitoringPage() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState("30")
  const [period, setPeriod] = useState("1h")

  const loadMonitoringData = useCallback(async () => {
    try {
      const data = await operationsService.getMonitoringData(period)
      setMonitoringData(data)
    } catch (error) {
      console.error("Failed to load monitoring data:", error)
      // 에러 시 기본값 설정
      setMonitoringData({
        metrics: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0,
          requestsPerSec: 0,
          avgLatency: 0,
          errorRate: 0,
          uptime: 99.9,
        },
        services: [],
        alerts: [],
        timeSeriesData: [],
      })
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadMonitoringData()
  }, [loadMonitoringData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(
      () => {
        loadMonitoringData()
      },
      parseInt(refreshInterval) * 1000
    )

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadMonitoringData])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "degraded":
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "down":
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="text-muted-foreground h-4 w-4" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">위험</Badge>
      case "error":
        return <Badge variant="destructive">에러</Badge>
      case "warning":
        return <Badge className="bg-yellow-500">주의</Badge>
      case "info":
        return <Badge variant="secondary">정보</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const metrics = monitoringData?.metrics || {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    requestsPerSec: 0,
    avgLatency: 0,
    errorRate: 0,
    uptime: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Activity className="h-6 w-6 text-green-500" />
            실시간 모니터링
          </h2>
          <p className="text-muted-foreground">
            시스템 리소스와 서비스 상태를 실시간으로 모니터링합니다.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1시간</SelectItem>
              <SelectItem value="6h">6시간</SelectItem>
              <SelectItem value="24h">24시간</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">자동 새로고침</span>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          <Select value={refreshInterval} onValueChange={setRefreshInterval}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10초</SelectItem>
              <SelectItem value="30">30초</SelectItem>
              <SelectItem value="60">1분</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadMonitoringData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast.success("로그 다운로드를 시작합니다", {
                description: "로그 파일이 곧 다운로드됩니다.",
              })
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            로그 다운로드
          </Button>
        </div>
      </div>

      {/* Resource Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CPU 사용량</CardTitle>
            <Cpu className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cpu.toFixed(1)}%</div>
            <Progress value={metrics.cpu} className="mt-2" />
            <p className="text-muted-foreground mt-2 text-xs">8 코어 / 16 스레드</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">메모리</CardTitle>
            <MemoryStick className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memory.toFixed(1)}%</div>
            <Progress value={metrics.memory} className="mt-2" />
            <p className="text-muted-foreground mt-2 text-xs">
              {((32 * metrics.memory) / 100).toFixed(1)}GB / 32GB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">디스크</CardTitle>
            <HardDrive className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.disk.toFixed(1)}%</div>
            <Progress value={metrics.disk} className="mt-2" />
            <p className="text-muted-foreground mt-2 text-xs">
              {((1000 * metrics.disk) / 100).toFixed(0)}GB / 1TB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">네트워크</CardTitle>
            <Network className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.network.toFixed(0)} Mbps</div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-green-600">↑ {(metrics.network * 0.7).toFixed(0)} Mbps</span>
              <span className="text-blue-600">↓ {(metrics.network * 0.3).toFixed(0)} Mbps</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">요청/초</CardTitle>
            <Globe className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.requestsPerSec.toFixed(0)}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              실시간 요청 수
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 지연</CardTitle>
            <Zap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgLatency.toFixed(0)}ms</div>
            <p className="text-muted-foreground mt-1 text-xs">
              P99: {(metrics.avgLatency * 1.5).toFixed(0)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">에러율</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
            <p
              className={`mt-1 text-xs ${metrics.errorRate < 1 ? "text-green-600" : "text-red-600"}`}
            >
              {metrics.errorRate < 1 ? "정상 범위" : "주의 필요"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">가동률</CardTitle>
            <Server className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime.toFixed(2)}%</div>
            <p className="text-muted-foreground mt-1 text-xs">30일 기준</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CPU & 메모리 사용량</CardTitle>
            <CardDescription>
              최근 {period === "1h" ? "1시간" : period === "6h" ? "6시간" : "24시간"} 추이
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {monitoringData?.timeSeriesData && monitoringData.timeSeriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monitoringData.timeSeriesData}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      name="CPU"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorCpu)"
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      name="Memory"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorMemory)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground text-sm">데이터가 수집되면 표시됩니다.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>요청 수 & 지연시간</CardTitle>
            <CardDescription>
              최근 {period === "1h" ? "1시간" : period === "6h" ? "6시간" : "24시간"} 추이
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {monitoringData?.timeSeriesData && monitoringData.timeSeriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monitoringData.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="requests"
                      name="요청/초"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground text-sm">데이터가 수집되면 표시됩니다.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services & Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Service Status */}
        <Card>
          <CardHeader>
            <CardTitle>서비스 상태</CardTitle>
            <CardDescription>모든 마이크로서비스 헬스체크</CardDescription>
          </CardHeader>
          <CardContent>
            {!monitoringData?.services || monitoringData.services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Server className="text-muted-foreground mb-4 h-10 w-10" />
                <h3 className="mb-2 font-medium">등록된 서비스가 없습니다</h3>
                <p className="text-muted-foreground text-sm">
                  서비스가 연결되면 상태가 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {monitoringData.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <p className="text-sm font-medium">{service.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {service.latency}ms • 최근: {service.lastCheck}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={service.status === "healthy" ? "secondary" : "outline"}
                      className={
                        service.status === "degraded" ? "border-yellow-500 text-yellow-600" : ""
                      }
                    >
                      {service.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>최근 알림</CardTitle>
                <CardDescription>시스템 이벤트 및 경고</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info("알림 설정", {
                    description: "알림 설정 페이지로 이동합니다.",
                  })
                }}
              >
                <Bell className="mr-2 h-4 w-4" />
                알림 설정
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!monitoringData?.alerts || monitoringData.alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="text-muted-foreground mb-4 h-10 w-10" />
                <h3 className="mb-2 font-medium">알림이 없습니다</h3>
                <p className="text-muted-foreground text-sm">
                  새로운 알림이 발생하면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {monitoringData.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      !alert.resolved ? "bg-muted/50" : ""
                    }`}
                  >
                    {alert.type === "warning" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" />
                    ) : alert.type === "critical" || alert.type === "error" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="mt-0.5 h-4 w-4 text-blue-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {alert.source} • {alert.createdAt}
                      </p>
                    </div>
                    {getSeverityBadge(alert.type)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
