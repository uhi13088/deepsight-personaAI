"use client"

import * as React from "react"
import Link from "next/link"
import {
  Users,
  UserPlus,
  Mail,
  MoreHorizontal,
  Shield,
  Settings,
  Trash2,
  Crown,
  Check,
  X,
  Clock,
  Search,
  Building2,
  Key,
  Edit,
  Loader2,
  Download,
} from "lucide-react"
import { toast } from "sonner"
import {
  teamService,
  type TeamData,
  type Member as ServiceMember,
  type PendingInvite as ServicePendingInvite,
  type MemberRole,
} from "@/services/team-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { cn, formatRelativeTime } from "@/lib/utils"
import { downloadCSV, generateFilename } from "@/lib/export"

const roles = [
  {
    id: "owner",
    name: "Owner",
    description: "조직의 모든 권한을 가집니다",
    permissions: ["모든 권한"],
    color: "text-yellow-600",
    icon: Crown,
  },
  {
    id: "admin",
    name: "Admin",
    description: "멤버 관리 및 설정 변경 권한",
    permissions: ["멤버 관리", "API 키 관리", "설정 변경", "빌링 조회"],
    color: "text-purple-600",
    icon: Shield,
  },
  {
    id: "developer",
    name: "Developer",
    description: "개발 관련 기능 접근 권한",
    permissions: ["API 키 조회", "로그 조회", "Playground 사용"],
    color: "text-blue-600",
    icon: Key,
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "읽기 전용 접근 권한",
    permissions: ["대시보드 조회", "로그 조회"],
    color: "text-gray-600",
    icon: Users,
  },
]

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false)
  const [editMemberDialogOpen, setEditMemberDialogOpen] = React.useState(false)
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<ServiceMember | null>(null)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("developer")
  const [editRole, setEditRole] = React.useState<MemberRole>("developer")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [teamData, setTeamData] = React.useState<TeamData | null>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await teamService.getTeam()
        setTeamData(data)
      } catch (error) {
        console.error("Failed to fetch team data:", error)
        toast.error("팀 데이터를 불러오는데 실패했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const organization = teamData?.organization ?? {
    id: "",
    name: "My Organization",
    plan: "Free",
    createdAt: new Date().toISOString(),
    memberCount: 0,
    maxMembers: 5,
  }
  const members = teamData?.members ?? []
  const pendingInvites = teamData?.pendingInvites ?? []

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const roleConfig = roles.find((r) => r.id === role)
    if (!roleConfig) return <Badge variant="secondary">{role}</Badge>

    const Icon = roleConfig.icon
    return (
      <Badge variant="outline" className={cn("gap-1", roleConfig.color)}>
        <Icon className="h-3 w-3" />
        {roleConfig.name}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "inactive":
        return <Badge variant="destructive">Inactive</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleInvite = async () => {
    try {
      await teamService.inviteMember({ email: inviteEmail, role: inviteRole as MemberRole })
      toast.success("초대가 발송되었습니다.")
      // Refresh team data
      const data = await teamService.getTeam()
      setTeamData(data)
      setInviteDialogOpen(false)
      setInviteEmail("")
      setInviteRole("developer")
    } catch (error) {
      console.error("Failed to invite member:", error)
      toast.error("초대 발송에 실패했습니다.")
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedMember) return

    setIsSaving(true)
    try {
      await teamService.updateMember(selectedMember.id, { role: editRole })
      toast.success("역할이 변경되었습니다.")
      // Refresh team data
      const data = await teamService.getTeam()
      setTeamData(data)
      setEditMemberDialogOpen(false)
      setSelectedMember(null)
    } catch (error) {
      console.error("Failed to update member role:", error)
      toast.error("역할 변경에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return

    setIsSaving(true)
    try {
      await teamService.removeMember(selectedMember.id)
      toast.success("멤버가 제거되었습니다.")
      // Refresh team data
      const data = await teamService.getTeam()
      setTeamData(data)
      setRemoveMemberDialogOpen(false)
      setSelectedMember(null)
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast.error("멤버 제거에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportMembers = () => {
    const columns = [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
      { key: "joinedAt", label: "Joined At" },
      { key: "lastActive", label: "Last Active" },
    ]
    downloadCSV(members, generateFilename("team_members"), columns)
    toast.success("CSV 파일이 다운로드되었습니다.")
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">팀원을 관리하고 역할을 할당하세요</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 rounded-lg p-3">
                <Building2 className="text-primary h-8 w-8" />
              </div>
              <div>
                <CardTitle>{organization.name}</CardTitle>
                <CardDescription>
                  Created {formatRelativeTime(organization.createdAt)}
                </CardDescription>
              </div>
            </div>
            <Badge variant="default">{organization.plan} Plan</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Team Members</p>
              <p className="text-2xl font-bold">
                {organization.memberCount} / {organization.maxMembers}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Pending Invites</p>
              <p className="text-2xl font-bold">{pendingInvites.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Available Seats</p>
              <p className="text-2xl font-bold">
                {organization.maxMembers - organization.memberCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites ({pendingInvites.length})</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>현재 조직의 모든 멤버</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-full md:w-[300px]">
                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button variant="outline" onClick={handleExportMembers}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-muted-foreground text-sm">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(member.joinedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.lastActive ? formatRelativeTime(member.lastActive) : "-"}
                      </TableCell>
                      <TableCell>
                        {member.role !== "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member)
                                  setEditRole(member.role)
                                  setEditMemberDialogOpen(true)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedMember(member)
                                  setRemoveMemberDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredMembers.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground">팀원이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Invites Tab */}
        <TabsContent value="invites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>아직 수락되지 않은 초대</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingInvites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.email}</TableCell>
                        <TableCell>{getRoleBadge(invite.role)}</TableCell>
                        <TableCell className="text-muted-foreground">{invite.invitedBy}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeTime(invite.invitedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeTime(invite.expiresAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              Resend
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  <Mail className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p>No pending invitations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>역할별 권한 설정</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {roles.map((role) => {
                  const Icon = role.icon
                  return (
                    <div key={role.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className={cn("bg-muted rounded-lg p-2", role.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{role.name}</h4>
                          <p className="text-muted-foreground text-sm">{role.description}</p>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-xs font-medium uppercase">
                          Permissions
                        </p>
                        <ul className="space-y-1">
                          {role.permissions.map((perm) => (
                            <li key={perm} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              {perm}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>이메일로 새 팀원을 초대하세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((r) => r.id !== "owner")
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(role.id)}
                          <span className="text-muted-foreground">- {role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>초대 이메일이 발송되며, 7일 내에 수락해야 합니다.</AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Role Dialog */}
      <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Role</DialogTitle>
            <DialogDescription>{selectedMember?.name}님의 역할을 변경합니다</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((r) => r.id !== "owner")
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {getRoleBadge(role.id)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditMemberDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              정말로 {selectedMember?.name}님을 팀에서 제거하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <Trash2 className="h-4 w-4" />
            <AlertTitle>주의</AlertTitle>
            <AlertDescription>
              이 작업은 되돌릴 수 없습니다. 해당 멤버는 더 이상 조직의 리소스에 접근할 수 없게
              됩니다.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveMemberDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
