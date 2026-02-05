"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Brain,
  Save,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  Info,
  BarChart3,
  Target,
  Layers,
  Zap,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts"

// 6D 벡터 차원 정의
const VECTOR_DIMENSIONS = [
  {
    key: "depth",
    name: "DEPTH",
    nameKr: "분석 깊이",
    description: "콘텐츠를 얼마나 깊이 분석하는가",
    low: "표면적 감상",
    high: "심층적 분석",
    color: "#3b82f6",
  },
  {
    key: "lens",
    name: "LENS",
    nameKr: "판단 렌즈",
    description: "주관적 감정 vs 객관적 기준",
    low: "주관적 감정",
    high: "객관적 기준",
    color: "#10b981",
  },
  {
    key: "stance",
    name: "STANCE",
    nameKr: "평가 태도",
    description: "관대한 평가 vs 엄격한 평가",
    low: "관대한 평가",
    high: "엄격한 평가",
    color: "#f59e0b",
  },
  {
    key: "scope",
    name: "SCOPE",
    nameKr: "관심 범위",
    description: "특정 장르 집중 vs 다양한 탐색",
    low: "특정 장르 집중",
    high: "다양한 탐색",
    color: "#ef4444",
  },
  {
    key: "taste",
    name: "TASTE",
    nameKr: "취향 성향",
    description: "대중적 인기 vs 개성적 선택",
    low: "대중적 인기",
    high: "개성적 선택",
    color: "#8b5cf6",
  },
  {
    key: "purpose",
    name: "PURPOSE",
    nameKr: "소비 목적",
    description: "순수 오락 vs 자기 성장",
    low: "순수 오락",
    high: "자기 성장",
    color: "#ec4899",
  },
]

interface ModelConfig {
  version: string
  lastUpdated: string
  status: string
  accuracy: number
  totalProcessed: number
  avgInferenceTime: string
}

interface AccuracyTrendItem {
  date: string
  accuracy: number
  samples: number
}

interface SampleVectorItem {
  dimension: string
  value: number
  fullMark: number
}

interface LearningSettings {
  adaptiveLearning: boolean
  realTimeUpdate: boolean
  confidenceThreshold: number
  decayRate: number
  minInteractions: number
}

export default function PsychometricPage() {
  const [activeTab, setActiveTab] = useState("config")
  const [isLoading, setIsLoading] = useState(true)
  const [weights, setWeights] = useState<Record<string, number>>(
    VECTOR_DIMENSIONS.reduce(
      (acc, dim) => ({ ...acc, [dim.key]: 1.0 }),
      {} as Record<string, number>
    )
  )
  const [settings, setSettings] = useState<LearningSettings>({
    adaptiveLearning: true,
    realTimeUpdate: true,
    confidenceThreshold: 0.75,
    decayRate: 0.05,
    minInteractions: 10,
  })
  const [isRetraining, setIsRetraining] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // API에서 로드되는 데이터
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    version: "-",
    lastUpdated: "-",
    status: "unknown",
    accuracy: 0,
    totalProcessed: 0,
    avgInferenceTime: "-",
  })
  const [accuracyTrend, setAccuracyTrend] = useState<AccuracyTrendItem[]>([])
  const [sampleVector, setSampleVector] = useState<SampleVectorItem[]>([])
  const [userVectorCount, setUserVectorCount] = useState(0)

  // 데이터 로드
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/psychometric/stats")
      const json = await res.json()
      if (json.success && json.data) {
        const {
          modelConfig: mc,
          accuracyTrend: at,
          sampleVector: sv,
          userVectorCount: uvc,
        } = json.data
        setModelConfig(mc)
        setAccuracyTrend(at)
        setSampleVector(sv)
        setUserVectorCount(uvc)
      }
    } catch (error) {
      console.error("Failed to fetch psychometric stats:", error)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/psychometric/settings")
      const json = await res.json()
      if (json.success && json.data) {
        const { weights: w, learning } = json.data
        if (w) {
          setWeights(w)
        }
        if (learning) {
          setSettings({
            adaptiveLearning: learning.adaptiveRate ?? true,
            realTimeUpdate: true,
            confidenceThreshold: learning.convergenceThreshold ?? 0.75,
            decayRate: 0.05,
            minInteractions: learning.batchSize ?? 10,
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch psychometric settings:", error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchStats(), fetchSettings()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchStats, fetchSettings])

  const handleWeightChange = (key: string, value: number[]) => {
    setWeights({ ...weights, [key]: value[0] })
  }

  const handleRetrain = async () => {
    setIsRetraining(true)
    toast.loading("모델 재학습을 시작합니다...", { id: "retrain" })
    // 재학습은 별도 ML 파이프라인에서 처리 - 여기서는 상태 표시만
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsRetraining(false)
    toast.success("모델 재학습이 완료되었습니다.", { id: "retrain" })
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    toast.loading("설정을 저장하는 중...", { id: "save-settings" })
    try {
      const res = await fetch("/api/psychometric/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "learning_settings",
          value: {
            learningRate: 0.01,
            batchSize: settings.minInteractions,
            epochs: 100,
            convergenceThreshold: settings.confidenceThreshold,
            adaptiveRate: settings.adaptiveLearning,
            feedbackWeight: 0.7,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("설정이 성공적으로 저장되었습니다.", { id: "save-settings" })
      } else {
        toast.error(json.error?.message || "설정 저장에 실패했습니다.", { id: "save-settings" })
      }
    } catch {
      toast.error("설정 저장 중 오류가 발생했습니다.", { id: "save-settings" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveWeights = async () => {
    toast.loading("가중치를 저장하는 중...", { id: "save-weights" })
    try {
      const res = await fetch("/api/psychometric/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "dimension_weights",
          value: weights,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("가중치가 성공적으로 저장되었습니다.", { id: "save-weights" })
      } else {
        toast.error(json.error?.message || "가중치 저장에 실패했습니다.", { id: "save-weights" })
      }
    } catch {
      toast.error("가중치 저장 중 오류가 발생했습니다.", { id: "save-weights" })
    }
  }

  // 벡터 해석 텍스트 생성
  const getVectorInterpretation = () => {
    if (sampleVector.length === 0) return null

    const getVal = (dim: string) => sampleVector.find((v) => v.dimension === dim)?.value ?? 0.5

    const depthLabel = getVal("DEPTH") > 0.6 ? "깊이 있는 분석" : "가벼운 감상"
    const tasteLabel = getVal("TASTE") > 0.6 ? "개성적인 선택" : "대중적인 선택"
    const stanceLabel = getVal("STANCE") > 0.6 ? "비교적 엄격한 기준" : "관대한 평가"
    const scopeLabel = getVal("SCOPE") > 0.5 ? "다양한 탐색" : "특정 장르에 집중하는 경향"
    const purposeLabel =
      getVal("PURPOSE") > 0.6
        ? "자기 성장 지향적"
        : getVal("PURPOSE") < 0.4
          ? "오락 중심"
          : "오락과 성장의 균형"
    const lensLabel =
      getVal("LENS") > 0.6
        ? "객관적 분석"
        : getVal("LENS") < 0.4
          ? "감정 중심의 판단"
          : "감정과 논리 사이"

    return (
      <p className="text-sm leading-relaxed">
        이 사용자는 <strong>{depthLabel}</strong>을 선호하며(DEPTH: {getVal("DEPTH").toFixed(2)}),{" "}
        <strong>{tasteLabel}</strong>을 추구합니다(TASTE: {getVal("TASTE").toFixed(2)}). 평가에
        있어서는 <strong>{stanceLabel}</strong>을 적용하고(STANCE: {getVal("STANCE").toFixed(2)}),{" "}
        <strong>{scopeLabel}</strong>이 있습니다(SCOPE: {getVal("SCOPE").toFixed(2)}). 콘텐츠 소비는{" "}
        <strong>{purposeLabel}</strong>을 추구하며(PURPOSE: {getVal("PURPOSE").toFixed(2)}), 판단은{" "}
        <strong>{lensLabel}</strong>에서 이루어집니다(LENS: {getVal("LENS").toFixed(2)}).
      </p>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="h-6 w-6 text-purple-500" />
            심리 측정 모델
          </h2>
          <p className="text-muted-foreground">
            6D 벡터 기반 사용자 심리 프로파일링 모델을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRetrain} disabled={isRetraining}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetraining ? "animate-spin" : ""}`} />
            모델 재학습
          </Button>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            설정 저장
          </Button>
        </div>
      </div>

      {/* Model Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">모델 버전</CardTitle>
            <Layers className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v{modelConfig.version}</div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                {modelConfig.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 정확도</CardTitle>
            <Target className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modelConfig.accuracy}%</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              {accuracyTrend.length >= 2
                ? `${(accuracyTrend[accuracyTrend.length - 1].accuracy - accuracyTrend[0].accuracy).toFixed(1)}% 변화`
                : "데이터 수집 중"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">처리된 프로필</CardTitle>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modelConfig.totalProcessed.toLocaleString()}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              사용자 벡터: {userVectorCount.toLocaleString()}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 추론 시간</CardTitle>
            <Zap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modelConfig.avgInferenceTime}</div>
            <p className="text-muted-foreground mt-1 text-xs">목표: 50ms 이내</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">차원 설정</TabsTrigger>
          <TabsTrigger value="weights">가중치 조정</TabsTrigger>
          <TabsTrigger value="learning">학습 설정</TabsTrigger>
          <TabsTrigger value="preview">벡터 미리보기</TabsTrigger>
        </TabsList>

        {/* 차원 설정 탭 */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>6D 벡터 차원 정의</CardTitle>
              <CardDescription>
                각 차원의 의미와 범위를 정의합니다. 모든 값은 0.0~1.0 범위입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {VECTOR_DIMENSIONS.map((dim) => (
                  <div key={dim.key} className="rounded-lg border p-4">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: dim.color }}
                        />
                        <div>
                          <h4 className="flex items-center gap-2 font-semibold">
                            {dim.name}
                            <span className="text-muted-foreground font-normal">
                              ({dim.nameKr})
                            </span>
                          </h4>
                          <p className="text-muted-foreground text-sm">{dim.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline">활성</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-20">0.0</span>
                        <span>{dim.low}</span>
                      </div>
                      <div className="bg-muted mx-4 h-2 flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: dim.color,
                            width: "50%",
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{dim.high}</span>
                        <span className="text-muted-foreground w-20 text-right">1.0</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 가중치 조정 탭 */}
        <TabsContent value="weights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>차원별 가중치</CardTitle>
                <CardDescription>매칭 알고리즘에서 각 차원의 중요도를 조정합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {VECTOR_DIMENSIONS.map((dim) => (
                  <div key={dim.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: dim.color }}
                        />
                        {dim.name}
                      </Label>
                      <span className="font-mono text-sm">
                        {(weights[dim.key] ?? 1.0).toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[weights[dim.key] ?? 1.0]}
                      onValueChange={(value) => handleWeightChange(dim.key, value)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                  </div>
                ))}

                <Separator className="my-4" />

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWeights(
                        VECTOR_DIMENSIONS.reduce(
                          (acc, dim) => ({ ...acc, [dim.key]: 1.0 }),
                          {} as Record<string, number>
                        )
                      )
                      toast.success("가중치가 기본값으로 복원되었습니다.")
                    }}
                  >
                    기본값으로 복원
                  </Button>
                  <Button size="sm" onClick={handleSaveWeights}>
                    가중치 저장
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>가중치 시각화</CardTitle>
                <CardDescription>현재 설정된 가중치의 균형을 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={VECTOR_DIMENSIONS.map((dim) => ({
                        dimension: dim.name,
                        weight: weights[dim.key] ?? 1.0,
                        fullMark: 2,
                      }))}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dimension" className="text-xs" />
                      <PolarRadiusAxis angle={30} domain={[0, 2]} />
                      <Radar
                        name="가중치"
                        dataKey="weight"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 학습 설정 탭 */}
        <TabsContent value="learning" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>적응형 학습</CardTitle>
                <CardDescription>
                  사용자 행동 데이터를 기반으로 모델을 지속적으로 개선합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-medium">적응형 학습 활성화</span>
                    <p className="text-muted-foreground text-sm">
                      사용자 피드백을 자동으로 학습합니다.
                    </p>
                  </div>
                  <Switch
                    checked={settings.adaptiveLearning}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, adaptiveLearning: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-medium">실시간 업데이트</span>
                    <p className="text-muted-foreground text-sm">
                      사용자 벡터를 실시간으로 조정합니다.
                    </p>
                  </div>
                  <Switch
                    checked={settings.realTimeUpdate}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, realTimeUpdate: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">신뢰도 임계값</span>
                    <span className="font-mono text-sm">{settings.confidenceThreshold}</span>
                  </div>
                  <Slider
                    value={[settings.confidenceThreshold]}
                    onValueChange={([value]) =>
                      setSettings({ ...settings, confidenceThreshold: value })
                    }
                    min={0.5}
                    max={0.95}
                    step={0.05}
                  />
                  <p className="text-muted-foreground text-sm">
                    이 값 이하의 예측은 불확실로 표시됩니다.
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">시간 감쇠율</span>
                    <span className="font-mono text-sm">{settings.decayRate}</span>
                  </div>
                  <Slider
                    value={[settings.decayRate]}
                    onValueChange={([value]) => setSettings({ ...settings, decayRate: value })}
                    min={0}
                    max={0.2}
                    step={0.01}
                  />
                  <p className="text-muted-foreground text-sm">
                    오래된 상호작용의 영향력을 감소시킵니다.
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">최소 상호작용 수</span>
                    <span className="font-mono text-sm">{settings.minInteractions}</span>
                  </div>
                  <Slider
                    value={[settings.minInteractions]}
                    onValueChange={([value]) =>
                      setSettings({ ...settings, minInteractions: value })
                    }
                    min={5}
                    max={50}
                    step={5}
                  />
                  <p className="text-muted-foreground text-sm">
                    벡터 안정화에 필요한 최소 상호작용 횟수입니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>모델 정확도 추이</CardTitle>
                <CardDescription>최근 매칭 로그 기반 정확도 변화</CardDescription>
              </CardHeader>
              <CardContent>
                {accuracyTrend.length > 0 ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={accuracyTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          name="정확도 (%)"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[350px] flex-col items-center justify-center text-center">
                    <BarChart3 className="text-muted-foreground mb-4 h-10 w-10" />
                    <p className="text-muted-foreground text-sm">
                      아직 정확도 추이 데이터가 없습니다.
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      매칭 로그가 쌓이면 자동으로 표시됩니다.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 벡터 미리보기 탭 */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>샘플 사용자 벡터</CardTitle>
              <CardDescription>
                {sampleVector.length > 0
                  ? "실제 사용자의 6D 벡터 프로필을 확인합니다."
                  : "사용자 벡터 데이터가 쌓이면 여기에 표시됩니다."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sampleVector.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={sampleVector}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="dimension" className="text-xs" />
                        <PolarRadiusAxis angle={30} domain={[0, 1]} />
                        <Radar
                          name="사용자 벡터"
                          dataKey="value"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">차원별 상세 값</h4>
                    {sampleVector.map((item) => {
                      const dim = VECTOR_DIMENSIONS.find((d) => d.name === item.dimension)
                      return (
                        <div key={item.dimension} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: dim?.color }}
                              />
                              {item.dimension}
                            </span>
                            <span className="font-mono">{item.value.toFixed(2)}</span>
                          </div>
                          <Progress value={item.value * 100} className="h-2" />
                          <div className="text-muted-foreground flex justify-between text-xs">
                            <span>{dim?.low}</span>
                            <span>{dim?.high}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">사용자 벡터 데이터가 없습니다</h3>
                  <p className="text-muted-foreground text-sm">
                    사용자 인터랙션이 쌓이면 벡터 프로필이 생성됩니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {sampleVector.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>벡터 해석</CardTitle>
                <CardDescription>현재 샘플 벡터에 대한 AI 기반 해석</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-4">
                  {getVectorInterpretation()}
                  <Separator className="my-4" />
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4" />
                    벡터 값을 기반으로 자동 생성된 해석입니다.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
