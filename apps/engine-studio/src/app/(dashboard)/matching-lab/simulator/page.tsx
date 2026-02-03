"use client"

import { useState, useEffect, useCallback } from "react"
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
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import { personaService } from "@/services/persona-service"
import type { Vector6D } from "@/types"

// 알고리즘 옵션
const ALGORITHMS = [
  { id: "cosine", name: "Cosine Similarity", description: "코사인 유사도 기반 매칭" },
  { id: "weighted", name: "Weighted Euclidean", description: "가중 유클리디안 거리" },
  { id: "context", name: "Context-Aware", description: "컨텍스트 인식 매칭" },
  { id: "hybrid", name: "Hybrid", description: "복합 알고리즘" },
]

interface PersonaForMatch {
  id: string
  name: string
  vector: Vector6D
  status: string
}

interface MatchResult {
  persona: PersonaForMatch
  score: number
  breakdown: Record<string, number>
}

export default function SimulatorPage() {
  // 페르소나 목록
  const [personas, setPersonas] = useState<PersonaForMatch[]>([])
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true)

  const [userVector, setUserVector] = useState<Vector6D>({
    depth: 0.65,
    lens: 0.45,
    stance: 0.55,
    scope: 0.6,
    taste: 0.7,
    purpose: 0.5,
  })
  const [algorithm, setAlgorithm] = useState("cosine")
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [results, setResults] = useState<MatchResult[] | null>(null)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  // 페르소나 목록 로드
  const fetchPersonas = useCallback(async () => {
    setIsLoadingPersonas(true)
    try {
      const response = await personaService.getPersonas({ status: "ACTIVE" })
      const personasForMatch: PersonaForMatch[] = response.personas.map((p) => ({
        id: p.id,
        name: p.name,
        vector: p.vector,
        status: p.status,
      }))
      setPersonas(personasForMatch)
    } catch (err) {
      console.error("Failed to fetch personas:", err)
      toast.error("페르소나 목록을 불러오는데 실패했습니다")
    } finally {
      setIsLoadingPersonas(false)
    }
  }, [])

  useEffect(() => {
    fetchPersonas()
  }, [fetchPersonas])

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

  const handleCopyVector = (persona: PersonaForMatch) => {
    const vectorString = JSON.stringify(persona.vector, null, 2)
    navigator.clipboard.writeText(vectorString)
    toast.success("벡터 복사 완료", {
      description: `${persona.name}의 벡터가 클립보드에 복사되었습니다.`,
    })
  }

  const handleViewDetails = (persona: PersonaForMatch) => {
    toast.info(`${persona.name} 상세 정보`, {
      description: `ID: ${persona.id} | 상태: ${persona.status}`,
    })
  }

  const handleVectorChange = (key: keyof Vector6D, value: number[]) => {
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

  const runSimulation = async () => {
    if (personas.length === 0) {
      toast.error("매칭할 페르소나가 없습니다", {
        description: "먼저 페르소나를 생성해주세요.",
      })
      return
    }

    setIsSimulating(true)

    try {
      // 시뮬레이션 결과 계산 (실제 API 연결 시 서버에서 계산)
      const dims = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
      const simulatedResults: MatchResult[] = personas
        .map((persona) => {
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

          const denominator = Math.sqrt(normA) * Math.sqrt(normB)
          const score = denominator === 0 ? 0 : dotProduct / denominator

          return {
            persona,
            score: score * 100,
            breakdown,
          }
        })
        .sort((a, b) => b.score - a.score)

      // 약간의 지연을 주어 시뮬레이션 느낌 연출
      await new Promise((resolve) => setTimeout(resolve, 800))

      setResults(simulatedResults)
      toast.success("시뮬레이션 완료", {
        description: `${simulatedResults.length}개 페르소나 매칭 완료`,
      })
    } catch (err) {
      console.error("Simulation failed:", err)
      toast.error("시뮬레이션에 실패했습니다")
    } finally {
      setIsSimulating(false)
    }
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
      ...(results?.[0] ? { top: results[0].persona.vector[d.key as keyof Vector6D] } : {}),
      fullMark: 1,
    }))
  }

  // 페르소나 로딩 중
  if (isLoadingPersonas) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">페르소나 목록을 불러오는 중...</p>
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
            <Zap className="h-6 w-6 text-yellow-500" />
            매칭 시뮬레이터
          </h2>
          <p className="text-muted-foreground">사용자 벡터와 페르소나 간의 매칭을 테스트합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchPersonas()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
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

      {/* 페르소나 없을 때 경고 */}
      {personas.length === 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800 dark:text-yellow-200">
              활성화된 페르소나가 없습니다. 먼저 페르소나를 생성하고 활성화해주세요.
            </p>
          </CardContent>
        </Card>
      )}

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
                  <CardDescription>테스트할 사용자의 6D 벡터를 설정합니다.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={randomizeVector}>
                  <Shuffle className="mr-2 h-4 w-4" />
                  랜덤
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.entries(userVector) as [keyof Vector6D, number][]).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium uppercase">{key}</Label>
                    <span className="bg-muted rounded px-2 py-0.5 font-mono text-sm">
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
              <CardDescription>매칭에 사용할 알고리즘을 선택합니다.</CardDescription>
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
                        <p className="text-muted-foreground text-xs">{algo.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="mt-4 w-full"
                size="lg"
                onClick={runSimulation}
                disabled={isSimulating || personas.length === 0}
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
              <CardDescription>사용자 벡터와 Top 매칭 페르소나 비교</CardDescription>
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
                    {results ? `${results.length}개 페르소나 매칭 완료` : "시뮬레이션을 실행하세요"}
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
                <div className="flex h-[500px] flex-col items-center justify-center text-center">
                  <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                    <ArrowLeftRight className="text-muted-foreground h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium">결과 대기 중</h3>
                  <p className="text-muted-foreground max-w-sm">
                    왼쪽 패널에서 사용자 벡터를 설정하고 시뮬레이션을 실행하면 매칭 결과가 여기에
                    표시됩니다.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <Collapsible
                        key={result.persona.id}
                        open={showDetails === result.persona.id}
                        onOpenChange={(open) => setShowDetails(open ? result.persona.id : null)}
                      >
                        <div
                          className={`rounded-lg border p-4 transition-all ${
                            index === 0
                              ? "border-green-500 bg-green-500/5"
                              : "hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                  index === 0 ? "bg-green-500 text-white" : "bg-muted"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="flex items-center gap-2 font-semibold">
                                  {result.persona.name}
                                  {index === 0 && (
                                    <Badge variant="default" className="text-xs">
                                      <Sparkles className="mr-1 h-3 w-3" />
                                      Best Match
                                    </Badge>
                                  )}
                                </h4>
                                <p className="text-muted-foreground text-sm">매칭 스코어</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold">{result.score.toFixed(1)}</p>
                                <p className="text-muted-foreground text-xs">/ 100</p>
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
                                    <span className="text-muted-foreground uppercase">{key}</span>
                                    <span>{(value * 100).toFixed(1)}%</span>
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
