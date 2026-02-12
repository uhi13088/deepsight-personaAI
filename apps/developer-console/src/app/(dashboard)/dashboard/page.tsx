"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle,
  Clock,
  DollarSign,
  Key,
  FileText,
  Play,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Bell,
  Radio,
  Wifi,
  Mail,
  MessageSquare,
  Webhook,
  X,
  Settings2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { cn, formatNumber, formatCurrency, formatRelativeTime } from "@/lib/utils"
import { toast } from "sonner"
import {
  dashboardService,
  type DashboardStats,
  type RecentActivity,
  type UsageByDay,
  type UsageByEndpoint,
  type DashboardPeriod,
  type RealTimeMetrics,
  type AlertItem,
  type AlertChannelConfig,
} from "@/services/dashboard-service"

const QUICK_ACTIONS = [
  { title: "새 API Key 생성", href: "/api-keys/new", icon: Key },
  { title: "문서 보기", href: "/docs", icon: FileText },
  { title: "Playground 열기", href: "/playground", icon: Play },
]

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "yesterday", label: "어제" },
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
]

export default function DashboardPage() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [period, setPeriod] = React.useState<DashboardPeriod>("7d")
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [recentLogs, setRecentLogs] = React.useState<RecentActivity[]>([])
  const [usageData, setUsageData] = React.useState<UsageByDay[]>([])
  const [usageByEndpoint, setUsageByEndpoint] = React.useState<UsageByEndpoint[]>([])

  // Real-time monitoring (§4.2)
  const [realtime, setRealtime] = React.useState<RealTimeMetrics | null>(null)
  const [realtimeEnabled, setRealtimeEnabled] = React.useState(false)

  // Alert center (§4.3)
  const [alerts, setAlerts] = React.useState<AlertItem[]>([])
  const [alertsOpen, setAlertsOpen] = React.useState(false)
  const [alertTab, setAlertTab] = React.useState<"notifications" | "settings">("notifications")
  const [alertChannels, setAlertChannels] = React.useState<AlertChannelConfig>({
    email: true,
    slack: false,
    webhook: false,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  })

  const unreadCount = alerts.filter((a) => !a.read).length

  const fetchData = React.useCallback(async (selectedPeriod: DashboardPeriod) => {
    try {
      setIsLoading(true)
      const data = await dashboardService.getStats(selectedPeriod)
      setStats(data.stats)
      setRecentLogs(data.recentActivity)
      setUsageData(data.usageByDay)
      setUsageByEndpoint(data.usageByEndpoint)
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      toast.error("대시보드 데이터를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  // Fetch alerts on mount
  React.useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await dashboardService.getAlerts()
        setAlerts(data)
      } catch {
        // Silent fail for alerts — non-critical
      }
    }
    fetchAlerts()
  }, [])

  // Fetch alert channels on mount
  React.useEffect(() => {
    const fetchChannels = async () => {
      try {
        const config = await dashboardService.getAlertChannels()
        setAlertChannels(config)
      } catch {
        // Silent fail — use defaults
      }
    }
    fetchChannels()
  }, [])

  // Real-time metrics polling (5s interval)
  React.useEffect(() => {
    if (!realtimeEnabled) {
      setRealtime(null)
      return
    }

    let cancelled = false

    const poll = async () => {
      try {
        const data = await dashboardService.getRealTimeMetrics()
        if (!cancelled) setRealtime(data)
      } catch {
        // Silent fail for realtime polling
      }
    }

    poll()
    const intervalId = setInterval(poll, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [realtimeEnabled])

  const handlePeriodChange = (value: string) => {
    setPeriod(value as DashboardPeriod)
  }

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await dashboardService.markAlertRead(alertId)
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)))
    } catch {
      toast.error("알림 읽음 처리에 실패했습니다.")
    }
  }

  const handleToggleChannel = async (channel: keyof AlertChannelConfig, value: boolean) => {
    const updated = { ...alertChannels, [channel]: value }
    setAlertChannels(updated)
    try {
      await dashboardService.updateAlertChannels(updated)
    } catch {
      toast.error("알림 채널 설정 저장에 실패했습니다.")
      setAlertChannels(alertChannels) // revert
    }
  }

  const userName = "Developer" // Replace with actual user name

  const dashboardMetrics = {
    apiCalls: { today: stats?.apiCalls.today ?? 0, change: stats?.apiCalls.change ?? 0 },
    successRate: { value: stats?.successRate.value ?? 0, change: stats?.successRate.change ?? 0 },
    latency: { p95: stats?.latency.p95 ?? 0, change: stats?.latency.change ?? 0 },
    cost: {
      thisMonth: stats?.cost.thisMonth ?? 0,
      percentUsed: stats?.cost.quotaLimit
        ? Math.round((stats.cost.quotaUsed / stats.cost.quotaLimit) * 100)
        : 0,
    },
  }

  if (isLoading && !stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section + Alert Center */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">안녕하세요, {userName}님!</h1>
          <p className="text-muted-foreground">
            오늘의 API 사용량: {formatNumber(dashboardMetrics.apiCalls.today)} calls | 이번 달:{" "}
            {formatNumber(stats?.apiCalls.thisMonth ?? 0)} calls
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Alert Center Dropdown (§4.3) */}
          <DropdownMenu open={alertsOpen} onOpenChange={setAlertsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-semibold">알림 센터</h3>
                <div className="flex gap-1">
                  <Button
                    variant={alertTab === "notifications" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setAlertTab("notifications")}
                  >
                    알림
                  </Button>
                  <Button
                    variant={alertTab === "settings" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setAlertTab("settings")}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {alertTab === "notifications" ? (
                <div className="max-h-[400px] overflow-y-auto">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "hover:bg-muted/50 flex items-start gap-3 border-b px-4 py-3 transition-colors",
                          !alert.read && "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                      >
                        <AlertTypeIcon type={alert.type} severity={alert.severity} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{alert.title}</p>
                            {!alert.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAlertRead(alert.id)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">{alert.message}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {formatRelativeTime(alert.timestamp)}
                            </span>
                            {alert.actionUrl && (
                              <Link
                                href={alert.actionUrl}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {alert.actionLabel ?? "자세히"}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <Bell className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                      <p className="text-muted-foreground text-sm">알림이 없습니다</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  <h4 className="text-sm font-medium">알림 채널 설정</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">이메일</span>
                      </div>
                      <Switch
                        checked={alertChannels.email}
                        onCheckedChange={(v) => handleToggleChannel("email", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">Slack</span>
                      </div>
                      <Switch
                        checked={alertChannels.slack}
                        onCheckedChange={(v) => handleToggleChannel("slack", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Webhook className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">Webhook</span>
                      </div>
                      <Switch
                        checked={alertChannels.webhook}
                        onCheckedChange={(v) => handleToggleChannel("webhook", v)}
                      />
                    </div>
                    <div className="mt-2 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">야간 알림 금지</span>
                        <Switch
                          checked={alertChannels.quietHoursEnabled}
                          onCheckedChange={(v) => handleToggleChannel("quietHoursEnabled", v)}
                        />
                      </div>
                      {alertChannels.quietHoursEnabled && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {alertChannels.quietHoursStart} ~ {alertChannels.quietHoursEnd}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {QUICK_ACTIONS.map((action) => (
            <Button key={action.href} variant="outline" asChild>
              <Link href={action.href} className="gap-2">
                <action.icon className="h-4 w-4" />
                {action.title}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Real-time Monitoring Panel (§4.2) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Radio
              className={cn(
                "h-4 w-4",
                realtimeEnabled ? "animate-pulse text-green-500" : "text-muted-foreground"
              )}
            />
            <CardTitle className="text-sm font-medium">Live Monitoring</CardTitle>
            {realtimeEnabled && (
              <Badge variant="success" className="text-xs">
                LIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">5초 갱신</span>
            <Switch checked={realtimeEnabled} onCheckedChange={setRealtimeEnabled} />
          </div>
        </CardHeader>
        <CardContent>
          {realtimeEnabled && realtime ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-muted-foreground text-xs">RPS</p>
                <p className="text-2xl font-bold">{realtime.rps.toFixed(1)}</p>
                <p className="text-muted-foreground text-xs">req/sec</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-muted-foreground text-xs">Success Rate</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    realtime.successRate >= 99
                      ? "text-green-600"
                      : realtime.successRate >= 95
                        ? "text-yellow-600"
                        : "text-red-600"
                  )}
                >
                  {realtime.successRate.toFixed(1)}%
                </p>
                <p className="text-muted-foreground text-xs">실시간</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-muted-foreground text-xs">Avg Response</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    realtime.avgResponseTime < 200
                      ? "text-green-600"
                      : realtime.avgResponseTime < 500
                        ? "text-yellow-600"
                        : "text-red-600"
                  )}
                >
                  {realtime.avgResponseTime}ms
                </p>
                <p className="text-muted-foreground text-xs">평균 응답시간</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-muted-foreground text-xs">Active Connections</p>
                <p className="text-2xl font-bold">{realtime.activeConnections}</p>
                <p className="text-muted-foreground text-xs">
                  <Wifi className="mr-1 inline h-3 w-3" />
                  활성 연결
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-center">
              <div>
                <Radio className="text-muted-foreground/30 mx-auto mb-2 h-6 w-6" />
                <p className="text-muted-foreground text-sm">
                  실시간 모니터링을 활성화하려면 스위치를 켜세요
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Filter */}
      <Tabs value={period} onValueChange={handlePeriodChange}>
        <TabsList>
          {PERIOD_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.value} value={opt.value}>
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* API Calls Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(dashboardMetrics.apiCalls.today)}
            </div>
            <ChangeIndicator value={dashboardMetrics.apiCalls.change} label="from yesterday" />
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.successRate.value}%</div>
            <ChangeIndicator
              value={dashboardMetrics.successRate.change}
              label="from last week"
              inverted={false}
            />
          </CardContent>
        </Card>

        {/* Latency P95 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latency P95</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.latency.p95}ms</div>
            <ChangeIndicator
              value={dashboardMetrics.latency.change}
              label="improvement"
              inverted
              suffix="ms"
            />
          </CardContent>
        </Card>

        {/* Cost This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost This Month</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardMetrics.cost.thisMonth)}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Progress value={dashboardMetrics.cost.percentUsed} className="h-2 flex-1" />
              <span>{dashboardMetrics.cost.percentUsed}% used</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Usage Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>
              API Usage ({PERIOD_OPTIONS.find((o) => o.value === period)?.label})
            </CardTitle>
            <CardDescription>Daily API call volume</CardDescription>
          </CardHeader>
          <CardContent>
            {usageData.length > 0 ? (
              <div className="flex h-[200px] items-end gap-2">
                {usageData.map((day, i) => {
                  const maxCalls = Math.max(...usageData.map((d) => d.calls))
                  const heightPercent = maxCalls > 0 ? (day.calls / maxCalls) * 100 : 0
                  const errorPercent =
                    day.errors > 0 && day.calls > 0 ? (day.errors / day.calls) * 100 : 0
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="relative w-full"
                        style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                      >
                        <div className="bg-primary hover:bg-primary/80 h-full w-full rounded-t transition-all" />
                        {errorPercent > 0 && (
                          <div
                            className="absolute bottom-0 left-0 w-full rounded-t bg-red-400/60"
                            style={{ height: `${errorPercent}%` }}
                          />
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {day.date.includes(" ") ? day.date.split(" ")[1] : day.date.slice(-5)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">사용 데이터가 없습니다</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest API calls</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/logs" className="gap-1">
                View all
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.status >= 200 && log.status < 300
                            ? "success"
                            : log.status >= 400
                              ? "destructive"
                              : "secondary"
                        }
                        className="font-mono text-xs"
                      >
                        {log.status}
                      </Badge>
                      <span className="text-muted-foreground font-mono text-xs uppercase">
                        {log.method}
                      </span>
                      <span className="text-muted-foreground max-w-[120px] truncate font-mono text-xs">
                        {log.endpoint.includes(" ") ? log.endpoint.split(" ")[1] : log.endpoint}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>{log.latency}ms</span>
                      <span>{formatRelativeTime(log.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Activity className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">최근 활동이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Top 5 + API Keys + Usage by Endpoint */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Error Top 5 */}
        <Card>
          <CardHeader>
            <CardTitle>Error Top 5</CardTitle>
            <CardDescription>Most frequent errors</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.errorTop5 && stats.errorTop5.length > 0 ? (
              <div className="space-y-3">
                {stats.errorTop5.map((err) => (
                  <div key={err.code} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      <span className="font-mono text-xs">{err.code}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>{err.count}회</span>
                      <span className="max-w-[80px] truncate">{err.endpoint}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">에러가 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active API Keys */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active API Keys</CardTitle>
              <CardDescription>Your API keys and their usage</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/api-keys/new" className="gap-1">
                <Key className="h-4 w-4" />
                New Key
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.activeKeys && stats.activeKeys.total > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{stats.activeKeys.total}</p>
                    <p className="text-muted-foreground text-xs">Total Keys</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.activeKeys.live}</p>
                    <p className="text-muted-foreground text-xs">Live</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.activeKeys.test}</p>
                    <p className="text-muted-foreground text-xs">Test</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/api-keys">Manage Keys</Link>
                </Button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Key className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">등록된 API Key가 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage by Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Endpoint</CardTitle>
            <CardDescription>API calls distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {usageByEndpoint.length > 0 ? (
              <div className="space-y-4">
                {usageByEndpoint.map((ep) => (
                  <div key={ep.endpoint} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <code className="font-mono text-xs">{ep.endpoint}</code>
                      <span className="text-muted-foreground text-xs">
                        {formatNumber(ep.calls)} ({ep.percentage}%)
                      </span>
                    </div>
                    <Progress value={ep.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <TrendingUp className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">사용 기록이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts - only shown when usage exceeds threshold */}
      {dashboardMetrics.cost.percentUsed >= 80 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-yellow-800 dark:text-yellow-200">Usage Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You&apos;ve used {dashboardMetrics.cost.percentUsed}% of your monthly API call quota.
              Consider upgrading your plan for more calls.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/billing">View Plans</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// Subcomponent: ChangeIndicator
// ============================================================================

function ChangeIndicator({
  value,
  label,
  inverted = false,
  suffix = "%",
}: {
  value: number
  label: string
  inverted?: boolean
  suffix?: string
}) {
  const isPositive = inverted ? value < 0 : value > 0
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight
  const colorClass = isPositive ? "text-green-500" : "text-red-500"

  return (
    <div className="text-muted-foreground flex items-center text-xs">
      <Icon className={cn("h-4 w-4", colorClass)} />
      <span className={colorClass}>
        {value > 0 ? "+" : ""}
        {value}
        {suffix}
      </span>
      <span className="ml-1">{label}</span>
    </div>
  )
}

// ============================================================================
// Subcomponent: AlertTypeIcon (§4.3)
// ============================================================================

function AlertTypeIcon({ type, severity }: { type: string; severity: string }) {
  const sizeClass = "h-4 w-4 mt-0.5"
  const colorClass =
    severity === "critical"
      ? "text-red-500"
      : severity === "warning"
        ? "text-yellow-500"
        : "text-blue-500"

  switch (type) {
    case "usage":
      return <Activity className={cn(sizeClass, colorClass)} />
    case "error":
      return <AlertTriangle className={cn(sizeClass, colorClass)} />
    case "security":
      return <AlertCircle className={cn(sizeClass, colorClass)} />
    case "billing":
      return <DollarSign className={cn(sizeClass, colorClass)} />
    case "system":
      return <Settings2 className={cn(sizeClass, colorClass)} />
    default:
      return <Bell className={cn(sizeClass, colorClass)} />
  }
}
