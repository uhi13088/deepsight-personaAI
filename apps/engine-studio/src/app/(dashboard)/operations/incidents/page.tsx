"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  MessageSquare,
  User,
  Calendar,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
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
import { ScrollArea } from "@/components/ui/scroll-area"

// 인시던트 타입
interface Incident {
  id: string
  title: string
  description: string
  severity: "critical" | "high" | "medium" | "low"
  status: "open" | "investigating" | "identified" | "monitoring" | "resolved"
  service: string
  reporter: string
  assignee: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  timeline: {
    time: string
    event: string
    user: string
  }[]
}

// Incidents - empty by default, will be loaded from API
const INCIDENTS: Incident[] = []

// Incident stats - default empty values
const INCIDENT_STATS = {
  open: 0,
  mttr: "-",
  totalThisMonth: 0,
  resolvedThisMonth: 0,
}

export default function IncidentsPage() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(INCIDENTS[0])
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const handleCreateIncident = () => {
    toast.success("인시던트가 생성되었습니다.")
    setShowCreateDialog(false)
  }

  const getSeverityBadge = (severity: Incident["severity"]) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "high":
        return <Badge className="bg-orange-500">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-500">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
    }
  }

  const getStatusBadge = (status: Incident["status"]) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>
      case "investigating":
        return <Badge className="bg-orange-500">조사중</Badge>
      case "identified":
        return <Badge className="bg-yellow-500">원인파악</Badge>
      case "monitoring":
        return <Badge className="bg-blue-500">모니터링</Badge>
      case "resolved":
        return <Badge className="bg-green-500">해결됨</Badge>
    }
  }

  const getSeverityIcon = (severity: Incident["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertOctagon className="h-5 w-5 text-red-500" />
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "medium":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "low":
        return <Clock className="text-muted-foreground h-5 w-5" />
    }
  }

  const filteredIncidents = INCIDENTS.filter(
    (incident) => statusFilter === "all" || incident.status === statusFilter
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <AlertOctagon className="h-6 w-6 text-red-500" />
            인시던트 관리
          </h2>
          <p className="text-muted-foreground">시스템 장애 및 이슈를 추적하고 관리합니다.</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              인시던트 생성
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 인시던트 생성</DialogTitle>
              <DialogDescription>새로운 시스템 이슈를 보고합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>제목</Label>
                <Input placeholder="인시던트 제목" />
              </div>
              <div className="grid gap-2">
                <Label>설명</Label>
                <Textarea placeholder="이슈에 대한 자세한 설명" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>심각도</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>영향 서비스</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api">API Gateway</SelectItem>
                      <SelectItem value="matching">Matching Engine</SelectItem>
                      <SelectItem value="persona">Persona Service</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                취소
              </Button>
              <Button onClick={handleCreateIncident}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">미해결 인시던트</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{INCIDENT_STATS.open}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {INCIDENT_STATS.open > 0 ? "즉시 대응 필요" : "모든 이슈 해결됨"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 해결 시간</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{INCIDENT_STATS.mttr}</div>
            <p className="mt-1 text-xs text-green-600">목표 대비 15% 단축</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">이번 달 총 인시던트</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{INCIDENT_STATS.totalThisMonth}</div>
            <p className="text-muted-foreground mt-1 text-xs">지난달 대비 -20%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">해결률</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((INCIDENT_STATS.resolvedThisMonth / INCIDENT_STATS.totalThisMonth) * 100)}
              %
            </div>
            <Progress
              value={(INCIDENT_STATS.resolvedThisMonth / INCIDENT_STATS.totalThisMonth) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Incident List & Details */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Incident List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>인시던트 목록</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">조사중</SelectItem>
                  <SelectItem value="identified">원인파악</SelectItem>
                  <SelectItem value="resolved">해결됨</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {filteredIncidents.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                  <CheckCircle className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">인시던트가 없습니다</h3>
                  <p className="text-muted-foreground text-sm">
                    시스템이 정상적으로 운영되고 있습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className={`hover:border-primary cursor-pointer rounded-lg border p-3 transition-all ${
                        selectedIncident?.id === incident.id ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(incident.severity)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-xs">{incident.id}</span>
                            {getStatusBadge(incident.status)}
                          </div>
                          <p className="mt-1 truncate text-sm font-medium">{incident.title}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {incident.service} • {incident.createdAt}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Incident Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedIncident?.id}
                  {selectedIncident && getSeverityBadge(selectedIncident.severity)}
                </CardTitle>
                <CardDescription>{selectedIncident?.title}</CardDescription>
              </div>
              {selectedIncident && (
                <div className="flex gap-2">
                  {selectedIncident.status !== "resolved" && (
                    <Select defaultValue={selectedIncident.status}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">조사중</SelectItem>
                        <SelectItem value="identified">원인파악</SelectItem>
                        <SelectItem value="monitoring">모니터링</SelectItem>
                        <SelectItem value="resolved">해결됨</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedIncident ? (
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="mb-2 font-semibold">설명</h4>
                  <p className="text-muted-foreground text-sm">{selectedIncident.description}</p>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">보고자:</span>
                      <span>{selectedIncident.reporter}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">담당자:</span>
                      <span>{selectedIncident.assignee}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">생성:</span>
                      <span>{selectedIncident.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <RefreshCw className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">업데이트:</span>
                      <span>{selectedIncident.updatedAt}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Timeline */}
                <div>
                  <h4 className="mb-4 font-semibold">타임라인</h4>
                  <div className="space-y-4">
                    {selectedIncident.timeline.map((event, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="bg-primary h-2 w-2 rounded-full" />
                          {index < selectedIncident.timeline.length - 1 && (
                            <div className="bg-border mt-1 h-full w-0.5" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{event.time}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{event.user}</span>
                          </div>
                          <p className="mt-1 text-sm">{event.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Input placeholder="업데이트 추가..." className="flex-1" />
                  <Button>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    추가
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-[400px] flex-col items-center justify-center text-center">
                <AlertOctagon className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">인시던트 선택</h3>
                <p className="text-muted-foreground">
                  왼쪽 목록에서 인시던트를 선택하면 상세 정보가 표시됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
