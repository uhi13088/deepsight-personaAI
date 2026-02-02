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
  CheckCircle,
  Clock,
  Shield,
  Filter,
  Search,
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
import { cn, formatNumber, formatRelativeTime, maskApiKey } from "@/lib/utils"

// Mock data - replace with real API calls
const apiKeys = [
  {
    id: "key_1",
    name: "Production Server",
    prefix: "pk_live_",
    key: "pk_live_abc123def456ghi789jkl012mno345pqr678",
    environment: "live" as const,
    status: "active" as const,
    permissions: ["match", "personas", "feedback"],
    createdAt: "2025-01-01T00:00:00Z",
    lastUsed: new Date(Date.now() - 120000).toISOString(),
    totalCalls: 125000,
    callsThisMonth: 45678,
    rateLimit: 1000,
  },
  {
    id: "key_2",
    name: "Development",
    prefix: "pk_test_",
    key: "pk_test_xyz789abc123def456ghi012jkl345mno678",
    environment: "test" as const,
    status: "active" as const,
    permissions: ["match", "personas", "feedback"],
    createdAt: "2025-01-05T00:00:00Z",
    lastUsed: new Date(Date.now() - 3600000).toISOString(),
    totalCalls: 8900,
    callsThisMonth: 890,
    rateLimit: 100,
  },
  {
    id: "key_3",
    name: "Staging Server",
    prefix: "pk_test_",
    key: "pk_test_sta123gin456ser789ver012key345abc678",
    environment: "test" as const,
    status: "active" as const,
    permissions: ["match", "personas"],
    createdAt: "2025-01-10T00:00:00Z",
    lastUsed: new Date(Date.now() - 86400000).toISOString(),
    totalCalls: 2340,
    callsThisMonth: 234,
    rateLimit: 100,
  },
  {
    id: "key_4",
    name: "Legacy API (Deprecated)",
    prefix: "pk_live_",
    key: "pk_live_leg123acy456key789old012dep345rec678",
    environment: "live" as const,
    status: "revoked" as const,
    permissions: ["match"],
    createdAt: "2024-06-15T00:00:00Z",
    lastUsed: "2024-12-01T00:00:00Z",
    totalCalls: 567890,
    callsThisMonth: 0,
    rateLimit: 500,
  },
]

const recentActivity = [
  {
    id: "1",
    keyName: "Production Server",
    action: "API call",
    endpoint: "/v1/match",
    status: 200,
    timestamp: new Date().toISOString(),
  },
  {
    id: "2",
    keyName: "Production Server",
    action: "API call",
    endpoint: "/v1/match",
    status: 200,
    timestamp: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: "3",
    keyName: "Development",
    action: "API call",
    endpoint: "/v1/personas",
    status: 200,
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: "4",
    keyName: "Production Server",
    action: "API call",
    endpoint: "/v1/feedback",
    status: 201,
    timestamp: new Date(Date.now() - 90000).toISOString(),
  },
  {
    id: "5",
    keyName: "Production Server",
    action: "API call",
    endpoint: "/v1/match",
    status: 400,
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
]

export default function ApiKeysPage() {
  const [showKey, setShowKey] = React.useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = React.useState("")
  const [environmentFilter, setEnvironmentFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [rotateDialogOpen, setRotateDialogOpen] = React.useState(false)
  const [selectedKey, setSelectedKey] = React.useState<(typeof apiKeys)[0] | null>(null)
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const copyToClipboard = async (key: string, keyId: string) => {
    await navigator.clipboard.writeText(key)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(null), 2000)
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
            <div className="text-2xl font-bold">
              {formatNumber(apiKeys.reduce((sum, k) => sum + k.callsThisMonth, 0))}
            </div>
            <p className="text-muted-foreground text-xs">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
            <Shield className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(Math.max(...activeKeys.map((k) => k.rateLimit)))}
            </div>
            <p className="text-muted-foreground text-xs">requests/min (max)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2 min</div>
            <p className="text-muted-foreground text-xs">ago</p>
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
                            {showKey[key.id] ? key.key : maskApiKey(key.key)}
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
                            onClick={() => copyToClipboard(key.key, key.id)}
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
                        {formatRelativeTime(key.lastUsed)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(key.callsThisMonth)}
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
                            <DropdownMenuItem onClick={() => copyToClipboard(key.key, key.id)}>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.keyName}</TableCell>
                      <TableCell>
                        <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
                          {activity.endpoint}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            activity.status >= 200 && activity.status < 300
                              ? "success"
                              : activity.status >= 400
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(activity.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                  <li>이 달 사용량: {formatNumber(selectedKey?.callsThisMonth || 0)} calls</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // Handle delete
                setDeleteDialogOpen(false)
                setSelectedKey(null)
              }}
            >
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
            <Button variant="outline" onClick={() => setRotateDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                // Handle rotation
                setRotateDialogOpen(false)
                setSelectedKey(null)
              }}
            >
              새 키 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
