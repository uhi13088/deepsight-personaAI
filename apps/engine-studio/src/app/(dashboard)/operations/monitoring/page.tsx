"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
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

// Default realtime metrics (will be updated from API)
const REALTIME_METRICS = {
  cpu: 0,
  memory: 0,
  disk: 0,
  network: 0,
  requests: 0,
  latency: 0,
  errors: 0,
  uptime: 0,
}

// Services - empty by default, will be loaded from API
const SERVICES: { name: string; status: string; latency: number; uptime: number }[] = []

// 시계열 데이터 (빈 상태에서는 빈 배열 반환)
const generateTimeSeriesData = () => {
  return []
}

// Alerts - empty by default, will be loaded from API
const ALERTS: {
  id: string
  severity: string
  message: string
  time: string
  acknowledged: boolean
}[] = []

export default function MonitoringPage() {
  const [timeSeriesData, setTimeSeriesData] = useState(generateTimeSeriesData())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState("30")

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(
      () => {
        setTimeSeriesData(generateTimeSeriesData())
      },
      parseInt(refreshInterval) * 1000
    )

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
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
      case "warning":
        return <Badge className="bg-yellow-500">주의</Badge>
      case "info":
        return <Badge variant="secondary">정보</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
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
            <div className="text-2xl font-bold">{REALTIME_METRICS.cpu}%</div>
            <Progress value={REALTIME_METRICS.cpu} className="mt-2" />
            <p className="text-muted-foreground mt-2 text-xs">8 코어 / 16 스레드</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">메모리</CardTitle>
            <MemoryStick className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.memory}%</div>
            <Progress value={REALTIME_METRICS.memory} className="mt-2" />
            <p className="text-muted-foreground mt-2 text-xs">19.8GB / 32GB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">디스크</CardTitle>
            <HardDrive className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.disk}%</div>
            <Progress value={REALTIME_METRICS.disk} className="mt-2" />
            <p className="text-muted-foreground mt-2 text-xs">380GB / 1TB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">네트워크</CardTitle>
            <Network className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.network} Mbps</div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-green-600">↑ 156 Mbps</span>
              <span className="text-blue-600">↓ 78 Mbps</span>
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
            <div className="text-2xl font-bold">{REALTIME_METRICS.requests}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12% from avg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 지연</CardTitle>
            <Zap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.latency}ms</div>
            <p className="text-muted-foreground mt-1 text-xs">P99: 45ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">에러율</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.errors}%</div>
            <p className="mt-1 text-xs text-green-600">정상 범위</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">가동률</CardTitle>
            <Server className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.uptime}%</div>
            <p className="text-muted-foreground mt-1 text-xs">30일 기준</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CPU & 메모리 사용량</CardTitle>
            <CardDescription>최근 1시간 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>요청 수 & 지연시간</CardTitle>
            <CardDescription>최근 1시간 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
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
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="latency"
                    name="지연(ms)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
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
            {SERVICES.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Server className="text-muted-foreground mb-4 h-10 w-10" />
                <h3 className="mb-2 font-medium">등록된 서비스가 없습니다</h3>
                <p className="text-muted-foreground text-sm">
                  서비스가 연결되면 상태가 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {SERVICES.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <p className="text-sm font-medium">{service.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {service.latency}ms • {service.uptime}% uptime
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={service.status === "healthy" ? "secondary" : "outline"}
                      className={
                        service.status === "warning" ? "border-yellow-500 text-yellow-600" : ""
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
            {ALERTS.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="text-muted-foreground mb-4 h-10 w-10" />
                <h3 className="mb-2 font-medium">알림이 없습니다</h3>
                <p className="text-muted-foreground text-sm">
                  새로운 알림이 발생하면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ALERTS.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      !alert.acknowledged ? "bg-muted/50" : ""
                    }`}
                  >
                    {alert.severity === "warning" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="mt-0.5 h-4 w-4 text-blue-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-muted-foreground mt-1 text-xs">{alert.time}</p>
                    </div>
                    {getSeverityBadge(alert.severity)}
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
