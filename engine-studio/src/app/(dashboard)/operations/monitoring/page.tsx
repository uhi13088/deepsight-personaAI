"use client"

import { useState, useEffect } from "react"
import {
  Activity,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Database,
  Globe,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Settings,
  Download,
  Bell,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// 실시간 메트릭 데이터
const REALTIME_METRICS = {
  cpu: 45,
  memory: 62,
  disk: 38,
  network: 234,
  requests: 1234,
  latency: 23,
  errors: 0.02,
  uptime: 99.99,
}

// 서비스 상태
const SERVICES = [
  { name: "API Gateway", status: "healthy", latency: 12, uptime: 99.99 },
  { name: "Matching Engine", status: "healthy", latency: 23, uptime: 99.95 },
  { name: "Persona Service", status: "healthy", latency: 18, uptime: 99.98 },
  { name: "User Service", status: "healthy", latency: 15, uptime: 99.97 },
  { name: "Analytics", status: "warning", latency: 45, uptime: 99.85 },
  { name: "Cache (Redis)", status: "healthy", latency: 2, uptime: 99.99 },
  { name: "Database (PostgreSQL)", status: "healthy", latency: 8, uptime: 99.99 },
  { name: "ML Pipeline", status: "healthy", latency: 156, uptime: 99.90 },
]

// 시계열 데이터
const generateTimeSeriesData = () => {
  const data = []
  const now = new Date()
  for (let i = 60; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000)
    data.push({
      time: time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      cpu: 40 + Math.random() * 20,
      memory: 55 + Math.random() * 15,
      requests: 1000 + Math.random() * 500,
      latency: 20 + Math.random() * 10,
    })
  }
  return data
}

const ALERTS = [
  {
    id: "1",
    severity: "warning",
    message: "Analytics 서비스 응답 지연 (>40ms)",
    time: "5분 전",
    acknowledged: false,
  },
  {
    id: "2",
    severity: "info",
    message: "ML Pipeline 스케줄 작업 완료",
    time: "15분 전",
    acknowledged: true,
  },
  {
    id: "3",
    severity: "info",
    message: "시스템 자동 백업 완료",
    time: "1시간 전",
    acknowledged: true,
  },
]

export default function MonitoringPage() {
  const [timeSeriesData, setTimeSeriesData] = useState(generateTimeSeriesData())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState("30")

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      setTimeSeriesData(generateTimeSeriesData())
    }, parseInt(refreshInterval) * 1000)

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
        return <Clock className="h-4 w-4 text-muted-foreground" />
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
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-500" />
            실시간 모니터링
          </h2>
          <p className="text-muted-foreground">
            시스템 리소스와 서비스 상태를 실시간으로 모니터링합니다.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">자동 새로고침</span>
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
          <Button variant="outline">
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
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.cpu}%</div>
            <Progress value={REALTIME_METRICS.cpu} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">8 코어 / 16 스레드</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">메모리</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.memory}%</div>
            <Progress value={REALTIME_METRICS.memory} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">19.8GB / 32GB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">디스크</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.disk}%</div>
            <Progress value={REALTIME_METRICS.disk} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">380GB / 1TB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">네트워크</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.network} Mbps</div>
            <div className="flex items-center gap-2 mt-2 text-xs">
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
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.requests}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% from avg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 지연</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.latency}ms</div>
            <p className="text-xs text-muted-foreground mt-1">P99: 45ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">에러율</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.errors}%</div>
            <p className="text-xs text-green-600 mt-1">정상 범위</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">가동률</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{REALTIME_METRICS.uptime}%</div>
            <p className="text-xs text-muted-foreground mt-1">30일 기준</p>
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
            <div className="space-y-3">
              {SERVICES.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.latency}ms • {service.uptime}% uptime
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={service.status === "healthy" ? "secondary" : "outline"}
                    className={service.status === "warning" ? "border-yellow-500 text-yellow-600" : ""}
                  >
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
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
              <Button variant="outline" size="sm">
                <Bell className="mr-2 h-4 w-4" />
                알림 설정
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    !alert.acknowledged ? "bg-muted/50" : ""
                  }`}
                >
                  {alert.severity === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                  </div>
                  {getSeverityBadge(alert.severity)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
