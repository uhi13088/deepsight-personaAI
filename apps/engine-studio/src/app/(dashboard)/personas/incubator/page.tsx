"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Beaker,
  CheckCircle,
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Calendar,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadarChart } from "@/components/charts/radar-chart"
import {
  incubatorService,
  type IncubatorStats,
  type IncubatorPersona,
  type IncubatorHistoryItem,
  type IncubatorSettings,
} from "@/services/incubator-service"

export default function IncubatorPage() {
  const router = useRouter()

  // 상태 관리
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<IncubatorStats | null>(null)
  const [personas, setPersonas] = useState<IncubatorPersona[]>([])
  const [history, setHistory] = useState<IncubatorHistoryItem[]>([])
  const [settings, setSettings] = useState<IncubatorSettings | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<IncubatorPersona | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [isRejecting, setIsRejecting] = useState<string | null>(null)

  // 설정 폼 상태
  const [formRunTime, setFormRunTime] = useState("03:00")
  const [formDailyLimit, setFormDailyLimit] = useState(5)
  const [formMinPassScore, setFormMinPassScore] = useState(70)
  const [formAutoApproveScore, setFormAutoApproveScore] = useState(85)

  // 데이터 로드
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const [statsData, personasData, historyData, settingsData] = await Promise.all([
        incubatorService.getStats(),
        incubatorService.getTodayPersonas(),
        incubatorService.getHistory(),
        incubatorService.getSettings(),
      ])

      setStats(statsData)
      setPersonas(personasData.personas)
      setHistory(historyData)
      setSettings(settingsData)

      // 설정 폼 초기화
      setFormRunTime(settingsData.runTime)
      setFormDailyLimit(settingsData.dailyLimit)
      setFormMinPassScore(settingsData.minPassScore)
      setFormAutoApproveScore(settingsData.autoApproveScore)
    } catch (err) {
      console.error("Failed to fetch incubator data:", err)
      toast.error("인큐베이터 데이터를 불러오는데 실패했습니다")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    fetchData(true)
  }

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      const updatedSettings = await incubatorService.updateSettings({ enabled })
      setSettings(updatedSettings)
      toast.success(enabled ? "인큐베이터가 활성화되었습니다" : "인큐베이터가 비활성화되었습니다")
    } catch (err) {
      const message = err instanceof Error ? err.message : "설정 변경에 실패했습니다"
      toast.error(message)
    }
  }

  const handleApprove = async (persona: IncubatorPersona) => {
    setIsApproving(persona.id)
    try {
      await incubatorService.approvePersona(persona.id)
      toast.success(`"${persona.name}" 페르소나가 승인되었습니다.`)
      // 목록에서 제거
      setPersonas((prev) => prev.filter((p) => p.id !== persona.id))
      if (selectedPersona?.id === persona.id) {
        setSelectedPersona(null)
      }
      // 페르소나 목록 페이지로 이동
      router.push(`/personas?approved=${persona.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "승인에 실패했습니다"
      toast.error(message)
    } finally {
      setIsApproving(null)
    }
  }

  const handleReject = async (persona: IncubatorPersona) => {
    if (!confirm(`"${persona.name}" 페르소나를 거부하시겠습니까?`)) return

    setIsRejecting(persona.id)
    try {
      await incubatorService.rejectPersona(persona.id)
      toast.info(`"${persona.name}" 페르소나가 거부되었습니다.`)
      // 상태 업데이트
      setPersonas((prev) =>
        prev.map((p) =>
          p.id === persona.id ? { ...p, status: "FAILED" as const, failReason: "수동 거부됨" } : p
        )
      )
      if (selectedPersona?.id === persona.id) {
        setSelectedPersona({
          ...selectedPersona,
          status: "FAILED",
          failReason: "수동 거부됨",
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "거부 처리에 실패했습니다"
      toast.error(message)
    } finally {
      setIsRejecting(null)
    }
  }

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const updatedSettings = await incubatorService.updateSettings({
        runTime: formRunTime,
        dailyLimit: formDailyLimit,
        minPassScore: formMinPassScore,
        autoApproveScore: formAutoApproveScore,
      })
      setSettings(updatedSettings)
      toast.success("인큐베이터 설정이 저장되었습니다.")
      setSettingsOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "설정 저장에 실패했습니다"
      toast.error(message)
    } finally {
      setIsSavingSettings(false)
    }
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">인큐베이터 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (!stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="text-destructive mx-auto mb-4 h-8 w-8" />
          <p className="text-destructive">데이터를 불러올 수 없습니다</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchData()}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Beaker className="h-6 w-6" />
            인큐베이터 관리
          </h1>
          <p className="text-muted-foreground">자동 페르소나 생성 및 검증 시스템</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">자동 생성</span>
            <Switch checked={settings?.enabled ?? false} onCheckedChange={handleToggleEnabled} />
            <Badge
              variant={settings?.enabled ? "default" : "secondary"}
              className={settings?.enabled ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {settings?.enabled ? "활성" : "비활성"}
            </Badge>
          </div>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                설정
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>인큐베이터 설정</DialogTitle>
                <DialogDescription>자동 생성 스케줄과 검증 기준을 설정합니다.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>배치 실행 시간</Label>
                  <Input
                    type="time"
                    value={formRunTime}
                    onChange={(e) => setFormRunTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>일일 생성 수</Label>
                  <Input
                    type="number"
                    value={formDailyLimit}
                    onChange={(e) => setFormDailyLimit(Number(e.target.value))}
                    min={1}
                    max={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>최소 통과 점수</Label>
                  <Input
                    type="number"
                    value={formMinPassScore}
                    onChange={(e) => setFormMinPassScore(Number(e.target.value))}
                    min={50}
                    max={90}
                  />
                </div>
                <div className="space-y-2">
                  <Label>자동 승인 점수</Label>
                  <Input
                    type="number"
                    value={formAutoApproveScore}
                    onChange={(e) => setFormAutoApproveScore(Number(e.target.value))}
                    min={70}
                    max={95}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                  {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSavingSettings ? "저장 중..." : "설정 저장"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              마지막 실행
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lastRunTime}</div>
            <p className="text-muted-foreground text-xs">다음 실행: {stats.nextRunTime}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Beaker className="h-4 w-4" />
              오늘 생성
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayGenerated}개</div>
            <p className="text-muted-foreground text-xs">
              통과 {stats.todayPassed} / 실패 {stats.todayFailed}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              주간 평균 점수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklyAvgScore}점</div>
            <Progress value={stats.weeklyAvgScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              주간 통과율
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklyPassRate}%</div>
            <Progress value={stats.weeklyPassRate} className="mt-2" />
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
                <CardDescription>{personas.length}개 생성됨 · 승인 대기 중</CardDescription>
              </CardHeader>
              <CardContent>
                {personas.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <Beaker className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>오늘 생성된 페르소나가 없습니다.</p>
                  </div>
                ) : (
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
                      {personas.map((persona) => (
                        <TableRow
                          key={persona.id}
                          className={`cursor-pointer ${selectedPersona?.id === persona.id ? "bg-muted" : ""}`}
                          onClick={() => setSelectedPersona(persona)}
                        >
                          <TableCell className="font-medium">{persona.name}</TableCell>
                          <TableCell>
                            {persona.status === "PASSED" ? (
                              <Badge
                                variant="default"
                                className="gap-1 bg-green-500 hover:bg-green-600"
                              >
                                <CheckCircle className="h-3 w-3" />
                                통과
                              </Badge>
                            ) : persona.status === "PENDING" ? (
                              <Badge variant="secondary" className="gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                검증 중
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
                              <Progress value={persona.overallScore} className="h-2 w-16" />
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
                                    disabled={isApproving === persona.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleApprove(persona)
                                    }}
                                  >
                                    {isApproving === persona.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <ThumbsUp className="h-4 w-4 text-green-500" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={isRejecting === persona.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleReject(persona)
                                    }}
                                  >
                                    {isRejecting === persona.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <ThumbsDown className="h-4 w-4 text-red-500" />
                                    )}
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
                )}
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
                      <p className="text-muted-foreground text-sm">
                        생성 시간: {selectedPersona.createdAt}
                      </p>
                    </div>

                    <RadarChart data={selectedPersona.vector} height={200} showLegend={false} />

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">검증 점수</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>일관성</span>
                          <span>{(selectedPersona.consistencyScore * 100).toFixed(0)}%</span>
                        </div>
                        <Progress
                          value={selectedPersona.consistencyScore * 100}
                          className="h-1.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>벡터 정렬</span>
                          <span>{(selectedPersona.vectorAlignmentScore * 100).toFixed(0)}%</span>
                        </div>
                        <Progress
                          value={selectedPersona.vectorAlignmentScore * 100}
                          className="h-1.5"
                        />
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
                      <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
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
                          disabled={isApproving === selectedPersona.id}
                          onClick={() => handleApprove(selectedPersona)}
                        >
                          {isApproving === selectedPersona.id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsUp className="mr-1 h-4 w-4" />
                          )}
                          승인
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          disabled={isRejecting === selectedPersona.id}
                          onClick={() => handleReject(selectedPersona)}
                        >
                          {isRejecting === selectedPersona.id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsDown className="mr-1 h-4 w-4" />
                          )}
                          거부
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Beaker className="mx-auto mb-4 h-12 w-12 opacity-50" />
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
                  {history.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell>{day.generated}개</TableCell>
                      <TableCell>{day.passed}개</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={(day.passed / day.generated) * 100}
                            className="h-2 w-16"
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
