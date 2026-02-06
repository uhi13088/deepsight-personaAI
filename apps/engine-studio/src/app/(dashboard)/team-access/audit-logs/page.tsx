"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  auditLogsService,
  type AuditLog as ApiAuditLog,
  type AuditLogStats,
} from "@/services/audit-logs-service"
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  User,
  Activity,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { downloadCSV, generateFilename } from "@/lib/export"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([])
  const [stats, setStats] = useState<AuditLogStats>({
    total: 0,
    today: 0,
    byAction: {},
    byTargetType: {},
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedLog, setSelectedLog] = useState<ApiAuditLog | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setIsLoading(true)
      const data = await auditLogsService.getLogs()
      setLogs(data.logs || [])
      setStats(data.stats || { total: 0, today: 0, byAction: {}, byTargetType: {} })
    } catch (error) {
      console.error("Failed to load audit logs:", error)
      toast.error("감사 로그를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadLogs()
      toast.success("로그가 새로고침되었습니다")
    } catch {
      toast.error("새로고침에 실패했습니다")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExport = () => {
    const exportData = filteredLogs.map((log) => ({
      timestamp: log.createdAt,
      user: log.user.name || log.user.email,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId || "",
      details: JSON.stringify(log.details || {}),
      ipAddress: log.ipAddress || "",
    }))
    const columns = [
      { key: "timestamp", label: "Timestamp" },
      { key: "user", label: "User" },
      { key: "action", label: "Action" },
      { key: "targetType", label: "Target Type" },
      { key: "targetId", label: "Target ID" },
      { key: "details", label: "Details" },
      { key: "ipAddress", label: "IP Address" },
    ]
    downloadCSV(exportData, generateFilename("audit_logs"), columns)
    toast.success("감사 로그 내보내기가 완료되었습니다")
  }

  const getActionIcon = (action: string) => {
    const actionUpper = action.toUpperCase()
    if (actionUpper.includes("LOGIN")) return <LogIn className="h-4 w-4" />
    if (actionUpper.includes("LOGOUT")) return <LogOut className="h-4 w-4" />
    if (actionUpper.includes("CREATE")) return <Plus className="h-4 w-4" />
    if (actionUpper.includes("UPDATE")) return <Edit className="h-4 w-4" />
    if (actionUpper.includes("DELETE")) return <Trash2 className="h-4 w-4" />
    if (actionUpper.includes("VIEW")) return <Eye className="h-4 w-4" />
    if (actionUpper.includes("DEPLOY")) return <Activity className="h-4 w-4" />
    return <Settings className="h-4 w-4" />
  }

  const getCategoryBadge = (targetType: string) => {
    const colors: Record<string, string> = {
      AUTH: "bg-blue-500",
      USER: "bg-green-500",
      PERSONA: "bg-purple-500",
      ARCHETYPE: "bg-indigo-500",
      ALGORITHM: "bg-orange-500",
      DEPLOYMENT: "bg-red-500",
      SAFETY_FILTER: "bg-yellow-500",
      INCIDENT: "bg-pink-500",
    }
    return <Badge className={colors[targetType] || "bg-gray-500"}>{targetType}</Badge>
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetType.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || log.targetType === categoryFilter
    return matchesSearch && matchesCategory
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Get unique target types for filter
  const targetTypes = [...new Set(logs.map((log) => log.targetType))]

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
            <FileText className="h-6 w-6 text-gray-500" />
            감사 로그
          </h2>
          <p className="text-muted-foreground">시스템 활동 기록을 조회하고 분석합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 로그</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-muted-foreground mt-1 text-xs">이번 달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 활동</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-muted-foreground mt-1 text-xs">기록된 활동</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">주요 작업</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(stats.byAction).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">가장 많은 작업 유형</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">대상 유형</CardTitle>
            <User className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byTargetType).length}</div>
            <p className="text-muted-foreground mt-1 text-xs">고유 대상 유형</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>활동 기록</CardTitle>
              <CardDescription>모든 시스템 활동 로그</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                <Input
                  placeholder="검색..."
                  className="w-64 pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="대상 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {targetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>작업</TableHead>
                <TableHead>대상 유형</TableHead>
                <TableHead>대상 ID</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="text-muted-foreground h-8 w-8" />
                      <p className="text-muted-foreground">감사 로그가 없습니다</p>
                      <p className="text-muted-foreground text-sm">
                        시스템 활동이 기록되면 여기에 표시됩니다
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="font-mono text-xs">{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {(log.user.name || log.user.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{log.user.name || log.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span>{log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(log.targetType)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.targetId?.slice(0, 8) || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>로그 상세</DialogTitle>
            <DialogDescription>
              {selectedLog && formatDate(selectedLog.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">사용자</Label>
                  <p className="font-medium">{selectedLog.user.name || "알 수 없음"}</p>
                  <p className="text-muted-foreground text-sm">{selectedLog.user.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP 주소</Label>
                  <p className="font-mono">{selectedLog.ipAddress || "-"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">작업</Label>
                  <div className="mt-1 flex items-center gap-2">
                    {getActionIcon(selectedLog.action)}
                    <span className="font-medium">{selectedLog.action}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">대상 유형</Label>
                  <div className="mt-1">{getCategoryBadge(selectedLog.targetType)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">대상 ID</Label>
                <p className="font-mono">{selectedLog.targetId || "-"}</p>
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">상세 내용</Label>
                  <pre className="bg-muted mt-1 max-h-40 overflow-auto rounded p-2 text-xs">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <Label className="text-muted-foreground">User Agent</Label>
                  <p className="text-muted-foreground mt-1 text-xs">{selectedLog.userAgent}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">기록됨</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
