"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { eventBusService } from "@/services"
import type { Event, EventChannel, DeadLetterEvent, EventStatus, EventPriority } from "@/services"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Settings,
  ArrowRight,
  MessageSquare,
  Server,
  Box,
  Layers,
} from "lucide-react"

// 타입은 서비스에서 import

export default function EventBusMonitorPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [channels, setChannels] = useState<EventChannel[]>([])
  const [deadLetters, setDeadLetters] = useState<DeadLetterEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, setSelectedDeadLetter] = useState<DeadLetterEvent | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const data = await eventBusService.getEventBusData()
      setEvents(data.events)
      setChannels(data.channels)
      setDeadLetters(data.deadLetters)
    } catch (error) {
      console.error("Failed to fetch event bus data:", error)
      toast.error("이벤트 버스 데이터를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    toast.loading("이벤트 정보를 새로고침하는 중...")
    await fetchData()
    setIsRefreshing(false)
    toast.dismiss()
    toast.success("이벤트 정보가 새로고침되었습니다.")
  }

  const handleOpenSettings = () => {
    router.push("/global-config/system-settings")
  }

  const handlePauseChannel = async (channel: EventChannel) => {
    toast.promise(eventBusService.pauseChannel(channel.id), {
      loading: `${channel.name} 채널 일시중지 중...`,
      success: () => {
        setChannels(
          channels.map((c) => (c.id === channel.id ? { ...c, status: "paused" as const } : c))
        )
        return `${channel.name} 채널이 일시중지되었습니다.`
      },
      error: "채널 일시중지에 실패했습니다.",
    })
  }

  const handleResumeChannel = async (channel: EventChannel) => {
    toast.promise(eventBusService.resumeChannel(channel.id), {
      loading: `${channel.name} 채널 재개 중...`,
      success: () => {
        setChannels(
          channels.map((c) => (c.id === channel.id ? { ...c, status: "active" as const } : c))
        )
        return `${channel.name} 채널이 재개되었습니다.`
      },
      error: "채널 재개에 실패했습니다.",
    })
  }

  const handleChannelSettings = (channel: EventChannel) => {
    toast.info(`${channel.name} 채널 설정`, {
      description: "채널 설정을 수정할 수 있습니다.",
    })
  }

  const handleRetryAllDeadLetters = () => {
    toast.promise(eventBusService.retryAllDeadLetters(), {
      loading: "모든 실패 이벤트를 재시도하는 중...",
      success: () => {
        fetchData()
        return "모든 실패 이벤트가 재시도되었습니다."
      },
      error: "일부 이벤트 재시도에 실패했습니다.",
    })
  }

  const handleDeleteAllDeadLetters = () => {
    toast.error("모든 실패 이벤트를 삭제하시겠습니까?", {
      description: "이 작업은 되돌릴 수 없습니다.",
      action: {
        label: "삭제",
        onClick: () => {
          toast.promise(eventBusService.deleteAllDeadLetters(), {
            loading: "삭제 중...",
            success: () => {
              fetchData()
              return "모든 실패 이벤트가 삭제되었습니다."
            },
            error: "삭제에 실패했습니다.",
          })
        },
      },
    })
  }

  const handleRetryDeadLetter = (dl: DeadLetterEvent) => {
    toast.promise(eventBusService.retryDeadLetter(dl.id), {
      loading: `${dl.id} 이벤트를 재시도하는 중...`,
      success: () => {
        setDeadLetters(deadLetters.filter((d) => d.id !== dl.id))
        return `${dl.id} 이벤트가 재시도되었습니다.`
      },
      error: "이벤트 재시도에 실패했습니다.",
    })
  }

  const handleViewDeadLetter = (dl: DeadLetterEvent) => {
    setSelectedDeadLetter(dl)
    toast.info(`${dl.id} 이벤트 상세`, {
      description: dl.error,
    })
  }

  const handleDeleteDeadLetter = (dl: DeadLetterEvent) => {
    toast.error(`${dl.id} 이벤트를 삭제하시겠습니까?`, {
      action: {
        label: "삭제",
        onClick: () => {
          toast.promise(eventBusService.deleteDeadLetter(dl.id), {
            loading: "삭제 중...",
            success: () => {
              setDeadLetters(deadLetters.filter((d) => d.id !== dl.id))
              return `${dl.id} 이벤트가 삭제되었습니다.`
            },
            error: "삭제에 실패했습니다.",
          })
        },
      },
    })
  }

  const handleRetryEvent = (event: Event) => {
    toast.promise(eventBusService.retryEvent(event.id), {
      loading: `${event.id} 이벤트를 재시도하는 중...`,
      success: () => {
        fetchData()
        setIsEventDetailOpen(false)
        return `${event.id} 이벤트가 재시도되었습니다.`
      },
      error: "이벤트 재시도에 실패했습니다.",
    })
  }

  // 라이브 모드 - API 폴링
  useEffect(() => {
    if (isLiveMode) {
      const interval = setInterval(() => {
        fetchData()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isLiveMode, fetchData])

  const getStatusBadge = (status: EventStatus) => {
    const config = {
      success: {
        icon: CheckCircle2,
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      },
      failed: {
        icon: XCircle,
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      },
      pending: {
        icon: Clock,
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      },
      processing: {
        icon: Activity,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      },
    }
    const Icon = config[status].icon
    return (
      <Badge className={config[status].className}>
        <Icon className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: EventPriority) => {
    const colors = {
      low: "bg-gray-100 text-gray-800",
      normal: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    }
    return <Badge className={colors[priority]}>{priority}</Badge>
  }

  const getChannelStatusBadge = (status: EventChannel["status"]) => {
    const config = {
      active: { icon: CheckCircle2, className: "text-green-600", label: "활성" },
      paused: { icon: Pause, className: "text-yellow-600", label: "일시중지" },
      error: { icon: AlertTriangle, className: "text-red-600", label: "오류" },
    }
    const Icon = config[status].icon
    return (
      <div className={`flex items-center gap-1 ${config[status].className}`}>
        <Icon className="h-4 w-4" />
        <span>{config[status].label}</span>
      </div>
    )
  }

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.id.includes(searchQuery) ||
      event.type.includes(searchQuery) ||
      event.source.includes(searchQuery)
    const matchesStatus = filterStatus === "all" || event.status === filterStatus
    const matchesType = filterType === "all" || event.type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const eventTypes = [...new Set(events.map((e) => e.type))]

  // 통계 계산
  const stats = {
    total: events.length,
    success: events.filter((e) => e.status === "success").length,
    failed: events.filter((e) => e.status === "failed").length,
    processing: events.filter((e) => e.status === "processing").length,
    avgProcessingTime: Math.round(
      events.reduce((acc, e) => acc + (e.processingTime || 0), 0) / events.length
    ),
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">이벤트 버스 모니터</h1>
          <p className="text-muted-foreground">실시간 이벤트 스트림 모니터링 및 관리</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="live-mode" checked={isLiveMode} onCheckedChange={setIsLiveMode} />
            <Label htmlFor="live-mode" className="flex items-center gap-1">
              {isLiveMode ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  Live
                </>
              ) : (
                "Paused"
              )}
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenSettings}>
            <Settings className="mr-2 h-4 w-4" />
            설정
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 이벤트</CardTitle>
            <MessageSquare className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">성공</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            <p className="text-muted-foreground text-xs">
              {((stats.success / stats.total) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">실패</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-muted-foreground text-xs">
              {((stats.failed / stats.total) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">처리 중</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 처리 시간</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProcessingTime}ms</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">이벤트 스트림</TabsTrigger>
          <TabsTrigger value="channels">채널</TabsTrigger>
          <TabsTrigger value="dead-letters">Dead Letter Queue</TabsTrigger>
        </TabsList>

        {/* 이벤트 스트림 탭 */}
        <TabsContent value="events" className="space-y-4">
          {/* 필터 */}
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="이벤트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="success">성공</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
                <SelectItem value="processing">처리 중</SelectItem>
                <SelectItem value="pending">대기</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="이벤트 타입" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 타입</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 이벤트 목록 */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>타입</TableHead>
                      <TableHead>소스</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>우선순위</TableHead>
                      <TableHead>처리 시간</TableHead>
                      <TableHead>시간</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{event.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Server className="text-muted-foreground h-3 w-3" />
                            {event.source}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Box className="text-muted-foreground h-3 w-3" />
                            {event.target}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(event.status)}</TableCell>
                        <TableCell>{getPriorityBadge(event.priority)}</TableCell>
                        <TableCell>
                          {event.processingTime ? `${event.processingTime}ms` : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(event.timestamp).toLocaleTimeString("ko-KR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedEvent(event)
                              setIsEventDetailOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 채널 탭 */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {channels.map((channel) => (
              <Card key={channel.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="text-primary h-5 w-5" />
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                    </div>
                    {getChannelStatusBadge(channel.status)}
                  </div>
                  <CardDescription>{channel.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 소스 -> 타겟 */}
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <div className="bg-muted flex items-center gap-1 rounded px-2 py-1">
                        <Server className="h-3 w-3" />
                        {channel.source}
                      </div>
                      <ArrowRight className="text-muted-foreground h-4 w-4" />
                      <div className="bg-muted flex items-center gap-1 rounded px-2 py-1">
                        <Box className="h-3 w-3" />
                        {channel.target}
                      </div>
                    </div>

                    {/* 이벤트 타입 */}
                    <div className="flex flex-wrap gap-1">
                      {channel.eventTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>

                    {/* 메트릭 */}
                    <div className="grid grid-cols-3 gap-4 border-t pt-2">
                      <div>
                        <p className="text-muted-foreground text-xs">메시지/초</p>
                        <p className="text-lg font-semibold">{channel.messagesPerSecond}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">총 메시지</p>
                        <p className="text-lg font-semibold">
                          {channel.totalMessages.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">오류율</p>
                        <p
                          className={`text-lg font-semibold ${channel.errorRate > 1 ? "text-red-600" : "text-green-600"}`}
                        >
                          {channel.errorRate}%
                        </p>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex justify-end gap-2">
                      {channel.status === "active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseChannel(channel)}
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          일시중지
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResumeChannel(channel)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          재개
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChannelSettings(channel)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Dead Letter Queue 탭 */}
        <TabsContent value="dead-letters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dead Letter Queue</CardTitle>
                  <CardDescription>처리 실패한 이벤트 목록</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRetryAllDeadLetters}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    모두 재시도
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteAllDeadLetters}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    모두 삭제
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {deadLetters.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-green-500" />
                  <p>Dead Letter Queue가 비어있습니다.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>원본 이벤트</TableHead>
                      <TableHead>이벤트 타입</TableHead>
                      <TableHead>오류</TableHead>
                      <TableHead>재시도</TableHead>
                      <TableHead>실패 시간</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadLetters.map((dl) => (
                      <TableRow key={dl.id}>
                        <TableCell className="font-mono text-xs">{dl.id}</TableCell>
                        <TableCell className="font-mono text-xs">{dl.originalEventId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{dl.eventType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm text-red-600">{dl.error}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{dl.retries}회</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(dl.failedAt).toLocaleString("ko-KR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="재시도"
                              onClick={() => handleRetryDeadLetter(dl)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="상세 보기"
                              onClick={() => handleViewDeadLetter(dl)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              title="삭제"
                              onClick={() => handleDeleteDeadLetter(dl)}
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
        </TabsContent>
      </Tabs>

      {/* 이벤트 상세 다이얼로그 */}
      <Dialog open={isEventDetailOpen} onOpenChange={setIsEventDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>이벤트 상세</DialogTitle>
            <DialogDescription>{selectedEvent?.id}</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">타입</Label>
                  <p className="font-medium">{selectedEvent.type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">상태</Label>
                  <p>{getStatusBadge(selectedEvent.status)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">소스</Label>
                  <p className="font-medium">{selectedEvent.source}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">대상</Label>
                  <p className="font-medium">{selectedEvent.target}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">우선순위</Label>
                  <p>{getPriorityBadge(selectedEvent.priority)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">처리 시간</Label>
                  <p className="font-medium">{selectedEvent.processingTime}ms</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">타임스탬프</Label>
                <p className="font-medium">
                  {new Date(selectedEvent.timestamp).toLocaleString("ko-KR")}
                </p>
              </div>
              {selectedEvent.error && (
                <div>
                  <Label className="text-muted-foreground text-xs">오류</Label>
                  <p className="text-red-600">{selectedEvent.error}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">페이로드</Label>
                <pre className="bg-muted mt-1 overflow-auto rounded p-3 text-xs">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventDetailOpen(false)}>
              닫기
            </Button>
            {selectedEvent?.status === "failed" && (
              <Button onClick={() => selectedEvent && handleRetryEvent(selectedEvent)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                재시도
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
