"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { operationsService, type Incident, type IncidentStats } from "@/services/operations-service"
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
  Loader2,
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

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [stats, setStats] = useState<IncidentStats>({
    total: 0,
    open: 0,
    investigating: 0,
    resolved: 0,
    critical: 0,
  })
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "MEDIUM" as Incident["severity"],
    affectedSystems: [] as string[],
    selectedSystem: "",
  })

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = async () => {
    try {
      setIsLoading(true)
      const data = await operationsService.getIncidents()
      setIncidents(data.incidents)
      setStats(data.stats)
      if (data.incidents.length > 0 && !selectedIncident) {
        setSelectedIncident(data.incidents[0])
      }
    } catch (error) {
      console.error("Failed to load incidents:", error)
      toast.error("인시던트 목록을 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateIncident = async () => {
    if (!newIncident.title.trim()) {
      toast.error("제목을 입력해주세요.")
      return
    }
    try {
      setIsSubmitting(true)
      await operationsService.createIncident({
        title: newIncident.title,
        description: newIncident.description,
        severity: newIncident.severity,
        affectedSystems: newIncident.affectedSystems,
      })
      toast.success("인시던트가 생성되었습니다.")
      setShowCreateDialog(false)
      setNewIncident({
        title: "",
        description: "",
        severity: "MEDIUM",
        affectedSystems: [],
        selectedSystem: "",
      })
      loadIncidents()
    } catch (error) {
      console.error("Failed to create incident:", error)
      toast.error("인시던트 생성에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: Incident["status"]) => {
    if (!selectedIncident) return
    try {
      const updated = await operationsService.updateIncident(selectedIncident.id, {
        status: newStatus,
      })
      setSelectedIncident(updated)
      setIncidents((prev) => prev.map((inc) => (inc.id === updated.id ? updated : inc)))
      toast.success("상태가 업데이트되었습니다.")
      loadIncidents()
    } catch (error) {
      console.error("Failed to update status:", error)
      toast.error("상태 업데이트에 실패했습니다.")
    }
  }

  const handleAddComment = async () => {
    if (!selectedIncident || !newComment.trim()) return
    try {
      await operationsService.addIncidentTimeline(selectedIncident.id, {
        action: "COMMENT",
        description: newComment,
      })
      setNewComment("")
      // Refresh the incident to get updated timeline
      const updated = await operationsService.getIncident(selectedIncident.id)
      setSelectedIncident(updated)
      setIncidents((prev) => prev.map((inc) => (inc.id === updated.id ? updated : inc)))
      toast.success("코멘트가 추가되었습니다.")
    } catch (error) {
      console.error("Failed to add comment:", error)
      toast.error("코멘트 추가에 실패했습니다.")
    }
  }

  const getSeverityBadge = (severity: Incident["severity"]) => {
    switch (severity) {
      case "CRITICAL":
        return <Badge variant="destructive">Critical</Badge>
      case "HIGH":
        return <Badge className="bg-orange-500">High</Badge>
      case "MEDIUM":
        return <Badge className="bg-yellow-500">Medium</Badge>
      case "LOW":
        return <Badge variant="secondary">Low</Badge>
    }
  }

  const getStatusBadge = (status: Incident["status"]) => {
    switch (status) {
      case "REPORTED":
        return <Badge variant="destructive">Open</Badge>
      case "INVESTIGATING":
        return <Badge className="bg-orange-500">조사중</Badge>
      case "IDENTIFIED":
        return <Badge className="bg-yellow-500">원인파악</Badge>
      case "FIXING":
        return <Badge className="bg-blue-500">수정중</Badge>
      case "RESOLVED":
        return <Badge className="bg-green-500">해결됨</Badge>
    }
  }

  const getSeverityIcon = (severity: Incident["severity"]) => {
    switch (severity) {
      case "CRITICAL":
        return <AlertOctagon className="h-5 w-5 text-red-500" />
      case "HIGH":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "MEDIUM":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "LOW":
        return <Clock className="text-muted-foreground h-5 w-5" />
    }
  }

  const filteredIncidents = incidents.filter((incident) => {
    if (statusFilter === "all") return true
    // Map UI filter to API status
    const statusMap: Record<string, Incident["status"][]> = {
      open: ["REPORTED"],
      investigating: ["INVESTIGATING"],
      identified: ["IDENTIFIED"],
      fixing: ["FIXING"],
      resolved: ["RESOLVED"],
    }
    return statusMap[statusFilter]?.includes(incident.status)
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Calculate resolution rate
  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0

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
            <AlertOctagon className="h-6 w-6 text-red-500" />
            인시던트 관리
          </h2>
          <p className="text-muted-foreground">시스템 장애 및 이슈를 추적하고 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadIncidents}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
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
                  <Input
                    placeholder="인시던트 제목"
                    value={newIncident.title}
                    onChange={(e) => setNewIncident((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>설명</Label>
                  <Textarea
                    placeholder="이슈에 대한 자세한 설명"
                    value={newIncident.description}
                    onChange={(e) =>
                      setNewIncident((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>심각도</Label>
                    <Select
                      value={newIncident.severity}
                      onValueChange={(value) =>
                        setNewIncident((prev) => ({
                          ...prev,
                          severity: value as Incident["severity"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>영향 시스템</Label>
                    <Select
                      value={newIncident.selectedSystem}
                      onValueChange={(value) => {
                        if (!newIncident.affectedSystems.includes(value)) {
                          setNewIncident((prev) => ({
                            ...prev,
                            affectedSystems: [...prev.affectedSystems, value],
                            selectedSystem: value,
                          }))
                        }
                      }}
                    >
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
                    {newIncident.affectedSystems.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {newIncident.affectedSystems.map((sys) => (
                          <Badge
                            key={sys}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() =>
                              setNewIncident((prev) => ({
                                ...prev,
                                affectedSystems: prev.affectedSystems.filter((s) => s !== sys),
                              }))
                            }
                          >
                            {sys} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateIncident} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">미해결 인시던트</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open + stats.investigating}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.open + stats.investigating > 0 ? "즉시 대응 필요" : "모든 이슈 해결됨"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical 인시던트</CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.critical > 0 ? "우선 처리 필요" : "Critical 이슈 없음"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 인시던트</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-muted-foreground mt-1 text-xs">전체 기록된 인시던트</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">해결률</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolutionRate}%</div>
            <Progress value={resolutionRate} className="mt-2" />
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
                            <span className="text-muted-foreground text-xs">
                              {incident.id.slice(0, 8)}
                            </span>
                            {getStatusBadge(incident.status)}
                          </div>
                          <p className="mt-1 truncate text-sm font-medium">{incident.title}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {incident.affectedSystems.join(", ") || "시스템 미지정"} •{" "}
                            {formatDate(incident.createdAt)}
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
                  {selectedIncident?.id.slice(0, 8)}
                  {selectedIncident && getSeverityBadge(selectedIncident.severity)}
                </CardTitle>
                <CardDescription>{selectedIncident?.title}</CardDescription>
              </div>
              {selectedIncident && (
                <div className="flex gap-2">
                  {selectedIncident.status !== "RESOLVED" && (
                    <Select
                      value={selectedIncident.status}
                      onValueChange={(value) => handleStatusChange(value as Incident["status"])}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REPORTED">Open</SelectItem>
                        <SelectItem value="INVESTIGATING">조사중</SelectItem>
                        <SelectItem value="IDENTIFIED">원인파악</SelectItem>
                        <SelectItem value="FIXING">수정중</SelectItem>
                        <SelectItem value="RESOLVED">해결됨</SelectItem>
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
                      <span>
                        {selectedIncident.reporter.name ||
                          selectedIncident.reporter.email ||
                          "알 수 없음"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">영향 시스템:</span>
                      <span>{selectedIncident.affectedSystems.join(", ") || "없음"}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">생성:</span>
                      <span>{formatDate(selectedIncident.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <RefreshCw className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">업데이트:</span>
                      <span>{formatDate(selectedIncident.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {selectedIncident.resolution && (
                  <div>
                    <h4 className="mb-2 font-semibold">해결 방법</h4>
                    <p className="text-muted-foreground text-sm">{selectedIncident.resolution}</p>
                  </div>
                )}

                <Separator />

                {/* Timeline */}
                <div>
                  <h4 className="mb-4 font-semibold">타임라인</h4>
                  {selectedIncident.timeline.length === 0 ? (
                    <p className="text-muted-foreground text-sm">타임라인 기록이 없습니다.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedIncident.timeline.map((entry, index) => (
                        <div key={entry.id || index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="bg-primary h-2 w-2 rounded-full" />
                            {index < selectedIncident.timeline.length - 1 && (
                              <div className="bg-border mt-1 h-full w-0.5" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{formatDate(entry.createdAt)}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">
                                {entry.performedBy.name || "시스템"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {entry.action}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm">{entry.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="업데이트 추가..."
                    className="flex-1"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>
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
