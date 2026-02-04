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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatNumber, formatCurrency, formatRelativeTime } from "@/lib/utils"
import { toast } from "sonner"
import {
  dashboardService,
  type DashboardStats,
  type RecentActivity,
  type UsageByDay,
  type UsageByEndpoint,
} from "@/services/dashboard-service"

const quickActions = [
  { title: "새 API Key 생성", href: "/api-keys/new", icon: Key },
  { title: "문서 보기", href: "/docs", icon: FileText },
  { title: "Playground 열기", href: "/playground", icon: Play },
]

export default function DashboardPage() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [recentLogs, setRecentLogs] = React.useState<RecentActivity[]>([])
  const [usageData, setUsageData] = React.useState<UsageByDay[]>([])
  const [usageByEndpoint, setUsageByEndpoint] = React.useState<UsageByEndpoint[]>([])

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dashboardService.getStats()
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
    }
    fetchData()
  }, [])

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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">안녕하세요, {userName}님!</h1>
          <p className="text-muted-foreground">
            오늘의 API 사용량: {formatNumber(dashboardMetrics.apiCalls.today)} calls | 이번 달:{" "}
            {formatNumber(stats?.apiCalls.thisMonth ?? 0)} calls
          </p>
        </div>
        <div className="flex gap-2">
          {quickActions.map((action) => (
            <Button key={action.href} variant="outline" asChild>
              <Link href={action.href} className="gap-2">
                <action.icon className="h-4 w-4" />
                {action.title}
              </Link>
            </Button>
          ))}
        </div>
      </div>

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
            <div className="text-muted-foreground flex items-center text-xs">
              {dashboardMetrics.apiCalls.change > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{dashboardMetrics.apiCalls.change}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{dashboardMetrics.apiCalls.change}%</span>
                </>
              )}
              <span className="ml-1">from yesterday</span>
            </div>
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
            <div className="text-muted-foreground flex items-center text-xs">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              <span className="text-green-500">+{dashboardMetrics.successRate.change}%</span>
              <span className="ml-1">from last week</span>
            </div>
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
            <div className="text-muted-foreground flex items-center text-xs">
              <ArrowDownRight className="h-4 w-4 text-green-500" />
              <span className="text-green-500">{dashboardMetrics.latency.change}ms</span>
              <span className="ml-1">improvement</span>
            </div>
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
            <CardTitle>API Usage (Last 7 Days)</CardTitle>
            <CardDescription>Daily API call volume</CardDescription>
          </CardHeader>
          <CardContent>
            {usageData.length > 0 ? (
              <div className="flex h-[200px] items-end gap-2">
                {usageData.map((day, i) => {
                  const maxCalls = Math.max(...usageData.map((d) => d.calls))
                  const heightPercent = (day.calls / maxCalls) * 100
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="bg-primary hover:bg-primary/80 w-full rounded-t transition-all"
                        style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                      />
                      <span className="text-muted-foreground text-xs">
                        {day.date.split(" ")[1]}
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

      {/* API Keys and Usage Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                      <code className="font-mono">{ep.endpoint}</code>
                      <span className="text-muted-foreground">
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
              Consider upgrading to Pro for more calls.
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
