"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Zap,
  User,
  Play,
  RefreshCw,
  Settings,
  ArrowRight,
  ArrowLeftRight,
  Target,
  Copy,
  Download,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Shuffle,
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
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts"

// 샘플 페르소나 목록
const SAMPLE_PERSONAS = [
  {
    id: "1",
    name: "논리적 평론가",
    vector: { depth: 0.85, lens: 0.78, stance: 0.72, scope: 0.45, taste: 0.68, purpose: 0.82 },
    status: "active",
  },
  {
    id: "2",
    name: "감성 에세이스트",
    vector: { depth: 0.62, lens: 0.25, stance: 0.35, scope: 0.58, taste: 0.75, purpose: 0.42 },
    status: "active",
  },
  {
    id: "3",
    name: "트렌드 헌터",
    vector: { depth: 0.45, lens: 0.55, stance: 0.48, scope: 0.85, taste: 0.32, purpose: 0.38 },
    status: "active",
  },
  {
    id: "4",
    name: "균형 잡힌 가이드",
    vector: { depth: 0.55, lens: 0.52, stance: 0.50, scope: 0.55, taste: 0.48, purpose: 0.52 },
    status: "active",
  },
  {
    id: "5",
    name: "시네필 평론가",
    vector: { depth: 0.92, lens: 0.72, stance: 0.78, scope: 0.22, taste: 0.88, purpose: 0.75 },
    status: "active",
  },
]

// 알고리즘 옵션
const ALGORITHMS = [
  { id: "cosine", name: "Cosine Similarity", description: "코사인 유사도 기반 매칭" },
  { id: "weighted", name: "Weighted Euclidean", description: "가중 유클리디안 거리" },
  { id: "context", name: "Context-Aware", description: "컨텍스트 인식 매칭" },
  { id: "hybrid", name: "Hybrid", description: "복합 알고리즘" },
]

interface MatchResult {
  persona: typeof SAMPLE_PERSONAS[0]
  score: number
  breakdown: Record<string, number>
}

export default function SimulatorPage() {
  const [userVector, setUserVector] = useState({
    depth: 0.65,
    lens: 0.45,
    stance: 0.55,
    scope: 0.60,
    taste: 0.70,
    purpose: 0.50,
  })
  const [algorithm, setAlgorithm] = useState("cosine")
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [results, setResults] = useState<MatchResult[] | null>(null)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  const handleExportResults = () => {
    if (!results) {
      toast.error("내보낼 결과가 없습니다", {
        description: "먼저 시뮬레이션을 실행하세요.",
      })
      return
    }
    const exportData = {
      userVector,
      algorithm,
      results: results.map((r) => ({
        persona: r.persona.name,
        score: r.score,
        breakdown: r.breakdown,
      })),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `simulation-result-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("결과를 내보냈습니다", {
      description: "JSON 파일이 다운로드되었습니다.",
    })
  }

  const handleAdvancedSettings = () => {
    setShowAdvancedSettings(!showAdvancedSettings)
    toast.info("고급 설정", {
      description: "고급 설정 기능은 준비 중입니다.",
    })
  }

  const handleCopyVector = (persona: typeof SAMPLE_PERSONAS[0]) => {
    const vectorString = JSON.stringify(persona.vector, null, 2)
    navigator.clipboard.writeText(vectorString)
    toast.success("벡터 복사 완료", {
      description: `${persona.name}의 벡터가 클립보드에 복사되었습니다.`,
    })
  }

  const handleViewDetails = (persona: typeof SAMPLE_PERSONAS[0]) => {
    toast.info(`${persona.name} 상세 정보`, {
      description: `ID: ${persona.id} | 상태: ${persona.status}`,
    })
  }

  const handleVectorChange = (key: string, value: number[]) => {
    setUserVector({ ...userVector, [key]: value[0] })
  }

  const randomizeVector = () => {
    setUserVector({
      depth: Math.random(),
      lens: Math.random(),
      stance: Math.random(),
      scope: Math.random(),
      taste: Math.random(),
      purpose: Math.random(),
    })
  }

  const runSimulation = () => {
    setIsSimulating(true)

    // 시뮬레이션 결과 생성 (실제로는 API 호출)
    setTimeout(() => {
      const simulatedResults: MatchResult[] = SAMPLE_PERSONAS.map((persona) => {
        // 간단한 코사인 유사도 계산 (실제로는 서버에서 계산)
        const dims = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
        let dotProduct = 0
        let normA = 0
        let normB = 0
        const breakdown: Record<string, number> = {}

        dims.forEach((dim) => {
          const a = userVector[dim]
          const b = persona.vector[dim]
          dotProduct += a * b
          normA += a * a
          normB += b * b
          breakdown[dim] = 1 - Math.abs(a - b)
        })

        const score = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))

        return {
          persona,
          score: score * 100,
          breakdown,
        }
      }).sort((a, b) => b.score - a.score)

      setResults(simulatedResults)
      setIsSimulating(false)
    }, 1000)
  }

  const getVectorData = () => {
    const dims = [
      { key: "depth", name: "DEPTH" },
      { key: "lens", name: "LENS" },
      { key: "stance", name: "STANCE" },
      { key: "scope", name: "SCOPE" },
      { key: "taste", name: "TASTE" },
      { key: "purpose", name: "PURPOSE" },
    ]

    return dims.map((d) => ({
      dimension: d.name,
      user: userVector[d.key as keyof typeof userVector],
      ...(results?.[0]
        ? { top: results[0].persona.vector[d.key as keyof typeof userVector] }
        : {}),
      fullMark: 1,
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            매칭 시뮬레이터
          </h2>
          <p className="text-muted-foreground">
            사용자 벡터와 페르소나 간의 매칭을 테스트합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportResults}>
            <Download className="mr-2 h-4 w-4" />
            결과 내보내기
          </Button>
          <Button variant="outline" onClick={handleAdvancedSettings}>
            <Settings className="mr-2 h-4 w-4" />
            고급 설정
          </Button>
        </div>
      </div>

      {/* Main 2-Panel Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Panel - Input */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    사용자 벡터 입력
                  </CardTitle>
                  <CardDescription>
                    테스트할 사용자의 6D 벡터를 설정합니다.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={randomizeVector}>
                  <Shuffle className="mr-2 h-4 w-4" />
                  랜덤
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(userVector).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="uppercase font-medium">{key}</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                      {value.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={(v) => handleVectorChange(key, v)}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>알고리즘 선택</CardTitle>
              <CardDescription>
                매칭에 사용할 알고리즘을 선택합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALGORITHMS.map((algo) => (
                    <SelectItem key={algo.id} value={algo.id}>
                      <div>
                        <p className="font-medium">{algo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {algo.description}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full mt-4"
                size="lg"
                onClick={runSimulation}
                disabled={isSimulating}
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    시뮬레이션 중...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    시뮬레이션 실행
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Vector Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>벡터 비교</CardTitle>
              <CardDescription>
                사용자 벡터와 Top 매칭 페르소나 비교
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={getVectorData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" className="text-xs" />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} />
                    <Radar
                      name="사용자"
                      dataKey="user"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                    {results && (
                      <Radar
                        name={results[0].persona.name}
                        dataKey="top"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                      />
                    )}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Results */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    매칭 결과
                  </CardTitle>
                  <CardDescription>
                    {results
                      ? `${results.length}개 페르소나 매칭 완료`
                      : "시뮬레이션을 실행하세요"}
                  </CardDescription>
                </div>
                {results && (
                  <Badge variant="secondary">
                    알고리즘: {ALGORITHMS.find((a) => a.id === algorithm)?.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!results ? (
                <div className="flex flex-col items-center justify-center h-[500px] text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">결과 대기 중</h3>
                  <p className="text-muted-foreground max-w-sm">
                    왼쪽 패널에서 사용자 벡터를 설정하고 시뮬레이션을 실행하면
                    매칭 결과가 여기에 표시됩니다.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <Collapsible
                        key={result.persona.id}
                        open={showDetails === result.persona.id}
                        onOpenChange={(open) =>
                          setShowDetails(open ? result.persona.id : null)
                        }
                      >
                        <div
                          className={`border rounded-lg p-4 transition-all ${
                            index === 0
                              ? "border-green-500 bg-green-500/5"
                              : "hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  index === 0
                                    ? "bg-green-500 text-white"
                                    : "bg-muted"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  {result.persona.name}
                                  {index === 0 && (
                                    <Badge variant="default" className="text-xs">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Best Match
                                    </Badge>
                                  )}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  매칭 스코어
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold">
                                  {result.score.toFixed(1)}
                                </p>
                                <p className="text-xs text-muted-foreground">/ 100</p>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {showDetails === result.persona.id ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          <div className="mt-3">
                            <Progress value={result.score} className="h-2" />
                          </div>

                          <CollapsibleContent>
                            <Separator className="my-4" />
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium">차원별 유사도</h5>
                              {Object.entries(result.breakdown).map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="uppercase text-muted-foreground">
                                      {key}
                                    </span>
                                    <span>
                                      {(value * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <Progress value={value * 100} className="h-1" />
                                </div>
                              ))}

                              <Separator className="my-2" />

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleCopyVector(result.persona)}
                                >
                                  <Copy className="mr-2 h-3 w-3" />
                                  벡터 복사
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleViewDetails(result.persona)}
                                >
                                  상세 보기
                                  <ArrowRight className="ml-2 h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
