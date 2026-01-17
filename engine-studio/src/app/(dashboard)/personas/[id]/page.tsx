"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Save, Trash2, Copy, Archive, Play, History,
  AlertTriangle, CheckCircle, Eye, EyeOff, RotateCcw
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
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
      "연출력 8/10, 각본 7/10, 배우 연기 9/10로 평가합니다."
    ],
    restrictions: ["스포일러 금지", "비속어 금지"]
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
  const [persona, setPersona] = useState(SAMPLE_PERSONA)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [testContent, setTestContent] = useState("")

  const handleVectorChange = (key: string, value: number[]) => {
    setPersona(prev => ({
      ...prev,
      vector: { ...prev.vector, [key]: value[0] }
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    // API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setIsEditing(false)
  }

  const handleTestPrompt = async () => {
    setTestResult("생성 중...")
    await new Promise(resolve => setTimeout(resolve, 1500))
    setTestResult(`[${persona.name}의 리뷰]

${testContent}에 대한 분석입니다.

이 작품은 서사 구조 측면에서 탄탄한 기반을 갖추고 있습니다. 특히 2막에서의 갈등 고조가 자연스럽게 이루어지며, 캐릭터 아크가 명확하게 설정되어 있습니다.

연출 기법 면에서는 롱테이크와 클로즈업의 적절한 배합이 돋보입니다. 다만, 중반부의 페이싱이 다소 느려지는 부분은 개선의 여지가 있습니다.

종합 평점: ★★★★☆ (4.2/5)`)
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

  return (
    <div className="p-6 space-y-6">
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
              <Button variant="outline" onClick={() => setIsEditing(false)}>취소</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowTestDialog(true)}>
                <Play className="h-4 w-4 mr-2" />
                테스트
              </Button>
              <Button variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                복제
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                수정
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
                    onChange={(e) => setPersona(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>역할</Label>
                  <Select disabled={!isEditing} value={persona.role}>
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
                    onChange={(e) => setPersona(prev => ({ ...prev, tagline: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea
                    value={persona.description}
                    disabled={!isEditing}
                    rows={3}
                    onChange={(e) => setPersona(prev => ({ ...prev, description: e.target.value }))}
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
                  <Select disabled={!isEditing} value={persona.status}>
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
                  <Select disabled={!isEditing} value={persona.visibility}>
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
                      <Badge key={idx} variant="secondary">{exp}</Badge>
                    ))}
                    {isEditing && (
                      <Button variant="outline" size="sm">+ 추가</Button>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="text-sm text-muted-foreground space-y-1">
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
                <CardDescription>
                  페르소나의 성격을 정의하는 6개 차원의 벡터입니다.
                </CardDescription>
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
                      <span className="text-xs text-muted-foreground w-16">{label.low}</span>
                      <Slider
                        value={[persona.vector[key as keyof typeof persona.vector]]}
                        min={0}
                        max={1}
                        step={0.05}
                        disabled={!isEditing}
                        onValueChange={(value) => handleVectorChange(key, value)}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-16 text-right">{label.high}</span>
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
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">프리셋</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={!isEditing}>
                      냉철한 분석가
                    </Button>
                    <Button variant="outline" size="sm" disabled={!isEditing}>
                      감성 에세이스트
                    </Button>
                    <Button variant="outline" size="sm" disabled={!isEditing}>
                      트렌드 헌터
                    </Button>
                    <Button variant="outline" size="sm" disabled={!isEditing}>
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
              <CardDescription>
                LLM에 전달되는 페르소나 정의 프롬프트입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={persona.prompt.systemPrompt}
                disabled={!isEditing}
                rows={20}
                className="font-mono text-sm"
                onChange={(e) => setPersona(prev => ({
                  ...prev,
                  prompt: { ...prev.prompt, systemPrompt: e.target.value }
                }))}
              />
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {persona.prompt.systemPrompt.length}자 / 권장 200-500자
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!isEditing}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    벡터 기반 자동 생성
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}>
                    <Play className="h-4 w-4 mr-2" />
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
                  <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                    &quot;{example}&quot;
                  </div>
                ))}
                {isEditing && (
                  <Button variant="outline" size="sm" className="w-full">+ 예시 추가</Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>금기사항</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {persona.prompt.restrictions.map((restriction, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    {restriction}
                  </div>
                ))}
                {isEditing && (
                  <Button variant="outline" size="sm" className="w-full">+ 금기사항 추가</Button>
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
                <p className="text-sm text-muted-foreground">총 노출 수</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {persona.metrics.selectionCount.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">선택 수</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  ★ {persona.metrics.avgRating}
                </div>
                <p className="text-sm text-muted-foreground">평균 평점</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {persona.metrics.matchAccuracy}%
                </div>
                <p className="text-sm text-muted-foreground">매칭 정확도</p>
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
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <History className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{version.version}</div>
                        <div className="text-sm text-muted-foreground">{version.changes}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {version.author} • {version.date}
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        보기
                      </Button>
                      {idx > 0 && (
                        <Button variant="outline" size="sm">
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
            <DialogDescription>
              샘플 콘텐츠로 페르소나의 응답을 테스트합니다.
            </DialogDescription>
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
              <div className="p-4 bg-muted rounded-lg">
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
