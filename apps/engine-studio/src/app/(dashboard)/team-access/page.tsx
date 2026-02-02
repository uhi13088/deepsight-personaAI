"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Users,
  Shield,
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Key,
  UserPlus,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { MOCK_TEAM_MEMBERS, type MockTeamMember } from "@/services/mock-data.service"

// 팀원 데이터 - adapted from centralized mock data service
interface TeamMember {
  id: string
  name: string
  email: string
  role: "ADMIN" | "AI_ENGINEER" | "CONTENT_MANAGER" | "ANALYST"
  status: "active" | "inactive" | "pending"
  avatar?: string
  lastActive: string
  joinedAt: string
}

// Transform centralized mock data to page-specific format
const transformTeamMember = (member: MockTeamMember): TeamMember => ({
  id: member.id,
  name: member.name,
  email: member.email,
  role: member.role as TeamMember["role"],
  status: member.status.toLowerCase() as TeamMember["status"],
  avatar: member.avatar,
  lastActive: new Date(member.lastActive).toLocaleString("ko-KR"),
  joinedAt: new Date(member.joinedAt).toLocaleDateString("ko-KR"),
})

const TEAM_MEMBERS: TeamMember[] = MOCK_TEAM_MEMBERS.map(transformTeamMember)

// TODO: Move ROLES to centralized mock-data.service when role management is expanded
const ROLES = [
  {
    id: "ADMIN",
    name: "관리자",
    description: "모든 기능에 대한 전체 접근 권한",
    permissions: 24,
    members: MOCK_TEAM_MEMBERS.filter((m) => m.role === "ADMIN").length,
    color: "bg-red-500",
  },
  {
    id: "AI_ENGINEER",
    name: "AI 엔지니어",
    description: "페르소나 및 알고리즘 관리",
    permissions: 18,
    members: MOCK_TEAM_MEMBERS.filter((m) => m.role === "AI_ENGINEER").length,
    color: "bg-purple-500",
  },
  {
    id: "CONTENT_MANAGER",
    name: "콘텐츠 매니저",
    description: "콘텐츠 및 프롬프트 관리",
    permissions: 12,
    members: MOCK_TEAM_MEMBERS.filter((m) => m.role === "CONTENT_MANAGER").length,
    color: "bg-blue-500",
  },
  {
    id: "ANALYST",
    name: "분석가",
    description: "데이터 분석 및 리포트 조회",
    permissions: 8,
    members: MOCK_TEAM_MEMBERS.filter((m) => m.role === "ANALYST").length,
    color: "bg-green-500",
  },
]

// Dynamically computed team stats from centralized mock data
const TEAM_STATS = {
  totalMembers: MOCK_TEAM_MEMBERS.length,
  activeMembers: MOCK_TEAM_MEMBERS.filter((m) => m.status === "ACTIVE").length,
  pendingInvites: MOCK_TEAM_MEMBERS.filter((m) => m.status === "PENDING").length,
  totalRoles: ROLES.length,
}

export default function TeamAccessPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [, setShowAddRoleDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("")
  const [inviteMessage, setInviteMessage] = useState("")
  const [teamMembers, setTeamMembers] = useState(TEAM_MEMBERS)

  const handleSendInvite = () => {
    if (!inviteEmail) {
      toast.error("이메일 주소를 입력해주세요")
      return
    }
    if (!inviteRole) {
      toast.error("역할을 선택해주세요")
      return
    }
    toast.success(`${inviteEmail}로 초대가 발송되었습니다`)
    setShowInviteDialog(false)
    setInviteEmail("")
    setInviteRole("")
    setInviteMessage("")
  }

  const handleEditMember = (member: TeamMember) => {
    toast.info(`${member.name} 편집 모드`)
  }

  const handleResetPassword = (member: TeamMember) => {
    toast.success(`${member.email}로 비밀번호 재설정 링크가 발송되었습니다`)
  }

  const handleDeleteMember = (member: TeamMember) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== member.id))
    toast.success(`${member.name}이(가) 팀에서 삭제되었습니다`)
  }

  const handleAddRole = () => {
    setShowAddRoleDialog(true)
    toast.info("새 역할 추가 기능은 권한 관리 페이지에서 설정할 수 있습니다")
  }

  const handleRoleSettings = (roleId: string) => {
    const role = ROLES.find((r) => r.id === roleId)
    if (role) {
      toast.info(`${role.name} 역할 설정`)
    }
  }

  const getRoleBadge = (role: TeamMember["role"]) => {
    const roleInfo = ROLES.find((r) => r.id === role)
    if (!roleInfo) {
      return <Badge variant="outline">Unknown Role</Badge>
    }
    return (
      <Badge variant="outline" className={`${roleInfo.color} border-current bg-opacity-10`}>
        {roleInfo.name}
      </Badge>
    )
  }

  const getStatusBadge = (status: TeamMember["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            활성
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            비활성
          </Badge>
        )
      case "pending":
        return (
          <Badge className="gap-1 bg-yellow-500">
            <AlertCircle className="h-3 w-3" />
            대기
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1">
            Unknown
          </Badge>
        )
    }
  }

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6 text-indigo-500" />팀 & 접근 관리
          </h2>
          <p className="text-muted-foreground">팀원을 관리하고 권한을 설정합니다.</p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              팀원 초대
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 팀원 초대</DialogTitle>
              <DialogDescription>이메일로 새로운 팀원을 초대합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>이메일 주소</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>역할</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>메시지 (선택)</Label>
                <Input
                  placeholder="환영 메시지를 입력하세요"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                취소
              </Button>
              <Button onClick={handleSendInvite}>
                <Mail className="mr-2 h-4 w-4" />
                초대 보내기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 팀원</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{TEAM_STATS.totalMembers}</div>
            <p className="text-muted-foreground mt-1 text-xs">{TEAM_STATS.activeMembers}명 활성</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">대기 중 초대</CardTitle>
            <Mail className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{TEAM_STATS.pendingInvites}</div>
            <p className="text-muted-foreground mt-1 text-xs">응답 대기</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">역할 수</CardTitle>
            <Shield className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{TEAM_STATS.totalRoles}</div>
            <p className="text-muted-foreground mt-1 text-xs">정의된 역할</p>
          </CardContent>
        </Card>

        <Link href="/team-access/audit-logs">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">감사 로그</CardTitle>
              <FileText className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-muted-foreground mt-1 text-xs">이번 달 활동</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">팀원</TabsTrigger>
          <TabsTrigger value="roles">역할</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>팀원 목록</CardTitle>
                  <CardDescription>모든 팀원을 관리합니다.</CardDescription>
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
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="역할 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {ROLES.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
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
                    <TableHead>팀원</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>마지막 활동</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-muted-foreground text-sm">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell>{member.lastActive}</TableCell>
                      <TableCell>{member.joinedAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditMember(member)}>
                              <Edit className="mr-2 h-4 w-4" />
                              편집
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(member)}>
                              <Key className="mr-2 h-4 w-4" />
                              비밀번호 재설정
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteMember(member)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>역할 관리</CardTitle>
                  <CardDescription>역할과 권한을 설정합니다.</CardDescription>
                </div>
                <Button size="sm" onClick={handleAddRole}>
                  <Plus className="mr-2 h-4 w-4" />
                  역할 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {ROLES.map((role) => (
                  <div
                    key={role.id}
                    className="hover:border-primary cursor-pointer rounded-lg border p-4 transition-colors"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${role.color}`} />
                        <div>
                          <h4 className="font-semibold">{role.name}</h4>
                          <p className="text-muted-foreground text-sm">{role.description}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRoleSettings(role.id)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{role.permissions}개 권한</span>
                        <span className="text-muted-foreground">{role.members}명</span>
                      </div>
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
