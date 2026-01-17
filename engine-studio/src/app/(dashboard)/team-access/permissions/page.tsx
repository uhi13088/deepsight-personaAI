"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Users,
  Key,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  FileCode,
  Database,
  Server,
  Activity,
  BarChart,
  UserCog,
  Building,
  FolderKey,
} from "lucide-react"

// 타입 정의
interface Permission {
  id: string
  name: string
  code: string
  description: string
  category: string
}

interface Role {
  id: string
  name: string
  code: string
  description: string
  permissions: string[]
  userCount: number
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

interface PermissionGroup {
  category: string
  icon: React.ReactNode
  permissions: Permission[]
}

// 권한 정의
const permissionGroups: PermissionGroup[] = [
  {
    category: "페르소나 관리",
    icon: <Users className="h-4 w-4" />,
    permissions: [
      { id: "p-001", name: "페르소나 조회", code: "persona:read", description: "페르소나 목록 및 상세 정보 조회", category: "페르소나 관리" },
      { id: "p-002", name: "페르소나 생성", code: "persona:create", description: "새 페르소나 생성", category: "페르소나 관리" },
      { id: "p-003", name: "페르소나 수정", code: "persona:update", description: "기존 페르소나 수정", category: "페르소나 관리" },
      { id: "p-004", name: "페르소나 삭제", code: "persona:delete", description: "페르소나 삭제", category: "페르소나 관리" },
      { id: "p-005", name: "페르소나 배포", code: "persona:deploy", description: "페르소나를 프로덕션에 배포", category: "페르소나 관리" },
      { id: "p-006", name: "인큐베이터 사용", code: "persona:incubator", description: "AI 인큐베이터로 페르소나 생성", category: "페르소나 관리" },
    ],
  },
  {
    category: "사용자 인사이트",
    icon: <BarChart className="h-4 w-4" />,
    permissions: [
      { id: "p-011", name: "인사이트 조회", code: "insight:read", description: "사용자 인사이트 데이터 조회", category: "사용자 인사이트" },
      { id: "p-012", name: "인사이트 분석", code: "insight:analyze", description: "새 인사이트 분석 실행", category: "사용자 인사이트" },
      { id: "p-013", name: "콜드스타트 관리", code: "insight:coldstart", description: "콜드스타트 설정 관리", category: "사용자 인사이트" },
      { id: "p-014", name: "심리분석 조회", code: "insight:psychometric", description: "심리분석 결과 조회", category: "사용자 인사이트" },
      { id: "p-015", name: "아키타입 관리", code: "insight:archetype", description: "아키타입 설정 관리", category: "사용자 인사이트" },
    ],
  },
  {
    category: "매칭 랩",
    icon: <Activity className="h-4 w-4" />,
    permissions: [
      { id: "p-021", name: "매칭 시뮬레이션", code: "matching:simulate", description: "매칭 시뮬레이션 실행", category: "매칭 랩" },
      { id: "p-022", name: "알고리즘 튜닝", code: "matching:tune", description: "매칭 알고리즘 파라미터 조정", category: "매칭 랩" },
      { id: "p-023", name: "성능 분석", code: "matching:performance", description: "매칭 성능 데이터 조회", category: "매칭 랩" },
    ],
  },
  {
    category: "시스템 통합",
    icon: <Server className="h-4 w-4" />,
    permissions: [
      { id: "p-031", name: "배포 파이프라인", code: "system:deploy", description: "배포 파이프라인 관리", category: "시스템 통합" },
      { id: "p-032", name: "버전 관리", code: "system:version", description: "버전 관리 기능 사용", category: "시스템 통합" },
      { id: "p-033", name: "이벤트 버스 모니터", code: "system:events", description: "이벤트 버스 모니터링", category: "시스템 통합" },
    ],
  },
  {
    category: "운영 관리",
    icon: <Settings className="h-4 w-4" />,
    permissions: [
      { id: "p-041", name: "모니터링 조회", code: "ops:monitor", description: "시스템 모니터링 대시보드 조회", category: "운영 관리" },
      { id: "p-042", name: "인시던트 관리", code: "ops:incident", description: "인시던트 관리 및 대응", category: "운영 관리" },
      { id: "p-043", name: "백업 관리", code: "ops:backup", description: "백업 및 복구 관리", category: "운영 관리" },
    ],
  },
  {
    category: "전역 설정",
    icon: <Database className="h-4 w-4" />,
    permissions: [
      { id: "p-051", name: "모델 설정", code: "config:model", description: "AI 모델 설정 관리", category: "전역 설정" },
      { id: "p-052", name: "안전 필터", code: "config:safety", description: "안전 필터 설정 관리", category: "전역 설정" },
      { id: "p-053", name: "API 엔드포인트", code: "config:api", description: "API 설정 관리", category: "전역 설정" },
    ],
  },
  {
    category: "팀 & 접근 관리",
    icon: <UserCog className="h-4 w-4" />,
    permissions: [
      { id: "p-061", name: "사용자 관리", code: "team:users", description: "팀 멤버 관리", category: "팀 & 접근 관리" },
      { id: "p-062", name: "역할 관리", code: "team:roles", description: "역할 및 권한 관리", category: "팀 & 접근 관리" },
      { id: "p-063", name: "감사 로그 조회", code: "team:audit", description: "감사 로그 조회", category: "팀 & 접근 관리" },
    ],
  },
]

// 역할 정의
const mockRoles: Role[] = [
  {
    id: "role-001",
    name: "관리자",
    code: "ADMIN",
    description: "시스템 전체 관리 권한을 가진 관리자 역할",
    permissions: permissionGroups.flatMap((g) => g.permissions.map((p) => p.code)),
    userCount: 3,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "role-002",
    name: "AI 엔지니어",
    code: "AI_ENGINEER",
    description: "AI 모델 개발 및 페르소나 관리 권한",
    permissions: [
      "persona:read", "persona:create", "persona:update", "persona:deploy", "persona:incubator",
      "insight:read", "insight:analyze", "insight:psychometric", "insight:archetype",
      "matching:simulate", "matching:tune", "matching:performance",
      "config:model",
    ],
    userCount: 8,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "role-003",
    name: "콘텐츠 매니저",
    code: "CONTENT_MANAGER",
    description: "페르소나 콘텐츠 관리 및 편집 권한",
    permissions: [
      "persona:read", "persona:create", "persona:update",
      "insight:read",
    ],
    userCount: 12,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "role-004",
    name: "분석가",
    code: "ANALYST",
    description: "데이터 조회 및 분석 권한 (읽기 전용)",
    permissions: [
      "persona:read",
      "insight:read", "insight:psychometric",
      "matching:performance",
      "ops:monitor",
    ],
    userCount: 15,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "role-005",
    name: "운영 담당자",
    code: "OPERATOR",
    description: "시스템 운영 및 모니터링 권한",
    permissions: [
      "persona:read",
      "system:deploy", "system:version", "system:events",
      "ops:monitor", "ops:incident", "ops:backup",
    ],
    userCount: 5,
    isSystem: false,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
]

export default function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>(mockRoles)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false)
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false)
  const [newRoleForm, setNewRoleForm] = useState({
    name: "",
    code: "",
    description: "",
    permissions: [] as string[],
  })

  const allPermissions = permissionGroups.flatMap((g) => g.permissions)

  const getPermissionCount = (role: Role) => {
    return `${role.permissions.length}/${allPermissions.length}`
  }

  const hasPermission = (role: Role, permissionCode: string) => {
    return role.permissions.includes(permissionCode)
  }

  const togglePermission = (permissionCode: string) => {
    if (newRoleForm.permissions.includes(permissionCode)) {
      setNewRoleForm({
        ...newRoleForm,
        permissions: newRoleForm.permissions.filter((p) => p !== permissionCode),
      })
    } else {
      setNewRoleForm({
        ...newRoleForm,
        permissions: [...newRoleForm.permissions, permissionCode],
      })
    }
  }

  const handleCreateRole = () => {
    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: newRoleForm.name,
      code: newRoleForm.code.toUpperCase().replace(/\s/g, "_"),
      description: newRoleForm.description,
      permissions: newRoleForm.permissions,
      userCount: 0,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setRoles([...roles, newRole])
    setIsCreateRoleDialogOpen(false)
    setNewRoleForm({ name: "", code: "", description: "", permissions: [] })
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setNewRoleForm({
      name: role.name,
      code: role.code,
      description: role.description,
      permissions: [...role.permissions],
    })
    setIsEditRoleDialogOpen(true)
  }

  const handleSaveRole = () => {
    if (selectedRole) {
      setRoles(roles.map((r) =>
        r.id === selectedRole.id
          ? {
              ...r,
              name: newRoleForm.name,
              description: newRoleForm.description,
              permissions: newRoleForm.permissions,
              updatedAt: new Date().toISOString(),
            }
          : r
      ))
      setIsEditRoleDialogOpen(false)
      setSelectedRole(null)
      setNewRoleForm({ name: "", code: "", description: "", permissions: [] })
    }
  }

  const handleDeleteRole = (roleId: string) => {
    setRoles(roles.filter((r) => r.id !== roleId))
  }

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">역할 권한 관리</h1>
          <p className="text-muted-foreground">
            역할 기반 접근 제어(RBAC) 설정
          </p>
        </div>
        <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 역할
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 역할 생성</DialogTitle>
              <DialogDescription>새로운 역할을 생성하고 권한을 할당합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>역할 이름</Label>
                  <Input
                    placeholder="예: 콘텐츠 편집자"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>역할 코드</Label>
                  <Input
                    placeholder="예: CONTENT_EDITOR"
                    value={newRoleForm.code}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, code: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>설명</Label>
                <Textarea
                  placeholder="역할에 대한 설명..."
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>권한 선택</Label>
                <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <Accordion type="multiple" className="w-full">
                    {permissionGroups.map((group) => (
                      <AccordionItem key={group.category} value={group.category}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            {group.icon}
                            <span>{group.category}</span>
                            <Badge variant="secondary" className="ml-2">
                              {group.permissions.filter((p) => newRoleForm.permissions.includes(p.code)).length}/
                              {group.permissions.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-6">
                            {group.permissions.map((permission) => (
                              <div key={permission.id} className="flex items-start gap-3 py-2">
                                <Checkbox
                                  id={permission.code}
                                  checked={newRoleForm.permissions.includes(permission.code)}
                                  onCheckedChange={() => togglePermission(permission.code)}
                                />
                                <div className="grid gap-0.5">
                                  <Label htmlFor={permission.code} className="font-medium cursor-pointer">
                                    {permission.name}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">{permission.description}</p>
                                  <code className="text-xs text-muted-foreground">{permission.code}</code>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateRoleDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleCreateRole}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">역할 목록</TabsTrigger>
          <TabsTrigger value="matrix">권한 매트릭스</TabsTrigger>
        </TabsList>

        {/* 역할 목록 탭 */}
        <TabsContent value="roles" className="space-y-4">
          {/* 검색 */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="역할 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* 역할 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        role.code === "ADMIN" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                        role.code === "AI_ENGINEER" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                        role.code === "CONTENT_MANAGER" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                        role.code === "ANALYST" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" :
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <code className="text-xs text-muted-foreground">{role.code}</code>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={role.isSystem && role.code === "ADMIN"}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRole(role)}>
                          <Edit className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          복제
                        </DropdownMenuItem>
                        {!role.isSystem && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{role.userCount}명</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span>{getPermissionCount(role)}</span>
                      </div>
                    </div>
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        시스템
                      </Badge>
                    )}
                  </div>

                  {/* 주요 권한 표시 */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">주요 권한</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 5).map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm.split(":")[0]}
                        </Badge>
                      ))}
                      {role.permissions.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{role.permissions.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 권한 매트릭스 탭 */}
        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>권한 매트릭스</CardTitle>
              <CardDescription>역할별 권한 현황을 한눈에 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">권한</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role.id} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{role.name}</span>
                          <code className="text-xs text-muted-foreground">{role.code}</code>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionGroups.map((group) => (
                    <>
                      <TableRow key={group.category} className="bg-muted/50">
                        <TableCell colSpan={roles.length + 1} className="font-medium">
                          <div className="flex items-center gap-2">
                            {group.icon}
                            {group.category}
                          </div>
                        </TableCell>
                      </TableRow>
                      {group.permissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="sticky left-0 bg-background">
                            <div>
                              <span className="text-sm">{permission.name}</span>
                              <code className="block text-xs text-muted-foreground">{permission.code}</code>
                            </div>
                          </TableCell>
                          {roles.map((role) => (
                            <TableCell key={`${role.id}-${permission.id}`} className="text-center">
                              {hasPermission(role, permission.code) ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 역할 수정 다이얼로그 */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>역할 수정</DialogTitle>
            <DialogDescription>역할 정보 및 권한을 수정합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>역할 이름</Label>
                <Input
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>역할 코드</Label>
                <Input value={newRoleForm.code} disabled />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>설명</Label>
              <Textarea
                value={newRoleForm.description}
                onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>권한 선택</Label>
              <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <Accordion type="multiple" className="w-full">
                  {permissionGroups.map((group) => (
                    <AccordionItem key={group.category} value={group.category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          {group.icon}
                          <span>{group.category}</span>
                          <Badge variant="secondary" className="ml-2">
                            {group.permissions.filter((p) => newRoleForm.permissions.includes(p.code)).length}/
                            {group.permissions.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-6">
                          {group.permissions.map((permission) => (
                            <div key={permission.id} className="flex items-start gap-3 py-2">
                              <Checkbox
                                id={`edit-${permission.code}`}
                                checked={newRoleForm.permissions.includes(permission.code)}
                                onCheckedChange={() => togglePermission(permission.code)}
                              />
                              <div className="grid gap-0.5">
                                <Label htmlFor={`edit-${permission.code}`} className="font-medium cursor-pointer">
                                  {permission.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRoleDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRole}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
