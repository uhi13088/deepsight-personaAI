"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Snowflake,
  Zap,
  Clock,
  Target,
  CheckCircle,
  Settings,
  Play,
  Users,
  TrendingUp,
  BarChart3,
  Info,
  LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import {
  MOCK_COLD_START_STATS,
  MOCK_COLD_START_TREND_DATA,
  MOCK_COLD_START_QUESTION_SETS,
} from "@/services/mock-data.service"

// Cold Start mode configuration with icons (icons cannot be serialized in mock-data.service)
// The base data comes from the centralized service, icons are added here
interface ColdStartModeWithIcon {
  id: string
  name: string
  nameKr: string
  description: string
  questions: number
  accuracy: number
  duration: string
  icon: LucideIcon
  color: string
  bgColor: string
  features: string[]
}

const COLD_START_MODES: ColdStartModeWithIcon[] = [
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
    features: ["핵심 취향 3문항", "기본 6D 벡터 추정", "즉시 추천 가능"],
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
    features: ["확장된 취향 분석", "정밀 6D 벡터 계산", "컨텍스트 기반 추천"],
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
    features: ["심층 성향 분석", "고정밀 벡터 매핑", "개인화 극대화"],
  },
]

// Use centralized mock data
const COLD_START_STATS = MOCK_COLD_START_STATS
const TREND_DATA = MOCK_COLD_START_TREND_DATA
const QUESTION_SETS = MOCK_COLD_START_QUESTION_SETS

export default function ColdStartPage() {
  const [activeMode, setActiveMode] = useState("standard")
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [, setSelectedQuestion] = useState<{ id: number; question: string; type: string } | null>(
    null
  )
  const [settings, setSettings] = useState({
    autoSelectMode: true,
    skipIfReturningUser: true,
    fallbackMode: "quick",
    minConfidenceThreshold: 70,
  })

  const handleSaveSettings = async () => {
    setIsSaving(true)
    toast.loading("설정을 저장하는 중...", { id: "save-cold-start" })
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    toast.success("Cold Start 설정이 저장되었습니다.", { id: "save-cold-start" })
  }

  const handleTestFullFlow = () => {
    setShowPreview(false)
    toast.info("전체 흐름 테스트를 시작합니다...")
    // Simulate test flow initiation
    setTimeout(() => {
      toast.success("테스트 흐름이 새 창에서 시작되었습니다.")
    }, 500)
  }

  const handleAddQuestion = () => {
    toast.success("새 질문이 추가되었습니다. 내용을 입력해주세요.")
  }

  const handleEditQuestion = (question: { id: number; question: string; type: string }) => {
    setSelectedQuestion(question)
    toast.info(`질문 ${question.id} 편집 모드`)
  }

  const handleToggleEditing = () => {
    if (isEditing) {
      // Saving
      toast.success("질문 세트가 저장되었습니다.")
    }
    setIsEditing(!isEditing)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
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
                <div className="bg-muted/30 rounded-lg border p-6">
                  <div className="space-y-4 text-center">
                    <h3 className="text-lg font-semibold">당신의 취향을 알려주세요</h3>
                    <p className="text-muted-foreground text-sm">
                      몇 가지 질문에 답해주시면 맞춤 추천을 제공해 드립니다.
                    </p>
                    <div className="mt-6 flex justify-center gap-4">
                      {COLD_START_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          className={`hover:border-primary rounded-lg border p-4 transition-colors ${
                            activeMode === mode.id ? "border-primary bg-primary/5" : ""
                          }`}
                          onClick={() => setActiveMode(mode.id)}
                        >
                          <mode.icon className={`mx-auto mb-2 h-8 w-8 ${mode.color}`} />
                          <p className="font-medium">{mode.nameKr}</p>
                          <p className="text-muted-foreground text-xs">{mode.duration}</p>
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
                <Button onClick={handleTestFullFlow}>전체 흐름 테스트</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
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
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{COLD_START_STATS.todayNewUsers}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +8.2% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">완료율</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{COLD_START_STATS.avgCompletionRate}%</div>
            <Progress value={COLD_START_STATS.avgCompletionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 완료 시간</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{COLD_START_STATS.avgTimeToComplete}</div>
            <p className="text-muted-foreground mt-1 text-xs">목표: 2분 이내</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">모드 분포</CardTitle>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
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
                className={`relative cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
                  activeMode === mode.id
                    ? "border-primary ring-primary/20 ring-2"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setActiveMode(mode.id)}
              >
                {activeMode === mode.id && (
                  <Badge className="absolute -right-2 -top-2" variant="default">
                    활성
                  </Badge>
                )}
                <div className={`inline-flex rounded-lg p-2 ${mode.bgColor} mb-3`}>
                  <mode.icon className={`h-5 w-5 ${mode.color}`} />
                </div>
                <h3 className="font-semibold">{mode.name}</h3>
                <p className="text-muted-foreground mb-3 text-sm">{mode.nameKr}</p>
                <p className="mb-4 text-sm">{mode.description}</p>

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
                  {COLD_START_MODES.find((m) => m.id === activeMode)?.name} 모드의 질문을
                  편집합니다.
                </CardDescription>
              </div>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={handleToggleEditing}
              >
                {isEditing ? "저장" : "편집"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {QUESTION_SETS[activeMode as keyof typeof QUESTION_SETS]?.map((q, idx) => (
                <div key={q.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.question}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {q.type === "single"
                        ? "단일 선택"
                        : q.type === "multi"
                          ? "복수 선택"
                          : q.type === "ranking"
                            ? "순위"
                            : "척도"}
                    </Badge>
                  </div>
                  {isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(q)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
              <Button variant="outline" className="mt-4 w-full" onClick={handleAddQuestion}>
                + 질문 추가
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>고급 설정</CardTitle>
            <CardDescription>Cold Start 동작 방식을 세부 조정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">자동 모드 선택</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="text-muted-foreground h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      사용자 기기, 시간대 등을 고려하여 최적 모드 자동 선택
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-muted-foreground text-sm">
                  사용자 상황에 따라 최적 모드를 자동 선택합니다.
                </p>
              </div>
              <Switch
                checked={settings.autoSelectMode}
                onCheckedChange={(checked) => setSettings({ ...settings, autoSelectMode: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-medium">재방문 사용자 스킵</span>
                <p className="text-muted-foreground text-sm">
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
                  onValueChange={(value) => setSettings({ ...settings, fallbackMode: value })}
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
              <p className="text-muted-foreground text-sm">
                사용자가 모드를 선택하지 않을 경우 기본 적용됩니다.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">최소 신뢰도 임계값</span>
                <span className="font-mono text-sm">{settings.minConfidenceThreshold}%</span>
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
              <p className="text-muted-foreground text-sm">
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
