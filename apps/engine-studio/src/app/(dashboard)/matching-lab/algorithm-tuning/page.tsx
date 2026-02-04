"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  abTestsService,
  type ABTest as ApiABTest,
  type ABTestStats,
} from "@/services/ab-tests-service"
import {
  Sliders,
  Play,
  Pause,
  TrendingUp,
  Users,
  Percent,
  CheckCircle,
  Plus,
  Eye,
  Trash2,
  Copy,
  MoreHorizontal,
  GitBranch,
  ArrowRight,
  Info,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

// UI에서 사용할 metrics 타입
interface TestMetrics {
  ctr: { control: number; test: number; lift: number }
  accuracy: { control: number; test: number; lift: number }
  satisfaction: { control: number; test: number; lift: number }
}

interface TestResults {
  sampleSize?: { control: number; test: number }
  metrics?: TestMetrics
  significance?: number
  winner?: "control" | "test" | null
  dailyMetrics?: Array<{ date: string; control: number; test: number }>
}

// API 결과에서 metrics 추출
const getTestResults = (results: Record<string, unknown> | null): TestResults => {
  if (!results) {
    return {
      sampleSize: { control: 0, test: 0 },
      metrics: {
        ctr: { control: 0, test: 0, lift: 0 },
        accuracy: { control: 0, test: 0, lift: 0 },
        satisfaction: { control: 0, test: 0, lift: 0 },
      },
      significance: 0,
      winner: null,
      dailyMetrics: [],
    }
  }
  return results as TestResults
}

// 상태 변환 (API -> UI)
const mapStatusToUI = (
  status: ApiABTest["status"]
): "draft" | "running" | "completed" | "paused" => {
  const map: Record<ApiABTest["status"], "draft" | "running" | "completed" | "paused"> = {
    DRAFT: "draft",
    RUNNING: "running",
    PAUSED: "paused",
    COMPLETED: "completed",
    CANCELLED: "completed",
  }
  return map[status]
}

export default function AlgorithmTuningPage() {
  const [tests, setTests] = useState<ApiABTest[]>([])
  const [stats, setStats] = useState<ABTestStats>({
    total: 0,
    running: 0,
    completed: 0,
    draft: 0,
  })
  const [selectedTest, setSelectedTest] = useState<ApiABTest | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    controlAlgorithm: "cosine",
    testAlgorithm: "hybrid",
    trafficSplit: 50,
  })

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      setIsLoading(true)
      const data = await abTestsService.getTests()
      setTests(data.tests)
      setStats(data.stats)
      if (data.tests.length > 0 && !selectedTest) {
        setSelectedTest(data.tests[0])
      }
    } catch (error) {
      console.error("Failed to load A/B tests:", error)
      toast.error("A/B 테스트 목록을 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTest = async () => {
    if (!newTest.name.trim()) {
      toast.error("테스트 이름을 입력하세요")
      return
    }
    if (!newTest.description.trim()) {
      toast.error("테스트 설명을 입력하세요")
      return
    }
    try {
      const created = await abTestsService.createTest({
        name: newTest.name,
        description: newTest.description,
        testType: "ALGORITHM",
        controlConfig: { algorithm: newTest.controlAlgorithm },
        testConfig: { algorithm: newTest.testAlgorithm },
        trafficSplit: newTest.trafficSplit,
      })
      setTests([...tests, created])
      setShowCreateDialog(false)
      setNewTest({
        name: "",
        description: "",
        controlAlgorithm: "cosine",
        testAlgorithm: "hybrid",
        trafficSplit: 50,
      })
      toast.success("A/B 테스트가 생성되었습니다", {
        description: `"${newTest.name}" 테스트가 초안으로 저장되었습니다.`,
      })
    } catch (error) {
      console.error("Failed to create A/B test:", error)
      toast.error("A/B 테스트 생성에 실패했습니다.")
    }
  }

  const handlePauseTest = async (test: ApiABTest) => {
    try {
      const updated = await abTestsService.pauseTest(test.id)
      setTests(tests.map((t) => (t.id === test.id ? updated : t)))
      if (selectedTest?.id === test.id) {
        setSelectedTest(updated)
      }
      toast.warning("테스트가 일시정지되었습니다", {
        description: `"${test.name}" 테스트가 일시정지되었습니다.`,
      })
    } catch (error) {
      console.error("Failed to pause test:", error)
      toast.error("테스트 일시정지에 실패했습니다.")
    }
  }

  const handleResumeTest = async (test: ApiABTest) => {
    try {
      const updated = await abTestsService.startTest(test.id)
      setTests(tests.map((t) => (t.id === test.id ? updated : t)))
      if (selectedTest?.id === test.id) {
        setSelectedTest(updated)
      }
      toast.success("테스트가 재개되었습니다", {
        description: `"${test.name}" 테스트가 재개되었습니다.`,
      })
    } catch (error) {
      console.error("Failed to resume test:", error)
      toast.error("테스트 재개에 실패했습니다.")
    }
  }

  const handleViewAnalysis = (test: ApiABTest) => {
    toast.info("상세 분석", {
      description: `"${test.name}" 테스트의 상세 분석 페이지로 이동합니다.`,
    })
  }

  const handleDuplicateTest = async (test: ApiABTest) => {
    try {
      const created = await abTestsService.createTest({
        name: `${test.name} (복사본)`,
        description: test.description || undefined,
        testType: test.testType,
        controlConfig: test.controlConfig,
        testConfig: test.testConfig,
        trafficSplit: test.trafficSplit,
      })
      setTests([...tests, created])
      toast.success("테스트가 복제되었습니다", {
        description: `"${test.name}" 테스트가 복제되었습니다.`,
      })
    } catch (error) {
      console.error("Failed to duplicate test:", error)
      toast.error("테스트 복제에 실패했습니다.")
    }
  }

  const handleDeleteTest = async (test: ApiABTest) => {
    try {
      await abTestsService.deleteTest(test.id)
      setTests(tests.filter((t) => t.id !== test.id))
      if (selectedTest?.id === test.id) {
        setSelectedTest(null)
      }
      toast.success("테스트가 삭제되었습니다", {
        description: `"${test.name}" 테스트가 삭제되었습니다.`,
      })
    } catch (error) {
      console.error("Failed to delete test:", error)
      toast.error("테스트 삭제에 실패했습니다.")
    }
  }

  const handleApplyToProduction = (test: ApiABTest) => {
    const algorithmName =
      test.testAlgorithm?.name ||
      (test.testConfig as { algorithm?: string })?.algorithm ||
      "테스트 알고리즘"
    toast.success("프로덕션에 적용되었습니다", {
      description: `"${algorithmName}" 알고리즘이 프로덕션에 적용되었습니다.`,
    })
  }

  const getStatusBadge = (status: ApiABTest["status"]) => {
    switch (status) {
      case "RUNNING":
        return <Badge className="bg-green-500">실행 중</Badge>
      case "COMPLETED":
        return <Badge variant="secondary">완료</Badge>
      case "PAUSED":
        return (
          <Badge variant="outline" className="border-yellow-600 text-yellow-600">
            일시정지
          </Badge>
        )
      case "DRAFT":
        return <Badge variant="outline">초안</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">취소됨</Badge>
    }
  }

  const getWinnerBadge = (test: ApiABTest) => {
    const results = getTestResults(test.results)
    if (!results.winner) return null
    if (results.winner === "test") {
      return <Badge className="bg-green-500">테스트 승리</Badge>
    }
    return <Badge variant="secondary">컨트롤 승리</Badge>
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
            <Sliders className="h-6 w-6 text-orange-500" />
            알고리즘 튜닝
          </h2>
          <p className="text-muted-foreground">
            A/B 테스트를 통해 매칭 알고리즘 성능을 비교하고 최적화합니다.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />새 A/B 테스트
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>새 A/B 테스트 생성</DialogTitle>
              <DialogDescription>
                알고리즘 성능을 비교할 새로운 A/B 테스트를 설정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>테스트 이름</Label>
                <Input
                  placeholder="예: Hybrid v2.1 성능 테스트"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>설명</Label>
                <Textarea
                  placeholder="테스트 목적과 가설을 설명하세요"
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>컨트롤 그룹 (A)</Label>
                  <Select
                    value={newTest.controlAlgorithm}
                    onValueChange={(v) => setNewTest({ ...newTest, controlAlgorithm: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cosine">Cosine Similarity</SelectItem>
                      <SelectItem value="weighted">Weighted Euclidean</SelectItem>
                      <SelectItem value="context">Context-Aware</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>테스트 그룹 (B)</Label>
                  <Select
                    value={newTest.testAlgorithm}
                    onValueChange={(v) => setNewTest({ ...newTest, testAlgorithm: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cosine">Cosine Similarity</SelectItem>
                      <SelectItem value="weighted">Weighted Euclidean</SelectItem>
                      <SelectItem value="context">Context-Aware</SelectItem>
                      <SelectItem value="hybrid">Hybrid v2.1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label>트래픽 분배</Label>
                  <span className="text-muted-foreground text-sm">
                    Control {100 - newTest.trafficSplit}% / Test {newTest.trafficSplit}%
                  </span>
                </div>
                <Slider
                  value={[newTest.trafficSplit]}
                  onValueChange={([v]) => setNewTest({ ...newTest, trafficSplit: v })}
                  min={10}
                  max={90}
                  step={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                취소
              </Button>
              <Button onClick={handleCreateTest}>테스트 생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">진행 중인 테스트</CardTitle>
            <GitBranch className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.running}</div>
            <p className="text-muted-foreground mt-1 text-xs">총 {stats.total}개 테스트</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 Lift</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+10.8%</div>
            <p className="text-muted-foreground mt-1 text-xs">최근 완료된 테스트 기준</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">테스트 샘플</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,845</div>
            <p className="text-muted-foreground mt-1 text-xs">현재 테스트 중인 사용자</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">통계적 유의성</CardTitle>
            <Percent className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">97.2%</div>
            <Progress value={97.2} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Test List & Details */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Test List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>A/B 테스트 목록</CardTitle>
            <CardDescription>클릭하여 상세 정보 확인</CardDescription>
          </CardHeader>
          <CardContent>
            {tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <GitBranch className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">A/B 테스트가 없습니다</p>
                <p className="text-muted-foreground text-xs">새 테스트를 생성해 주세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className={`hover:border-primary cursor-pointer rounded-lg border p-3 transition-all ${
                      selectedTest?.id === test.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-medium">{test.name}</h4>
                      {getStatusBadge(test.status)}
                    </div>
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {test.description || "설명 없음"}
                    </p>
                    <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                      <span>
                        시작:{" "}
                        {test.startDate
                          ? new Date(test.startDate).toLocaleDateString("ko-KR")
                          : "-"}
                      </span>
                      {getWinnerBadge(test)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTest?.name || "테스트 선택"}</CardTitle>
                <CardDescription>
                  {selectedTest?.description || "왼쪽에서 테스트를 선택하세요"}
                </CardDescription>
              </div>
              {selectedTest && (
                <div className="flex gap-2">
                  {selectedTest.status === "RUNNING" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePauseTest(selectedTest)}
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      일시정지
                    </Button>
                  ) : selectedTest.status === "PAUSED" || selectedTest.status === "DRAFT" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResumeTest(selectedTest)}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {selectedTest.status === "DRAFT" ? "시작" : "재개"}
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleViewAnalysis(selectedTest)}>
                        <Eye className="mr-2 h-4 w-4" />
                        상세 분석
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTest(selectedTest)}>
                        <Copy className="mr-2 h-4 w-4" />
                        복제
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteTest(selectedTest)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedTest ? (
              (() => {
                const results = getTestResults(selectedTest.results)
                const controlAlgName =
                  selectedTest.controlAlgorithm?.name ||
                  (selectedTest.controlConfig as { algorithm?: string })?.algorithm ||
                  "Control"
                const testAlgName =
                  selectedTest.testAlgorithm?.name ||
                  (selectedTest.testConfig as { algorithm?: string })?.algorithm ||
                  "Test"
                return (
                  <div className="space-y-6">
                    {/* Algorithm Comparison */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Badge variant="outline">Control (A)</Badge>
                          <span className="text-muted-foreground text-xs">
                            {(results.sampleSize?.control || 0).toLocaleString()} 샘플
                          </span>
                        </div>
                        <p className="font-medium">{controlAlgName}</p>
                      </div>
                      <div className="border-primary rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Badge>Test (B)</Badge>
                          <span className="text-muted-foreground text-xs">
                            {(results.sampleSize?.test || 0).toLocaleString()} 샘플
                          </span>
                        </div>
                        <p className="font-medium">{testAlgName}</p>
                      </div>
                    </div>

                    {/* Metrics Comparison */}
                    <div>
                      <h4 className="mb-3 font-semibold">핵심 지표 비교</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>지표</TableHead>
                            <TableHead className="text-right">Control</TableHead>
                            <TableHead className="text-right">Test</TableHead>
                            <TableHead className="text-right">Lift</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>CTR</TableCell>
                            <TableCell className="text-right">
                              {results.metrics?.ctr.control || 0}%
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {results.metrics?.ctr.test || 0}%
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  (results.metrics?.ctr.lift || 0) > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {(results.metrics?.ctr.lift || 0) > 0 ? "+" : ""}
                                {results.metrics?.ctr.lift || 0}%
                              </span>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>정확도</TableCell>
                            <TableCell className="text-right">
                              {results.metrics?.accuracy.control || 0}%
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {results.metrics?.accuracy.test || 0}%
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  (results.metrics?.accuracy.lift || 0) > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {(results.metrics?.accuracy.lift || 0) > 0 ? "+" : ""}
                                {results.metrics?.accuracy.lift || 0}%
                              </span>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>만족도</TableCell>
                            <TableCell className="text-right">
                              {results.metrics?.satisfaction.control || 0}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {results.metrics?.satisfaction.test || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  (results.metrics?.satisfaction.lift || 0) > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {(results.metrics?.satisfaction.lift || 0) > 0 ? "+" : ""}
                                {results.metrics?.satisfaction.lift || 0}%
                              </span>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Chart */}
                    <div>
                      <h4 className="mb-3 font-semibold">일별 CTR 추이</h4>
                      <div className="h-[200px]">
                        {results.dailyMetrics && results.dailyMetrics.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={results.dailyMetrics}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="date" className="text-xs" />
                              <YAxis domain={["auto", "auto"]} className="text-xs" />
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
                                dataKey="control"
                                name="Control"
                                stroke="#94a3b8"
                                strokeWidth={2}
                              />
                              <Line
                                type="monotone"
                                dataKey="test"
                                name="Test"
                                stroke="#3b82f6"
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-muted-foreground flex h-full items-center justify-center">
                            테스트 실행 후 데이터가 수집됩니다
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Statistical Significance */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="flex items-center gap-2 font-semibold">
                          통계적 유의성
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="text-muted-foreground h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>
                              95% 이상이면 결과가 통계적으로 유의합니다.
                            </TooltipContent>
                          </Tooltip>
                        </h4>
                        <span className="text-lg font-bold">{results.significance || 0}%</span>
                      </div>
                      <Progress value={results.significance || 0} className="h-2" />
                      {(results.significance || 0) >= 95 && results.winner && (
                        <div className="mt-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            {results.winner === "test"
                              ? "테스트 알고리즘이 통계적으로 유의하게 더 좋은 성능을 보입니다."
                              : "컨트롤 알고리즘이 통계적으로 유의하게 더 좋은 성능을 보입니다."}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {selectedTest.status === "COMPLETED" && results.winner === "test" && (
                      <Button
                        className="w-full"
                        onClick={() => handleApplyToProduction(selectedTest)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        테스트 알고리즘을 프로덕션에 적용
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })()
            ) : (
              <div className="flex h-[400px] flex-col items-center justify-center text-center">
                <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <GitBranch className="text-muted-foreground h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-medium">테스트 선택</h3>
                <p className="text-muted-foreground max-w-sm">
                  왼쪽 목록에서 A/B 테스트를 선택하면 상세 정보가 표시됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
