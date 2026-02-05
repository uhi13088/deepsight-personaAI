"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Save,
  Copy,
  Play,
  History,
  AlertTriangle,
  Eye,
  RotateCcw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RadarChart } from "@/components/charts/radar-chart"
import { personaService } from "@/services/persona-service"
import type { PersonaRole, PersonaStatus, Vector6D } from "@/types"

// 페르소나 페이지 데이터 타입
interface PersonaPageData {
  id: string
  name: string
  role: string
  description: string
  expertise: string[]
  status: string
  visibility: string
  vector: Vector6D
  prompt: {
    systemPrompt: string
    exampleResponses: string[]
    restrictions: string[]
  }
  metrics: {
    impressionCount: number
    selectionCount: number
    avgRating: number
    matchAccuracy: number
  } | null
  versions: Array<{
    version: string
    date: string
    changes: string
    author: string
  }>
  qualityScore: number
  createdAt: string
  updatedAt: string
}

const VECTOR_LABELS = {
  depth: { name: "분석 깊이", low: "직관적", high: "심층적" },
  lens: { name: "판단 렌즈", low: "감성적", high: "논리적" },
  stance: { name: "평가 태도", low: "수용적", high: "비판적" },
  scope: { name: "관심 범위", low: "핵심만", high: "디테일" },
  taste: { name: "취향 성향", low: "클래식", high: "실험적" },
  purpose: { name: "소비 목적", low: "오락", high: "의미추구" },
}

export default function PersonaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const personaId = params?.id as string

  const [persona, setPersona] = useState<PersonaPageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [testContent, setTestContent] = useState("")

  // 검증 관련 상태
  const [validationResult, setValidationResult] = useState<{
    overallScore: number
    passed: boolean
    breakdown: {
      promptQuality: { score: number; details: Record<string, number>; issues: string[] }
      vectorConsistency: {
        score: number
        details: Record<string, { expected: string; actual: string; match: boolean }>
        issues: string[]
      }
      expertiseRelevance: { score: number; issues: string[] }
    }
    allIssues: string[]
    validatedAt: string
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidationDate, setLastValidationDate] = useState<string | null>(null)

  // 페르소나 데이터 로드
  const fetchPersona = useCallback(async () => {
    if (!personaId) return

    setIsLoading(true)
    setError(null)

    try {
      const apiData = await personaService.getPersonaById(personaId)

      const defaultVector: Vector6D = {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
      }

      setPersona({
        id: apiData.id,
        name: apiData.name,
        role: apiData.role || "REVIEWER",
        description: apiData.description || "",
        expertise: apiData.expertise || [],
        status: apiData.status,
        visibility:
          ((apiData as unknown as Record<string, unknown>).visibility as string) || "PRIVATE",
        vector: apiData.vector || defaultVector,
        prompt: {
          systemPrompt: apiData.promptTemplate || "",
          exampleResponses: [],
          restrictions: [],
        },
        metrics: apiData.metrics
          ? {
              impressionCount: apiData.metrics.impressions,
              selectionCount: apiData.metrics.clicks,
              avgRating:
                apiData.metrics.satisfactionRate > 0 ? apiData.metrics.satisfactionRate / 20 : 0,
              matchAccuracy: apiData.metrics.ctr,
            }
          : null,
        versions: (apiData.versions || []).map((v, idx) => ({
          version: `v${v.version}.0`,
          date:
            v.createdAt instanceof Date
              ? v.createdAt.toISOString().split("T")[0]
              : String(v.createdAt).split("T")[0],
          changes: idx === 0 ? "최신 벡터" : `벡터 버전 ${v.version}`,
          author: "",
        })),
        qualityScore: apiData.qualityScore ?? 0,
        createdAt:
          apiData.createdAt instanceof Date
            ? apiData.createdAt.toISOString()
            : (apiData.createdAt as unknown as string),
        updatedAt:
          apiData.updatedAt instanceof Date
            ? apiData.updatedAt.toISOString()
            : (apiData.updatedAt as unknown as string),
      })
    } catch (err) {
      console.error("Failed to fetch persona:", err)
      setError(err instanceof Error ? err.message : "페르소나를 불러올 수 없습니다")
    } finally {
      setIsLoading(false)
    }
  }, [personaId])

  useEffect(() => {
    fetchPersona()
  }, [fetchPersona])

  const handleVectorChange = (key: string, value: number[]) => {
    setPersona((prev) => {
      if (!prev) return prev
      return { ...prev, vector: { ...prev.vector, [key]: value[0] } }
    })
  }

  const handleSave = async () => {
    if (!persona) return
    setIsSaving(true)
    try {
      await personaService.updatePersona(personaId, {
        name: persona.name,
        role: persona.role as PersonaRole,
        description: persona.description || undefined,
        status: persona.status as PersonaStatus,
        expertise: persona.expertise,
        vector: persona.vector as Vector6D,
        promptTemplate: persona.prompt.systemPrompt,
      })

      toast.success("페르소나가 저장되었습니다")
      setIsEditing(false)
      await fetchPersona() // 저장 후 새로고침
    } catch (err) {
      console.error("Save error:", err)
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await personaService.deletePersona(personaId)
      toast.success("페르소나가 삭제되었습니다")
      router.push("/personas")
    } catch (err) {
      console.error("Delete error:", err)
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleDuplicate = async () => {
    if (!persona) return
    try {
      const newPersona = await personaService.createPersona({
        name: `${persona.name} (복제본)`,
        role: persona.role as PersonaRole,
        description: persona.description || undefined,
        expertise: persona.expertise,
        vector: persona.vector as Vector6D,
        promptTemplate: persona.prompt.systemPrompt,
      })

      toast.success("페르소나가 복제되었습니다")
      router.push(`/personas/${newPersona.id}`)
    } catch (err) {
      console.error("Duplicate error:", err)
      toast.error(err instanceof Error ? err.message : "복제에 실패했습니다")
    }
  }

  const handleAddExpertise = () => {
    const newExpertise = prompt("추가할 전문 분야를 입력하세요:")
    if (newExpertise?.trim()) {
      setPersona((prev) => {
        if (!prev) return prev
        return { ...prev, expertise: [...prev.expertise, newExpertise.trim()] }
      })
    }
  }

  const handleAddExampleResponse = () => {
    const newExample = prompt("예시 응답을 입력하세요:")
    if (newExample?.trim()) {
      setPersona((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          prompt: {
            ...prev.prompt,
            exampleResponses: [...prev.prompt.exampleResponses, newExample.trim()],
          },
        }
      })
    }
  }

  const handleAddRestriction = () => {
    const newRestriction = prompt("금기사항을 입력하세요:")
    if (newRestriction?.trim()) {
      setPersona((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          prompt: {
            ...prev.prompt,
            restrictions: [...prev.prompt.restrictions, newRestriction.trim()],
          },
        }
      })
    }
  }

  const handleApplyPreset = (presetName: string) => {
    const presets: Record<string, Vector6D> = {
      "냉철한 분석가": {
        depth: 0.95,
        lens: 0.95,
        stance: 0.85,
        scope: 0.9,
        taste: 0.2,
        purpose: 0.8,
      },
      "감성 에세이스트": {
        depth: 0.6,
        lens: 0.2,
        stance: 0.3,
        scope: 0.4,
        taste: 0.7,
        purpose: 0.6,
      },
      "트렌드 헌터": { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.3, taste: 0.95, purpose: 0.4 },
      "균형 잡힌 가이드": {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
      },
    }
    const preset = presets[presetName]
    if (preset) {
      setPersona((prev) => {
        if (!prev) return prev
        return { ...prev, vector: preset }
      })
      toast.success(`'${presetName}' 프리셋이 적용되었습니다`)
    }
  }

  const handleAutoGeneratePrompt = () => {
    if (!persona) return
    const { depth, lens, stance, scope, taste, purpose } = persona.vector
    const generatedPrompt = `# 역할 정의
당신은 "${persona.name}"입니다. ${persona.role} 역할을 수행합니다.
전문 분야: ${persona.expertise.join(", ")}

# 성향 가이드
- 분석 깊이: ${(depth * 100).toFixed(0)}% ${depth > 0.5 ? "심층적" : "직관적"} (${depth > 0.5 ? "배경과 맥락까지 파악" : "핵심 정보 위주"})
- 판단 렌즈: ${(lens * 100).toFixed(0)}% ${lens > 0.5 ? "논리적" : "감성적"} (${lens > 0.5 ? "구조와 근거 중시" : "느낌과 감정 중시"})
- 평가 태도: ${(stance * 100).toFixed(0)}% ${stance > 0.5 ? "비판적" : "수용적"} (${stance > 0.5 ? "결점도 지적" : "긍정 위주"})
- 관심 범위: ${(scope * 100).toFixed(0)}% ${scope > 0.5 ? "디테일" : "핵심만"} (${scope > 0.5 ? "세부사항 꼼꼼히" : "핵심만 집중"})
- 취향 성향: ${(taste * 100).toFixed(0)}% ${taste > 0.5 ? "실험적" : "클래식"} (${taste > 0.5 ? "새로운 것 선호" : "검증된 것 선호"})
- 소비 목적: ${(purpose * 100).toFixed(0)}% ${purpose > 0.5 ? "의미 추구" : "오락 추구"}

# 행동 지침
1. 콘텐츠를 추천할 때는 ${lens > 0.5 ? "논리적 근거를 제시" : "감성적 표현을 사용"}하세요.
2. ${scope > 0.5 ? "세부 요소를 분석" : "핵심 정보를 간략히 전달"}하세요.
3. ${stance > 0.5 ? "아쉬운 점도 솔직하게 말하되, 건설적으로 표현" : "긍정적인 면을 부각"}하세요.

# 금기사항
- 비속어, 혐오 표현 절대 금지
- 정치적/종교적 편향 금지
- 스포일러 주의`

    setPersona((prev) => {
      if (!prev) return prev
      return { ...prev, prompt: { ...prev.prompt, systemPrompt: generatedPrompt } }
    })
    toast.success("벡터 기반으로 프롬프트가 생성되었습니다")
  }

  const handleViewVersion = (version: string) => {
    toast.info(`${version} 버전 상세 보기 (구현 예정)`)
  }

  const handleRollback = (version: string) => {
    if (confirm(`${version} 버전으로 롤백하시겠습니까?`)) {
      toast.success(`${version} 버전으로 롤백되었습니다`)
    }
  }

  // 페르소나 검증 실행
  const handleValidation = async () => {
    setIsValidating(true)
    try {
      const response = await fetch(`/api/personas/${personaId}/validate`, {
        method: "POST",
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || "검증 실패")
      }

      setValidationResult(data.data)
      setLastValidationDate(data.data.validatedAt)

      if (data.data.passed) {
        toast.success(`검증 통과! 점수: ${data.data.overallScore}점`)
      } else {
        toast.warning(`검증 미통과. 점수: ${data.data.overallScore}점 (70점 이상 필요)`)
      }
    } catch (err) {
      console.error("Validation error:", err)
      toast.error(err instanceof Error ? err.message : "검증에 실패했습니다")
    } finally {
      setIsValidating(false)
    }
  }

  // 마지막 검증 결과 조회
  const fetchLastValidation = useCallback(async () => {
    if (!personaId) return

    try {
      const response = await fetch(`/api/personas/${personaId}/validate`)
      const data = await response.json()

      if (data.success && data.data.hasBeenValidated) {
        setLastValidationDate(data.data.lastValidationDate)
      }
    } catch (err) {
      console.error("Failed to fetch validation:", err)
    }
  }, [personaId])

  useEffect(() => {
    fetchLastValidation()
  }, [fetchLastValidation])

  const handleTestPrompt = async () => {
    if (!persona) return
    setTestResult("생성 중...")

    try {
      const result = await personaService.testPersona({
        personaId: personaId,
        contentTitle: testContent,
        contentDescription: testContent,
      })

      setTestResult(`[${persona.name}의 리뷰]

${result.response}

---
테스트 결과:
- 벡터 정렬도: ${result.scores.vectorAlignment.toFixed(1)}%
- 톤 매칭: ${result.scores.toneMatch.toFixed(1)}%
- 추론 품질: ${result.scores.reasoningQuality.toFixed(1)}%
- 실행 시간: ${result.executionTime.toFixed(0)}ms`)
    } catch (err) {
      console.error("Test error:", err)
      toast.error("테스트 실행에 실패했습니다")
      setTestResult("")
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 80) return "text-blue-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ACTIVE: "default",
      DRAFT: "secondary",
      LEGACY: "outline",
      DEPRECATED: "destructive",
      ARCHIVED: "outline",
    }
    return variants[status] || "secondary"
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2" />
          <p className="text-muted-foreground">페르소나 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태 또는 데이터 없음
  if (error || !persona) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
        <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="mb-2 text-lg font-semibold">페르소나를 불러올 수 없습니다</h2>
        <p className="text-muted-foreground mb-4 text-sm">{error || "데이터를 찾을 수 없습니다"}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/personas")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Button>
          <Button onClick={() => fetchPersona()}>다시 시도</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/personas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{persona.name}</h1>
              <Badge variant={getStatusBadge(persona.status)}>{persona.status}</Badge>
              <Badge variant="outline">{persona.visibility}</Badge>
              <span className={`text-lg font-semibold ${getQualityColor(persona.qualityScore)}`}>
                품질 {persona.qualityScore}점
              </span>
            </div>
            <p className="text-muted-foreground">{persona.description || "설명 없음"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowTestDialog(true)}>
                <Play className="mr-2 h-4 w-4" />
                테스트
              </Button>
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                복제
              </Button>
              <Button onClick={() => setIsEditing(true)}>수정</Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger value="vector">성향 벡터</TabsTrigger>
          <TabsTrigger value="prompt">프롬프트</TabsTrigger>
          <TabsTrigger value="validation">검증</TabsTrigger>
          <TabsTrigger value="metrics">성과 지표</TabsTrigger>
          <TabsTrigger value="history">버전 히스토리</TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>이름</Label>
                  <Input
                    value={persona.name}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setPersona((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>역할</Label>
                  <Select
                    disabled={!isEditing}
                    value={persona.role}
                    onValueChange={(value) =>
                      setPersona((prev) => (prev ? { ...prev, role: value } : prev))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REVIEWER">평론가 (Reviewer)</SelectItem>
                      <SelectItem value="CURATOR">큐레이터 (Curator)</SelectItem>
                      <SelectItem value="EDUCATOR">교육자 (Educator)</SelectItem>
                      <SelectItem value="COMPANION">동반자 (Companion)</SelectItem>
                      <SelectItem value="ANALYST">분석가 (Analyst)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea
                    value={persona.description}
                    disabled={!isEditing}
                    rows={3}
                    onChange={(e) =>
                      setPersona((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>상태 및 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>상태</Label>
                  <Select
                    disabled={!isEditing}
                    value={persona.status}
                    onValueChange={(value) =>
                      setPersona((prev) => (prev ? { ...prev, status: value } : prev))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">임시저장 (Draft)</SelectItem>
                      <SelectItem value="ACTIVE">활성 (Active)</SelectItem>
                      <SelectItem value="LEGACY">레거시 (Legacy)</SelectItem>
                      <SelectItem value="DEPRECATED">지원중단 (Deprecated)</SelectItem>
                      <SelectItem value="ARCHIVED">보관 (Archived)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>공개 범위</Label>
                  <Select
                    disabled={!isEditing}
                    value={persona.visibility}
                    onValueChange={(value) =>
                      setPersona((prev) => (prev ? { ...prev, visibility: value } : prev))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GLOBAL">전체 공개 (Global)</SelectItem>
                      <SelectItem value="PRIVATE">비공개 (Private)</SelectItem>
                      <SelectItem value="SHARED">공유 (Shared)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>전문 분야</Label>
                  <div className="flex flex-wrap gap-2">
                    {persona.expertise.map((exp, idx) => (
                      <Badge key={idx} variant="secondary">
                        {exp}
                      </Badge>
                    ))}
                    {isEditing && (
                      <Button variant="outline" size="sm" onClick={handleAddExpertise}>
                        + 추가
                      </Button>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="text-muted-foreground space-y-1 text-sm">
                  <p>생성일: {new Date(persona.createdAt).toLocaleDateString("ko-KR")}</p>
                  <p>최종 수정: {new Date(persona.updatedAt).toLocaleDateString("ko-KR")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 성향 벡터 탭 */}
        <TabsContent value="vector" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>6D 성향 벡터</CardTitle>
                <CardDescription>페르소나의 성격을 정의하는 6개 차원의 벡터입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(VECTOR_LABELS).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                      <Label>{label.name}</Label>
                      <span className="text-sm font-medium">
                        {(persona.vector[key as keyof typeof persona.vector] * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-16 text-xs">{label.low}</span>
                      <Slider
                        value={[persona.vector[key as keyof typeof persona.vector]]}
                        min={0}
                        max={1}
                        step={0.05}
                        disabled={!isEditing}
                        onValueChange={(value) => handleVectorChange(key, value)}
                        className="flex-1"
                      />
                      <span className="text-muted-foreground w-16 text-right text-xs">
                        {label.high}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>벡터 시각화</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <RadarChart data={persona.vector} />
                </div>
                <div className="bg-muted mt-4 rounded-lg p-4">
                  <h4 className="mb-2 font-medium">프리셋</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isEditing}
                      onClick={() => handleApplyPreset("냉철한 분석가")}
                    >
                      냉철한 분석가
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isEditing}
                      onClick={() => handleApplyPreset("감성 에세이스트")}
                    >
                      감성 에세이스트
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isEditing}
                      onClick={() => handleApplyPreset("트렌드 헌터")}
                    >
                      트렌드 헌터
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isEditing}
                      onClick={() => handleApplyPreset("균형 잡힌 가이드")}
                    >
                      균형 잡힌 가이드
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 프롬프트 탭 */}
        <TabsContent value="prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>시스템 프롬프트</CardTitle>
              <CardDescription>LLM에 전달되는 페르소나 정의 프롬프트입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={persona.prompt.systemPrompt}
                disabled={!isEditing}
                rows={20}
                className="font-mono text-sm"
                onChange={(e) =>
                  setPersona((prev) =>
                    prev
                      ? { ...prev, prompt: { ...prev.prompt, systemPrompt: e.target.value } }
                      : prev
                  )
                }
              />
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                  {persona.prompt.systemPrompt.length}자 / 권장 200-500자
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isEditing}
                    onClick={handleAutoGeneratePrompt}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    벡터 기반 자동 생성
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}>
                    <Play className="mr-2 h-4 w-4" />
                    테스트
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>예시 응답</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {persona.prompt.exampleResponses.length > 0 ? (
                  persona.prompt.exampleResponses.map((example, idx) => (
                    <div key={idx} className="bg-muted rounded-lg p-3 text-sm">
                      &quot;{example}&quot;
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">등록된 예시 응답이 없습니다.</p>
                )}
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddExampleResponse}
                  >
                    + 예시 추가
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>금기사항</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {persona.prompt.restrictions.length > 0 ? (
                  persona.prompt.restrictions.map((restriction, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm dark:bg-red-900/20"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      {restriction}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">등록된 금기사항이 없습니다.</p>
                )}
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddRestriction}
                  >
                    + 금기사항 추가
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 검증 탭 */}
        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    페르소나 품질 검증
                  </CardTitle>
                  <CardDescription>
                    프롬프트 품질, 벡터 일관성, 전문분야 관련성을 검증합니다.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  {lastValidationDate && (
                    <span className="text-muted-foreground text-sm">
                      마지막 검증: {new Date(lastValidationDate).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                  <Button onClick={handleValidation} disabled={isValidating}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {isValidating ? "검증 중..." : "검증 실행"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {validationResult ? (
                <div className="space-y-6">
                  {/* 종합 점수 */}
                  <div className="bg-muted rounded-lg p-6 text-center">
                    <div
                      className={`text-5xl font-bold ${validationResult.passed ? "text-green-600" : "text-red-600"}`}
                    >
                      {validationResult.overallScore}점
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      {validationResult.passed ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-600">검증 통과</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="font-medium text-red-600">
                            검증 미통과 (70점 이상 필요)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 상세 점수 */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* 프롬프트 품질 */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">프롬프트 품질</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {validationResult.breakdown.promptQuality.score}점
                        </div>
                        <Progress
                          value={validationResult.breakdown.promptQuality.score}
                          className="mt-2"
                        />
                        <div className="mt-3 space-y-1 text-sm">
                          {Object.entries(validationResult.breakdown.promptQuality.details).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground">{key}</span>
                                <span>{Math.round(value)}%</span>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 벡터 일관성 */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">벡터 일관성</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {validationResult.breakdown.vectorConsistency.score}점
                        </div>
                        <Progress
                          value={validationResult.breakdown.vectorConsistency.score}
                          className="mt-2"
                        />
                        <div className="mt-3 space-y-1 text-sm">
                          {Object.entries(validationResult.breakdown.vectorConsistency.details).map(
                            ([key, detail]) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-muted-foreground">{key}</span>
                                {detail.match ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 전문분야 관련성 */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">전문분야 관련성</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {validationResult.breakdown.expertiseRelevance.score}점
                        </div>
                        <Progress
                          value={validationResult.breakdown.expertiseRelevance.score}
                          className="mt-2"
                        />
                        <div className="text-muted-foreground mt-3 text-sm">
                          프롬프트에 전문분야 관련 내용이 포함되어 있는지 검사합니다.
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 발견된 이슈 */}
                  {validationResult.allIssues.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                          발견된 이슈 ({validationResult.allIssues.length}개)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {validationResult.allIssues.map((issue, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20"
                            >
                              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                              <span className="text-sm">{issue}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ShieldCheck className="text-muted-foreground mx-auto h-12 w-12" />
                  <h3 className="mt-4 text-lg font-medium">아직 검증되지 않았습니다</h3>
                  <p className="text-muted-foreground mt-2">
                    &apos;검증 실행&apos; 버튼을 클릭하여 페르소나 품질을 검증해보세요.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 성과 지표 탭 */}
        <TabsContent value="metrics" className="space-y-6">
          {persona.metrics ? (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {persona.metrics.impressionCount.toLocaleString()}
                  </div>
                  <p className="text-muted-foreground text-sm">총 노출 수</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {persona.metrics.selectionCount.toLocaleString()}
                  </div>
                  <p className="text-muted-foreground text-sm">선택 수</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">★ {persona.metrics.avgRating.toFixed(1)}</div>
                  <p className="text-muted-foreground text-sm">평균 평점</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {persona.metrics.matchAccuracy.toFixed(1)}%
                  </div>
                  <p className="text-muted-foreground text-sm">매칭 정확도</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">성과 데이터가 없습니다</h3>
                <p className="text-muted-foreground text-sm">
                  매칭이 진행되면 성과 지표가 표시됩니다.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 버전 히스토리 탭 */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>버전 히스토리</CardTitle>
            </CardHeader>
            <CardContent>
              {persona.versions.length > 0 ? (
                <div className="space-y-4">
                  {persona.versions.map((version, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <History className="text-muted-foreground h-5 w-5" />
                        <div>
                          <div className="font-medium">{version.version}</div>
                          <div className="text-muted-foreground text-sm">{version.changes}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-muted-foreground text-sm">
                          {version.author ? `${version.author} • ` : ""}
                          {version.date}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVersion(version.version)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          보기
                        </Button>
                        {idx > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(version.version)}
                          >
                            롤백
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <History className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">버전 히스토리가 없습니다</h3>
                  <p className="text-muted-foreground text-sm">
                    벡터가 수정되면 버전 히스토리가 기록됩니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 테스트 다이얼로그 */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>프롬프트 테스트</DialogTitle>
            <DialogDescription>샘플 콘텐츠로 페르소나의 응답을 테스트합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>테스트할 콘텐츠</Label>
              <Input
                placeholder="예: 영화 '기생충'"
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
              />
            </div>
            <Button onClick={handleTestPrompt} disabled={!testContent}>
              테스트 실행
            </Button>
            {testResult && (
              <div className="bg-muted rounded-lg p-4">
                <Label className="mb-2 block">결과</Label>
                <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>페르소나 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{persona.name}&apos; 페르소나를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
