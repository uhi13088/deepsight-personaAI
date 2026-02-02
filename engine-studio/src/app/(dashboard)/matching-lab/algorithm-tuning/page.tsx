"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

// A/B 테스트 타입
interface ABTest {
  id: string
  name: string
  description: string
  status: "draft" | "running" | "completed" | "paused"
  controlAlgorithm: string
  testAlgorithm: string
  trafficSplit: number
  startDate: string
  endDate: string | null
  sampleSize: { control: number; test: number }
  metrics: {
    ctr: { control: number; test: number; lift: number }
    accuracy: { control: number; test: number; lift: number }
    satisfaction: { control: number; test: number; lift: number }
  }
  significance: number
  winner: "control" | "test" | null
}

const AB_TESTS: ABTest[] = [
  {
    id: "1",
    name: "Hybrid vs Cosine 비교",
    description: "Hybrid 알고리즘과 기존 Cosine 유사도 성능 비교",
    status: "running",
    controlAlgorithm: "Cosine Similarity",
    testAlgorithm: "Hybrid Algorithm v2.1",
    trafficSplit: 50,
    startDate: "2025-01-10",
    endDate: null,
    sampleSize: { control: 12456, test: 12389 },
    metrics: {
      ctr: { control: 23.4, test: 28.6, lift: 22.2 },
      accuracy: { control: 89.2, test: 92.1, lift: 3.2 },
      satisfaction: { control: 4.2, test: 4.5, lift: 7.1 },
    },
    significance: 97.2,
    winner: "test",
  },
  {
    id: "2",
    name: "Context Weight 조정 테스트",
    description: "컨텍스트 가중치 0.3 vs 0.5 비교",
    status: "completed",
    controlAlgorithm: "Context-Aware (w=0.3)",
    testAlgorithm: "Context-Aware (w=0.5)",
    trafficSplit: 50,
    startDate: "2025-01-01",
    endDate: "2025-01-08",
    sampleSize: { control: 25678, test: 25432 },
    metrics: {
      ctr: { control: 24.1, test: 25.8, lift: 7.1 },
      accuracy: { control: 90.5, test: 91.2, lift: 0.8 },
      satisfaction: { control: 4.3, test: 4.4, lift: 2.3 },
    },
    significance: 94.5,
    winner: "test",
  },
  {
    id: "3",
    name: "새 가중치 벡터 테스트",
    description: "PURPOSE 차원 가중치 증가 효과 테스트",
    status: "paused",
    controlAlgorithm: "Weighted (default)",
    testAlgorithm: "Weighted (PURPOSE x1.5)",
    trafficSplit: 30,
    startDate: "2025-01-12",
    endDate: null,
    sampleSize: { control: 8234, test: 3521 },
    metrics: {
      ctr: { control: 22.8, test: 21.5, lift: -5.7 },
      accuracy: { control: 88.9, test: 87.2, lift: -1.9 },
      satisfaction: { control: 4.1, test: 4.0, lift: -2.4 },
    },
    significance: 82.3,
    winner: null,
  },
]

const DAILY_METRICS = [
  { date: "01/10", control: 23.1, test: 27.5 },
  { date: "01/11", control: 23.4, test: 28.2 },
  { date: "01/12", control: 23.2, test: 28.8 },
  { date: "01/13", control: 23.5, test: 29.1 },
  { date: "01/14", control: 23.3, test: 28.5 },
  { date: "01/15", control: 23.6, test: 28.9 },
  { date: "01/16", control: 23.4, test: 28.6 },
]

export default function AlgorithmTuningPage() {
  const [tests, setTests] = useState<ABTest[]>(AB_TESTS)
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(AB_TESTS[0])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    controlAlgorithm: "cosine",
    testAlgorithm: "hybrid",
    trafficSplit: 50,
  })

  const handleCreateTest = () => {
    if (!newTest.name.trim()) {
      toast.error("테스트 이름을 입력하세요")
      return
    }
    if (!newTest.description.trim()) {
      toast.error("테스트 설명을 입력하세요")
      return
    }
    const newABTest: ABTest = {
      id: String(tests.length + 1),
      name: newTest.name,
      description: newTest.description,
      status: "draft",
      controlAlgorithm: newTest.controlAlgorithm,
      testAlgorithm: newTest.testAlgorithm,
      trafficSplit: newTest.trafficSplit,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      sampleSize: { control: 0, test: 0 },
      metrics: {
        ctr: { control: 0, test: 0, lift: 0 },
        accuracy: { control: 0, test: 0, lift: 0 },
        satisfaction: { control: 0, test: 0, lift: 0 },
      },
      significance: 0,
      winner: null,
    }
    setTests([...tests, newABTest])
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
  }

  const handlePauseTest = (test: ABTest) => {
    setTests(tests.map((t) =>
      t.id === test.id ? { ...t, status: "paused" as const } : t
    ))
    if (selectedTest?.id === test.id) {
      setSelectedTest({ ...test, status: "paused" })
    }
    toast.warning("테스트가 일시정지되었습니다", {
      description: `"${test.name}" 테스트가 일시정지되었습니다.`,
    })
  }

  const handleResumeTest = (test: ABTest) => {
    setTests(tests.map((t) =>
      t.id === test.id ? { ...t, status: "running" as const } : t
    ))
    if (selectedTest?.id === test.id) {
      setSelectedTest({ ...test, status: "running" })
    }
    toast.success("테스트가 재개되었습니다", {
      description: `"${test.name}" 테스트가 재개되었습니다.`,
    })
  }

  const handleViewAnalysis = (test: ABTest) => {
    toast.info("상세 분석", {
      description: `"${test.name}" 테스트의 상세 분석 페이지로 이동합니다.`,
    })
  }

  const handleDuplicateTest = (test: ABTest) => {
    const duplicatedTest: ABTest = {
      ...test,
      id: String(tests.length + 1),
      name: `${test.name} (복사본)`,
      status: "draft",
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      sampleSize: { control: 0, test: 0 },
    }
    setTests([...tests, duplicatedTest])
    toast.success("테스트가 복제되었습니다", {
      description: `"${test.name}" 테스트가 복제되었습니다.`,
    })
  }

  const handleDeleteTest = (test: ABTest) => {
    setTests(tests.filter((t) => t.id !== test.id))
    if (selectedTest?.id === test.id) {
      setSelectedTest(null)
    }
    toast.success("테스트가 삭제되었습니다", {
      description: `"${test.name}" 테스트가 삭제되었습니다.`,
    })
  }

  const handleApplyToProduction = (test: ABTest) => {
    toast.success("프로덕션에 적용되었습니다", {
      description: `"${test.testAlgorithm}" 알고리즘이 프로덕션에 적용되었습니다.`,
    })
  }

  const getStatusBadge = (status: ABTest["status"]) => {
    switch (status) {
      case "running":
        return <Badge className="bg-green-500">실행 중</Badge>
      case "completed":
        return <Badge variant="secondary">완료</Badge>
      case "paused":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">일시정지</Badge>
      case "draft":
        return <Badge variant="outline">초안</Badge>
    }
  }

  const getWinnerBadge = (test: ABTest) => {
    if (!test.winner) return null
    if (test.winner === "test") {
      return <Badge className="bg-green-500">테스트 승리</Badge>
    }
    return <Badge variant="secondary">컨트롤 승리</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
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
              <Plus className="mr-2 h-4 w-4" />
              새 A/B 테스트
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
                  <span className="text-sm text-muted-foreground">
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
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tests.filter((t) => t.status === "running").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              총 {tests.length}개 테스트
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 Lift</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+10.8%</div>
            <p className="text-xs text-muted-foreground mt-1">
              최근 완료된 테스트 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">테스트 샘플</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,845</div>
            <p className="text-xs text-muted-foreground mt-1">
              현재 테스트 중인 사용자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">통계적 유의성</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
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
            <div className="space-y-2">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-primary ${
                    selectedTest?.id === test.id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                  onClick={() => setSelectedTest(test)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{test.name}</h4>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {test.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>시작: {test.startDate}</span>
                    {getWinnerBadge(test)}
                  </div>
                </div>
              ))}
            </div>
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
                  {selectedTest.status === "running" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePauseTest(selectedTest)}
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      일시정지
                    </Button>
                  ) : selectedTest.status === "paused" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResumeTest(selectedTest)}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      재개
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
              <div className="space-y-6">
                {/* Algorithm Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Control (A)</Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedTest.sampleSize.control.toLocaleString()} 샘플
                      </span>
                    </div>
                    <p className="font-medium">{selectedTest.controlAlgorithm}</p>
                  </div>
                  <div className="p-4 border rounded-lg border-primary">
                    <div className="flex items-center justify-between mb-2">
                      <Badge>Test (B)</Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedTest.sampleSize.test.toLocaleString()} 샘플
                      </span>
                    </div>
                    <p className="font-medium">{selectedTest.testAlgorithm}</p>
                  </div>
                </div>

                {/* Metrics Comparison */}
                <div>
                  <h4 className="font-semibold mb-3">핵심 지표 비교</h4>
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
                          {selectedTest.metrics.ctr.control}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {selectedTest.metrics.ctr.test}%
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              selectedTest.metrics.ctr.lift > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {selectedTest.metrics.ctr.lift > 0 ? "+" : ""}
                            {selectedTest.metrics.ctr.lift}%
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>정확도</TableCell>
                        <TableCell className="text-right">
                          {selectedTest.metrics.accuracy.control}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {selectedTest.metrics.accuracy.test}%
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              selectedTest.metrics.accuracy.lift > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {selectedTest.metrics.accuracy.lift > 0 ? "+" : ""}
                            {selectedTest.metrics.accuracy.lift}%
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>만족도</TableCell>
                        <TableCell className="text-right">
                          {selectedTest.metrics.satisfaction.control}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {selectedTest.metrics.satisfaction.test}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              selectedTest.metrics.satisfaction.lift > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {selectedTest.metrics.satisfaction.lift > 0 ? "+" : ""}
                            {selectedTest.metrics.satisfaction.lift}%
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Chart */}
                <div>
                  <h4 className="font-semibold mb-3">일별 CTR 추이</h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={DAILY_METRICS}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[20, 32]} className="text-xs" />
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
                  </div>
                </div>

                {/* Statistical Significance */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      통계적 유의성
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          95% 이상이면 결과가 통계적으로 유의합니다.
                        </TooltipContent>
                      </Tooltip>
                    </h4>
                    <span className="text-lg font-bold">
                      {selectedTest.significance}%
                    </span>
                  </div>
                  <Progress value={selectedTest.significance} className="h-2" />
                  {selectedTest.significance >= 95 && selectedTest.winner && (
                    <div className="mt-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {selectedTest.winner === "test"
                          ? "테스트 알고리즘이 통계적으로 유의하게 더 좋은 성능을 보입니다."
                          : "컨트롤 알고리즘이 통계적으로 유의하게 더 좋은 성능을 보입니다."}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedTest.status === "completed" && selectedTest.winner === "test" && (
                  <Button className="w-full" onClick={() => handleApplyToProduction(selectedTest)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    테스트 알고리즘을 프로덕션에 적용
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <GitBranch className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">테스트 선택</h3>
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
