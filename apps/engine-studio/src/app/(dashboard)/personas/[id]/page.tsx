"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Save, Copy, Play, History, AlertTriangle, Eye, RotateCcw } from "lucide-react"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadarChart } from "@/components/charts/radar-chart"

// 샘플 페르소나 데이터
const SAMPLE_PERSONA = {
  id: "1",
  name: "논리적 평론가",
  role: "REVIEWER",
  tagline: "데이터와 논리로 콘텐츠를 분석하는 평론가",
  description: "영화의 서사 구조와 연출을 분석적으로 보는 것을 좋아합니다.",
  expertise: ["영화", "드라마"],
  status: "ACTIVE",
  visibility: "PUBLIC",
  avatar: "/avatars/analyst.png",
  vector: {
    depth: 0.85,
    lens: 0.9,
    stance: 0.8,
    scope: 0.85,
    taste: 0.3,
    purpose: 0.7,
  },
  prompt: {
    systemPrompt: `# 역할 정의
당신은 "논리적 평론가"입니다. 리뷰어(Reviewer) 역할을 수행합니다.
전문 분야: 영화, 드라마

# 성향 가이드
- 분석 깊이: 85% 심층적 (배경과 맥락까지 파악)
- 판단 렌즈: 90% 논리적 (구조와 근거 중시)
- 평가 태도: 80% 비판적 (결점도 지적)
- 관심 범위: 85% 디테일 (세부사항 꼼꼼히)
- 취향 성향: 30% 클래식 (검증된 것 선호)
- 소비 목적: 70% 의미 추구

# 행동 지침
1. 콘텐츠를 추천할 때는 항상 논리적 근거를 제시하세요.
2. 연출, 각본, 연기력 등 세부 요소를 분석하세요.
3. 아쉬운 점도 솔직하게 말하되, 건설적으로 표현하세요.

# 금기사항
- 비속어, 혐오 표현 절대 금지
- 정치적/종교적 편향 금지
- 스포일러 주의`,
    exampleResponses: [
      "이 영화는 3막 구조에서 2막 전환점의 타이밍이 절묘합니다.",
      "연출력 8/10, 각본 7/10, 배우 연기 9/10로 평가합니다.",
    ],
    restrictions: ["스포일러 금지", "비속어 금지"],
  },
  metrics: {
    impressionCount: 15420,
    selectionCount: 8234,
    avgRating: 4.5,
    matchAccuracy: 87.3,
  },
  versions: [
    { version: "v1.2.0", date: "2026-01-15", changes: "벡터 미세 조정", author: "김엔지니어" },
    { version: "v1.1.0", date: "2026-01-10", changes: "프롬프트 개선", author: "박매니저" },
    { version: "v1.0.0", date: "2026-01-05", changes: "최초 생성", author: "이관리자" },
  ],
  qualityScore: 92,
  createdAt: "2026-01-05T10:00:00Z",
  updatedAt: "2026-01-15T14:30:00Z",
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

  const [persona, setPersona] = useState(SAMPLE_PERSONA)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [testContent, setTestContent] = useState("")

  // 페르소나 데이터 로드
  useEffect(() => {
    const fetchPersona = async () => {
      if (!personaId) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/personas/${personaId}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to fetch persona")
        }

        // API 응답을 페이지 형식에 맞게 변환
        const apiData = result.data
        setPersona({
          ...SAMPLE_PERSONA,
          id: apiData.id,
          name: apiData.name,
          role: apiData.role || SAMPLE_PERSONA.role,
          expertise: apiData.expertise || SAMPLE_PERSONA.expertise,
          status: apiData.status,
          vector: apiData.vector || SAMPLE_PERSONA.vector,
          createdAt: apiData.createdAt,
          updatedAt: apiData.updatedAt,
        })
      } catch (err) {
        console.error("Failed to fetch persona:", err)
        setError(err instanceof Error ? err.message : "페르소나를 불러올 수 없습니다")
        // 에러 시에도 샘플 데이터로 폴백 (데모 목적)
        setPersona({ ...SAMPLE_PERSONA, id: personaId })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPersona()
  }, [personaId])

  const handleVectorChange = (key: string, value: number[]) => {
    setPersona((prev) => ({
      ...prev,
      vector: { ...prev.vector, [key]: value[0] },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/personas/${personaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: persona.name,
          role: persona.role,
          tagline: persona.tagline,
          description: persona.description,
          status: persona.status,
          visibility: persona.visibility,
          expertise: persona.expertise,
          vector: persona.vector,
          prompt: persona.prompt,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "저장에 실패했습니다")
      }

      toast.success("페르소나가 저장되었습니다")
      setIsEditing(false)
    } catch (err) {
      console.error("Save error:", err)
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async () => {
    try {
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...persona,
          name: `${persona.name} (복제본)`,
          status: "DRAFT",
        }),
      })

      const result = await response.json()
      if (result.success && result.data?.id) {
        toast.success("페르소나가 복제되었습니다")
        router.push(`/personas/${result.data.id}`)
      } else {
        toast.success("페르소나가 복제되었습니다") // Demo fallback
      }
    } catch {
      toast.error("복제에 실패했습니다")
    }
  }

  const handleAddExpertise = () => {
    const newExpertise = prompt("추가할 전문 분야를 입력하세요:")
    if (newExpertise?.trim()) {
      setPersona((prev) => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()],
      }))
    }
  }

  const handleAddExampleResponse = () => {
    const newExample = prompt("예시 응답을 입력하세요:")
    if (newExample?.trim()) {
      setPersona((prev) => ({
        ...prev,
        prompt: {
          ...prev.prompt,
          exampleResponses: [...prev.prompt.exampleResponses, newExample.trim()],
        },
      }))
    }
  }

  const handleAddRestriction = () => {
    const newRestriction = prompt("금기사항을 입력하세요:")
    if (newRestriction?.trim()) {
      setPersona((prev) => ({
        ...prev,
        prompt: {
          ...prev.prompt,
          restrictions: [...prev.prompt.restrictions, newRestriction.trim()],
        },
      }))
    }
  }

  const handleApplyPreset = (presetName: string) => {
    const presets: Record<string, typeof SAMPLE_PERSONA.vector> = {
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
      setPersona((prev) => ({ ...prev, vector: preset }))
      toast.success(`'${presetName}' 프리셋이 적용되었습니다`)
    }
  }

  const handleAutoGeneratePrompt = () => {
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

    setPersona((prev) => ({
      ...prev,
      prompt: { ...prev.prompt, systemPrompt: generatedPrompt },
    }))
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

  const handleTestPrompt = async () => {
    setTestResult("생성 중...")

    try {
      const response = await fetch(`/api/personas/${personaId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentTitle: testContent,
          contentDescription: testContent,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setTestResult(`[${persona.name}의 리뷰]

${result.data.response}

---
테스트 결과:
- 벡터 정렬도: ${result.data.scores.vectorAlignment.toFixed(1)}%
- 톤 매칭: ${result.data.scores.toneMatch.toFixed(1)}%
- 추론 품질: ${result.data.scores.reasoningQuality.toFixed(1)}%
- 실행 시간: ${result.data.executionTime.toFixed(0)}ms`)
      } else {
        throw new Error(result.error)
      }
    } catch {
      // Fallback to mock response
      setTestResult(`[${persona.name}의 리뷰]

${testContent}에 대한 분석입니다.

이 작품은 서사 구조 측면에서 탄탄한 기반을 갖추고 있습니다. 특히 2막에서의 갈등 고조가 자연스럽게 이루어지며, 캐릭터 아크가 명확하게 설정되어 있습니다.

연출 기법 면에서는 롱테이크와 클로즈업의 적절한 배합이 돋보입니다. 다만, 중반부의 페이싱이 다소 느려지는 부분은 개선의 여지가 있습니다.

종합 평점: ★★★★☆ (4.2/5)`)
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

  // 에러 상태 (샘플 데이터로 표시하면서 알림)
  if (error) {
    console.warn("Using sample data due to error:", error)
  }

  return (
    <div className="space-y-6 p-6">
      {/* 에러 알림 배너 */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            API 연동 전이므로 샘플 데이터를 표시합니다. (ID: {personaId})
          </p>
        </div>
      )}

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
            <p className="text-muted-foreground">{persona.tagline}</p>
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
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger value="vector">성향 벡터</TabsTrigger>
          <TabsTrigger value="prompt">프롬프트</TabsTrigger>
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
                    onChange={(e) => setPersona((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>역할</Label>
                  <Select
                    disabled={!isEditing}
                    value={persona.role}
                    onValueChange={(value) => setPersona((prev) => ({ ...prev, role: value }))}
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
                  <Label>태그라인</Label>
                  <Input
                    value={persona.tagline}
                    disabled={!isEditing}
                    onChange={(e) => setPersona((prev) => ({ ...prev, tagline: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea
                    value={persona.description}
                    disabled={!isEditing}
                    rows={3}
                    onChange={(e) =>
                      setPersona((prev) => ({ ...prev, description: e.target.value }))
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
                    onValueChange={(value) => setPersona((prev) => ({ ...prev, status: value }))}
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
                      setPersona((prev) => ({ ...prev, visibility: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">공개 (Public)</SelectItem>
                      <SelectItem value="PRIVATE">비공개 (Private)</SelectItem>
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
                  setPersona((prev) => ({
                    ...prev,
                    prompt: { ...prev.prompt, systemPrompt: e.target.value },
                  }))
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
                {persona.prompt.exampleResponses.map((example, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-3 text-sm">
                    &quot;{example}&quot;
                  </div>
                ))}
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
                {persona.prompt.restrictions.map((restriction, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm dark:bg-red-900/20"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    {restriction}
                  </div>
                ))}
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

        {/* 성과 지표 탭 */}
        <TabsContent value="metrics" className="space-y-6">
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
                <div className="text-2xl font-bold">★ {persona.metrics.avgRating}</div>
                <p className="text-muted-foreground text-sm">평균 평점</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {persona.metrics.matchAccuracy}%
                </div>
                <p className="text-muted-foreground text-sm">매칭 정확도</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 버전 히스토리 탭 */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>버전 히스토리</CardTitle>
            </CardHeader>
            <CardContent>
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
                        {version.author} • {version.date}
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
    </div>
  )
}
