"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Globe,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  Key,
  Link,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Play,
  RefreshCw,
  Settings,
  Code,
  FileJson,
  Lock,
  Unlock,
} from "lucide-react"

// 타입 정의
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
type EndpointStatus = "active" | "deprecated" | "disabled"

interface ApiEndpoint {
  id: string
  path: string
  method: HttpMethod
  name: string
  description: string
  version: string
  status: EndpointStatus
  category: string
  requiresAuth: boolean
  rateLimit: number
  timeout: number
  lastCalled?: string
  callCount: number
  avgResponseTime: number
  errorRate: number
  parameters: {
    name: string
    type: string
    required: boolean
    description: string
  }[]
  responses: {
    code: number
    description: string
  }[]
}

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed?: string
  expiresAt?: string
  permissions: string[]
  rateLimit: number
  status: "active" | "revoked" | "expired"
}

// 목 데이터
const mockEndpoints: ApiEndpoint[] = [
  {
    id: "ep-001",
    path: "/api/v1/personas",
    method: "GET",
    name: "List Personas",
    description: "페르소나 목록을 조회합니다. 페이지네이션 및 필터링을 지원합니다.",
    version: "v1",
    status: "active",
    category: "Persona",
    requiresAuth: true,
    rateLimit: 100,
    timeout: 30000,
    lastCalled: "2024-01-15T10:30:00Z",
    callCount: 45892,
    avgResponseTime: 120,
    errorRate: 0.02,
    parameters: [
      { name: "page", type: "integer", required: false, description: "페이지 번호 (기본값: 1)" },
      { name: "limit", type: "integer", required: false, description: "페이지당 항목 수 (기본값: 20, 최대: 100)" },
      { name: "status", type: "string", required: false, description: "상태 필터 (active, inactive, draft)" },
    ],
    responses: [
      { code: 200, description: "성공" },
      { code: 401, description: "인증 실패" },
      { code: 429, description: "요청 한도 초과" },
    ],
  },
  {
    id: "ep-002",
    path: "/api/v1/personas",
    method: "POST",
    name: "Create Persona",
    description: "새로운 페르소나를 생성합니다.",
    version: "v1",
    status: "active",
    category: "Persona",
    requiresAuth: true,
    rateLimit: 50,
    timeout: 60000,
    lastCalled: "2024-01-15T10:25:00Z",
    callCount: 12456,
    avgResponseTime: 350,
    errorRate: 0.05,
    parameters: [
      { name: "name", type: "string", required: true, description: "페르소나 이름" },
      { name: "description", type: "string", required: false, description: "페르소나 설명" },
      { name: "vector", type: "object", required: true, description: "6D 벡터 값" },
    ],
    responses: [
      { code: 201, description: "생성 성공" },
      { code: 400, description: "잘못된 요청" },
      { code: 401, description: "인증 실패" },
    ],
  },
  {
    id: "ep-003",
    path: "/api/v1/personas/{id}",
    method: "GET",
    name: "Get Persona",
    description: "특정 페르소나의 상세 정보를 조회합니다.",
    version: "v1",
    status: "active",
    category: "Persona",
    requiresAuth: true,
    rateLimit: 100,
    timeout: 30000,
    lastCalled: "2024-01-15T10:28:00Z",
    callCount: 89234,
    avgResponseTime: 85,
    errorRate: 0.01,
    parameters: [
      { name: "id", type: "string", required: true, description: "페르소나 ID" },
    ],
    responses: [
      { code: 200, description: "성공" },
      { code: 404, description: "페르소나를 찾을 수 없음" },
    ],
  },
  {
    id: "ep-004",
    path: "/api/v1/matching/compute",
    method: "POST",
    name: "Compute Match",
    description: "사용자와 페르소나 간의 매칭 점수를 계산합니다.",
    version: "v1",
    status: "active",
    category: "Matching",
    requiresAuth: true,
    rateLimit: 30,
    timeout: 120000,
    lastCalled: "2024-01-15T10:29:00Z",
    callCount: 234567,
    avgResponseTime: 450,
    errorRate: 0.03,
    parameters: [
      { name: "userId", type: "string", required: true, description: "사용자 ID" },
      { name: "personaIds", type: "array", required: true, description: "매칭할 페르소나 ID 목록" },
      { name: "algorithm", type: "string", required: false, description: "매칭 알고리즘 (cosine, euclidean)" },
    ],
    responses: [
      { code: 200, description: "매칭 결과" },
      { code: 400, description: "잘못된 요청" },
    ],
  },
  {
    id: "ep-005",
    path: "/api/v1/insights/analyze",
    method: "POST",
    name: "Analyze User",
    description: "사용자 데이터를 분석하여 인사이트를 생성합니다.",
    version: "v1",
    status: "active",
    category: "Insight",
    requiresAuth: true,
    rateLimit: 20,
    timeout: 180000,
    lastCalled: "2024-01-15T10:15:00Z",
    callCount: 45678,
    avgResponseTime: 1200,
    errorRate: 0.08,
    parameters: [
      { name: "userId", type: "string", required: true, description: "분석할 사용자 ID" },
      { name: "dataTypes", type: "array", required: false, description: "분석할 데이터 유형" },
    ],
    responses: [
      { code: 200, description: "분석 결과" },
      { code: 202, description: "비동기 처리 시작" },
    ],
  },
  {
    id: "ep-006",
    path: "/api/v0/personas",
    method: "GET",
    name: "List Personas (Legacy)",
    description: "[Deprecated] v1 API를 사용하세요.",
    version: "v0",
    status: "deprecated",
    category: "Persona",
    requiresAuth: true,
    rateLimit: 50,
    timeout: 30000,
    callCount: 1234,
    avgResponseTime: 200,
    errorRate: 0.1,
    parameters: [],
    responses: [
      { code: 200, description: "성공" },
    ],
  },
]

const mockApiKeys: ApiKey[] = [
  {
    id: "key-001",
    name: "Production API Key",
    key: "sk-prod-xxxxxxxxxxxxxxxxxxxx",
    createdAt: "2024-01-01T00:00:00Z",
    lastUsed: "2024-01-15T10:30:00Z",
    permissions: ["read:personas", "write:personas", "read:matching", "write:matching"],
    rateLimit: 1000,
    status: "active",
  },
  {
    id: "key-002",
    name: "Development API Key",
    key: "sk-dev-xxxxxxxxxxxxxxxxxxxx",
    createdAt: "2024-01-05T00:00:00Z",
    lastUsed: "2024-01-15T09:00:00Z",
    permissions: ["read:personas", "read:matching"],
    rateLimit: 100,
    status: "active",
  },
  {
    id: "key-003",
    name: "Test API Key",
    key: "sk-test-xxxxxxxxxxxxxxxxxxxx",
    createdAt: "2023-12-01T00:00:00Z",
    expiresAt: "2024-01-01T00:00:00Z",
    permissions: ["read:personas"],
    rateLimit: 10,
    status: "expired",
  },
]

export default function ApiEndpointsPage() {
  const [endpoints] = useState<ApiEndpoint[]>(mockEndpoints)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)
  const [isCreateKeyDialogOpen, setIsCreateKeyDialogOpen] = useState(false)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)
  const [newKeyForm, setNewKeyForm] = useState({
    name: "",
    permissions: [] as string[],
    rateLimit: 100,
    expiresIn: "never",
  })

  const categories = [...new Set(endpoints.map((e) => e.category))]

  const getMethodBadge = (method: HttpMethod) => {
    const colors: Record<HttpMethod, string> = {
      GET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
    return <Badge className={`${colors[method]} font-mono text-xs`}>{method}</Badge>
  }

  const getStatusBadge = (status: EndpointStatus) => {
    const config = {
      active: { icon: CheckCircle2, className: "text-green-600", label: "Active" },
      deprecated: { icon: AlertTriangle, className: "text-yellow-600", label: "Deprecated" },
      disabled: { icon: XCircle, className: "text-red-600", label: "Disabled" },
    }
    const Icon = config[status].icon
    return (
      <Badge variant="outline" className={config[status].className}>
        <Icon className="h-3 w-3 mr-1" />
        {config[status].label}
      </Badge>
    )
  }

  const getKeyStatusBadge = (status: ApiKey["status"]) => {
    const config = {
      active: { className: "bg-green-100 text-green-800", label: "활성" },
      revoked: { className: "bg-red-100 text-red-800", label: "폐기됨" },
      expired: { className: "bg-gray-100 text-gray-800", label: "만료됨" },
    }
    return <Badge className={config[status].className}>{config[status].label}</Badge>
  }

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch =
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "all" || ep.category === filterCategory
    const matchesStatus = filterStatus === "all" || ep.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleCreateKey = () => {
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyForm.name,
      key: `sk-${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString(),
      permissions: newKeyForm.permissions,
      rateLimit: newKeyForm.rateLimit,
      status: "active",
    }
    setApiKeys([newKey, ...apiKeys])
    setIsCreateKeyDialogOpen(false)
    setNewKeyForm({ name: "", permissions: [], rateLimit: 100, expiresIn: "never" })
  }

  const handleRevokeKey = (keyId: string) => {
    setApiKeys(apiKeys.map((k) => (k.id === keyId ? { ...k, status: "revoked" as const } : k)))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API 엔드포인트</h1>
          <p className="text-muted-foreground">
            API 엔드포인트 관리 및 키 설정
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileJson className="mr-2 h-4 w-4" />
            OpenAPI 스펙
          </Button>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">엔드포인트</TabsTrigger>
          <TabsTrigger value="keys">API 키</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        {/* 엔드포인트 탭 */}
        <TabsContent value="endpoints" className="space-y-4">
          {/* 필터 */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="엔드포인트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 엔드포인트 목록 */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredEndpoints.map((endpoint) => (
                  <Collapsible
                    key={endpoint.id}
                    open={expandedEndpoint === endpoint.id}
                    onOpenChange={() =>
                      setExpandedEndpoint(expandedEndpoint === endpoint.id ? null : endpoint.id)
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {expandedEndpoint === endpoint.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            {getMethodBadge(endpoint.method)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-sm">{endpoint.path}</code>
                              {getStatusBadge(endpoint.status)}
                              {endpoint.requiresAuth && (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{endpoint.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">
                              {endpoint.callCount.toLocaleString()} calls
                            </p>
                            <p className="text-muted-foreground">
                              avg {endpoint.avgResponseTime}ms
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEndpoint(endpoint)
                              setIsTestDialogOpen(true)
                            }}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            테스트
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 p-4 space-y-4">
                        <p className="text-sm">{endpoint.description}</p>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Rate Limit</Label>
                            <p>{endpoint.rateLimit} req/min</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Timeout</Label>
                            <p>{endpoint.timeout / 1000}s</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Error Rate</Label>
                            <p className={endpoint.errorRate > 0.05 ? "text-red-600" : ""}>
                              {(endpoint.errorRate * 100).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Version</Label>
                            <p>{endpoint.version}</p>
                          </div>
                        </div>

                        {endpoint.parameters.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Parameters</Label>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Required</TableHead>
                                  <TableHead>Description</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {endpoint.parameters.map((param) => (
                                  <TableRow key={param.name}>
                                    <TableCell className="font-mono text-xs">{param.name}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">{param.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      {param.required ? (
                                        <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">Optional</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm">{param.description}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Responses</Label>
                          <div className="flex gap-2">
                            {endpoint.responses.map((res) => (
                              <Badge
                                key={res.code}
                                variant="outline"
                                className={
                                  res.code < 300
                                    ? "border-green-500 text-green-700"
                                    : res.code < 500
                                    ? "border-yellow-500 text-yellow-700"
                                    : "border-red-500 text-red-700"
                                }
                              >
                                {res.code}: {res.description}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API 키 탭 */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API 키</CardTitle>
                  <CardDescription>API 인증 키 관리</CardDescription>
                </div>
                <Dialog open={isCreateKeyDialogOpen} onOpenChange={setIsCreateKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      새 API 키
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 API 키 생성</DialogTitle>
                      <DialogDescription>새로운 API 키를 생성합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>키 이름</Label>
                        <Input
                          placeholder="Production API Key"
                          value={newKeyForm.name}
                          onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Rate Limit (requests/min)</Label>
                        <Input
                          type="number"
                          value={newKeyForm.rateLimit}
                          onChange={(e) =>
                            setNewKeyForm({ ...newKeyForm, rateLimit: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>만료 기간</Label>
                        <Select
                          value={newKeyForm.expiresIn}
                          onValueChange={(v) => setNewKeyForm({ ...newKeyForm, expiresIn: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">만료 없음</SelectItem>
                            <SelectItem value="30d">30일</SelectItem>
                            <SelectItem value="90d">90일</SelectItem>
                            <SelectItem value="1y">1년</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>권한</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {["read:personas", "write:personas", "read:matching", "write:matching", "read:insights", "write:insights"].map(
                            (perm) => (
                              <div key={perm} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={perm}
                                  checked={newKeyForm.permissions.includes(perm)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewKeyForm({
                                        ...newKeyForm,
                                        permissions: [...newKeyForm.permissions, perm],
                                      })
                                    } else {
                                      setNewKeyForm({
                                        ...newKeyForm,
                                        permissions: newKeyForm.permissions.filter((p) => p !== perm),
                                      })
                                    }
                                  }}
                                  className="rounded"
                                />
                                <Label htmlFor={perm} className="text-sm font-normal">
                                  {perm}
                                </Label>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateKeyDialogOpen(false)}>
                        취소
                      </Button>
                      <Button onClick={handleCreateKey}>생성</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>키</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>마지막 사용</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{key.key}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(key.key)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getKeyStatusBadge(key.status)}</TableCell>
                      <TableCell>{key.rateLimit}/min</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.lastUsed ? new Date(key.lastUsed).toLocaleString("ko-KR") : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(key.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(key.key)}>
                              <Copy className="mr-2 h-4 w-4" />
                              키 복사
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {key.status === "active" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRevokeKey(key.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                폐기
                              </DropdownMenuItem>
                            )}
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

        {/* 설정 탭 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>전역 API 설정</CardTitle>
              <CardDescription>모든 API 엔드포인트에 적용되는 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>기본 Rate Limit</Label>
                  <Input type="number" defaultValue={100} />
                  <p className="text-xs text-muted-foreground">분당 최대 요청 수</p>
                </div>
                <div className="space-y-2">
                  <Label>기본 Timeout</Label>
                  <Input type="number" defaultValue={30000} />
                  <p className="text-xs text-muted-foreground">밀리초 단위</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">보안 설정</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>CORS 활성화</Label>
                      <p className="text-sm text-muted-foreground">Cross-Origin 요청 허용</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>IP 화이트리스트</Label>
                      <p className="text-sm text-muted-foreground">특정 IP만 API 접근 허용</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>요청 로깅</Label>
                      <p className="text-sm text-muted-foreground">모든 API 요청 기록</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>허용 도메인 (CORS)</Label>
                <Textarea placeholder="https://example.com&#10;https://app.example.com" rows={3} />
                <p className="text-xs text-muted-foreground">한 줄에 하나의 도메인 입력</p>
              </div>

              <Button>설정 저장</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 테스트 다이얼로그 */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>API 테스트</DialogTitle>
            <DialogDescription>
              {selectedEndpoint && (
                <span className="font-mono">
                  {selectedEndpoint.method} {selectedEndpoint.path}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedEndpoint && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Select defaultValue={apiKeys[0]?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="API 키 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiKeys
                      .filter((k) => k.status === "active")
                      .map((k) => (
                        <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEndpoint.parameters.length > 0 && (
                <div className="space-y-2">
                  <Label>Parameters</Label>
                  {selectedEndpoint.parameters.map((param) => (
                    <div key={param.name} className="grid grid-cols-3 gap-2 items-center">
                      <Label className="text-sm">
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input className="col-span-2" placeholder={param.description} />
                    </div>
                  ))}
                </div>
              )}

              {selectedEndpoint.method !== "GET" && (
                <div className="space-y-2">
                  <Label>Request Body (JSON)</Label>
                  <Textarea
                    className="font-mono text-sm"
                    rows={6}
                    placeholder="{}"
                  />
                </div>
              )}

              <div className="rounded bg-muted p-3">
                <Label className="text-xs text-muted-foreground mb-2 block">Response</Label>
                <pre className="text-xs font-mono text-muted-foreground">
                  응답이 여기에 표시됩니다...
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              닫기
            </Button>
            <Button>
              <Play className="mr-2 h-4 w-4" />
              요청 전송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
