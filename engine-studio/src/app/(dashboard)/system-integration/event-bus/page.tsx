"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Filter,
  Search,
  Eye,
  Trash2,
  Settings,
  ArrowRight,
  ArrowDown,
  MessageSquare,
  Database,
  Server,
  Cpu,
  Box,
  Layers,
} from "lucide-react"

// 타입 정의
type EventStatus = "success" | "failed" | "pending" | "processing"
type EventPriority = "low" | "normal" | "high" | "critical"

interface Event {
  id: string
  type: string
  source: string
  target: string
  payload: Record<string, unknown>
  status: EventStatus
  priority: EventPriority
  timestamp: string
  processingTime?: number
  error?: string
  retryCount: number
}

interface EventChannel {
  id: string
  name: string
  description: string
  source: string
  target: string
  eventTypes: string[]
  status: "active" | "paused" | "error"
  messagesPerSecond: number
  totalMessages: number
  errorRate: number
}

interface DeadLetterEvent {
  id: string
  originalEventId: string
  eventType: string
  error: string
  failedAt: string
  retries: number
  payload: Record<string, unknown>
}

// 목 데이터
const generateMockEvents = (): Event[] => {
  const types = [
    "persona.created",
    "persona.updated",
    "matching.completed",
    "user.analyzed",
    "archetype.assigned",
    "insight.generated",
    "model.trained",
    "alert.triggered",
  ]
  const sources = ["persona-service", "matching-engine", "insight-engine", "archetype-service", "ml-pipeline"]
  const targets = ["notification-service", "analytics-service", "storage-service", "audit-service"]
  const statuses: EventStatus[] = ["success", "failed", "pending", "processing"]
  const priorities: EventPriority[] = ["low", "normal", "high", "critical"]

  return Array.from({ length: 50 }, (_, i) => ({
    id: `evt-${String(i + 1).padStart(5, "0")}`,
    type: types[Math.floor(Math.random() * types.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    target: targets[Math.floor(Math.random() * targets.length)],
    payload: {
      entityId: `entity-${Math.floor(Math.random() * 1000)}`,
      action: "process",
      data: { value: Math.random() },
    },
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
    processingTime: Math.floor(Math.random() * 500),
    retryCount: Math.floor(Math.random() * 3),
    error: Math.random() > 0.8 ? "Connection timeout" : undefined,
  }))
}

const mockChannels: EventChannel[] = [
  {
    id: "ch-001",
    name: "Persona Events",
    description: "페르소나 생성/수정 이벤트 채널",
    source: "persona-service",
    target: "notification-service",
    eventTypes: ["persona.created", "persona.updated", "persona.deleted"],
    status: "active",
    messagesPerSecond: 45.2,
    totalMessages: 125840,
    errorRate: 0.02,
  },
  {
    id: "ch-002",
    name: "Matching Pipeline",
    description: "매칭 결과 이벤트 채널",
    source: "matching-engine",
    target: "analytics-service",
    eventTypes: ["matching.started", "matching.completed", "matching.failed"],
    status: "active",
    messagesPerSecond: 128.7,
    totalMessages: 458921,
    errorRate: 0.05,
  },
  {
    id: "ch-003",
    name: "User Insight Stream",
    description: "사용자 인사이트 분석 스트림",
    source: "insight-engine",
    target: "storage-service",
    eventTypes: ["insight.generated", "profile.updated"],
    status: "active",
    messagesPerSecond: 67.3,
    totalMessages: 234567,
    errorRate: 0.01,
  },
  {
    id: "ch-004",
    name: "ML Training Events",
    description: "ML 모델 학습 이벤트",
    source: "ml-pipeline",
    target: "notification-service",
    eventTypes: ["model.training.started", "model.training.completed"],
    status: "paused",
    messagesPerSecond: 0,
    totalMessages: 12456,
    errorRate: 0.08,
  },
  {
    id: "ch-005",
    name: "Alert Notifications",
    description: "시스템 알림 이벤트",
    source: "monitoring-service",
    target: "notification-service",
    eventTypes: ["alert.triggered", "alert.resolved"],
    status: "error",
    messagesPerSecond: 2.1,
    totalMessages: 8934,
    errorRate: 15.2,
  },
]

const mockDeadLetters: DeadLetterEvent[] = [
  {
    id: "dl-001",
    originalEventId: "evt-00042",
    eventType: "matching.completed",
    error: "Target service unavailable: connection refused",
    failedAt: "2024-01-15T10:30:00Z",
    retries: 3,
    payload: { matchId: "m-123", score: 0.87 },
  },
  {
    id: "dl-002",
    originalEventId: "evt-00089",
    eventType: "insight.generated",
    error: "Payload validation failed: missing required field 'userId'",
    failedAt: "2024-01-15T09:45:00Z",
    retries: 1,
    payload: { insightType: "preference", data: {} },
  },
  {
    id: "dl-003",
    originalEventId: "evt-00156",
    eventType: "persona.updated",
    error: "Database transaction timeout",
    failedAt: "2024-01-15T08:20:00Z",
    retries: 3,
    payload: { personaId: "p-456", changes: ["name", "vector"] },
  },
]

export default function EventBusMonitorPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [channels] = useState<EventChannel[]>(mockChannels)
  const [deadLetters] = useState<DeadLetterEvent[]>(mockDeadLetters)
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false)

  // 초기 이벤트 로드 및 라이브 모드 시뮬레이션
  useEffect(() => {
    setEvents(generateMockEvents())

    if (isLiveMode) {
      const interval = setInterval(() => {
        const newEvent: Event = {
          id: `evt-${Date.now()}`,
          type: ["persona.created", "matching.completed", "insight.generated"][Math.floor(Math.random() * 3)],
          source: ["persona-service", "matching-engine", "insight-engine"][Math.floor(Math.random() * 3)],
          target: ["notification-service", "analytics-service"][Math.floor(Math.random() * 2)],
          payload: { entityId: `entity-${Math.floor(Math.random() * 1000)}` },
          status: ["success", "processing"][Math.floor(Math.random() * 2)] as EventStatus,
          priority: "normal",
          timestamp: new Date().toISOString(),
          processingTime: Math.floor(Math.random() * 100),
          retryCount: 0,
        }
        setEvents((prev) => [newEvent, ...prev.slice(0, 49)])
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [isLiveMode])

  const getStatusBadge = (status: EventStatus) => {
    const config = {
      success: { icon: CheckCircle2, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      failed: { icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      pending: { icon: Clock, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      processing: { icon: Activity, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    }
    const Icon = config[status].icon
    return (
      <Badge className={config[status].className}>
        <Icon className="h-3 w-3 mr-1" />
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
          <p className="text-muted-foreground">
            실시간 이벤트 스트림 모니터링 및 관리
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="live-mode"
              checked={isLiveMode}
              onCheckedChange={setIsLiveMode}
            />
            <Label htmlFor="live-mode" className="flex items-center gap-1">
              {isLiveMode ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live
                </>
              ) : (
                "Paused"
              )}
            </Label>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button variant="outline" size="sm">
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
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
            <p className="text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
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
            <Clock className="h-4 w-4 text-muted-foreground" />
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
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  <SelectItem key={type} value={type}>{type}</SelectItem>
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
                            <Server className="h-3 w-3 text-muted-foreground" />
                            {event.source}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Box className="h-3 w-3 text-muted-foreground" />
                            {event.target}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(event.status)}</TableCell>
                        <TableCell>{getPriorityBadge(event.priority)}</TableCell>
                        <TableCell>
                          {event.processingTime ? `${event.processingTime}ms` : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
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
                      <Layers className="h-5 w-5 text-primary" />
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
                      <div className="flex items-center gap-1 rounded bg-muted px-2 py-1">
                        <Server className="h-3 w-3" />
                        {channel.source}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-1 rounded bg-muted px-2 py-1">
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
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">메시지/초</p>
                        <p className="text-lg font-semibold">{channel.messagesPerSecond}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">총 메시지</p>
                        <p className="text-lg font-semibold">{channel.totalMessages.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">오류율</p>
                        <p className={`text-lg font-semibold ${channel.errorRate > 1 ? "text-red-600" : "text-green-600"}`}>
                          {channel.errorRate}%
                        </p>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex justify-end gap-2">
                      {channel.status === "active" ? (
                        <Button variant="outline" size="sm">
                          <Pause className="mr-2 h-4 w-4" />
                          일시중지
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Play className="mr-2 h-4 w-4" />
                          재개
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
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
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    모두 재시도
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    모두 삭제
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {deadLetters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
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
                          <p className="text-sm text-red-600 truncate">{dl.error}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{dl.retries}회</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(dl.failedAt).toLocaleString("ko-KR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="재시도">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="상세 보기">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" title="삭제">
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
                  <Label className="text-xs text-muted-foreground">타입</Label>
                  <p className="font-medium">{selectedEvent.type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">상태</Label>
                  <p>{getStatusBadge(selectedEvent.status)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">소스</Label>
                  <p className="font-medium">{selectedEvent.source}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">대상</Label>
                  <p className="font-medium">{selectedEvent.target}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">우선순위</Label>
                  <p>{getPriorityBadge(selectedEvent.priority)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">처리 시간</Label>
                  <p className="font-medium">{selectedEvent.processingTime}ms</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">타임스탬프</Label>
                <p className="font-medium">{new Date(selectedEvent.timestamp).toLocaleString("ko-KR")}</p>
              </div>
              {selectedEvent.error && (
                <div>
                  <Label className="text-xs text-muted-foreground">오류</Label>
                  <p className="text-red-600">{selectedEvent.error}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">페이로드</Label>
                <pre className="mt-1 rounded bg-muted p-3 text-xs overflow-auto">
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
              <Button>
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
