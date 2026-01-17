"use client"

import { useSession } from "next-auth/react"
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  ThumbsUp,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Activity,
  Zap,
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
  BarChart,
  Bar,
} from "recharts"

// Mock 데이터
const KPI_DATA = {
  totalMatches: 156789,
  todayMatches: 3456,
  matchingAccuracy: 94.2,
  avgMatchScore: 87.5,
  ctr: 23.8,
  nps: 72,
  activePersonas: 48,
  totalPersonas: 52,
}

const TREND_DATA = [
  { date: "01/10", matches: 2800, accuracy: 93.1 },
  { date: "01/11", matches: 3200, accuracy: 93.8 },
  { date: "01/12", matches: 2950, accuracy: 94.0 },
  { date: "01/13", matches: 3100, accuracy: 93.5 },
  { date: "01/14", matches: 3400, accuracy: 94.2 },
  { date: "01/15", matches: 3250, accuracy: 94.5 },
  { date: "01/16", matches: 3456, accuracy: 94.2 },
]

const ACTIVITY_LOG = [
  {
    id: "1",
    type: "PERSONA_DEPLOYED",
    title: "페르소나 배포 완료",
    description: "'논리적 평론가' 페르소나가 프로덕션에 배포되었습니다.",
    time: "10분 전",
    status: "success",
  },
  {
    id: "2",
    type: "AB_TEST_COMPLETED",
    title: "A/B 테스트 완료",
    description: "'알고리즘 v2.1' 테스트가 종료되었습니다. 테스트 그룹이 5.2% 더 높은 CTR을 기록했습니다.",
    time: "1시간 전",
    status: "info",
  },
  {
    id: "3",
    type: "INCUBATOR",
    title: "인큐베이터 결과",
    description: "오늘 생성된 3개의 페르소나 중 2개가 품질 검증을 통과했습니다.",
    time: "3시간 전",
    status: "warning",
  },
  {
    id: "4",
    type: "PERSONA_CREATED",
    title: "새 페르소나 생성",
    description: "'감성 에세이스트' 페르소나가 생성되어 리뷰 대기 중입니다.",
    time: "5시간 전",
    status: "info",
  },
]

const TOP_PERSONAS = [
  { name: "논리적 평론가", matches: 12340, accuracy: 96.2, score: 92 },
  { name: "감성 에세이스트", matches: 10890, accuracy: 94.8, score: 89 },
  { name: "트렌드 헌터", matches: 9560, accuracy: 93.5, score: 87 },
  { name: "균형 잡힌 가이드", matches: 8230, accuracy: 95.1, score: 85 },
  { name: "시네필 평론가", matches: 7890, accuracy: 94.2, score: 83 },
]

const SYSTEM_STATUS = {
  api: { status: "healthy", latency: 142 },
  database: { status: "healthy", connections: 45 },
  matchingEngine: { status: "healthy", qps: 234 },
  incubator: { status: "idle", lastRun: "03:00 AM" },
}

export default function DashboardPage() {
  const { data: session } = useSession()

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

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            안녕하세요, {session?.user?.name}님!
          </h2>
          <p className="text-muted-foreground">
            오늘의 매칭 현황과 시스템 상태를 확인하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/personas/create">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              새 페르소나 생성
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
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {KPI_DATA.todayMatches.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">매칭 정확도</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{KPI_DATA.matchingAccuracy}%</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +0.7% from last week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 매칭 스코어</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{KPI_DATA.avgMatchScore}</div>
            <Progress value={KPI_DATA.avgMatchScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">활성 페르소나</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {KPI_DATA.activePersonas} / {KPI_DATA.totalPersonas}
            </div>
            <Progress
              value={(KPI_DATA.activePersonas / KPI_DATA.totalPersonas) * 100}
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
                <AreaChart data={TREND_DATA}>
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
                <LineChart data={TREND_DATA}>
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
              {TOP_PERSONAS.map((persona, index) => (
                <div key={persona.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{persona.name}</p>
                    <p className="text-xs text-muted-foreground">
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
              {ACTIVITY_LOG.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  {getActivityIcon(activity.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(SYSTEM_STATUS.api.status)} bg-current`} />
                  <span className="text-sm">API 서버</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {SYSTEM_STATUS.api.latency}ms
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(SYSTEM_STATUS.database.status)} bg-current`} />
                  <span className="text-sm">데이터베이스</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {SYSTEM_STATUS.database.connections} 연결
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(SYSTEM_STATUS.matchingEngine.status)} bg-current`} />
                  <span className="text-sm">매칭 엔진</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {SYSTEM_STATUS.matchingEngine.qps} QPS
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full text-gray-400 bg-current" />
                  <span className="text-sm">인큐베이터</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  마지막 실행: {SYSTEM_STATUS.incubator.lastRun}
                </span>
              </div>
            </div>

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
