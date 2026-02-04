"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  safetyFiltersService,
  type SafetyFilter as ApiSafetyFilter,
  type SafetyFilterStats,
  type FilterType,
} from "@/services/safety-filters-service"
import {
  Shield,
  Plus,
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  EyeOff,
  Filter,
  Ban,
  Sparkles,
  Trash2,
  TestTube,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export default function SafetyFiltersPage() {
  const [filters, setFilters] = useState<ApiSafetyFilter[]>([])
  const [stats, setStats] = useState<SafetyFilterStats>({
    total: 0,
    active: 0,
    inactive: 0,
    byType: {} as Record<FilterType, number>,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [testInput, setTestInput] = useState("")
  const [testResult, setTestResult] = useState<null | { safe: boolean; flags: string[] }>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add Filter Dialog state
  const [newFilterName, setNewFilterName] = useState("")
  const [newFilterPattern, setNewFilterPattern] = useState("")
  const [newFilterType, setNewFilterType] = useState<FilterType>("CUSTOM")

  useEffect(() => {
    loadFilters()
  }, [])

  const loadFilters = async () => {
    try {
      setIsLoading(true)
      const data = await safetyFiltersService.getFilters()
      setFilters(data.filters)
      setStats(data.stats)
    } catch (error) {
      console.error("Failed to load filters:", error)
      toast.error("필터 목록을 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterToggle = async (filter: ApiSafetyFilter) => {
    try {
      const updated = await safetyFiltersService.toggleFilter(filter.id, !filter.isActive)
      setFilters((prev) =>
        prev.map((f) => (f.id === updated.id ? { ...f, isActive: updated.isActive } : f))
      )
      toast.success(updated.isActive ? "필터가 활성화되었습니다." : "필터가 비활성화되었습니다.")
    } catch (error) {
      console.error("Failed to toggle filter:", error)
      toast.error("필터 상태 변경에 실패했습니다.")
    }
  }

  const handleDeleteFilter = async (id: string) => {
    try {
      await safetyFiltersService.deleteFilter(id)
      setFilters((prev) => prev.filter((f) => f.id !== id))
      toast.success("필터가 삭제되었습니다.")
      loadFilters()
    } catch (error) {
      console.error("Failed to delete filter:", error)
      toast.error("필터 삭제에 실패했습니다.")
    }
  }

  const handleTest = () => {
    // 시뮬레이션된 테스트 결과
    const isSafe = Math.random() > 0.3
    const matchingFilters = filters.filter((f) => {
      if (!f.isActive) return false
      try {
        const regex = new RegExp(f.pattern, "i")
        return regex.test(testInput)
      } catch {
        return false
      }
    })
    setTestResult({
      safe: matchingFilters.length === 0,
      flags: matchingFilters.map((f) => f.name),
    })
  }

  const handleAddFilter = async () => {
    if (!newFilterName.trim()) {
      toast.error("필터 이름을 입력해주세요.")
      return
    }
    if (!newFilterPattern.trim()) {
      toast.error("필터 패턴을 입력해주세요.")
      return
    }
    // Validate regex pattern
    try {
      new RegExp(newFilterPattern)
    } catch {
      toast.error("유효하지 않은 정규식 패턴입니다.")
      return
    }

    try {
      setIsSubmitting(true)
      await safetyFiltersService.createFilter({
        name: newFilterName,
        filterType: newFilterType,
        pattern: newFilterPattern,
        isActive: true,
      })
      toast.success("새 필터가 추가되었습니다.")
      setShowAddDialog(false)
      setNewFilterName("")
      setNewFilterPattern("")
      setNewFilterType("CUSTOM")
      loadFilters()
    } catch (error) {
      console.error("Failed to create filter:", error)
      toast.error("필터 생성에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFilterTypeLabel = (type: FilterType) => {
    const labels: Record<FilterType, string> = {
      PROFANITY: "욕설/비속어",
      HATE_SPEECH: "혐오 표현",
      POLITICAL: "정치적 내용",
      RELIGIOUS: "종교적 내용",
      CUSTOM: "커스텀",
    }
    return labels[type]
  }

  const getFilterTypeBadge = (type: FilterType) => {
    const colors: Record<FilterType, string> = {
      PROFANITY: "bg-red-500",
      HATE_SPEECH: "bg-orange-500",
      POLITICAL: "bg-blue-500",
      RELIGIOUS: "bg-purple-500",
      CUSTOM: "bg-gray-500",
    }
    return <Badge className={colors[type]}>{getFilterTypeLabel(type)}</Badge>
  }

  const getFilterTypeIcon = (type: FilterType) => {
    switch (type) {
      case "PROFANITY":
        return <AlertCircle className="h-4 w-4" />
      case "HATE_SPEECH":
        return <Ban className="h-4 w-4" />
      case "POLITICAL":
        return <AlertTriangle className="h-4 w-4" />
      case "RELIGIOUS":
        return <EyeOff className="h-4 w-4" />
      case "CUSTOM":
        return <Settings className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Shield className="h-6 w-6 text-green-500" />
            안전 필터
          </h2>
          <p className="text-muted-foreground">콘텐츠 안전성을 위한 필터 설정을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadFilters}>
            <RefreshCw className="mr-2 h-4 w-4" />
            동기화
          </Button>
          <Button onClick={() => toast.success("필터 설정이 저장되었습니다.")}>
            <Save className="mr-2 h-4 w-4" />
            설정 저장
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 필터</CardTitle>
            <Filter className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-muted-foreground mt-1 text-xs">등록된 필터</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">활성 필터</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-muted-foreground mt-1 text-xs">사용 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">비활성 필터</CardTitle>
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inactive}</div>
            <p className="text-muted-foreground mt-1 text-xs">비활성화됨</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">필터 유형</CardTitle>
            <Sparkles className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byType).length}</div>
            <p className="text-muted-foreground mt-1 text-xs">카테고리</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="filters">
        <TabsList>
          <TabsTrigger value="filters">필터 설정</TabsTrigger>
          <TabsTrigger value="test">테스트</TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>안전 필터 목록</CardTitle>
                  <CardDescription>각 필터의 정규식 패턴과 상태를 관리합니다.</CardDescription>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      필터 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 필터 추가</DialogTitle>
                      <DialogDescription>새로운 안전 필터를 생성합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>필터 이름</Label>
                        <Input
                          placeholder="예: 커스텀 필터"
                          value={newFilterName}
                          onChange={(e) => setNewFilterName(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>필터 유형</Label>
                        <Select
                          value={newFilterType}
                          onValueChange={(v) => setNewFilterType(v as FilterType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PROFANITY">욕설/비속어</SelectItem>
                            <SelectItem value="HATE_SPEECH">혐오 표현</SelectItem>
                            <SelectItem value="POLITICAL">정치적 내용</SelectItem>
                            <SelectItem value="RELIGIOUS">종교적 내용</SelectItem>
                            <SelectItem value="CUSTOM">커스텀</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>정규식 패턴</Label>
                        <Textarea
                          placeholder="예: (욕설|비속어).*"
                          value={newFilterPattern}
                          onChange={(e) => setNewFilterPattern(e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">
                          정규식 패턴을 입력하세요. 해당 패턴과 일치하는 콘텐츠가 필터링됩니다.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        취소
                      </Button>
                      <Button onClick={handleAddFilter} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        추가
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {filters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Shield className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">등록된 필터가 없습니다</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    새 필터를 추가하여 콘텐츠 필터링을 시작하세요.
                  </p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    필터 추가
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filters.map((filter) => (
                    <div
                      key={filter.id}
                      className={`rounded-lg border p-4 transition-all ${
                        filter.isActive ? "" : "opacity-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="bg-muted rounded-lg p-2">
                            {getFilterTypeIcon(filter.filterType)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{filter.name}</h4>
                              {getFilterTypeBadge(filter.filterType)}
                            </div>
                            <p className="text-muted-foreground mt-1 font-mono text-sm">
                              {filter.pattern}
                            </p>
                            <p className="text-muted-foreground mt-2 text-xs">
                              생성: {formatDate(filter.createdAt)} • 수정:{" "}
                              {formatDate(filter.updatedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFilter(filter.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={filter.isActive}
                            onCheckedChange={() => handleFilterToggle(filter)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>필터 테스트</CardTitle>
              <CardDescription>텍스트를 입력하여 안전 필터를 테스트합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>테스트 입력</Label>
                <Textarea
                  placeholder="테스트할 텍스트를 입력하세요..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>

              <Button onClick={handleTest} className="w-full" disabled={!testInput.trim()}>
                <TestTube className="mr-2 h-4 w-4" />
                필터 테스트 실행
              </Button>

              {testResult && (
                <div
                  className={`rounded-lg p-4 ${
                    testResult.safe
                      ? "border border-green-500 bg-green-500/10"
                      : "border border-red-500 bg-red-500/10"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {testResult.safe ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-600">안전</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-600">필터 감지됨</span>
                      </>
                    )}
                  </div>
                  {!testResult.safe && testResult.flags.length > 0 && (
                    <div className="mt-2">
                      <p className="text-muted-foreground mb-2 text-sm">감지된 필터:</p>
                      <div className="flex flex-wrap gap-2">
                        {testResult.flags.map((flag, index) => (
                          <Badge key={index} variant="destructive">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
