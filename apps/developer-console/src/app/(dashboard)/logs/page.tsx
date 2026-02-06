"use client"

import * as React from "react"
import Link from "next/link"
import {
  Search,
  Filter,
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
  Calendar,
  Activity,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { logsService, type ApiLog as ServiceApiLog, type LogsStats } from "@/services/logs-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { cn, formatRelativeTime, getHttpStatusColor } from "@/lib/utils"
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
  const [showFilters, setShowFilters] = React.useState(false)

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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
                      ? Math.round(apiLogs.reduce((sum, l) => sum + l.latency, 0) / apiLogs.length)
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
                  placeholder="Search by request ID, endpoint, or IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
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
                            <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
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

      {/* Log Detail Modal */}
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
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
