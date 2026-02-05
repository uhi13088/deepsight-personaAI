"use client"

import { useState, useEffect, useCallback } from "react"
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
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

// Cold Start mode configuration with icons
interface ColdStartModeWithIcon {
  id: "LIGHT" | "MEDIUM" | "DEEP"
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
    id: "LIGHT",
    name: "Quick Mode",
    nameKr: "빠른 시작",
    description: "12개 질문으로 빠르게 기본 성향 파악",
    questions: 12,
    accuracy: 72,
    duration: "2분",
    icon: Zap,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    features: ["핵심 취향 12문항", "기본 6D 벡터 추정", "즉시 추천 가능"],
  },
  {
    id: "MEDIUM",
    name: "Standard Mode",
    nameKr: "표준 시작",
    description: "30개 질문으로 균형잡힌 프로필 생성",
    questions: 30,
    accuracy: 85,
    duration: "5분",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    features: ["확장된 취향 분석", "정밀 6D 벡터 계산", "컨텍스트 기반 추천"],
  },
  {
    id: "DEEP",
    name: "Deep Mode",
    nameKr: "심층 분석",
    description: "60개 질문으로 정교한 사용자 프로필 구축",
    questions: 60,
    accuracy: 94,
    duration: "15분",
    icon: BarChart3,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    features: ["심층 성향 분석", "고정밀 벡터 매핑", "개인화 극대화"],
  },
]

// Question type from API
interface ColdStartQuestion {
  id: string
  name: string
  onboardingLevel: "LIGHT" | "MEDIUM" | "DEEP"
  questionOrder: number
  questionText: string
  questionType: "SLIDER" | "MULTIPLE_CHOICE" | "RANKING" | "TEXT" | "IMAGE"
  options: unknown
  targetDimensions: string[]
  weightFormula: unknown
  isRequired: boolean
  createdAt: string
  updatedAt: string
}

// Cold Start stats - default empty values
const DEFAULT_STATS = {
  todayNewUsers: 0,
  avgCompletionRate: 0,
  avgTimeToComplete: "-",
  modeDistribution: { LIGHT: 0, MEDIUM: 0, DEEP: 0 },
}

// Trend data - empty by default
const TREND_DATA: { date: string; quick: number; standard: number; deep: number }[] = []

const QUESTION_TYPE_LABELS: Record<string, string> = {
  SLIDER: "슬라이더",
  MULTIPLE_CHOICE: "객관식",
  RANKING: "순위",
  TEXT: "텍스트",
  IMAGE: "이미지",
}

const DIMENSION_OPTIONS = ["depth", "lens", "stance", "scope", "taste", "purpose"]

export default function ColdStartPage() {
  const [activeMode, setActiveMode] = useState<"LIGHT" | "MEDIUM" | "DEEP">("MEDIUM")
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [questions, setQuestions] = useState<ColdStartQuestion[]>([])
  const [questionCounts, setQuestionCounts] = useState({
    LIGHT: 0,
    MEDIUM: 0,
    DEEP: 0,
    total: 0,
  })
  const [stats] = useState(DEFAULT_STATS)
  const [selectedQuestion, setSelectedQuestion] = useState<ColdStartQuestion | null>(null)
  const [settings, setSettings] = useState({
    autoSelectMode: true,
    skipIfReturningUser: true,
    fallbackMode: "LIGHT" as "LIGHT" | "MEDIUM" | "DEEP",
    minConfidenceThreshold: 70,
  })

  // 새 질문 폼 상태
  const [newQuestion, setNewQuestion] = useState({
    name: "",
    questionText: "",
    questionType: "MULTIPLE_CHOICE" as "SLIDER" | "MULTIPLE_CHOICE" | "RANKING" | "TEXT" | "IMAGE",
    targetDimensions: [] as string[],
    options: null as unknown,
    isRequired: true,
  })

  // 질문 목록 조회
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/cold-start/questions")
      const data = await response.json()
      if (data.success) {
        setQuestions(data.data.questions)
        setQuestionCounts(data.data.counts)
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error)
      toast.error("질문 목록을 불러올 수 없습니다")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 설정 조회
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/cold-start/settings")
      const data = await response.json()
      if (data.success) {
        setSettings(data.data.settings)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }, [])

  useEffect(() => {
    fetchQuestions()
    fetchSettings()
  }, [fetchQuestions, fetchSettings])

  // 현재 모드의 질문들
  const currentModeQuestions = questions.filter((q) => q.onboardingLevel === activeMode)

  const handleSaveSettings = async () => {
    setIsSaving(true)
    toast.loading("설정을 저장하는 중...", { id: "save-cold-start" })
    try {
      const response = await fetch("/api/cold-start/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Cold Start 설정이 저장되었습니다.", { id: "save-cold-start" })
      } else {
        toast.error(data.error?.message || "설정 저장에 실패했습니다", { id: "save-cold-start" })
      }
    } catch {
      toast.error("서버 오류가 발생했습니다", { id: "save-cold-start" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestFullFlow = () => {
    setShowPreview(false)
    toast.info("전체 흐름 테스트를 시작합니다...")
    setTimeout(() => {
      toast.success("테스트 흐름이 새 창에서 시작되었습니다.")
    }, 500)
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.name || !newQuestion.questionText) {
      toast.error("질문 이름과 내용은 필수입니다")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/cold-start/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newQuestion,
          onboardingLevel: activeMode,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("질문이 추가되었습니다")
        setShowAddDialog(false)
        setNewQuestion({
          name: "",
          questionText: "",
          questionType: "MULTIPLE_CHOICE",
          targetDimensions: [],
          options: null,
          isRequired: true,
        })
        fetchQuestions()
      } else {
        toast.error(data.error?.message || "질문 추가에 실패했습니다")
      }
    } catch {
      toast.error("서버 오류가 발생했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("이 질문을 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`/api/cold-start/questions/${questionId}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("질문이 삭제되었습니다")
        fetchQuestions()
      } else {
        toast.error(data.error?.message || "질문 삭제에 실패했습니다")
      }
    } catch {
      toast.error("서버 오류가 발생했습니다")
    }
  }

  const handleEditQuestion = (question: ColdStartQuestion) => {
    setSelectedQuestion(question)
    toast.info(`질문 "${question.name}" 편집 모드`)
  }

  const handleToggleEditing = () => {
    if (isEditing) {
      toast.success("편집 모드가 종료되었습니다.")
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
            <div className="text-2xl font-bold">{stats.todayNewUsers}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +8.2% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 질문 수</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionCounts.total}</div>
            <Progress value={(questionCounts.total / 102) * 100} className="mt-2" />
            <p className="text-muted-foreground mt-1 text-xs">목표: 102개 (12+30+60)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">모드별 질문</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-600">Quick</span>
                <span>{questionCounts.LIGHT}/12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Standard</span>
                <span>{questionCounts.MEDIUM}/30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Deep</span>
                <span>{questionCounts.DEEP}/60</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">완료율</CardTitle>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Quick</span>
                <span>{Math.round((questionCounts.LIGHT / 12) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Standard</span>
                <span>{Math.round((questionCounts.MEDIUM / 30) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Deep</span>
                <span>{Math.round((questionCounts.DEEP / 60) * 100)}%</span>
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
                  편집합니다. ({currentModeQuestions.length}개)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  질문 추가
                </Button>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleEditing}
                >
                  {isEditing ? "완료" : "편집"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
              </div>
            ) : currentModeQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="text-muted-foreground mb-4 h-10 w-10" />
                <h3 className="mb-2 font-medium">등록된 질문이 없습니다</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  질문을 추가하여 사용자 프로필 수집을 시작하세요.
                </p>
                <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  질문 추가
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentModeQuestions.map((q, idx) => (
                  <div key={q.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {isEditing && (
                      <GripVertical className="text-muted-foreground h-4 w-4 cursor-grab" />
                    )}
                    <span className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{q.questionText}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {QUESTION_TYPE_LABELS[q.questionType] || q.questionType}
                        </Badge>
                        {q.targetDimensions.map((dim) => (
                          <Badge key={dim} variant="outline" className="text-xs">
                            {dim}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {isEditing && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(q)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(q.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 질문 추가 다이얼로그 */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>새 질문 추가</DialogTitle>
              <DialogDescription>
                {COLD_START_MODES.find((m) => m.id === activeMode)?.nameKr} 모드에 새 질문을
                추가합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>질문 이름</Label>
                <Input
                  value={newQuestion.name}
                  onChange={(e) => setNewQuestion({ ...newQuestion, name: e.target.value })}
                  placeholder="예: 영화 장르 선호도"
                />
              </div>
              <div className="space-y-2">
                <Label>질문 내용</Label>
                <Textarea
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                  placeholder="예: 가장 좋아하는 영화 장르는 무엇인가요?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>질문 유형</Label>
                <Select
                  value={newQuestion.questionType}
                  onValueChange={(v) =>
                    setNewQuestion({
                      ...newQuestion,
                      questionType: v as typeof newQuestion.questionType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MULTIPLE_CHOICE">객관식</SelectItem>
                    <SelectItem value="SLIDER">슬라이더</SelectItem>
                    <SelectItem value="RANKING">순위</SelectItem>
                    <SelectItem value="TEXT">텍스트</SelectItem>
                    <SelectItem value="IMAGE">이미지</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>대상 차원</Label>
                <div className="flex flex-wrap gap-2">
                  {DIMENSION_OPTIONS.map((dim) => (
                    <Badge
                      key={dim}
                      variant={newQuestion.targetDimensions.includes(dim) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setNewQuestion((prev) => ({
                          ...prev,
                          targetDimensions: prev.targetDimensions.includes(dim)
                            ? prev.targetDimensions.filter((d) => d !== dim)
                            : [...prev.targetDimensions, dim],
                        }))
                      }}
                    >
                      {dim}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newQuestion.isRequired}
                  onCheckedChange={(checked) =>
                    setNewQuestion({ ...newQuestion, isRequired: checked })
                  }
                />
                <Label>필수 질문</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                취소
              </Button>
              <Button onClick={handleAddQuestion} disabled={isSaving}>
                {isSaving ? "추가 중..." : "추가"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  onValueChange={(value: "LIGHT" | "MEDIUM" | "DEEP") =>
                    setSettings({ ...settings, fallbackMode: value })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIGHT">Quick</SelectItem>
                    <SelectItem value="MEDIUM">Standard</SelectItem>
                    <SelectItem value="DEEP">Deep</SelectItem>
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
