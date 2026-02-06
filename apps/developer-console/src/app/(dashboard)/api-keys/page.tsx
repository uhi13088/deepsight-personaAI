"use client"

import * as React from "react"
import Link from "next/link"
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Activity,
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Shield,
  Search,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn, formatNumber, formatRelativeTime, maskApiKey } from "@/lib/utils"
import { toast } from "sonner"
import { apiKeysService, type ApiKey } from "@/services/api-keys-service"

export default function ApiKeysPage() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([])
  const [showKey, setShowKey] = React.useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = React.useState("")
  const [environmentFilter, setEnvironmentFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [rotateDialogOpen, setRotateDialogOpen] = React.useState(false)
  const [rotateResultDialogOpen, setRotateResultDialogOpen] = React.useState(false)
  const [selectedKey, setSelectedKey] = React.useState<ApiKey | null>(null)
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isRotating, setIsRotating] = React.useState(false)
  const [newRotatedKey, setNewRotatedKey] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const data = await apiKeysService.getKeys()
        setApiKeys(data.apiKeys)
      } catch (error) {
        console.error("Failed to fetch API keys:", error)
        toast.error("API 키 목록을 불러오는데 실패했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchApiKeys()
  }, [])

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const copyToClipboard = async (key: string, keyId: string) => {
    await navigator.clipboard.writeText(key)
    setCopiedKey(keyId)
    toast.success("API 키가 복사되었습니다.")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleRevokeKey = async () => {
    if (!selectedKey) return
    setIsDeleting(true)
    try {
      await apiKeysService.revokeKey(selectedKey.id)
      setApiKeys((prev) => prev.filter((k) => k.id !== selectedKey.id))
      toast.success("API 키가 폐기되었습니다.")
      setDeleteDialogOpen(false)
      setSelectedKey(null)
    } catch (error) {
      console.error("Failed to revoke API key:", error)
      toast.error("API 키 폐기에 실패했습니다.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRotateKey = async () => {
    if (!selectedKey) return
    setIsRotating(true)
    try {
      const result = await apiKeysService.rotateKey(selectedKey.id)
      setNewRotatedKey(result.apiKey.key)
      // Update the key in the list
      setApiKeys((prev) =>
        prev.map((k) => (k.id === selectedKey.id ? { ...k, lastFour: result.apiKey.lastFour } : k))
      )
      toast.success("API 키가 로테이션되었습니다.")
      setRotateDialogOpen(false)
      setRotateResultDialogOpen(true)
    } catch (error) {
      console.error("Failed to rotate API key:", error)
      toast.error("API 키 로테이션에 실패했습니다.")
    } finally {
      setIsRotating(false)
    }
  }

  const filteredKeys = apiKeys.filter((key) => {
    const matchesSearch = key.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesEnvironment = environmentFilter === "all" || key.environment === environmentFilter
    const matchesStatus = statusFilter === "all" || key.status === statusFilter
    return matchesSearch && matchesEnvironment && matchesStatus
  })

  const activeKeys = apiKeys.filter((k) => k.status === "active")
  const liveKeys = apiKeys.filter((k) => k.environment === "live" && k.status === "active")
  const testKeys = apiKeys.filter((k) => k.environment === "test" && k.status === "active")
  const totalCallsThisMonth = apiKeys.reduce((sum, k) => sum + (k.stats?.callsThisMonth ?? 0), 0)
  const maxRateLimit = activeKeys.length > 0 ? Math.max(...activeKeys.map((k) => k.rateLimit)) : 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" /> Active
          </Badge>
        )
      case "revoked":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Revoked
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> Expired
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getEnvironmentBadge = (env: string) => {
    switch (env) {
      case "live":
        return <Badge variant="default">Live</Badge>
      case "test":
        return <Badge variant="secondary">Test</Badge>
      default:
        return <Badge variant="outline">{env}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">API 키를 관리하고 사용량을 모니터링하세요</p>
        </div>
        <Button asChild>
          <Link href="/api-keys/new" className="gap-2">
            <Plus className="h-4 w-4" />새 API Key 생성
          </Link>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
            <Key className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeKeys.length}</div>
            <p className="text-muted-foreground text-xs">
              {liveKeys.length} live, {testKeys.length} test
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalCallsThisMonth)}</div>
            <p className="text-muted-foreground text-xs">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
            <Shield className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(maxRateLimit)}</div>
            <p className="text-muted-foreground text-xs">requests/min (max)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeKeys.length > 0 && activeKeys[0].lastUsedAt
                ? formatRelativeTime(activeKeys[0].lastUsedAt)
                : "-"}
            </div>
            <p className="text-muted-foreground text-xs">
              {activeKeys.length === 0 || !activeKeys[0].lastUsedAt ? "활동 없음" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search keys by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Environments</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keys Table */}
          <Card>
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                API 키를 클릭하여 복사하거나, 메뉴에서 관리 옵션을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Calls (Month)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map((key) => (
                    <TableRow key={key.id} className={cn(key.status === "revoked" && "opacity-60")}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
                            {showKey[key.id]
                              ? `${key.prefix}...${key.lastFour}`
                              : maskApiKey(`${key.prefix}...${key.lastFour}`)}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {showKey[key.id] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              copyToClipboard(`${key.prefix}...${key.lastFour}`, key.id)
                            }
                          >
                            {copiedKey === key.id ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getEnvironmentBadge(key.environment)}</TableCell>
                      <TableCell>{getStatusBadge(key.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(key.stats?.callsThisMonth ?? 0)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                copyToClipboard(`${key.prefix}...${key.lastFour}`, key.id)
                              }
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Key
                            </DropdownMenuItem>
                            {key.status === "active" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedKey(key)
                                    setRotateDialogOpen(true)
                                  }}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Rotate Key
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedKey(key)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Revoke Key
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredKeys.length === 0 && (
                <div className="text-muted-foreground py-8 text-center">
                  <Key className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p>No API keys found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent API Activity</CardTitle>
              <CardDescription>최근 API 호출 활동을 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center">
                <Activity className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                <p className="text-muted-foreground">최근 활동이 없습니다</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  API 키를 생성하고 사용하면 여기에 활동이 표시됩니다
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key 삭제</DialogTitle>
            <DialogDescription>
              정말로 <strong>{selectedKey?.name}</strong> 키를 삭제하시겠습니까? 이 작업은 되돌릴 수
              없으며, 해당 키를 사용하는 모든 서비스가 작동하지 않게 됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border-destructive/20 rounded-md border p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-destructive mt-0.5 h-5 w-5" />
              <div className="text-sm">
                <p className="text-destructive font-medium">주의사항</p>
                <ul className="text-muted-foreground mt-1 list-inside list-disc">
                  <li>이 키를 사용하는 모든 API 호출이 즉시 실패합니다</li>
                  <li>삭제된 키는 복구할 수 없습니다</li>
                  <li>
                    이 달 사용량: {formatNumber(selectedKey?.stats?.callsThisMonth || 0)} calls
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRevokeKey} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Confirmation Dialog */}
      <Dialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key 로테이션</DialogTitle>
            <DialogDescription>
              <strong>{selectedKey?.name}</strong> 키를 새로운 키로 교체하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 h-5 w-5 text-yellow-600" />
              <div className="text-sm">
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  Key 로테이션 안내
                </p>
                <ul className="text-muted-foreground mt-1 list-inside list-disc">
                  <li>새 키가 생성되고, 기존 키는 24시간 후 만료됩니다</li>
                  <li>유예 기간 동안 두 키 모두 사용 가능합니다</li>
                  <li>새 키로 서비스를 업데이트해 주세요</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRotateDialogOpen(false)}
              disabled={isRotating}
            >
              취소
            </Button>
            <Button onClick={handleRotateKey} disabled={isRotating}>
              {isRotating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로테이션 중...
                </>
              ) : (
                "새 키 생성"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Result Dialog - Shows the new key */}
      <Dialog open={rotateResultDialogOpen} onOpenChange={setRotateResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 API 키가 생성되었습니다</DialogTitle>
            <DialogDescription>
              아래 키를 안전한 곳에 저장하세요. 이 키는 다시 볼 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <Key className="h-4 w-4" />
            <AlertTitle>중요</AlertTitle>
            <AlertDescription>
              이 키는 한 번만 표시됩니다. 지금 복사하여 안전하게 저장하세요.
            </AlertDescription>
          </Alert>
          {newRotatedKey && (
            <div className="space-y-2">
              <Label>새 API 키</Label>
              <div className="bg-muted flex items-center gap-2 rounded-lg p-4">
                <code className="flex-1 break-all font-mono text-sm">{newRotatedKey}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(newRotatedKey, "new-rotated-key")}
                >
                  {copiedKey === "new-rotated-key" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setRotateResultDialogOpen(false)
                setNewRotatedKey(null)
                setSelectedKey(null)
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
