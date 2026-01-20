"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Brain,
  Settings,
  Save,
  RefreshCw,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Info,
  Sliders,
  BarChart3,
  PieChart,
  Target,
  Layers,
  GitBranch,
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
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
    weight: 1.0,
  },
  {
    key: "lens",
    name: "LENS",
    nameKr: "판단 렌즈",
    description: "주관적 감정 vs 객관적 기준",
    low: "주관적 감정",
    high: "객관적 기준",
    color: "#10b981",
    weight: 1.0,
  },
  {
    key: "stance",
    name: "STANCE",
    nameKr: "평가 태도",
    description: "관대한 평가 vs 엄격한 평가",
    low: "관대한 평가",
    high: "엄격한 평가",
    color: "#f59e0b",
    weight: 1.0,
  },
  {
    key: "scope",
    name: "SCOPE",
    nameKr: "관심 범위",
    description: "특정 장르 집중 vs 다양한 탐색",
    low: "특정 장르 집중",
    high: "다양한 탐색",
    color: "#ef4444",
    weight: 1.0,
  },
  {
    key: "taste",
    name: "TASTE",
    nameKr: "취향 성향",
    description: "대중적 인기 vs 개성적 선택",
    low: "대중적 인기",
    high: "개성적 선택",
    color: "#8b5cf6",
    weight: 1.0,
  },
  {
    key: "purpose",
    name: "PURPOSE",
    nameKr: "소비 목적",
    description: "순수 오락 vs 자기 성장",
    low: "순수 오락",
    high: "자기 성장",
    color: "#ec4899",
    weight: 1.0,
  },
]

// 모델 설정
const MODEL_CONFIG = {
  version: "3.0",
  lastUpdated: "2025-01-15",
  status: "active",
  accuracy: 94.2,
  totalProcessed: 156789,
  avgInferenceTime: "23ms",
}

// Mock 데이터
const ACCURACY_TREND = [
  { date: "01/10", accuracy: 93.1, samples: 12340 },
  { date: "01/11", accuracy: 93.5, samples: 13210 },
  { date: "01/12", accuracy: 93.8, samples: 14520 },
  { date: "01/13", accuracy: 94.0, samples: 15680 },
  { date: "01/14", accuracy: 94.1, samples: 16230 },
  { date: "01/15", accuracy: 94.2, samples: 17450 },
  { date: "01/16", accuracy: 94.2, samples: 18120 },
]

const SAMPLE_VECTOR = [
  { dimension: "DEPTH", value: 0.72, fullMark: 1 },
  { dimension: "LENS", value: 0.45, fullMark: 1 },
  { dimension: "STANCE", value: 0.68, fullMark: 1 },
  { dimension: "SCOPE", value: 0.35, fullMark: 1 },
  { dimension: "TASTE", value: 0.82, fullMark: 1 },
  { dimension: "PURPOSE", value: 0.55, fullMark: 1 },
]

export default function PsychometricPage() {
  const [activeTab, setActiveTab] = useState("config")
  const [weights, setWeights] = useState<Record<string, number>>(
    VECTOR_DIMENSIONS.reduce((acc, dim) => ({ ...acc, [dim.key]: dim.weight }), {})
  )
  const [settings, setSettings] = useState({
    adaptiveLearning: true,
    realTimeUpdate: true,
    confidenceThreshold: 0.75,
    decayRate: 0.05,
    minInteractions: 10,
  })
  const [isRetraining, setIsRetraining] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleWeightChange = (key: string, value: number[]) => {
    setWeights({ ...weights, [key]: value[0] })
  }

  const handleRetrain = async () => {
    setIsRetraining(true)
    toast.loading("모델 재학습을 시작합니다...", { id: "retrain" })
    // Simulate retraining process
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsRetraining(false)
    toast.success("모델 재학습이 완료되었습니다.", { id: "retrain" })
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    toast.loading("설정을 저장하는 중...", { id: "save-settings" })
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    toast.success("설정이 성공적으로 저장되었습니다.", { id: "save-settings" })
  }

  const handleSaveWeights = async () => {
    toast.loading("가중치를 저장하는 중...", { id: "save-weights" })
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast.success("가중치가 성공적으로 저장되었습니다.", { id: "save-weights" })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
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
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v{MODEL_CONFIG.version}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                {MODEL_CONFIG.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 정확도</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MODEL_CONFIG.accuracy}%</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +0.4% from last week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">처리된 프로필</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {MODEL_CONFIG.totalProcessed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              누적 사용자 프로필
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 추론 시간</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MODEL_CONFIG.avgInferenceTime}</div>
            <p className="text-xs text-muted-foreground mt-1">
              목표: 50ms 이내
            </p>
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
                  <div key={dim.key} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dim.color }}
                        />
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {dim.name}
                            <span className="text-muted-foreground font-normal">
                              ({dim.nameKr})
                            </span>
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {dim.description}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">활성</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-muted-foreground">0.0</span>
                        <span>{dim.low}</span>
                      </div>
                      <div className="flex-1 mx-4 h-2 bg-muted rounded-full overflow-hidden">
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
                        <span className="w-20 text-right text-muted-foreground">1.0</span>
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
                <CardDescription>
                  매칭 알고리즘에서 각 차원의 중요도를 조정합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {VECTOR_DIMENSIONS.map((dim) => (
                  <div key={dim.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: dim.color }}
                        />
                        {dim.name}
                      </Label>
                      <span className="text-sm font-mono">
                        {weights[dim.key].toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[weights[dim.key]]}
                      onValueChange={(value) => handleWeightChange(dim.key, value)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                  </div>
                ))}

                <Separator className="my-4" />

                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => {
                    setWeights(VECTOR_DIMENSIONS.reduce((acc, dim) => ({ ...acc, [dim.key]: 1.0 }), {}))
                    toast.success("가중치가 기본값으로 복원되었습니다.")
                  }}>
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
                <CardDescription>
                  현재 설정된 가중치의 균형을 확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={VECTOR_DIMENSIONS.map((dim) => ({
                        dimension: dim.name,
                        weight: weights[dim.key],
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
                    <p className="text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
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
                    <span className="text-sm font-mono">
                      {settings.confidenceThreshold}
                    </span>
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
                  <p className="text-sm text-muted-foreground">
                    이 값 이하의 예측은 불확실로 표시됩니다.
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">시간 감쇠율</span>
                    <span className="text-sm font-mono">
                      {settings.decayRate}
                    </span>
                  </div>
                  <Slider
                    value={[settings.decayRate]}
                    onValueChange={([value]) =>
                      setSettings({ ...settings, decayRate: value })
                    }
                    min={0}
                    max={0.2}
                    step={0.01}
                  />
                  <p className="text-sm text-muted-foreground">
                    오래된 상호작용의 영향력을 감소시킵니다.
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">최소 상호작용 수</span>
                    <span className="text-sm font-mono">
                      {settings.minInteractions}
                    </span>
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
                  <p className="text-sm text-muted-foreground">
                    벡터 안정화에 필요한 최소 상호작용 횟수입니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>모델 정확도 추이</CardTitle>
                <CardDescription>
                  최근 7일간의 모델 정확도 변화
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ACCURACY_TREND}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[90, 100]} className="text-xs" />
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
                실제 사용자의 6D 벡터 프로필 예시를 확인합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={SAMPLE_VECTOR}>
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
                  {SAMPLE_VECTOR.map((item) => {
                    const dim = VECTOR_DIMENSIONS.find(
                      (d) => d.name === item.dimension
                    )
                    return (
                      <div key={item.dimension} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: dim?.color }}
                            />
                            {item.dimension}
                          </span>
                          <span className="font-mono">{item.value.toFixed(2)}</span>
                        </div>
                        <Progress value={item.value * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{dim?.low}</span>
                          <span>{dim?.high}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>벡터 해석</CardTitle>
              <CardDescription>
                현재 샘플 벡터에 대한 AI 기반 해석
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm leading-relaxed">
                  이 사용자는 <strong>깊이 있는 분석</strong>을 선호하며(DEPTH: 0.72),
                  <strong>개성적인 선택</strong>을 추구합니다(TASTE: 0.82).
                  평가에 있어서는 <strong>비교적 엄격한 기준</strong>을 적용하고(STANCE: 0.68),
                  특정 장르에 <strong>집중하는 경향</strong>이 있습니다(SCOPE: 0.35).
                  콘텐츠 소비는 오락과 성장의 <strong>균형</strong>을 추구하며(PURPOSE: 0.55),
                  판단은 <strong>감정과 논리 사이</strong>에서 이루어집니다(LENS: 0.45).
                </p>
                <Separator className="my-4" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  추천 페르소나: &quot;논리적 평론가&quot;, &quot;시네필 평론가&quot;
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
