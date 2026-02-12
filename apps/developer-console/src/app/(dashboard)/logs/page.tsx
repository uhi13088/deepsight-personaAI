"use client"

import * as React from "react"
import {
  Search,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Activity,
  Loader2,
  Bell,
  BarChart3,
  Settings2,
  Mail,
  MessageSquare,
  Webhook,
} from "lucide-react"
import { toast } from "sonner"
import {
  logsService,
  type ApiLog as ServiceApiLog,
  type LogsStats,
  type ErrorDashboardData,
  type ErrorAlertConfig,
} from "@/services/logs-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatRelativeTime } from "@/lib/utils"
import { downloadCSV, downloadJSON, generateFilename } from "@/lib/export"

export default function LogsPage() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [apiLogs, setApiLogs] = React.useState<ServiceApiLog[]>([])
  const [stats, setStats] = React.useState<LogsStats | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [endpointFilter, setEndpointFilter] = React.useState<string>("all")
  const [apiKeyFilter, setApiKeyFilter] = React.useState<string>("all")
  const [selectedLog, setSelectedLog] = React.useState<ServiceApiLog | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = React.useState("logs")

  // Error dashboard (§7.2~§7.3)
  const [errorDashboard, setErrorDashboard] = React.useState<ErrorDashboardData | null>(null)
  const [errorDashboardLoading, setErrorDashboardLoading] = React.useState(false)
  const [errorAlertConfig, setErrorAlertConfig] = React.useState<ErrorAlertConfig>({
    enabled: false,
    errorRateThreshold: 5,
    consecutiveErrorCount: 10,
    notifyChannels: { email: true, slack: false, webhook: false },
  })
  const [showAlertSettings, setShowAlertSettings] = React.useState(false)

  const fetchLogs = React.useCallback(async () => {
    try {
      const filters: Parameters<typeof logsService.getLogs>[0] = {}

      if (searchQuery) filters.search = searchQuery
      if (statusFilter !== "all") {
        if (statusFilter === "2xx") filters.status = "success"
        else if (statusFilter === "4xx") filters.status = "client_error"
        else if (statusFilter === "5xx") filters.status = "server_error"
      }
      if (endpointFilter !== "all") filters.endpoint = endpointFilter
      if (apiKeyFilter !== "all") filters.apiKeyId = apiKeyFilter

      const data = await logsService.getLogs(filters)
      setApiLogs(data.logs)
      setStats(data.stats)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      toast.error("로그를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, endpointFilter, apiKeyFilter])

  // Debounce search and filters
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchLogs()
    }, 300)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [fetchLogs])

  // API already handles all filtering - just use the fetched logs directly
  const filteredLogs = apiLogs

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await logsService.getLogs()
      setApiLogs(data.logs)
      setStats(data.stats)
      toast.success("로그가 새로고침되었습니다.")
    } catch (error) {
      console.error("Failed to refresh logs:", error)
      toast.error("로그 새로고침에 실패했습니다.")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fetch error dashboard data
  const fetchErrorDashboard = React.useCallback(async () => {
    try {
      setErrorDashboardLoading(true)
      const data = await logsService.getErrorDashboard("7d")
      setErrorDashboard(data)
    } catch {
      toast.error("에러 대시보드 데이터를 불러오는데 실패했습니다.")
    } finally {
      setErrorDashboardLoading(false)
    }
  }, [])

  // Fetch error alert config on mount
  React.useEffect(() => {
    const fetchAlertConfig = async () => {
      try {
        const config = await logsService.getErrorAlertConfig()
        setErrorAlertConfig(config)
      } catch {
        // Silent fail — use defaults
      }
    }
    fetchAlertConfig()
  }, [])

  const handleSaveAlertConfig = async () => {
    try {
      await logsService.updateErrorAlertConfig(errorAlertConfig)
      toast.success("에러 알림 설정이 저장되었습니다.")
      setShowAlertSettings(false)
    } catch {
      toast.error("에러 알림 설정 저장에 실패했습니다.")
    }
  }

  const handleExportJSONL = async () => {
    try {
      const blob = await logsService.exportLogs(
        {
          status: statusFilter !== "all" ? statusFilter : undefined,
          endpoint: endpointFilter !== "all" ? endpointFilter : undefined,
        },
        "jsonl"
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = generateFilename("api_logs") + ".jsonl"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("JSONL 파일이 다운로드되었습니다.")
    } catch {
      toast.error("JSONL 내보내기에 실패했습니다.")
    }
  }

  const handleExportCSV = () => {
    const columns = [
      { key: "id", label: "ID" },
      { key: "timestamp", label: "Timestamp" },
      { key: "method", label: "Method" },
      { key: "endpoint", label: "Endpoint" },
      { key: "statusCode", label: "Status Code" },
      { key: "latency", label: "Latency (ms)" },
      { key: "apiKeyName", label: "API Key" },
      { key: "requestBody", label: "Request Body" },
      { key: "responseBody", label: "Response Body" },
    ]
    downloadCSV(filteredLogs, generateFilename("api_logs"), columns)
    toast.success("CSV 파일이 다운로드되었습니다.")
  }

  const handleExportJSON = () => {
    downloadJSON(filteredLogs, generateFilename("api_logs"))
    toast.success("JSON 파일이 다운로드되었습니다.")
  }

  const toggleRowExpansion = (logId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (status >= 400 && status < 500) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    } else if (status >= 500) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const getStatusBadgeVariant = (
    status: number
  ): "success" | "destructive" | "secondary" | "default" => {
    if (status >= 200 && status < 300) return "success"
    if (status >= 400 && status < 500) return "destructive"
    if (status >= 500) return "destructive"
    return "secondary"
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  const endpoints = [...new Set(apiLogs.map((log) => log.endpoint))]
  const apiKeyNames = [...new Set(apiLogs.map((log) => log.apiKeyName))]

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
          <h1 className="text-2xl font-bold tracking-tight">API Logs</h1>
          <p className="text-muted-foreground">API 요청 로그를 조회하고 분석하세요</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>Export as JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSONL}>Export as JSONL</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Tabs: Logs / Error Dashboard / Error Alerts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="errors" onClick={fetchErrorDashboard}>
            Error Dashboard
          </TabsTrigger>
          <TabsTrigger value="alerts">Error Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Requests</p>
                    <p className="text-2xl font-bold">{stats?.total ?? apiLogs.length}</p>
                  </div>
                  <Activity className="text-muted-foreground/20 h-8 w-8" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Success (2xx)</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.success ??
                        apiLogs.filter((l) => l.status >= 200 && l.status < 300).length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Client Errors (4xx)</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats?.clientError ??
                        apiLogs.filter((l) => l.status >= 400 && l.status < 500).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Avg Latency</p>
                    <p className="text-2xl font-bold">
                      {stats?.avgLatency ??
                        (apiLogs.length > 0
                          ? Math.round(
                              apiLogs.reduce((sum, l) => sum + l.latency, 0) / apiLogs.length
                            )
                          : 0)}
                      ms
                    </p>
                  </div>
                  <Clock className="text-muted-foreground/20 h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="고급 검색: status:400 AND endpoint:/v1/match AND duration:>500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    <p className="text-muted-foreground mt-1 text-xs">
                      고급 문법: status:코드, endpoint:경로, duration:&gt;ms (AND/OR 조합 가능)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="2xx">2xx Success</SelectItem>
                        <SelectItem value="4xx">4xx Client Error</SelectItem>
                        <SelectItem value="5xx">5xx Server Error</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={endpointFilter} onValueChange={setEndpointFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Endpoint" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Endpoints</SelectItem>
                        {endpoints.map((endpoint) => (
                          <SelectItem key={endpoint} value={endpoint}>
                            {endpoint}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={apiKeyFilter} onValueChange={setApiKeyFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="API Key" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All API Keys</SelectItem>
                        {apiKeyNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Request Logs</CardTitle>
              <CardDescription>{filteredLogs.length} requests found</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Request ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleRowExpansion(log.id)}
                      >
                        <TableCell>
                          {expandedRows.has(log.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatRelativeTime(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.method}</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
                            {log.endpoint}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <Badge variant={getStatusBadgeVariant(log.status)}>{log.status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-mono text-sm",
                              log.latency < 100
                                ? "text-green-600"
                                : log.latency < 300
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            )}
                          >
                            {log.latency}ms
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {log.apiKeyName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="font-mono text-xs">{log.id.slice(0, 12)}...</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(log.id)
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(log.id) && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <div className="space-y-4 p-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <h4 className="mb-2 text-sm font-medium">Request Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">IP Address:</span>
                                      <span className="font-mono">{log.ip}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">User Agent:</span>
                                      <span className="max-w-[250px] truncate font-mono text-xs">
                                        {log.userAgent}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">API Key:</span>
                                      <span className="font-mono">{log.apiKey}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="mb-2 text-sm font-medium">Timing</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Timestamp:</span>
                                      <span className="font-mono">
                                        {new Date(log.timestamp).toISOString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Latency:</span>
                                      <span className="font-mono">{log.latency}ms</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <Tabs defaultValue="request" className="w-full">
                                <TabsList>
                                  <TabsTrigger value="request">Request Body</TabsTrigger>
                                  <TabsTrigger value="response">Response Body</TabsTrigger>
                                </TabsList>
                                <TabsContent value="request">
                                  <pre className="bg-muted max-h-[200px] overflow-auto rounded-lg p-4 text-xs">
                                    {JSON.stringify(log.requestBody, null, 2) || "No request body"}
                                  </pre>
                                </TabsContent>
                                <TabsContent value="response">
                                  <pre className="bg-muted max-h-[200px] overflow-auto rounded-lg p-4 text-xs">
                                    {JSON.stringify(log.responseBody, null, 2)}
                                  </pre>
                                </TabsContent>
                              </Tabs>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Full Details
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy as JSON
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>

              {filteredLogs.length === 0 && (
                <div className="text-muted-foreground py-12 text-center">
                  <Activity className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p>No logs found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Dashboard Tab (§7.2~§7.3) */}
        <TabsContent value="errors" className="space-y-6">
          {errorDashboardLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : errorDashboard ? (
            <>
              {/* Error Rate Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Rate Trend</CardTitle>
                  <CardDescription>에러율 추이 (최근 7일)</CardDescription>
                </CardHeader>
                <CardContent>
                  {errorDashboard.errorRateTrend.length > 0 ? (
                    <div className="flex h-[200px] items-end gap-2">
                      {errorDashboard.errorRateTrend.map((day, i) => {
                        const maxRate = Math.max(
                          ...errorDashboard.errorRateTrend.map((d) => d.errorRate),
                          1
                        )
                        const heightPercent = (day.errorRate / maxRate) * 100
                        return (
                          <div key={i} className="flex flex-1 flex-col items-center gap-1">
                            <div
                              className={cn(
                                "w-full rounded-t transition-all",
                                day.errorRate > 5
                                  ? "bg-red-500"
                                  : day.errorRate > 2
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              )}
                              style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                            />
                            <span className="text-muted-foreground text-xs">
                              {day.date.slice(-5)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <BarChart3 className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                      <p className="text-muted-foreground text-sm">에러 추이 데이터가 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Errors by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Errors by Type</CardTitle>
                    <CardDescription>HTTP 상태 코드별 에러 분류</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {errorDashboard.errorsByType.length > 0 ? (
                      <div className="space-y-3">
                        {errorDashboard.errorsByType.map((err) => (
                          <div key={err.code} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive">{err.code}</Badge>
                                <span>{err.description}</span>
                              </div>
                              <span className="text-muted-foreground">
                                {err.count} ({err.percentage}%)
                              </span>
                            </div>
                            <Progress value={err.percentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500/30" />
                        <p className="text-muted-foreground text-sm">에러가 없습니다</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Errors by Endpoint */}
                <Card>
                  <CardHeader>
                    <CardTitle>Errors by Endpoint</CardTitle>
                    <CardDescription>엔드포인트별 에러율</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {errorDashboard.errorsByEndpoint.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Endpoint</TableHead>
                            <TableHead className="text-right">Errors</TableHead>
                            <TableHead className="text-right">Error Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errorDashboard.errorsByEndpoint.map((ep) => (
                            <TableRow key={ep.endpoint}>
                              <TableCell>
                                <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
                                  {ep.endpoint}
                                </code>
                              </TableCell>
                              <TableCell className="text-right">{ep.errorCount}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={ep.errorRate > 5 ? "destructive" : "secondary"}>
                                  {ep.errorRate}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-8 text-center">
                        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500/30" />
                        <p className="text-muted-foreground text-sm">에러가 없습니다</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Error Messages */}
              {errorDashboard.topErrorMessages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Error Messages</CardTitle>
                    <CardDescription>가장 빈번한 에러 메시지</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Message</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Last Occurred</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errorDashboard.topErrorMessages.map((msg, i) => (
                          <TableRow key={i}>
                            <TableCell className="max-w-[400px] truncate font-mono text-sm">
                              {msg.message}
                            </TableCell>
                            <TableCell className="text-right">{msg.count}</TableCell>
                            <TableCell className="text-muted-foreground text-right text-sm">
                              {formatRelativeTime(msg.lastOccurred)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <BarChart3 className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
              <p className="text-muted-foreground">
                Error Dashboard 탭을 클릭하면 데이터를 불러옵니다
              </p>
            </div>
          )}
        </TabsContent>

        {/* Error Alerts Tab (§7.3) */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Error Alert Settings</CardTitle>
                </div>
                <Switch
                  checked={errorAlertConfig.enabled}
                  onCheckedChange={(v) => setErrorAlertConfig({ ...errorAlertConfig, enabled: v })}
                />
              </div>
              <CardDescription>
                에러율 임계값 또는 연속 에러 발생 시 알림을 받습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Threshold Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">임계값 설정</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>에러율 임계값 (%)</Label>
                    <Input
                      type="number"
                      value={errorAlertConfig.errorRateThreshold}
                      onChange={(e) =>
                        setErrorAlertConfig({
                          ...errorAlertConfig,
                          errorRateThreshold: Number(e.target.value),
                        })
                      }
                      min={1}
                      max={100}
                      className="mt-1"
                    />
                    <p className="text-muted-foreground mt-1 text-xs">
                      에러율이 이 값을 초과하면 알림 발생
                    </p>
                  </div>
                  <div>
                    <Label>연속 에러 횟수</Label>
                    <Input
                      type="number"
                      value={errorAlertConfig.consecutiveErrorCount}
                      onChange={(e) =>
                        setErrorAlertConfig({
                          ...errorAlertConfig,
                          consecutiveErrorCount: Number(e.target.value),
                        })
                      }
                      min={1}
                      className="mt-1"
                    />
                    <p className="text-muted-foreground mt-1 text-xs">
                      연속 에러가 이 횟수를 초과하면 알림 발생
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Channels */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">알림 채널</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm">이메일</span>
                    </div>
                    <Switch
                      checked={errorAlertConfig.notifyChannels.email}
                      onCheckedChange={(v) =>
                        setErrorAlertConfig({
                          ...errorAlertConfig,
                          notifyChannels: { ...errorAlertConfig.notifyChannels, email: v },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm">Slack</span>
                    </div>
                    <Switch
                      checked={errorAlertConfig.notifyChannels.slack}
                      onCheckedChange={(v) =>
                        setErrorAlertConfig({
                          ...errorAlertConfig,
                          notifyChannels: { ...errorAlertConfig.notifyChannels, slack: v },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Webhook className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm">Webhook</span>
                    </div>
                    <Switch
                      checked={errorAlertConfig.notifyChannels.webhook}
                      onCheckedChange={(v) =>
                        setErrorAlertConfig({
                          ...errorAlertConfig,
                          notifyChannels: { ...errorAlertConfig.notifyChannels, webhook: v },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAlertConfig}>설정 저장</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Modal (AC2 — Request/Response 헤더+바디) */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>Request ID: {selectedLog?.id}</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Endpoint</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline">{selectedLog.method}</Badge>
                      <code className="font-mono text-sm">{selectedLog.endpoint}</code>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1 flex items-center gap-2">
                      {getStatusIcon(selectedLog.status)}
                      <Badge variant={getStatusBadgeVariant(selectedLog.status)}>
                        {selectedLog.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Latency</Label>
                    <p className="mt-1 font-mono">{selectedLog.latency}ms</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Timestamp</Label>
                    <p className="mt-1 font-mono text-sm">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">IP Address</Label>
                    <p className="mt-1 font-mono">{selectedLog.ip}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">API Key</Label>
                    <p className="mt-1">
                      {selectedLog.apiKeyName} ({selectedLog.apiKey})
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">User Agent</Label>
                <p className="mt-1 break-all font-mono text-sm">{selectedLog.userAgent}</p>
              </div>

              <Tabs defaultValue="request">
                <TabsList>
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="req-headers">Request Headers</TabsTrigger>
                  <TabsTrigger value="res-headers">Response Headers</TabsTrigger>
                </TabsList>
                <TabsContent value="request" className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Request Body</Label>
                    <pre className="bg-muted mt-2 max-h-[300px] overflow-auto rounded-lg p-4 text-xs">
                      {JSON.stringify(selectedLog.requestBody, null, 2) || "No request body"}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="response" className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Response Body</Label>
                    <pre className="bg-muted mt-2 max-h-[300px] overflow-auto rounded-lg p-4 text-xs">
                      {JSON.stringify(selectedLog.responseBody, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="req-headers" className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Request Headers</Label>
                    <pre className="bg-muted mt-2 max-h-[300px] overflow-auto rounded-lg p-4 text-xs">
                      {JSON.stringify(selectedLog.requestHeaders, null, 2) || "No headers"}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="res-headers" className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Response Headers</Label>
                    <pre className="bg-muted mt-2 max-h-[300px] overflow-auto rounded-lg p-4 text-xs">
                      {JSON.stringify(selectedLog.responseHeaders, null, 2) || "No headers"}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
