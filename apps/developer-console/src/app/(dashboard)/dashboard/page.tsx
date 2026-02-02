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
import {
  cn,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  getHttpStatusColor,
} from "@/lib/utils"

// Mock data - replace with real API calls
const dashboardMetrics = {
  apiCalls: { today: 1234, change: 12 },
  successRate: { value: 99.8, change: 0.2 },
  latency: { p95: 142, change: -5 },
  cost: { thisMonth: 234.56, percentUsed: 65 },
}

const usageData = [
  { date: "Jan 10", calls: 1100 },
  { date: "Jan 11", calls: 1250 },
  { date: "Jan 12", calls: 980 },
  { date: "Jan 13", calls: 1400 },
  { date: "Jan 14", calls: 1380 },
  { date: "Jan 15", calls: 1200 },
  { date: "Jan 16", calls: 1350 },
]

const recentLogs = [
  {
    id: "1",
    timestamp: new Date().toISOString(),
    endpoint: "POST /v1/match",
    status: 200,
    latency: 145,
    requestId: "req_abc123",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 30000).toISOString(),
    endpoint: "POST /v1/match",
    status: 200,
    latency: 132,
    requestId: "req_def456",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    endpoint: "POST /v1/feedback",
    status: 201,
    latency: 45,
    requestId: "req_ghi789",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 90000).toISOString(),
    endpoint: "POST /v1/match",
    status: 400,
    latency: 12,
    requestId: "req_jkl012",
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    endpoint: "GET /v1/personas",
    status: 200,
    latency: 78,
    requestId: "req_mno345",
  },
]

const quickActions = [
  { title: "새 API Key 생성", href: "/api-keys/new", icon: Key },
  { title: "문서 보기", href: "/docs/getting-started", icon: FileText },
  { title: "Playground 열기", href: "/playground", icon: Play },
]

export default function DashboardPage() {
  const userName = "Developer" // Replace with actual user name

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">안녕하세요, {userName}님!</h1>
          <p className="text-muted-foreground">
            오늘의 API 사용량: {formatNumber(dashboardMetrics.apiCalls.today)} calls | 이번 달:{" "}
            {formatNumber(45678)} calls
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
                    <span className="text-muted-foreground text-xs">{day.date.split(" ")[1]}</span>
                  </div>
                )
              })}
            </div>
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
                      {log.endpoint.split(" ")[1]}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span>{log.latency}ms</span>
                    <span>{formatRelativeTime(log.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <td className="font-medium">Production Server</td>
                  <td>
                    <Badge variant="default">Live</Badge>
                  </td>
                  <td className="text-muted-foreground">2 min ago</td>
                  <td className="text-right">{formatNumber(12500)}</td>
                </TableRow>
                <TableRow>
                  <td className="font-medium">Development</td>
                  <td>
                    <Badge variant="secondary">Test</Badge>
                  </td>
                  <td className="text-muted-foreground">1 hour ago</td>
                  <td className="text-right">{formatNumber(890)}</td>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Usage by Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Endpoint</CardTitle>
            <CardDescription>API calls distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { endpoint: "/v1/match", calls: 45000, percentage: 69 },
                { endpoint: "/v1/personas", calls: 12000, percentage: 18 },
                { endpoint: "/v1/feedback", calls: 8000, percentage: 12 },
              ].map((item) => (
                <div key={item.endpoint} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono">{item.endpoint}</span>
                    <span className="text-muted-foreground">
                      {formatNumber(item.calls)} ({item.percentage}%)
                    </span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-yellow-800 dark:text-yellow-200">Usage Alert</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            You've used 65% of your monthly API call quota. Consider upgrading to Pro for more
            calls.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/billing">View Plans</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
