"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  BarChart3,
  Target,
  Users,
  ThumbsUp,
  Download,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Zap,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// 기본 데이터 타입
interface KPI {
  dailyMatches: number
  matchAccuracy: number
  avgLatency: number
  userSatisfaction: number
  ctr: number
  nps: number
}

interface TrendItem {
  date: string
  matches: number
  accuracy: number
  latency: number
  ctr: number
}

interface AlgorithmItem {
  algorithm: string
  matches: number
  accuracy: number
  avgLatency: number
  ctr: number
  status: string
}

interface PersonaItem {
  name: string
  matches: number
  accuracy: number
  ctr: number
}

interface FeedbackItem {
  type: string
  count: number
  percentage: number
}

// 기본값
const DEFAULT_KPI: KPI = {
  dailyMatches: 0,
  matchAccuracy: 0,
  avgLatency: 0,
  userSatisfaction: 0,
  ctr: 0,
  nps: 0,
}

const DEFAULT_trendData: TrendItem[] = []
const DEFAULT_ALGORITHM_DATA: AlgorithmItem[] = []
const DEFAULT_PERSONAS: PersonaItem[] = []
const DEFAULT_FEEDBACK: FeedbackItem[] = [
  { type: "positive", count: 0, percentage: 0 },
  { type: "neutral", count: 0, percentage: 0 },
  { type: "negative", count: 0, percentage: 0 },
]

const FEEDBACK_COLORS = {
  positive: "#10b981",
  neutral: "#94a3b8",
  negative: "#ef4444",
}

export default function PerformancePage() {
  const [dateRange, setDateRange] = useState("7d")
  const [refreshing, setRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 데이터 상태
  const [kpi, setKpi] = useState<KPI>(DEFAULT_KPI)
  const [trendData, setTrendData] = useState<TrendItem[]>(DEFAULT_trendData)
  const [algorithmData, setAlgorithmData] = useState<AlgorithmItem[]>(DEFAULT_ALGORITHM_DATA)
  const [topPersonas, setTopPersonas] = useState<PersonaItem[]>(DEFAULT_PERSONAS)
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>(DEFAULT_FEEDBACK)

  // 데이터 가져오기
  const fetchPerformanceData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/matching/performance?range=${dateRange}`)
      const data = await response.json()

      if (data.success) {
        setKpi(data.data.kpi)
        setTrendData(data.data.trendData)
        setAlgorithmData(data.data.algorithmPerformance)
        setTopPersonas(data.data.topPersonas)
        setFeedbackData(data.data.feedbackData)
      }
    } catch (error) {
      console.error("Failed to fetch performance data:", error)
      toast.error("성능 데이터를 불러올 수 없습니다")
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  // 초기 로드 및 날짜 범위 변경 시 데이터 가져오기
  useEffect(() => {
    fetchPerformanceData()
  }, [fetchPerformanceData])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Clear any existing timeout before setting a new one
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    await fetchPerformanceData()

    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(false)
      toast.success("데이터가 새로고침되었습니다")
    }, 500)
  }

  const handleExportReport = () => {
    const reportData = {
      dateRange,
      kpi,
      trendData,
      algorithmPerformance: algorithmData,
      topPersonas,
      feedbackData,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `performance-report-${dateRange}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("리포트가 다운로드되었습니다", {
      description: `${dateRange === "1d" ? "오늘" : dateRange === "7d" ? "최근 7일" : dateRange === "30d" ? "최근 30일" : "최근 90일"} 성능 리포트`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            성능 분석
          </h2>
          <p className="text-muted-foreground">매칭 엔진의 전반적인 성능 지표를 모니터링합니다.</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">오늘</SelectItem>
              <SelectItem value="7d">최근 7일</SelectItem>
              <SelectItem value="30d">최근 30일</SelectItem>
              <SelectItem value="90d">최근 90일</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            리포트
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">일일 매칭</CardTitle>
            <Target className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.dailyMatches.toLocaleString()}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +8.2%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">정확도</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.matchAccuracy}%</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +0.4%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 지연</CardTitle>
            <Zap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.avgLatency}ms</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <ArrowDownRight className="mr-1 h-3 w-3" />
              -2ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">만족도</CardTitle>
            <ThumbsUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.userSatisfaction}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +0.2
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CTR</CardTitle>
            <Eye className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.ctr}%</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +1.2%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NPS</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.nps}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +5
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>매칭 수 & 정확도 추이</CardTitle>
            <CardDescription>최근 7일간 일별 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[90, 100]}
                    className="text-xs"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="matches"
                    name="매칭 수"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorMatches)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="accuracy"
                    name="정확도 (%)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Latency & CTR Chart */}
        <Card>
          <CardHeader>
            <CardTitle>지연시간 & CTR 추이</CardTitle>
            <CardDescription>응답 속도와 클릭률 상관관계</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" domain={[15, 30]} className="text-xs" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[24, 32]}
                    className="text-xs"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="latency"
                    name="지연시간 (ms)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ctr"
                    name="CTR (%)"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Algorithm Performance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>알고리즘별 성능</CardTitle>
            <CardDescription>각 매칭 알고리즘의 세부 성능 지표</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>알고리즘</TableHead>
                  <TableHead className="text-right">매칭 수</TableHead>
                  <TableHead className="text-right">정확도</TableHead>
                  <TableHead className="text-right">평균 지연</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {algorithmData.map((algo) => (
                  <TableRow key={algo.algorithm}>
                    <TableCell className="font-medium">{algo.algorithm}</TableCell>
                    <TableCell className="text-right">{algo.matches.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{algo.accuracy}%</TableCell>
                    <TableCell className="text-right">{algo.avgLatency}ms</TableCell>
                    <TableCell className="text-right">{algo.ctr}%</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          algo.status === "primary"
                            ? "default"
                            : algo.status === "secondary"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {algo.status === "primary"
                          ? "주력"
                          : algo.status === "secondary"
                            ? "보조"
                            : "레거시"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* User Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>사용자 피드백</CardTitle>
            <CardDescription>매칭 결과에 대한 피드백 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feedbackData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="type"
                  >
                    {feedbackData.map((entry) => (
                      <Cell
                        key={entry.type}
                        fill={FEEDBACK_COLORS[entry.type as keyof typeof FEEDBACK_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value) =>
                      typeof value === "number" ? value.toLocaleString() : value
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {feedbackData.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: FEEDBACK_COLORS[item.type as keyof typeof FEEDBACK_COLORS],
                      }}
                    />
                    <span className="text-sm capitalize">
                      {item.type === "positive"
                        ? "긍정"
                        : item.type === "neutral"
                          ? "중립"
                          : "부정"}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Personas Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 페르소나 성능</CardTitle>
          <CardDescription>가장 많이 매칭된 페르소나들의 성능 지표</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {topPersonas.map((persona, index) => (
              <div key={persona.name} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-medium">{persona.name}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">매칭</span>
                    <span>{persona.matches.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">정확도</span>
                    <span className="text-green-600">{persona.accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CTR</span>
                    <span>{persona.ctr}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
