"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  TrendingUp,
  Users,
  Target,
  ThumbsUp,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Activity,
  Zap,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
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
import {
  dashboardService,
  type DashboardKPI,
  type TrendDataPoint,
  type ActivityLogItem,
  type TopPersona,
  type SystemStatus,
} from "@/services/dashboard-service"

export default function DashboardPage() {
  const { data: session } = useSession()

  // 상태 관리
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kpiData, setKpiData] = useState<DashboardKPI | null>(null)
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([])
  const [topPersonas, setTopPersonas] = useState<TopPersona[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)

  // 데이터 로드 함수
  const fetchDashboardData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const data = await dashboardService.getDashboardData()
      setKpiData(data.kpi)
      setTrendData(data.trendData)
      setActivityLog(data.activityLog)
      setTopPersonas(data.topPersonas)
      setSystemStatus(data.systemStatus)
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err)
      setError(err instanceof Error ? err.message : "데이터를 불러올 수 없습니다")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // 초기 데이터 로드
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // 새로고침 핸들러
  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500"
      case "warning":
        return "text-yellow-500"
      case "error":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getActivityIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error || !kpiData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="text-destructive mx-auto mb-4 h-8 w-8" />
          <p className="text-destructive">{error || "데이터를 불러올 수 없습니다"}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchDashboardData()}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            안녕하세요, {session?.user?.name || "사용자"}님!
          </h2>
          <p className="text-muted-foreground">오늘의 매칭 현황과 시스템 상태를 확인하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/personas/create">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />새 페르소나 생성
            </Button>
          </Link>
          <Link href="/matching-lab/simulator">
            <Button variant="outline">
              <Zap className="mr-2 h-4 w-4" />
              시뮬레이터 열기
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 매칭 수</CardTitle>
            <Target className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.todayMatches.toLocaleString()}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12.5% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">매칭 정확도</CardTitle>
            <ThumbsUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.matchingAccuracy}%</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +0.7% from last week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 매칭 스코어</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.avgMatchScore}</div>
            <Progress value={kpiData.avgMatchScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">활성 페르소나</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiData.activePersonas} / {kpiData.totalPersonas}
            </div>
            <Progress
              value={
                kpiData.totalPersonas > 0
                  ? (kpiData.activePersonas / kpiData.totalPersonas) * 100
                  : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Matching Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>매칭 추이</CardTitle>
            <CardDescription>최근 7일간 일별 매칭 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="matches"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorMatches)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>정확도 추이</CardTitle>
            <CardDescription>최근 7일간 매칭 정확도 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[90, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Top Personas */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Top 페르소나</CardTitle>
            <CardDescription>이번 주 가장 많이 매칭된 페르소나</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPersonas.map((persona, index) => (
                <div key={persona.name} className="flex items-center gap-3">
                  <span className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{persona.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {persona.matches.toLocaleString()} 매칭 · {persona.accuracy}% 정확도
                    </p>
                  </div>
                  <Badge variant="secondary">{persona.score}점</Badge>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Link href="/personas">
              <Button variant="ghost" className="w-full" size="sm">
                전체 보기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>시스템 이벤트 및 변경 사항</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLog.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  {getActivityIcon(activity.status)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {activity.description}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>시스템 상태</CardTitle>
            <CardDescription>실시간 서비스 모니터링</CardDescription>
          </CardHeader>
          <CardContent>
            {systemStatus && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${getStatusColor(systemStatus.api.status)} bg-current`}
                    />
                    <span className="text-sm">API 서버</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {systemStatus.api.latency}ms
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${getStatusColor(systemStatus.database.status)} bg-current`}
                    />
                    <span className="text-sm">데이터베이스</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {systemStatus.database.connections} 연결
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${getStatusColor(systemStatus.matchingEngine.status)} bg-current`}
                    />
                    <span className="text-sm">매칭 엔진</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {systemStatus.matchingEngine.qps} QPS
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-current text-gray-400" />
                    <span className="text-sm">인큐베이터</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    마지막 실행: {systemStatus.incubator.lastRun}
                  </span>
                </div>
              </div>
            )}

            <Separator className="my-4" />

            <Link href="/operations/monitoring">
              <Button variant="ghost" className="w-full" size="sm">
                상세 모니터링
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
