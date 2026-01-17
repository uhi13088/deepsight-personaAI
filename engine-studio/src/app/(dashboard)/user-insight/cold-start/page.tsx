"use client"

import { useState } from "react"
import {
  Snowflake,
  Zap,
  Clock,
  Target,
  CheckCircle,
  Settings,
  Play,
  Pause,
  RefreshCw,
  ChevronRight,
  Users,
  TrendingUp,
  BarChart3,
  Info,
  AlertCircle,
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
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

// Cold Start 모드 정의
const COLD_START_MODES = [
  {
    id: "quick",
    name: "Quick Mode",
    nameKr: "빠른 시작",
    description: "3개 질문으로 빠르게 기본 성향 파악",
    questions: 3,
    accuracy: 72,
    duration: "30초",
    icon: Zap,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    features: [
      "핵심 취향 3문항",
      "기본 6D 벡터 추정",
      "즉시 추천 가능",
    ],
  },
  {
    id: "standard",
    name: "Standard Mode",
    nameKr: "표준 시작",
    description: "7개 질문으로 균형잡힌 프로필 생성",
    questions: 7,
    accuracy: 85,
    duration: "2분",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    features: [
      "확장된 취향 분석",
      "정밀 6D 벡터 계산",
      "컨텍스트 기반 추천",
    ],
  },
  {
    id: "deep",
    name: "Deep Mode",
    nameKr: "심층 분석",
    description: "15개 질문으로 정교한 사용자 프로필 구축",
    questions: 15,
    accuracy: 94,
    duration: "5분",
    icon: BarChart3,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    features: [
      "심층 성향 분석",
      "고정밀 벡터 매핑",
      "개인화 극대화",
    ],
  },
]

// Mock 데이터
const COLD_START_STATS = {
  totalNewUsers: 12456,
  todayNewUsers: 342,
  avgCompletionRate: 78.5,
  avgTimeToComplete: "1분 42초",
  modeDistribution: {
    quick: 45,
    standard: 38,
    deep: 17,
  },
}

const TREND_DATA = [
  { date: "01/10", quick: 156, standard: 124, deep: 52 },
  { date: "01/11", quick: 178, standard: 145, deep: 61 },
  { date: "01/12", quick: 142, standard: 132, deep: 48 },
  { date: "01/13", quick: 189, standard: 156, deep: 72 },
  { date: "01/14", quick: 201, standard: 168, deep: 78 },
  { date: "01/15", quick: 167, standard: 142, deep: 65 },
  { date: "01/16", quick: 154, standard: 130, deep: 58 },
]

const QUESTION_SETS = {
  quick: [
    { id: 1, question: "콘텐츠를 선택할 때 가장 중요하게 생각하는 것은?", type: "single" },
    { id: 2, question: "평소 선호하는 분위기/톤은?", type: "single" },
    { id: 3, question: "새로운 콘텐츠 발견 방식은?", type: "single" },
  ],
  standard: [
    { id: 1, question: "콘텐츠를 선택할 때 가장 중요하게 생각하는 것은?", type: "single" },
    { id: 2, question: "평소 선호하는 분위기/톤은?", type: "single" },
    { id: 3, question: "새로운 콘텐츠 발견 방식은?", type: "single" },
    { id: 4, question: "콘텐츠 소비 시 집중하는 요소는?", type: "multi" },
    { id: 5, question: "선호하는 콘텐츠 길이는?", type: "single" },
    { id: 6, question: "비평/리뷰에 대한 태도는?", type: "single" },
    { id: 7, question: "콘텐츠 소비 목적은?", type: "multi" },
  ],
  deep: [
    // 15개 질문 (간략화)
    { id: 1, question: "콘텐츠 선택 기준", type: "single" },
    { id: 2, question: "분위기/톤 선호", type: "single" },
    { id: 3, question: "발견 방식", type: "single" },
    { id: 4, question: "집중 요소", type: "multi" },
    { id: 5, question: "콘텐츠 길이", type: "single" },
    { id: 6, question: "비평 태도", type: "single" },
    { id: 7, question: "소비 목적", type: "multi" },
    { id: 8, question: "장르 선호도", type: "ranking" },
    { id: 9, question: "시청 패턴", type: "single" },
    { id: 10, question: "공유 성향", type: "single" },
    { id: 11, question: "재시청 패턴", type: "single" },
    { id: 12, question: "트렌드 민감도", type: "scale" },
    { id: 13, question: "깊이 vs 다양성", type: "scale" },
    { id: 14, question: "감성 vs 논리", type: "scale" },
    { id: 15, question: "모험 성향", type: "scale" },
  ],
}

export default function ColdStartPage() {
  const [activeMode, setActiveMode] = useState("standard")
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [settings, setSettings] = useState({
    autoSelectMode: true,
    skipIfReturningUser: true,
    fallbackMode: "quick",
    minConfidenceThreshold: 70,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Snowflake className="h-6 w-6 text-blue-500" />
            Cold Start 전략
          </h2>
          <p className="text-muted-foreground">
            신규 사용자를 위한 초기 프로필 수집 전략을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Play className="mr-2 h-4 w-4" />
                미리보기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cold Start 미리보기</DialogTitle>
                <DialogDescription>
                  사용자가 경험하게 될 온보딩 흐름을 미리 확인합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="border rounded-lg p-6 bg-muted/30">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">당신의 취향을 알려주세요</h3>
                    <p className="text-sm text-muted-foreground">
                      몇 가지 질문에 답해주시면 맞춤 추천을 제공해 드립니다.
                    </p>
                    <div className="flex justify-center gap-4 mt-6">
                      {COLD_START_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          className={`p-4 border rounded-lg hover:border-primary transition-colors ${
                            activeMode === mode.id ? "border-primary bg-primary/5" : ""
                          }`}
                          onClick={() => setActiveMode(mode.id)}
                        >
                          <mode.icon className={`h-8 w-8 mx-auto mb-2 ${mode.color}`} />
                          <p className="font-medium">{mode.nameKr}</p>
                          <p className="text-xs text-muted-foreground">{mode.duration}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  닫기
                </Button>
                <Button>전체 흐름 테스트</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            설정 저장
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 신규 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{COLD_START_STATS.todayNewUsers}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">완료율</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{COLD_START_STATS.avgCompletionRate}%</div>
            <Progress value={COLD_START_STATS.avgCompletionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 완료 시간</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{COLD_START_STATS.avgTimeToComplete}</div>
            <p className="text-xs text-muted-foreground mt-1">목표: 2분 이내</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">모드 분포</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Quick</span>
                <span>{COLD_START_STATS.modeDistribution.quick}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Standard</span>
                <span>{COLD_START_STATS.modeDistribution.standard}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Deep</span>
                <span>{COLD_START_STATS.modeDistribution.deep}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Cold Start 모드</CardTitle>
          <CardDescription>
            신규 사용자의 초기 프로필을 수집하는 3가지 모드를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {COLD_START_MODES.map((mode) => (
              <div
                key={mode.id}
                className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  activeMode === mode.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setActiveMode(mode.id)}
              >
                {activeMode === mode.id && (
                  <Badge className="absolute -top-2 -right-2" variant="default">
                    활성
                  </Badge>
                )}
                <div className={`inline-flex p-2 rounded-lg ${mode.bgColor} mb-3`}>
                  <mode.icon className={`h-5 w-5 ${mode.color}`} />
                </div>
                <h3 className="font-semibold">{mode.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{mode.nameKr}</p>
                <p className="text-sm mb-4">{mode.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">질문 수</span>
                    <span className="font-medium">{mode.questions}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">예상 정확도</span>
                    <span className="font-medium">{mode.accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">소요 시간</span>
                    <span className="font-medium">{mode.duration}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <ul className="space-y-1">
                  {mode.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mode Details & Question Editor */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>질문 세트 편집</CardTitle>
                <CardDescription>
                  {COLD_START_MODES.find(m => m.id === activeMode)?.name} 모드의 질문을 편집합니다.
                </CardDescription>
              </div>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "저장" : "편집"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {QUESTION_SETS[activeMode as keyof typeof QUESTION_SETS]?.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.question}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {q.type === "single" ? "단일 선택" :
                       q.type === "multi" ? "복수 선택" :
                       q.type === "ranking" ? "순위" : "척도"}
                    </Badge>
                  </div>
                  {isEditing && (
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
              <Button variant="outline" className="w-full mt-4">
                + 질문 추가
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>고급 설정</CardTitle>
            <CardDescription>
              Cold Start 동작 방식을 세부 조정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">자동 모드 선택</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      사용자 기기, 시간대 등을 고려하여 최적 모드 자동 선택
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  사용자 상황에 따라 최적 모드를 자동 선택합니다.
                </p>
              </div>
              <Switch
                checked={settings.autoSelectMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoSelectMode: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-medium">재방문 사용자 스킵</span>
                <p className="text-sm text-muted-foreground">
                  이미 프로필이 있는 사용자는 건너뜁니다.
                </p>
              </div>
              <Switch
                checked={settings.skipIfReturningUser}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, skipIfReturningUser: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">폴백 모드</span>
                <Select
                  value={settings.fallbackMode}
                  onValueChange={(value) =>
                    setSettings({ ...settings, fallbackMode: value })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deep">Deep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                사용자가 모드를 선택하지 않을 경우 기본 적용됩니다.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">최소 신뢰도 임계값</span>
                <span className="text-sm font-mono">
                  {settings.minConfidenceThreshold}%
                </span>
              </div>
              <Slider
                value={[settings.minConfidenceThreshold]}
                onValueChange={([value]) =>
                  setSettings({ ...settings, minConfidenceThreshold: value })
                }
                min={50}
                max={95}
                step={5}
              />
              <p className="text-sm text-muted-foreground">
                이 임계값 이하면 추가 질문을 요청합니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>모드별 사용 추이</CardTitle>
          <CardDescription>최근 7일간 모드별 사용자 수 변화</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="colorQuick" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorStandard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDeep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="quick"
                  name="Quick"
                  stroke="#eab308"
                  fillOpacity={1}
                  fill="url(#colorQuick)"
                />
                <Area
                  type="monotone"
                  dataKey="standard"
                  name="Standard"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorStandard)"
                />
                <Area
                  type="monotone"
                  dataKey="deep"
                  name="Deep"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#colorDeep)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
