"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Activity,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  Key,
  Shield,
  AlertCircle,
  CheckCircle,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { MOCK_TEAM_MEMBERS } from "@/services/mock-data.service"

// TODO: Add MOCK_AUDIT_LOGS to @/services/mock-data.service for centralized audit log management
// 감사 로그 타입
interface AuditLog {
  id: string
  timestamp: string
  user: {
    name: string
    email: string
  }
  action: string
  category: "auth" | "persona" | "config" | "user" | "system"
  resource: string
  details: string
  ip: string
  status: "success" | "failure" | "warning"
}

const AUDIT_LOGS: AuditLog[] = [
  {
    id: "1",
    timestamp: "2025-01-16 15:30:45",
    user: { name: "김관리자", email: "admin@deepsight.ai" },
    action: "LOGIN",
    category: "auth",
    resource: "Session",
    details: "관리자 로그인 성공",
    ip: "192.168.1.100",
    status: "success",
  },
  {
    id: "2",
    timestamp: "2025-01-16 15:25:12",
    user: { name: "이엔지니어", email: "engineer@deepsight.ai" },
    action: "CREATE",
    category: "persona",
    resource: "Persona: 논리적 평론가",
    details: "새 페르소나 생성",
    ip: "192.168.1.101",
    status: "success",
  },
  {
    id: "3",
    timestamp: "2025-01-16 15:20:33",
    user: { name: "박콘텐츠", email: "content@deepsight.ai" },
    action: "UPDATE",
    category: "persona",
    resource: "Persona: 감성 에세이스트",
    details: "프롬프트 템플릿 수정",
    ip: "192.168.1.102",
    status: "success",
  },
  {
    id: "4",
    timestamp: "2025-01-16 15:15:20",
    user: { name: "김관리자", email: "admin@deepsight.ai" },
    action: "UPDATE",
    category: "config",
    resource: "Global Config",
    details: "AI 모델 설정 변경",
    ip: "192.168.1.100",
    status: "success",
  },
  {
    id: "5",
    timestamp: "2025-01-16 15:10:05",
    user: { name: "최분석", email: "analyst@deepsight.ai" },
    action: "VIEW",
    category: "system",
    resource: "Performance Report",
    details: "성능 리포트 조회",
    ip: "192.168.1.103",
    status: "success",
  },
  {
    id: "6",
    timestamp: "2025-01-16 15:05:48",
    user: { name: "Unknown", email: "unknown@test.com" },
    action: "LOGIN",
    category: "auth",
    resource: "Session",
    details: "잘못된 비밀번호로 로그인 시도",
    ip: "203.0.113.45",
    status: "failure",
  },
  {
    id: "7",
    timestamp: "2025-01-16 15:00:22",
    user: { name: "이엔지니어", email: "engineer@deepsight.ai" },
    action: "DEPLOY",
    category: "persona",
    resource: "Persona: 트렌드 헌터",
    details: "프로덕션 배포",
    ip: "192.168.1.101",
    status: "success",
  },
  {
    id: "8",
    timestamp: "2025-01-16 14:55:15",
    user: { name: "김관리자", email: "admin@deepsight.ai" },
    action: "CREATE",
    category: "user",
    resource: "User: 정신규",
    details: "새 사용자 초대",
    ip: "192.168.1.100",
    status: "success",
  },
]

// TODO: Move AUDIT_STATS to @/services/mock-data.service
const AUDIT_STATS = {
  totalLogs: 1234,
  todayLogs: 89,
  failedAttempts: 3,
  uniqueUsers: MOCK_TEAM_MEMBERS.filter(m => m.status === "ACTIVE").length,
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
    toast.success("로그가 새로고침되었습니다")
  }

  const handleExport = () => {
    toast.success("감사 로그 내보내기가 시작되었습니다", {
      description: "CSV 파일이 곧 다운로드됩니다"
    })
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <LogIn className="h-4 w-4" />
      case "LOGOUT":
        return <LogOut className="h-4 w-4" />
      case "CREATE":
        return <Plus className="h-4 w-4" />
      case "UPDATE":
        return <Edit className="h-4 w-4" />
      case "DELETE":
        return <Trash2 className="h-4 w-4" />
      case "VIEW":
        return <Eye className="h-4 w-4" />
      case "DEPLOY":
        return <Activity className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getCategoryBadge = (category: AuditLog["category"]) => {
    const colors: Record<string, string> = {
      auth: "bg-blue-500",
      persona: "bg-purple-500",
      config: "bg-orange-500",
      user: "bg-green-500",
      system: "bg-gray-500",
    }
    const labels: Record<string, string> = {
      auth: "인증",
      persona: "페르소나",
      config: "설정",
      user: "사용자",
      system: "시스템",
    }
    return (
      <Badge className={colors[category]}>
        {labels[category]}
      </Badge>
    )
  }

  const getStatusBadge = (status: AuditLog["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            성공
          </Badge>
        )
      case "failure":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            실패
          </Badge>
        )
      case "warning":
        return (
          <Badge className="bg-yellow-500 gap-1">
            <AlertCircle className="h-3 w-3" />
            주의
          </Badge>
        )
    }
  }

  const filteredLogs = AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      log.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter
    const matchesStatus = statusFilter === "all" || log.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-gray-500" />
            감사 로그
          </h2>
          <p className="text-muted-foreground">
            시스템 활동 기록을 조회하고 분석합니다.
          </p>
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
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {AUDIT_STATS.totalLogs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">이번 달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 활동</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{AUDIT_STATS.todayLogs}</div>
            <p className="text-xs text-muted-foreground mt-1">기록된 활동</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">실패한 시도</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {AUDIT_STATS.failedAttempts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">오늘</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{AUDIT_STATS.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">오늘</p>
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
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="검색..."
                  className="pl-8 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="auth">인증</SelectItem>
                  <SelectItem value="persona">페르소나</SelectItem>
                  <SelectItem value="config">설정</SelectItem>
                  <SelectItem value="user">사용자</SelectItem>
                  <SelectItem value="system">시스템</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="success">성공</SelectItem>
                  <SelectItem value="failure">실패</SelectItem>
                  <SelectItem value="warning">주의</SelectItem>
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
                <TableHead>카테고리</TableHead>
                <TableHead>리소스</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="font-mono text-xs">
                    {log.timestamp}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {log.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{log.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span>{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getCategoryBadge(log.category)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {log.resource}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                  <TableCell className="text-right">
                    {getStatusBadge(log.status)}
                  </TableCell>
                </TableRow>
              ))}
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
              {selectedLog?.timestamp}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">사용자</Label>
                  <p className="font-medium">{selectedLog.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.user.email}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP 주소</Label>
                  <p className="font-mono">{selectedLog.ip}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">작업</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getActionIcon(selectedLog.action)}
                    <span className="font-medium">{selectedLog.action}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">카테고리</Label>
                  <div className="mt-1">
                    {getCategoryBadge(selectedLog.category)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">리소스</Label>
                <p className="font-medium">{selectedLog.resource}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">상세 내용</Label>
                <p>{selectedLog.details}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">상태</Label>
                <div className="mt-1">
                  {getStatusBadge(selectedLog.status)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
