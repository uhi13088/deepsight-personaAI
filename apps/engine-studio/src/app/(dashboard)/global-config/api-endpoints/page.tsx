"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Play,
  RefreshCw,
  FileJson,
  Lock,
} from "lucide-react"
import { RATE_LIMIT_CONFIG, TIMEOUT_CONFIG } from "@/config/app.config"

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

// API endpoints - empty by default, will be loaded from API
const mockEndpoints: ApiEndpoint[] = []

// API keys - empty by default, will be loaded from API
const mockApiKeys: ApiKey[] = []

export default function ApiEndpointsPage() {
  const [endpoints] = useState<ApiEndpoint[]>(mockEndpoints)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)
  const [isCreateKeyDialogOpen, setIsCreateKeyDialogOpen] = useState(false)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [isEditKeyDialogOpen, setIsEditKeyDialogOpen] = useState(false)
  const [selectedKeyForEdit, setSelectedKeyForEdit] = useState<ApiKey | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)
  const [newKeyForm, setNewKeyForm] = useState({
    name: "",
    permissions: [] as string[],
    rateLimit: 100,
    expiresIn: "never",
  })
  // Initialize global settings from centralized app.config
  const [globalSettings, setGlobalSettings] = useState<{
    defaultRateLimit: number
    defaultTimeout: number
    corsEnabled: boolean
    ipWhitelist: boolean
    requestLogging: boolean
    allowedDomains: string
  }>({
    defaultRateLimit: RATE_LIMIT_CONFIG.maxRequests,
    defaultTimeout: TIMEOUT_CONFIG.apiRequest,
    corsEnabled: true,
    ipWhitelist: false,
    requestLogging: true,
    allowedDomains: "",
  })
  const [testForm, setTestForm] = useState({
    selectedApiKey: "",
    parameters: {} as Record<string, string>,
    requestBody: "{}",
    response: "",
    isLoading: false,
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)

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
        <Icon className="mr-1 h-3 w-3" />
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
    toast.success("클립보드에 복사되었습니다")
  }

  const handleCreateKey = () => {
    if (!newKeyForm.name.trim()) {
      toast.error("키 이름을 입력해주세요")
      return
    }
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
    toast.success("새 API 키가 생성되었습니다")
  }

  const handleRevokeKey = (keyId: string) => {
    setApiKeys(apiKeys.map((k) => (k.id === keyId ? { ...k, status: "revoked" as const } : k)))
    toast.success("API 키가 폐기되었습니다")
  }

  const handleEditKey = (key: ApiKey) => {
    setSelectedKeyForEdit(key)
    setIsEditKeyDialogOpen(true)
  }

  const handleSaveEditedKey = () => {
    if (selectedKeyForEdit) {
      setApiKeys(apiKeys.map((k) => (k.id === selectedKeyForEdit.id ? selectedKeyForEdit : k)))
      setIsEditKeyDialogOpen(false)
      setSelectedKeyForEdit(null)
      toast.success("API 키가 수정되었습니다")
    }
  }

  const handleOpenApiSpec = () => {
    // Open OpenAPI spec in new tab or download
    toast.info("OpenAPI 스펙을 다운로드합니다...")
    // Simulate download
    setTimeout(() => {
      toast.success("OpenAPI 스펙 파일이 준비되었습니다")
    }, 1000)
  }

  const handleSaveGlobalSettings = async () => {
    setIsSavingSettings(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("전역 API 설정이 저장되었습니다")
    } catch {
      toast.error("설정 저장 중 오류가 발생했습니다")
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleTestApiRequest = async () => {
    if (!selectedEndpoint) return

    setTestForm({ ...testForm, isLoading: true, response: "" })

    try {
      // Simulate API request
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: {
          success: true,
          message: "테스트 요청이 성공했습니다",
          endpoint: selectedEndpoint.path,
          method: selectedEndpoint.method,
          timestamp: new Date().toISOString(),
        },
      }

      setTestForm({
        ...testForm,
        isLoading: false,
        response: JSON.stringify(mockResponse, null, 2),
      })
      toast.success("API 테스트 요청이 완료되었습니다")
    } catch {
      setTestForm({
        ...testForm,
        isLoading: false,
        response: JSON.stringify({ error: "요청 실패" }, null, 2),
      })
      toast.error("API 테스트 요청이 실패했습니다")
    }
  }

  const handleTestDialogClose = (open: boolean) => {
    setIsTestDialogOpen(open)
    if (!open) {
      setTestForm({
        selectedApiKey: apiKeys.find((k) => k.status === "active")?.id || "",
        parameters: {},
        requestBody: "{}",
        response: "",
        isLoading: false,
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API 엔드포인트</h1>
          <p className="text-muted-foreground">API 엔드포인트 관리 및 키 설정</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenApiSpec}>
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
            <div className="relative max-w-sm flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
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
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
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
              {filteredEndpoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileJson className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">등록된 엔드포인트가 없습니다</h3>
                  <p className="text-muted-foreground text-sm">
                    API 엔드포인트가 등록되면 여기에 표시됩니다.
                  </p>
                </div>
              ) : (
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
                        <div className="hover:bg-muted/50 flex cursor-pointer items-center justify-between p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {expandedEndpoint === endpoint.id ? (
                                <ChevronDown className="text-muted-foreground h-4 w-4" />
                              ) : (
                                <ChevronRight className="text-muted-foreground h-4 w-4" />
                              )}
                              {getMethodBadge(endpoint.method)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <code className="font-mono text-sm">{endpoint.path}</code>
                                {getStatusBadge(endpoint.status)}
                                {endpoint.requiresAuth && (
                                  <Lock className="text-muted-foreground h-3 w-3" />
                                )}
                              </div>
                              <p className="text-muted-foreground text-sm">{endpoint.name}</p>
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
                        <div className="bg-muted/30 space-y-4 border-t p-4">
                          <p className="text-sm">{endpoint.description}</p>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <Label className="text-muted-foreground text-xs">Rate Limit</Label>
                              <p>{endpoint.rateLimit} req/min</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-xs">Timeout</Label>
                              <p>{endpoint.timeout / 1000}s</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-xs">Error Rate</Label>
                              <p className={endpoint.errorRate > 0.05 ? "text-red-600" : ""}>
                                {(endpoint.errorRate * 100).toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-xs">Version</Label>
                              <p>{endpoint.version}</p>
                            </div>
                          </div>

                          {endpoint.parameters.length > 0 && (
                            <div>
                              <Label className="text-muted-foreground mb-2 block text-xs">
                                Parameters
                              </Label>
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
                                      <TableCell className="font-mono text-xs">
                                        {param.name}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          {param.type}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {param.required ? (
                                          <Badge className="bg-red-100 text-xs text-red-800">
                                            Required
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">
                                            Optional
                                          </span>
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
                            <Label className="text-muted-foreground mb-2 block text-xs">
                              Responses
                            </Label>
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
              )}
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
                      <Plus className="mr-2 h-4 w-4" />새 API 키
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
                          {[
                            "read:personas",
                            "write:personas",
                            "read:matching",
                            "write:matching",
                            "read:insights",
                            "write:insights",
                          ].map((perm) => (
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
                          ))}
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
              {apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Lock className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-medium">등록된 API 키가 없습니다</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    새 API 키를 생성하여 API에 접근하세요.
                  </p>
                  <Button onClick={() => setIsCreateKeyDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />새 API 키
                  </Button>
                </div>
              ) : (
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
                            <code className="bg-muted rounded px-2 py-1 text-xs">{key.key}</code>
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
                        <TableCell className="text-muted-foreground text-sm">
                          {key.lastUsed ? new Date(key.lastUsed).toLocaleString("ko-KR") : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
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
                                <Copy className="mr-2 h-4 w-4" />키 복사
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditKey(key)}>
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
              )}
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
                  <Input
                    type="number"
                    value={globalSettings.defaultRateLimit}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        defaultRateLimit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-muted-foreground text-xs">분당 최대 요청 수</p>
                </div>
                <div className="space-y-2">
                  <Label>기본 Timeout</Label>
                  <Input
                    type="number"
                    value={globalSettings.defaultTimeout}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        defaultTimeout: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-muted-foreground text-xs">밀리초 단위</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">보안 설정</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>CORS 활성화</Label>
                      <p className="text-muted-foreground text-sm">Cross-Origin 요청 허용</p>
                    </div>
                    <Switch
                      checked={globalSettings.corsEnabled}
                      onCheckedChange={(checked) => {
                        setGlobalSettings({ ...globalSettings, corsEnabled: checked })
                        toast.success(
                          checked ? "CORS가 활성화되었습니다" : "CORS가 비활성화되었습니다"
                        )
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>IP 화이트리스트</Label>
                      <p className="text-muted-foreground text-sm">특정 IP만 API 접근 허용</p>
                    </div>
                    <Switch
                      checked={globalSettings.ipWhitelist}
                      onCheckedChange={(checked) => {
                        setGlobalSettings({ ...globalSettings, ipWhitelist: checked })
                        toast.success(
                          checked
                            ? "IP 화이트리스트가 활성화되었습니다"
                            : "IP 화이트리스트가 비활성화되었습니다"
                        )
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>요청 로깅</Label>
                      <p className="text-muted-foreground text-sm">모든 API 요청 기록</p>
                    </div>
                    <Switch
                      checked={globalSettings.requestLogging}
                      onCheckedChange={(checked) => {
                        setGlobalSettings({ ...globalSettings, requestLogging: checked })
                        toast.success(
                          checked
                            ? "요청 로깅이 활성화되었습니다"
                            : "요청 로깅이 비활성화되었습니다"
                        )
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>허용 도메인 (CORS)</Label>
                <Textarea
                  placeholder="https://example.com&#10;https://app.example.com"
                  rows={3}
                  value={globalSettings.allowedDomains}
                  onChange={(e) =>
                    setGlobalSettings({ ...globalSettings, allowedDomains: e.target.value })
                  }
                />
                <p className="text-muted-foreground text-xs">한 줄에 하나의 도메인 입력</p>
              </div>

              <Button onClick={handleSaveGlobalSettings} disabled={isSavingSettings}>
                {isSavingSettings ? "저장 중..." : "설정 저장"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 테스트 다이얼로그 */}
      <Dialog open={isTestDialogOpen} onOpenChange={handleTestDialogClose}>
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
                <Select
                  value={testForm.selectedApiKey}
                  onValueChange={(value) => setTestForm({ ...testForm, selectedApiKey: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="API 키 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiKeys
                      .filter((k) => k.status === "active")
                      .map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEndpoint.parameters.length > 0 && (
                <div className="space-y-2">
                  <Label>Parameters</Label>
                  {selectedEndpoint.parameters.map((param) => (
                    <div key={param.name} className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-sm">
                        {param.name}
                        {param.required && <span className="ml-1 text-red-500">*</span>}
                      </Label>
                      <Input
                        className="col-span-2"
                        placeholder={param.description}
                        value={testForm.parameters[param.name] || ""}
                        onChange={(e) =>
                          setTestForm({
                            ...testForm,
                            parameters: { ...testForm.parameters, [param.name]: e.target.value },
                          })
                        }
                      />
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
                    value={testForm.requestBody}
                    onChange={(e) => setTestForm({ ...testForm, requestBody: e.target.value })}
                  />
                </div>
              )}

              <div className="bg-muted rounded p-3">
                <Label className="text-muted-foreground mb-2 block text-xs">Response</Label>
                <pre className="text-muted-foreground max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs">
                  {testForm.response || "응답이 여기에 표시됩니다..."}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleTestDialogClose(false)}>
              닫기
            </Button>
            <Button onClick={handleTestApiRequest} disabled={testForm.isLoading}>
              {testForm.isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  요청 중...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  요청 전송
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API 키 수정 다이얼로그 */}
      <Dialog open={isEditKeyDialogOpen} onOpenChange={setIsEditKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API 키 수정</DialogTitle>
            <DialogDescription>API 키 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          {selectedKeyForEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>키 이름</Label>
                <Input
                  value={selectedKeyForEdit.name}
                  onChange={(e) =>
                    setSelectedKeyForEdit({ ...selectedKeyForEdit, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Rate Limit (requests/min)</Label>
                <Input
                  type="number"
                  value={selectedKeyForEdit.rateLimit}
                  onChange={(e) =>
                    setSelectedKeyForEdit({
                      ...selectedKeyForEdit,
                      rateLimit: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>권한</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "read:personas",
                    "write:personas",
                    "read:matching",
                    "write:matching",
                    "read:insights",
                    "write:insights",
                  ].map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edit-${perm}`}
                        checked={selectedKeyForEdit.permissions.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedKeyForEdit({
                              ...selectedKeyForEdit,
                              permissions: [...selectedKeyForEdit.permissions, perm],
                            })
                          } else {
                            setSelectedKeyForEdit({
                              ...selectedKeyForEdit,
                              permissions: selectedKeyForEdit.permissions.filter((p) => p !== perm),
                            })
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`edit-${perm}`} className="text-sm font-normal">
                        {perm}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditKeyDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveEditedKey}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
