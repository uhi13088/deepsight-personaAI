"use client"

import { useState } from "react"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

// 성능 지표 데이터
const PERFORMANCE_KPI = {
  dailyMatches: 156789,
  matchAccuracy: 94.2,
  avgLatency: 23,
  userSatisfaction: 4.5,
  ctr: 28.6,
  nps: 72,
}

const TREND_DATA = [
  { date: "01/10", matches: 142345, accuracy: 93.1, latency: 25, ctr: 26.2 },
  { date: "01/11", matches: 148923, accuracy: 93.5, latency: 24, ctr: 27.1 },
  { date: "01/12", matches: 151234, accuracy: 93.8, latency: 23, ctr: 27.8 },
  { date: "01/13", matches: 149876, accuracy: 94.0, latency: 24, ctr: 28.2 },
  { date: "01/14", matches: 154321, accuracy: 94.1, latency: 22, ctr: 28.4 },
  { date: "01/15", matches: 153456, accuracy: 94.2, latency: 23, ctr: 28.5 },
  { date: "01/16", matches: 156789, accuracy: 94.2, latency: 23, ctr: 28.6 },
]

const ALGORITHM_PERFORMANCE = [
  {
    algorithm: "Hybrid v2.1",
    matches: 78234,
    accuracy: 95.2,
    avgLatency: 22,
    ctr: 29.1,
    status: "primary",
  },
  {
    algorithm: "Context-Aware",
    matches: 45678,
    accuracy: 93.8,
    avgLatency: 25,
    ctr: 27.8,
    status: "secondary",
  },
  {
    algorithm: "Cosine Similarity",
    matches: 23456,
    accuracy: 92.1,
    avgLatency: 18,
    ctr: 26.2,
    status: "legacy",
  },
  {
    algorithm: "Weighted Euclidean",
    matches: 9421,
    accuracy: 91.5,
    avgLatency: 20,
    ctr: 25.8,
    status: "legacy",
  },
]

const TOP_PERSONAS = [
  { name: "논리적 평론가", matches: 23456, accuracy: 96.5, ctr: 31.2 },
  { name: "감성 에세이스트", matches: 21345, accuracy: 95.2, ctr: 29.8 },
  { name: "트렌드 헌터", matches: 19876, accuracy: 94.1, ctr: 28.5 },
  { name: "균형 잡힌 가이드", matches: 18234, accuracy: 93.8, ctr: 27.9 },
  { name: "시네필 평론가", matches: 15678, accuracy: 95.8, ctr: 30.1 },
]

const FEEDBACK_DATA = [
  { type: "positive", count: 89234, percentage: 85 },
  { type: "neutral", count: 10523, percentage: 10 },
  { type: "negative", count: 5243, percentage: 5 },
]

const FEEDBACK_COLORS = {
  positive: "#10b981",
  neutral: "#94a3b8",
  negative: "#ef4444",
}

export default function PerformancePage() {
  const [dateRange, setDateRange] = useState("7d")
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      toast.success("데이터가 새로고침되었습니다")
    }, 1500)
  }

  const handleExportReport = () => {
    const reportData = {
      dateRange,
      kpi: PERFORMANCE_KPI,
      trendData: TREND_DATA,
      algorithmPerformance: ALGORITHM_PERFORMANCE,
      topPersonas: TOP_PERSONAS,
      feedbackData: FEEDBACK_DATA,
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
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            성능 분석
          </h2>
          <p className="text-muted-foreground">
            매칭 엔진의 전반적인 성능 지표를 모니터링합니다.
          </p>
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
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {PERFORMANCE_KPI.dailyMatches.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +8.2%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">정확도</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PERFORMANCE_KPI.matchAccuracy}%</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +0.4%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 지연</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PERFORMANCE_KPI.avgLatency}ms</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              -2ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">만족도</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PERFORMANCE_KPI.userSatisfaction}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +0.2
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CTR</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PERFORMANCE_KPI.ctr}%</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +1.2%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NPS</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PERFORMANCE_KPI.nps}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
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
                <AreaChart data={TREND_DATA}>
                  <defs>
                    <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" domain={[90, 100]} className="text-xs" />
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
                <LineChart data={TREND_DATA}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" domain={[15, 30]} className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" domain={[24, 32]} className="text-xs" />
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
                {ALGORITHM_PERFORMANCE.map((algo) => (
                  <TableRow key={algo.algorithm}>
                    <TableCell className="font-medium">{algo.algorithm}</TableCell>
                    <TableCell className="text-right">
                      {algo.matches.toLocaleString()}
                    </TableCell>
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
                    data={FEEDBACK_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="type"
                  >
                    {FEEDBACK_DATA.map((entry) => (
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
                    formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {FEEDBACK_DATA.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          FEEDBACK_COLORS[item.type as keyof typeof FEEDBACK_COLORS],
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
            {TOP_PERSONAS.map((persona, index) => (
              <div key={persona.name} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-sm truncate">{persona.name}</span>
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
