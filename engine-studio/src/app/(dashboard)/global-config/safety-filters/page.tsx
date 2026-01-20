"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
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

// 안전 필터 카테고리
interface SafetyFilter {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  threshold: number
  action: "block" | "warn" | "flag" | "allow"
  triggeredCount: number
  lastTriggered: string | null
}

const SAFETY_FILTERS: SafetyFilter[] = [
  {
    id: "1",
    name: "욕설/비속어",
    description: "부적절한 언어 사용 감지",
    category: "language",
    enabled: true,
    threshold: 0.8,
    action: "block",
    triggeredCount: 1234,
    lastTriggered: "10분 전",
  },
  {
    id: "2",
    name: "혐오 표현",
    description: "인종, 성별, 종교 등에 대한 혐오 표현",
    category: "hate",
    enabled: true,
    threshold: 0.7,
    action: "block",
    triggeredCount: 567,
    lastTriggered: "1시간 전",
  },
  {
    id: "3",
    name: "성인 콘텐츠",
    description: "성적으로 노골적인 콘텐츠",
    category: "adult",
    enabled: true,
    threshold: 0.9,
    action: "block",
    triggeredCount: 234,
    lastTriggered: "3시간 전",
  },
  {
    id: "4",
    name: "폭력적 내용",
    description: "과도한 폭력 묘사",
    category: "violence",
    enabled: true,
    threshold: 0.75,
    action: "warn",
    triggeredCount: 456,
    lastTriggered: "2시간 전",
  },
  {
    id: "5",
    name: "개인정보",
    description: "전화번호, 주소 등 개인정보 노출",
    category: "pii",
    enabled: true,
    threshold: 0.95,
    action: "block",
    triggeredCount: 89,
    lastTriggered: "5시간 전",
  },
  {
    id: "6",
    name: "스팸/광고",
    description: "스팸성 콘텐츠 및 무분별한 광고",
    category: "spam",
    enabled: true,
    threshold: 0.85,
    action: "flag",
    triggeredCount: 789,
    lastTriggered: "30분 전",
  },
]

const FILTER_STATS = {
  totalBlocked: 2579,
  totalWarned: 456,
  totalFlagged: 789,
  avgResponseTime: 23,
}

const BLOCKED_WORDS = [
  "욕설1", "욕설2", "비속어1", "비속어2", "금지어1",
]

export default function SafetyFiltersPage() {
  const [filters, setFilters] = useState(SAFETY_FILTERS)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [testInput, setTestInput] = useState("")
  const [testResult, setTestResult] = useState<null | { safe: boolean; flags: string[] }>(null)
  // Add Filter Dialog state
  const [newFilterName, setNewFilterName] = useState("")
  const [newFilterDescription, setNewFilterDescription] = useState("")
  const [newFilterCategory, setNewFilterCategory] = useState("")
  // Blocked words state
  const [blockedWords, setBlockedWords] = useState(BLOCKED_WORDS)
  const [newWord, setNewWord] = useState("")
  const [bulkWords, setBulkWords] = useState("")

  const handleFilterToggle = (id: string) => {
    setFilters(filters.map(f =>
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ))
  }

  const handleThresholdChange = (id: string, value: number[]) => {
    setFilters(filters.map(f =>
      f.id === id ? { ...f, threshold: value[0] } : f
    ))
  }

  const handleTest = () => {
    // 시뮬레이션된 테스트 결과
    const isSafe = Math.random() > 0.3
    setTestResult({
      safe: isSafe,
      flags: isSafe ? [] : ["욕설/비속어", "스팸/광고"],
    })
  }

  const handleAddFilter = () => {
    if (!newFilterName.trim()) {
      toast.error("필터 이름을 입력해주세요.")
      return
    }
    const newFilter: SafetyFilter = {
      id: String(Date.now()),
      name: newFilterName,
      description: newFilterDescription,
      category: newFilterCategory || "custom",
      enabled: true,
      threshold: 0.8,
      action: "flag",
      triggeredCount: 0,
      lastTriggered: null,
    }
    setFilters([...filters, newFilter])
    toast.success("새 필터가 추가되었습니다.")
    setShowAddDialog(false)
    setNewFilterName("")
    setNewFilterDescription("")
    setNewFilterCategory("")
  }

  const handleAddWord = () => {
    if (!newWord.trim()) {
      toast.error("단어를 입력해주세요.")
      return
    }
    if (blockedWords.includes(newWord.trim())) {
      toast.error("이미 등록된 단어입니다.")
      return
    }
    setBlockedWords([...blockedWords, newWord.trim()])
    setNewWord("")
    toast.success("단어가 추가되었습니다.")
  }

  const handleDeleteWord = (word: string) => {
    setBlockedWords(blockedWords.filter(w => w !== word))
    toast.success("단어가 삭제되었습니다.")
  }

  const handleBulkAddWords = () => {
    if (!bulkWords.trim()) {
      toast.error("단어를 입력해주세요.")
      return
    }
    const words = bulkWords.split("\n").map(w => w.trim()).filter(w => w && !blockedWords.includes(w))
    if (words.length === 0) {
      toast.error("추가할 새 단어가 없습니다.")
      return
    }
    setBlockedWords([...blockedWords, ...words])
    setBulkWords("")
    toast.success(`${words.length}개의 단어가 추가되었습니다.`)
  }

  const getActionBadge = (action: SafetyFilter["action"]) => {
    switch (action) {
      case "block":
        return <Badge variant="destructive">차단</Badge>
      case "warn":
        return <Badge className="bg-yellow-500">경고</Badge>
      case "flag":
        return <Badge className="bg-blue-500">플래그</Badge>
      case "allow":
        return <Badge variant="secondary">허용</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "language":
        return <AlertCircle className="h-4 w-4" />
      case "hate":
        return <Ban className="h-4 w-4" />
      case "adult":
        return <EyeOff className="h-4 w-4" />
      case "violence":
        return <AlertTriangle className="h-4 w-4" />
      case "pii":
        return <Shield className="h-4 w-4" />
      case "spam":
        return <Filter className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-500" />
            안전 필터
          </h2>
          <p className="text-muted-foreground">
            콘텐츠 안전성을 위한 필터 설정을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success("필터 설정을 동기화했습니다.")}>
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
            <CardTitle className="text-sm font-medium">차단된 콘텐츠</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {FILTER_STATS.totalBlocked.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">이번 달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">경고 발생</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {FILTER_STATS.totalWarned.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">이번 달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">플래그된 항목</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {FILTER_STATS.totalFlagged.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">이번 달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 응답 시간</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {FILTER_STATS.avgResponseTime}ms
            </div>
            <p className="text-xs text-muted-foreground mt-1">필터 처리</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="filters">
        <TabsList>
          <TabsTrigger value="filters">필터 설정</TabsTrigger>
          <TabsTrigger value="blocklist">차단 목록</TabsTrigger>
          <TabsTrigger value="test">테스트</TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>안전 필터 목록</CardTitle>
                  <CardDescription>각 필터의 임계값과 동작을 설정합니다.</CardDescription>
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
                      <DialogDescription>
                        새로운 안전 필터를 생성합니다.
                      </DialogDescription>
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
                        <Label>설명</Label>
                        <Textarea
                          placeholder="필터에 대한 설명"
                          value={newFilterDescription}
                          onChange={(e) => setNewFilterDescription(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>카테고리</Label>
                        <Select value={newFilterCategory} onValueChange={setNewFilterCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="language">언어</SelectItem>
                            <SelectItem value="hate">혐오</SelectItem>
                            <SelectItem value="adult">성인</SelectItem>
                            <SelectItem value="violence">폭력</SelectItem>
                            <SelectItem value="pii">개인정보</SelectItem>
                            <SelectItem value="spam">스팸</SelectItem>
                            <SelectItem value="custom">커스텀</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        취소
                      </Button>
                      <Button onClick={handleAddFilter}>추가</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filters.map((filter) => (
                  <div
                    key={filter.id}
                    className={`p-4 border rounded-lg transition-all ${
                      filter.enabled ? "" : "opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getCategoryIcon(filter.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{filter.name}</h4>
                            {getActionBadge(filter.action)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {filter.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="font-medium">{filter.triggeredCount}</p>
                          <p className="text-muted-foreground text-xs">감지</p>
                        </div>
                        <Switch
                          checked={filter.enabled}
                          onCheckedChange={() => handleFilterToggle(filter.id)}
                        />
                      </div>
                    </div>

                    {filter.enabled && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>임계값</Label>
                            <span className="text-sm font-mono">
                              {filter.threshold.toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            value={[filter.threshold]}
                            onValueChange={(v) => handleThresholdChange(filter.id, v)}
                            min={0}
                            max={1}
                            step={0.05}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>동작</Label>
                          <Select
                            value={filter.action}
                            onValueChange={(value: SafetyFilter["action"]) => {
                              setFilters(filters.map(f =>
                                f.id === filter.id ? { ...f, action: value } : f
                              ))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="block">차단</SelectItem>
                              <SelectItem value="warn">경고</SelectItem>
                              <SelectItem value="flag">플래그</SelectItem>
                              <SelectItem value="allow">허용</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {filter.lastTriggered && (
                      <p className="text-xs text-muted-foreground mt-3">
                        마지막 감지: {filter.lastTriggered}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>차단 단어 목록</CardTitle>
                  <CardDescription>직접 차단할 단어를 관리합니다.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="단어 입력"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    className="w-40"
                  />
                  <Button size="sm" onClick={handleAddWord}>
                    <Plus className="mr-2 h-4 w-4" />
                    단어 추가
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {blockedWords.map((word) => (
                  <Badge
                    key={word}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    <span className="blur-sm hover:blur-none transition-all cursor-pointer">
                      {word}
                    </span>
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => handleDeleteWord(word)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>대량 추가 (줄바꿈으로 구분)</Label>
                  <Textarea
                    placeholder="차단할 단어를 입력하세요..."
                    className="min-h-[100px]"
                    value={bulkWords}
                    onChange={(e) => setBulkWords(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={handleBulkAddWords}>
                  <Plus className="mr-2 h-4 w-4" />
                  대량 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>필터 테스트</CardTitle>
              <CardDescription>
                텍스트를 입력하여 안전 필터를 테스트합니다.
              </CardDescription>
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

              <Button onClick={handleTest} className="w-full">
                <TestTube className="mr-2 h-4 w-4" />
                필터 테스트 실행
              </Button>

              {testResult && (
                <div
                  className={`p-4 rounded-lg ${
                    testResult.safe
                      ? "bg-green-500/10 border border-green-500"
                      : "bg-red-500/10 border border-red-500"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.safe ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-600">안전</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-600">위험 감지</span>
                      </>
                    )}
                  </div>
                  {!testResult.safe && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        감지된 필터:
                      </p>
                      <div className="flex gap-2">
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
