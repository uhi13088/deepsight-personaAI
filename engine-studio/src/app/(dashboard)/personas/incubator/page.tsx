"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Beaker,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadarChart } from "@/components/charts/radar-chart"
import {
  MOCK_INCUBATOR_PERSONAS,
  generateRandomVector,
} from "@/services/mock-data.service"

// TODO: Add MOCK_INCUBATOR_STATS to @/services/mock-data.service
const INCUBATOR_STATS = {
  enabled: true,
  lastRunTime: "2024-01-17 03:00",
  todayGenerated: MOCK_INCUBATOR_PERSONAS.length,
  todayPassed: MOCK_INCUBATOR_PERSONAS.filter(p => p.status === "READY").length,
  todayFailed: MOCK_INCUBATOR_PERSONAS.filter(p => p.status === "FAILED").length,
  weeklyAvgScore: 78.5,
  weeklyPassRate: 65,
}

// TODO: Extend MockIncubatorPersona in @/services/mock-data.service to include
// validation scores (consistencyScore, vectorAlignmentScore, toneMatchScore, reasoningScore)
// For now, we enhance the service data with additional computed fields
const TODAY_PERSONAS = MOCK_INCUBATOR_PERSONAS.map((p, index) => {
  const baseScore = p.testScore / 100
  return {
    id: p.id,
    name: p.name,
    status: p.status === "READY" ? "PASSED" : p.status === "FAILED" ? "FAILED" : "PENDING" as const,
    consistencyScore: Math.min(0.95, baseScore + 0.05 * (index % 3)),
    vectorAlignmentScore: Math.min(0.95, baseScore - 0.02 + 0.03 * (index % 2)),
    toneMatchScore: Math.min(0.98, baseScore + 0.08),
    reasoningScore: Math.min(0.92, baseScore - 0.05),
    overallScore: p.testScore,
    vector: generateRandomVector(),
    createdAt: `03:${(15 + index * 7).toString().padStart(2, '0')}`,
    failReason: p.status === "FAILED" ? `테스트 점수 미달 (${p.testScore} < 70)` : undefined,
  }
})

// TODO: Add MOCK_INCUBATOR_HISTORY to @/services/mock-data.service
const HISTORY_DATA = [
  { date: "01/16", generated: 5, passed: 4, avgScore: 82 },
  { date: "01/15", generated: 6, passed: 4, avgScore: 78 },
  { date: "01/14", generated: 4, passed: 3, avgScore: 81 },
  { date: "01/13", generated: 5, passed: 3, avgScore: 75 },
  { date: "01/12", generated: 5, passed: 4, avgScore: 80 },
  { date: "01/11", generated: 6, passed: 5, avgScore: 84 },
  { date: "01/10", generated: 4, passed: 2, avgScore: 72 },
]

export default function IncubatorPage() {
  const router = useRouter()
  const [isEnabled, setIsEnabled] = useState(INCUBATOR_STATS.enabled)
  const [selectedPersona, setSelectedPersona] = useState<typeof TODAY_PERSONAS[0] | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleApprove = async (personaId: string, personaName: string) => {
    try {
      // API 호출 (실제로는 승인 API 호출)
      toast.success(`"${personaName}" 페르소나가 승인되었습니다.`)
      // 승인된 페르소나를 personas 목록에 추가
      router.push(`/personas?approved=${personaId}`)
    } catch {
      toast.error("승인에 실패했습니다.")
    }
  }

  const handleReject = async (personaId: string, personaName: string) => {
    if (!confirm(`"${personaName}" 페르소나를 거부하시겠습니까?`)) return
    try {
      // API 호출 (실제로는 거부 API 호출)
      toast.info(`"${personaName}" 페르소나가 거부되었습니다.`)
      setSelectedPersona(null)
    } catch {
      toast.error("거부 처리에 실패했습니다.")
    }
  }

  const handleSaveSettings = () => {
    toast.success("인큐베이터 설정이 저장되었습니다.")
    setSettingsOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Beaker className="h-6 w-6" />
            인큐베이터 관리
          </h1>
          <p className="text-muted-foreground">
            자동 페르소나 생성 및 검증 시스템
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">자동 생성</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <Badge
              variant={isEnabled ? "default" : "secondary"}
              className={isEnabled ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {isEnabled ? "활성" : "비활성"}
            </Badge>
          </div>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                설정
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>인큐베이터 설정</DialogTitle>
                <DialogDescription>
                  자동 생성 스케줄과 검증 기준을 설정합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>배치 실행 시간</Label>
                  <Input type="time" defaultValue="03:00" />
                </div>
                <div className="space-y-2">
                  <Label>일일 생성 수</Label>
                  <Input type="number" defaultValue={5} min={1} max={10} />
                </div>
                <div className="space-y-2">
                  <Label>최소 통과 점수</Label>
                  <Input type="number" defaultValue={70} min={50} max={90} />
                </div>
                <div className="space-y-2">
                  <Label>자동 승인 점수</Label>
                  <Input type="number" defaultValue={85} min={70} max={95} />
                </div>
                <Button className="w-full" onClick={handleSaveSettings}>설정 저장</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              마지막 실행
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{INCUBATOR_STATS.lastRunTime}</div>
            <p className="text-xs text-muted-foreground">
              다음 실행: 내일 03:00
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Beaker className="h-4 w-4" />
              오늘 생성
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{INCUBATOR_STATS.todayGenerated}개</div>
            <p className="text-xs text-muted-foreground">
              통과 {INCUBATOR_STATS.todayPassed} / 실패 {INCUBATOR_STATS.todayFailed}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              주간 평균 점수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{INCUBATOR_STATS.weeklyAvgScore}점</div>
            <Progress value={INCUBATOR_STATS.weeklyAvgScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              주간 통과율
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{INCUBATOR_STATS.weeklyPassRate}%</div>
            <Progress value={INCUBATOR_STATS.weeklyPassRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">오늘 생성</TabsTrigger>
          <TabsTrigger value="history">생성 이력</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Today's List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>오늘 생성된 페르소나</CardTitle>
                <CardDescription>
                  {INCUBATOR_STATS.todayGenerated}개 생성됨 · 승인 대기 중
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>점수</TableHead>
                      <TableHead>생성 시간</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TODAY_PERSONAS.map((persona) => (
                      <TableRow
                        key={persona.id}
                        className={`cursor-pointer ${selectedPersona?.id === persona.id ? "bg-muted" : ""}`}
                        onClick={() => setSelectedPersona(persona)}
                      >
                        <TableCell className="font-medium">{persona.name}</TableCell>
                        <TableCell>
                          {persona.status === "PASSED" ? (
                            <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
                              <CheckCircle className="h-3 w-3" />
                              통과
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              실패
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={persona.overallScore} className="w-16 h-2" />
                            <span className="text-sm">{persona.overallScore}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {persona.createdAt}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {persona.status === "PASSED" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleApprove(persona.id, persona.name)
                                  }}
                                >
                                  <ThumbsUp className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleReject(persona.id, persona.name)
                                  }}
                                >
                                  <ThumbsDown className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedPersona(persona)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Detail Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">상세 정보</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPersona ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">{selectedPersona.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        생성 시간: {selectedPersona.createdAt}
                      </p>
                    </div>

                    <RadarChart
                      data={selectedPersona.vector}
                      height={200}
                      showLegend={false}
                    />

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">검증 점수</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>일관성</span>
                          <span>{(selectedPersona.consistencyScore * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={selectedPersona.consistencyScore * 100} className="h-1.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>벡터 정렬</span>
                          <span>{(selectedPersona.vectorAlignmentScore * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={selectedPersona.vectorAlignmentScore * 100} className="h-1.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>말투 매칭</span>
                          <span>{(selectedPersona.toneMatchScore * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={selectedPersona.toneMatchScore * 100} className="h-1.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>추론 품질</span>
                          <span>{(selectedPersona.reasoningScore * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={selectedPersona.reasoningScore * 100} className="h-1.5" />
                      </div>
                    </div>

                    {selectedPersona.failReason && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{selectedPersona.failReason}</span>
                        </div>
                      </div>
                    )}

                    {selectedPersona.status === "PASSED" && (
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={() => handleApprove(selectedPersona.id, selectedPersona.name)}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          onClick={() => handleReject(selectedPersona.id, selectedPersona.name)}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          거부
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Beaker className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>페르소나를 선택하면</p>
                    <p>상세 정보가 표시됩니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>생성 이력</CardTitle>
              <CardDescription>최근 7일간 인큐베이터 활동</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>생성 수</TableHead>
                    <TableHead>통과</TableHead>
                    <TableHead>통과율</TableHead>
                    <TableHead>평균 점수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {HISTORY_DATA.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell>{day.generated}개</TableCell>
                      <TableCell>{day.passed}개</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={(day.passed / day.generated) * 100}
                            className="w-16 h-2"
                          />
                          <span className="text-sm">
                            {((day.passed / day.generated) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{day.avgScore}점</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
