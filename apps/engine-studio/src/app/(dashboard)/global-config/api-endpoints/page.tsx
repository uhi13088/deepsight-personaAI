"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileJson,
  Lock,
  Loader2,
} from "lucide-react"

// 타입 정의
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
type EndpointStatus = "active" | "deprecated" | "disabled"

interface ApiEndpoint {
  id: string
  path: string
  method: HttpMethod
  name: string
  description: string | null
  version: string
  status: EndpointStatus
  category: string
  requiresAuth: boolean
  rateLimit: number
  timeout: number
  createdAt: string
  updatedAt: string
}

interface GlobalApiSettings {
  defaultRateLimit: number
  defaultTimeout: number
  corsEnabled: boolean
  ipWhitelist: boolean
  requestLogging: boolean
  allowedDomains: string
}

export default function ApiEndpointsPage() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpoint | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false)

  // 설정 탭 상태
  const [globalSettings, setGlobalSettings] = useState<GlobalApiSettings>({
    defaultRateLimit: 100,
    defaultTimeout: 30000,
    corsEnabled: true,
    ipWhitelist: false,
    requestLogging: true,
    allowedDomains: "",
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // 엔드포인트 목록 조회
  const fetchEndpoints = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (filterCategory !== "all") params.set("category", filterCategory)
      if (filterStatus !== "all") params.set("status", filterStatus)
      if (searchQuery) params.set("search", searchQuery)

      const res = await fetch(`/api/api-endpoints?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setEndpoints(json.data)
        setCategories(json.categories)
      } else {
        toast.error(json.error?.message || "엔드포인트 조회 실패")
      }
    } catch {
      toast.error("엔드포인트 목록을 불러올 수 없습니다")
    } finally {
      setIsLoading(false)
    }
  }, [filterCategory, filterStatus, searchQuery])

  // 설정 로드
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoadingSettings(true)
      const res = await fetch("/api/system-config?category=API")
      const json = await res.json()

      if (json.success && json.data.API) {
        const apiConfigs = json.data.API as { key: string; value: unknown }[]
        const settings: Partial<GlobalApiSettings> = {}

        for (const config of apiConfigs) {
          switch (config.key) {
            case "defaultRateLimit":
              settings.defaultRateLimit = config.value as number
              break
            case "defaultTimeout":
              settings.defaultTimeout = config.value as number
              break
            case "corsEnabled":
              settings.corsEnabled = config.value as boolean
              break
            case "ipWhitelist":
              settings.ipWhitelist = config.value as boolean
              break
            case "requestLogging":
              settings.requestLogging = config.value as boolean
              break
            case "allowedDomains":
              settings.allowedDomains = config.value as string
              break
          }
        }

        setGlobalSettings((prev) => ({ ...prev, ...settings }))
      }
    } catch {
      // 설정이 없으면 기본값 사용
    } finally {
      setIsLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    fetchEndpoints()
  }, [fetchEndpoints])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

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

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch =
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // 엔드포인트 상태 변경
  const handleStatusChange = async (endpointId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/api-endpoints/${endpointId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus.toUpperCase() }),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(`엔드포인트 상태가 ${newStatus}로 변경되었습니다`)
        fetchEndpoints()
      } else {
        toast.error(json.error?.message || "상태 변경 실패")
      }
    } catch {
      toast.error("상태 변경에 실패했습니다")
    }
  }

  // 엔드포인트 설정 수정
  const handleEditEndpoint = (endpoint: ApiEndpoint) => {
    setEditingEndpoint({ ...endpoint })
    setIsEditDialogOpen(true)
  }

  const handleSaveEndpoint = async () => {
    if (!editingEndpoint) return

    setIsSavingEndpoint(true)
    try {
      const res = await fetch(`/api/api-endpoints/${editingEndpoint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingEndpoint.name,
          description: editingEndpoint.description,
          rateLimit: editingEndpoint.rateLimit,
          timeout: editingEndpoint.timeout,
          requiresAuth: editingEndpoint.requiresAuth,
        }),
      })
      const json = await res.json()

      if (json.success) {
        toast.success("엔드포인트 설정이 저장되었습니다")
        setIsEditDialogOpen(false)
        setEditingEndpoint(null)
        fetchEndpoints()
      } else {
        toast.error(json.error?.message || "저장 실패")
      }
    } catch {
      toast.error("엔드포인트 설정 저장에 실패했습니다")
    } finally {
      setIsSavingEndpoint(false)
    }
  }

  // 전역 설정 저장
  const handleSaveGlobalSettings = async () => {
    setIsSavingSettings(true)
    try {
      const entries = [
        {
          key: "defaultRateLimit",
          value: globalSettings.defaultRateLimit,
          description: "기본 Rate Limit (req/min)",
        },
        {
          key: "defaultTimeout",
          value: globalSettings.defaultTimeout,
          description: "기본 Timeout (ms)",
        },
        { key: "corsEnabled", value: globalSettings.corsEnabled, description: "CORS 활성화 여부" },
        {
          key: "ipWhitelist",
          value: globalSettings.ipWhitelist,
          description: "IP 화이트리스트 활성화",
        },
        {
          key: "requestLogging",
          value: globalSettings.requestLogging,
          description: "요청 로깅 활성화",
        },
        {
          key: "allowedDomains",
          value: globalSettings.allowedDomains,
          description: "CORS 허용 도메인",
        },
      ]

      for (const entry of entries) {
        const res = await fetch("/api/system-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "API", ...entry }),
        })
        const json = await res.json()
        if (!json.success) {
          throw new Error(json.error?.message || "설정 저장 실패")
        }
      }

      toast.success("전역 API 설정이 저장되었습니다")
    } catch (error) {
      const message = error instanceof Error ? error.message : "설정 저장 중 오류가 발생했습니다"
      toast.error(message)
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API 엔드포인트</h1>
          <p className="text-muted-foreground">외부 API 엔드포인트 상태 관리 및 전역 정책 설정</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchEndpoints()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("OpenAPI 스펙을 준비합니다...")}
          >
            <FileJson className="mr-2 h-4 w-4" />
            OpenAPI 스펙
          </Button>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">엔드포인트</TabsTrigger>
          <TabsTrigger value="settings">전역 설정</TabsTrigger>
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
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              ) : filteredEndpoints.length === 0 ? (
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
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {endpoint.version}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditEndpoint(endpoint)}>
                                  설정 수정
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {endpoint.status !== "active" && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(endpoint.id, "ACTIVE")}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                    Active로 변경
                                  </DropdownMenuItem>
                                )}
                                {endpoint.status !== "deprecated" && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(endpoint.id, "DEPRECATED")}
                                  >
                                    <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                                    Deprecated로 변경
                                  </DropdownMenuItem>
                                )}
                                {endpoint.status !== "disabled" && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(endpoint.id, "DISABLED")}
                                  >
                                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                    Disabled로 변경
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="bg-muted/30 space-y-3 border-t p-4">
                          {endpoint.description && (
                            <p className="text-sm">{endpoint.description}</p>
                          )}
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
                              <Label className="text-muted-foreground text-xs">카테고리</Label>
                              <p>{endpoint.category}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-xs">인증 필요</Label>
                              <p>{endpoint.requiresAuth ? "예" : "아니오"}</p>
                            </div>
                          </div>
                          <div className="text-muted-foreground text-xs">
                            마지막 수정: {new Date(endpoint.updatedAt).toLocaleString("ko-KR")}
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

        {/* 전역 설정 탭 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>전역 API 설정</CardTitle>
              <CardDescription>모든 API 엔드포인트에 적용되는 기본 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
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
                          onCheckedChange={(checked) =>
                            setGlobalSettings({ ...globalSettings, corsEnabled: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>IP 화이트리스트</Label>
                          <p className="text-muted-foreground text-sm">특정 IP만 API 접근 허용</p>
                        </div>
                        <Switch
                          checked={globalSettings.ipWhitelist}
                          onCheckedChange={(checked) =>
                            setGlobalSettings({ ...globalSettings, ipWhitelist: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>요청 로깅</Label>
                          <p className="text-muted-foreground text-sm">모든 API 요청 기록</p>
                        </div>
                        <Switch
                          checked={globalSettings.requestLogging}
                          onCheckedChange={(checked) =>
                            setGlobalSettings({ ...globalSettings, requestLogging: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>허용 도메인 (CORS)</Label>
                    <Textarea
                      placeholder={"https://example.com\nhttps://app.example.com"}
                      rows={3}
                      value={globalSettings.allowedDomains}
                      onChange={(e) =>
                        setGlobalSettings({ ...globalSettings, allowedDomains: e.target.value })
                      }
                    />
                    <p className="text-muted-foreground text-xs">한 줄에 하나의 도메인 입력</p>
                  </div>

                  <Button onClick={handleSaveGlobalSettings} disabled={isSavingSettings}>
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      "설정 저장"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 엔드포인트 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>엔드포인트 설정 수정</DialogTitle>
            <DialogDescription>
              {editingEndpoint && (
                <span className="font-mono">
                  {editingEndpoint.method} {editingEndpoint.path}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {editingEndpoint && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>이름</Label>
                <Input
                  value={editingEndpoint.name}
                  onChange={(e) => setEditingEndpoint({ ...editingEndpoint, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>설명</Label>
                <Textarea
                  value={editingEndpoint.description || ""}
                  onChange={(e) =>
                    setEditingEndpoint({ ...editingEndpoint, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Rate Limit (req/min)</Label>
                  <Input
                    type="number"
                    value={editingEndpoint.rateLimit}
                    onChange={(e) =>
                      setEditingEndpoint({
                        ...editingEndpoint,
                        rateLimit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={editingEndpoint.timeout}
                    onChange={(e) =>
                      setEditingEndpoint({
                        ...editingEndpoint,
                        timeout: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingEndpoint.requiresAuth}
                  onCheckedChange={(checked) =>
                    setEditingEndpoint({ ...editingEndpoint, requiresAuth: checked })
                  }
                />
                <Label>인증 필요</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveEndpoint} disabled={isSavingEndpoint}>
              {isSavingEndpoint ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
