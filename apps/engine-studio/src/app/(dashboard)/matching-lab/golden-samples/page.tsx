"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Play,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type DifficultyLevel = "EASY" | "MEDIUM" | "HARD"

interface GoldenSample {
  id: string
  contentTitle: string
  contentType: string | null
  genre: string | null
  description: string | null
  testQuestion: string
  expectedReactions: ExpectedReaction[] | null
  difficultyLevel: DifficultyLevel
  validationDimensions: string[]
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ExpectedReaction {
  dimension: string
  expectedValue: string
  keywords: string[]
}

interface TestResult {
  personaId: string
  sampleId: string
  overallScore: number
  passed: boolean
  breakdown: {
    vectorAlignment: {
      score: number
    }
    reactionMatch: {
      score: number
      results: { dimension: string; match: boolean; score: number }[]
    }
  }
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  EASY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  HARD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  EASY: "쉬움",
  MEDIUM: "보통",
  HARD: "어려움",
}

const CONTENT_TYPES = ["영화", "드라마", "음악", "책", "게임", "기타"]
const GENRES = ["액션", "로맨스", "SF", "판타지", "공포", "코미디", "다큐멘터리", "기타"]
const DIMENSIONS = ["depth", "lens", "stance", "scope", "taste", "purpose"]

export default function GoldenSamplesPage() {
  const [samples, setSamples] = useState<GoldenSample[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | "ALL">("ALL")

  // 다이얼로그 상태
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [selectedSample, setSelectedSample] = useState<GoldenSample | null>(null)

  // 폼 상태
  const [formData, setFormData] = useState({
    contentTitle: "",
    contentType: "",
    genre: "",
    description: "",
    testQuestion: "",
    difficultyLevel: "MEDIUM" as DifficultyLevel,
    validationDimensions: [] as string[],
    expectedReactions: [] as ExpectedReaction[],
  })
  const [isSaving, setIsSaving] = useState(false)

  // 테스트 상태
  const [testPersonaId, setTestPersonaId] = useState("")
  const [testResponse, setTestResponse] = useState("")
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  // 골든 샘플 목록 조회
  const fetchSamples = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (difficultyFilter !== "ALL") {
        params.set("difficulty", difficultyFilter)
      }

      const response = await fetch(`/api/golden-samples?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setSamples(data.data.samples)
      } else {
        toast.error(data.error?.message || "목록 조회에 실패했습니다")
      }
    } catch {
      toast.error("서버 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }, [difficultyFilter])

  useEffect(() => {
    fetchSamples()
  }, [fetchSamples])

  // 필터링된 샘플
  const filteredSamples = samples.filter((sample) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        sample.contentTitle.toLowerCase().includes(query) ||
        sample.testQuestion.toLowerCase().includes(query) ||
        sample.contentType?.toLowerCase().includes(query) ||
        sample.genre?.toLowerCase().includes(query)
      )
    }
    return true
  })

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      contentTitle: "",
      contentType: "",
      genre: "",
      description: "",
      testQuestion: "",
      difficultyLevel: "MEDIUM",
      validationDimensions: [],
      expectedReactions: [],
    })
  }

  // 골든 샘플 생성
  const handleCreate = async () => {
    if (!formData.contentTitle || !formData.testQuestion) {
      toast.error("콘텐츠 제목과 테스트 질문은 필수입니다")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/golden-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("골든 샘플이 생성되었습니다")
        setShowCreateDialog(false)
        resetForm()
        fetchSamples()
      } else {
        toast.error(data.error?.message || "생성에 실패했습니다")
      }
    } catch {
      toast.error("서버 오류가 발생했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  // 골든 샘플 수정
  const handleEdit = async () => {
    if (!selectedSample) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/golden-samples/${selectedSample.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("골든 샘플이 수정되었습니다")
        setShowEditDialog(false)
        setSelectedSample(null)
        resetForm()
        fetchSamples()
      } else {
        toast.error(data.error?.message || "수정에 실패했습니다")
      }
    } catch {
      toast.error("서버 오류가 발생했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  // 골든 샘플 삭제
  const handleDelete = async () => {
    if (!selectedSample) return

    try {
      const response = await fetch(`/api/golden-samples/${selectedSample.id}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (data.success) {
        toast.success("골든 샘플이 삭제되었습니다")
        setShowDeleteDialog(false)
        setSelectedSample(null)
        fetchSamples()
      } else {
        toast.error(data.error?.message || "삭제에 실패했습니다")
      }
    } catch {
      toast.error("서버 오류가 발생했습니다")
    }
  }

  // 테스트 실행
  const handleTest = async () => {
    if (!selectedSample || !testPersonaId || !testResponse) {
      toast.error("페르소나 ID와 응답을 입력해주세요")
      return
    }

    setIsTesting(true)
    setTestResult(null)
    try {
      const response = await fetch("/api/golden-samples/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: testPersonaId,
          sampleId: selectedSample.id,
          response: testResponse,
        }),
      })
      const data = await response.json()

      if (data.success) {
        setTestResult(data.data)
        if (data.data.passed) {
          toast.success(`테스트 통과! 점수: ${data.data.overallScore}점`)
        } else {
          toast.warning(`테스트 미통과. 점수: ${data.data.overallScore}점`)
        }
      } else {
        toast.error(data.error?.message || "테스트 실행에 실패했습니다")
      }
    } catch {
      toast.error("서버 오류가 발생했습니다")
    } finally {
      setIsTesting(false)
    }
  }

  // 수정 다이얼로그 열기
  const openEditDialog = (sample: GoldenSample) => {
    setSelectedSample(sample)
    setFormData({
      contentTitle: sample.contentTitle,
      contentType: sample.contentType || "",
      genre: sample.genre || "",
      description: sample.description || "",
      testQuestion: sample.testQuestion,
      difficultyLevel: sample.difficultyLevel,
      validationDimensions: sample.validationDimensions,
      expectedReactions: sample.expectedReactions || [],
    })
    setShowEditDialog(true)
  }

  // 테스트 다이얼로그 열기
  const openTestDialog = (sample: GoldenSample) => {
    setSelectedSample(sample)
    setTestPersonaId("")
    setTestResponse("")
    setTestResult(null)
    setShowTestDialog(true)
  }

  // 기대 반응 추가
  const addExpectedReaction = () => {
    setFormData((prev) => ({
      ...prev,
      expectedReactions: [
        ...prev.expectedReactions,
        { dimension: "depth", expectedValue: "high", keywords: [] },
      ],
    }))
  }

  // 기대 반응 수정
  const updateExpectedReaction = (
    index: number,
    field: keyof ExpectedReaction,
    value: string | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      expectedReactions: prev.expectedReactions.map((reaction, i) =>
        i === index ? { ...reaction, [field]: value } : reaction
      ),
    }))
  }

  // 기대 반응 삭제
  const removeExpectedReaction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      expectedReactions: prev.expectedReactions.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">골든 샘플 관리</h1>
          <p className="text-muted-foreground">
            페르소나 품질 검증을 위한 표준 테스트 케이스를 관리합니다.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />새 골든 샘플
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="콘텐츠 제목, 질문으로 검색..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <Select
                value={difficultyFilter}
                onValueChange={(v) => setDifficultyFilter(v as DifficultyLevel | "ALL")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="난이도" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체</SelectItem>
                  <SelectItem value="EASY">쉬움</SelectItem>
                  <SelectItem value="MEDIUM">보통</SelectItem>
                  <SelectItem value="HARD">어려움</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{samples.length}</div>
            <p className="text-muted-foreground text-sm">전체 샘플</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {samples.filter((s) => s.difficultyLevel === "EASY").length}
            </div>
            <p className="text-muted-foreground text-sm">쉬움</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {samples.filter((s) => s.difficultyLevel === "MEDIUM").length}
            </div>
            <p className="text-muted-foreground text-sm">보통</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {samples.filter((s) => s.difficultyLevel === "HARD").length}
            </div>
            <p className="text-muted-foreground text-sm">어려움</p>
          </CardContent>
        </Card>
      </div>

      {/* 샘플 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>골든 샘플 목록</CardTitle>
          <CardDescription>총 {filteredSamples.length}개의 샘플</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center">
              <Target className="text-muted-foreground mb-4 h-12 w-12" />
              <p className="text-muted-foreground">골든 샘플이 없습니다</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />첫 샘플 만들기
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>콘텐츠</TableHead>
                  <TableHead>타입/장르</TableHead>
                  <TableHead>테스트 질문</TableHead>
                  <TableHead>난이도</TableHead>
                  <TableHead>버전</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="font-medium">{sample.contentTitle}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {sample.contentType && (
                          <Badge variant="outline">{sample.contentType}</Badge>
                        )}
                        {sample.genre && <Badge variant="secondary">{sample.genre}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{sample.testQuestion}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${DIFFICULTY_COLORS[sample.difficultyLevel]}`}
                      >
                        {DIFFICULTY_LABELS[sample.difficultyLevel]}
                      </span>
                    </TableCell>
                    <TableCell>v{sample.version}</TableCell>
                    <TableCell>
                      {sample.isActive ? (
                        <Badge variant="default">활성</Badge>
                      ) : (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openTestDialog(sample)}
                          title="테스트"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(sample)}
                          title="수정"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSample(sample)
                            setShowDeleteDialog(true)
                          }}
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 생성 다이얼로그 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 골든 샘플 생성</DialogTitle>
            <DialogDescription>
              페르소나 품질 검증을 위한 테스트 케이스를 생성합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>콘텐츠 제목 *</Label>
                <Input
                  value={formData.contentTitle}
                  onChange={(e) => setFormData({ ...formData, contentTitle: e.target.value })}
                  placeholder="예: 기생충"
                />
              </div>
              <div className="space-y-2">
                <Label>난이도</Label>
                <Select
                  value={formData.difficultyLevel}
                  onValueChange={(v) =>
                    setFormData({ ...formData, difficultyLevel: v as DifficultyLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">쉬움</SelectItem>
                    <SelectItem value="MEDIUM">보통</SelectItem>
                    <SelectItem value="HARD">어려움</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>콘텐츠 타입</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(v) => setFormData({ ...formData, contentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>장르</Label>
                <Select
                  value={formData.genre}
                  onValueChange={(v) => setFormData({ ...formData, genre: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="콘텐츠에 대한 간단한 설명..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>테스트 질문 *</Label>
              <Textarea
                value={formData.testQuestion}
                onChange={(e) => setFormData({ ...formData, testQuestion: e.target.value })}
                placeholder="예: 이 영화에 대해 어떻게 생각하시나요?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>검증 차원</Label>
              <div className="flex flex-wrap gap-2">
                {DIMENSIONS.map((dim) => (
                  <Badge
                    key={dim}
                    variant={formData.validationDimensions.includes(dim) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        validationDimensions: prev.validationDimensions.includes(dim)
                          ? prev.validationDimensions.filter((d) => d !== dim)
                          : [...prev.validationDimensions, dim],
                      }))
                    }}
                  >
                    {dim}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>기대 반응</Label>
                <Button type="button" variant="outline" size="sm" onClick={addExpectedReaction}>
                  <Plus className="mr-1 h-3 w-3" />
                  추가
                </Button>
              </div>
              {formData.expectedReactions.map((reaction, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg border p-3">
                  <Select
                    value={reaction.dimension}
                    onValueChange={(v) => updateExpectedReaction(idx, "dimension", v)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSIONS.map((dim) => (
                        <SelectItem key={dim} value={dim}>
                          {dim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={reaction.expectedValue}
                    onValueChange={(v) => updateExpectedReaction(idx, "expectedValue", v)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="medium">중간</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="키워드 (쉼표로 구분)"
                    value={reaction.keywords.join(", ")}
                    onChange={(e) =>
                      updateExpectedReaction(
                        idx,
                        "keywords",
                        e.target.value.split(",").map((k) => k.trim())
                      )
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExpectedReaction(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>골든 샘플 수정</DialogTitle>
            <DialogDescription>테스트 케이스를 수정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>콘텐츠 제목 *</Label>
                <Input
                  value={formData.contentTitle}
                  onChange={(e) => setFormData({ ...formData, contentTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>난이도</Label>
                <Select
                  value={formData.difficultyLevel}
                  onValueChange={(v) =>
                    setFormData({ ...formData, difficultyLevel: v as DifficultyLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">쉬움</SelectItem>
                    <SelectItem value="MEDIUM">보통</SelectItem>
                    <SelectItem value="HARD">어려움</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>콘텐츠 타입</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(v) => setFormData({ ...formData, contentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>장르</Label>
                <Select
                  value={formData.genre}
                  onValueChange={(v) => setFormData({ ...formData, genre: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>테스트 질문 *</Label>
              <Textarea
                value={formData.testQuestion}
                onChange={(e) => setFormData({ ...formData, testQuestion: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>검증 차원</Label>
              <div className="flex flex-wrap gap-2">
                {DIMENSIONS.map((dim) => (
                  <Badge
                    key={dim}
                    variant={formData.validationDimensions.includes(dim) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        validationDimensions: prev.validationDimensions.includes(dim)
                          ? prev.validationDimensions.filter((d) => d !== dim)
                          : [...prev.validationDimensions, dim],
                      }))
                    }}
                  >
                    {dim}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>기대 반응</Label>
                <Button type="button" variant="outline" size="sm" onClick={addExpectedReaction}>
                  <Plus className="mr-1 h-3 w-3" />
                  추가
                </Button>
              </div>
              {formData.expectedReactions.map((reaction, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg border p-3">
                  <Select
                    value={reaction.dimension}
                    onValueChange={(v) => updateExpectedReaction(idx, "dimension", v)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSIONS.map((dim) => (
                        <SelectItem key={dim} value={dim}>
                          {dim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={reaction.expectedValue}
                    onValueChange={(v) => updateExpectedReaction(idx, "expectedValue", v)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="medium">중간</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="키워드 (쉼표로 구분)"
                    value={reaction.keywords.join(", ")}
                    onChange={(e) =>
                      updateExpectedReaction(
                        idx,
                        "keywords",
                        e.target.value.split(",").map((k) => k.trim())
                      )
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExpectedReaction(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              취소
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 테스트 다이얼로그 */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>골든 샘플 테스트</DialogTitle>
            <DialogDescription>
              {selectedSample?.contentTitle} - {selectedSample?.testQuestion}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>페르소나 ID</Label>
              <Input
                value={testPersonaId}
                onChange={(e) => setTestPersonaId(e.target.value)}
                placeholder="테스트할 페르소나 ID를 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>페르소나 응답</Label>
              <Textarea
                value={testResponse}
                onChange={(e) => setTestResponse(e.target.value)}
                placeholder="페르소나가 생성한 응답을 입력하세요..."
                rows={6}
              />
            </div>
            {testResult && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {testResult.passed ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-green-600">테스트 통과</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-red-600">테스트 미통과</span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>종합 점수</span>
                      <span className="font-bold">{testResult.overallScore}점</span>
                    </div>
                    <div className="flex justify-between">
                      <span>벡터 정렬</span>
                      <span>{testResult.breakdown.vectorAlignment.score}점</span>
                    </div>
                    <div className="flex justify-between">
                      <span>반응 매칭</span>
                      <span>{testResult.breakdown.reactionMatch.score}점</span>
                    </div>
                    {testResult.breakdown.reactionMatch.results.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-muted-foreground text-sm">반응 상세:</p>
                        {testResult.breakdown.reactionMatch.results.map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>{r.dimension}</span>
                            <div className="flex items-center gap-2">
                              <span>{r.score}%</span>
                              {r.match ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              닫기
            </Button>
            <Button onClick={handleTest} disabled={isTesting}>
              {isTesting ? "테스트 중..." : "테스트 실행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>골든 샘플 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{selectedSample?.contentTitle}&apos; 샘플을 삭제하시겠습니까? 이 작업은 되돌릴
              수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
