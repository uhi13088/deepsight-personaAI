"use client"

import * as React from "react"
import Link from "next/link"
import {
  Webhook as WebhookIcon,
  Plus,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  Activity,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  webhooksService,
  type Webhook,
  type DeliveryLog as ServiceDeliveryLog,
  type WebhooksData,
} from "@/services/webhooks-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { cn, formatRelativeTime } from "@/lib/utils"

const eventTypes = [
  { id: "match.completed", name: "Match Completed", description: "매칭 분석 완료 시" },
  { id: "batch.completed", name: "Batch Completed", description: "배치 매칭 완료 시" },
  { id: "feedback.received", name: "Feedback Received", description: "피드백 수신 시" },
  { id: "usage.threshold", name: "Usage Threshold", description: "사용량 임계치 도달 시" },
  { id: "api_key.created", name: "API Key Created", description: "API 키 생성 시" },
  { id: "api_key.revoked", name: "API Key Revoked", description: "API 키 폐기 시" },
]

export default function WebhooksPage() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([])
  const [deliveryLogs, setDeliveryLogs] = React.useState<ServiceDeliveryLog[]>([])
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedWebhook, setSelectedWebhook] = React.useState<Webhook | null>(null)
  const [newWebhookUrl, setNewWebhookUrl] = React.useState("")
  const [newWebhookDescription, setNewWebhookDescription] = React.useState("")
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([])
  const [copiedSecret, setCopiedSecret] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await webhooksService.getWebhooks()
        setWebhooks(data.webhooks)
        setDeliveryLogs(data.deliveryLogs)
      } catch (error) {
        console.error("Failed to fetch webhooks:", error)
        toast.error("웹훅 데이터를 불러오는데 실패했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const copySecret = async (secret: string, webhookId: string) => {
    await navigator.clipboard.writeText(secret)
    setCopiedSecret(webhookId)
    setTimeout(() => setCopiedSecret(null), 2000)
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" /> Active
          </Badge>
        )
      case "disabled":
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" /> Disabled
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDeliveryStatusBadge = (status: string, statusCode: number) => {
    if (status === "success") {
      return <Badge variant="success">{statusCode}</Badge>
    }
    return <Badge variant="destructive">{statusCode}</Badge>
  }

  const handleCreateWebhook = async () => {
    try {
      await webhooksService.createWebhook({
        url: newWebhookUrl,
        description: newWebhookDescription,
        events: selectedEvents,
      })
      toast.success("웹훅이 생성되었습니다.")
      // Refresh data
      const data = await webhooksService.getWebhooks()
      setWebhooks(data.webhooks)
      setDeliveryLogs(data.deliveryLogs)
      setCreateDialogOpen(false)
      setNewWebhookUrl("")
      setNewWebhookDescription("")
      setSelectedEvents([])
    } catch (error) {
      console.error("Failed to create webhook:", error)
      toast.error("웹훅 생성에 실패했습니다.")
    }
  }

  const handleDeleteWebhook = async () => {
    if (!selectedWebhook) return
    try {
      await webhooksService.deleteWebhook(selectedWebhook.id)
      toast.success("웹훅이 삭제되었습니다.")
      // Refresh data
      const data = await webhooksService.getWebhooks()
      setWebhooks(data.webhooks)
      setDeliveryLogs(data.deliveryLogs)
      setDeleteDialogOpen(false)
      setSelectedWebhook(null)
    } catch (error) {
      console.error("Failed to delete webhook:", error)
      toast.error("웹훅 삭제에 실패했습니다.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">Webhook 엔드포인트를 관리하고 이벤트를 수신하세요</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {/* Pro Plan Alert */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Webhook Feature</AlertTitle>
        <AlertDescription>
          Webhook은 Pro 플랜 이상에서 사용할 수 있습니다. 현재 Pro 플랜을 사용 중이며, 최대 5개의
          웹훅을 등록할 수 있습니다.
        </AlertDescription>
      </Alert>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Webhooks</CardTitle>
            <WebhookIcon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhooks.filter((w) => w.status === "active").length}
            </div>
            <p className="text-muted-foreground text-xs">of {webhooks.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhooks.reduce((sum, w) => sum + w.stats.totalDeliveries, 0).toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">all time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {webhooks.length > 0
                ? (
                    webhooks.reduce((sum, w) => sum + w.stats.successRate, 0) / webhooks.length
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-muted-foreground text-xs">average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhooks.length > 0
                ? Math.round(
                    webhooks.reduce((sum, w) => sum + w.stats.avgLatency, 0) / webhooks.length
                  )
                : 0}
              ms
            </div>
            <p className="text-muted-foreground text-xs">response time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="deliveries">Recent Deliveries</TabsTrigger>
          <TabsTrigger value="events">Event Types</TabsTrigger>
        </TabsList>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>등록된 웹훅 엔드포인트 목록</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Last Delivery</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell>
                        <div>
                          <code className="font-mono text-sm">{webhook.url}</code>
                          <p className="text-muted-foreground text-sm">{webhook.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(webhook.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.slice(0, 2).map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event.split(".")[1]}
                            </Badge>
                          ))}
                          {webhook.events.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{webhook.events.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {webhook.lastDelivery.status === "success" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-muted-foreground text-sm">
                            {formatRelativeTime(webhook.lastDelivery.timestamp)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-medium",
                            webhook.stats.successRate >= 99
                              ? "text-green-600"
                              : webhook.stats.successRate >= 95
                                ? "text-yellow-600"
                                : "text-red-600"
                          )}
                        >
                          {webhook.stats.successRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copySecret(webhook.secret, webhook.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Secret
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Test Webhook
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedWebhook(webhook)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {webhooks.length === 0 && (
                <div className="py-12 text-center">
                  <WebhookIcon className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground">등록된 웹훅이 없습니다</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Add Webhook 버튼을 클릭하여 웹훅을 추가하세요
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
              <CardDescription>최근 웹훅 전송 로그</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Request ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryLogs.map((log) => {
                    const webhook = webhooks.find((w) => w.id === log.webhookId)
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {formatRelativeTime(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.event}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
                          {webhook?.url}
                        </TableCell>
                        <TableCell>{getDeliveryStatusBadge(log.status, log.statusCode)}</TableCell>
                        <TableCell
                          className={cn(
                            "font-mono text-sm",
                            log.latency < 200
                              ? "text-green-600"
                              : log.latency < 1000
                                ? "text-yellow-600"
                                : "text-red-600"
                          )}
                        >
                          {log.latency}ms
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-xs">{log.requestId}</code>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {deliveryLogs.length === 0 && (
                <div className="py-12 text-center">
                  <Activity className="text-muted-foreground/30 mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground">전송 기록이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Event Types</CardTitle>
              <CardDescription>수신 가능한 이벤트 유형</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {eventTypes.map((event) => (
                  <div key={event.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-muted-foreground text-sm">{event.description}</p>
                        <code className="text-muted-foreground mt-2 block font-mono text-xs">
                          {event.id}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Webhook Signature */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="text-primary h-5 w-5" />
                <CardTitle>Webhook Signature Verification</CardTitle>
              </div>
              <CardDescription>웹훅 요청의 무결성을 검증하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                모든 웹훅 요청에는 <code className="font-mono">X-DeepSight-Signature</code> 헤더가
                포함됩니다. 이 서명을 검증하여 요청이 DeepSight에서 온 것인지 확인하세요.
              </p>
              <pre className="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-sm">
                {`// Node.js example
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(\`sha256=\${expectedSignature}\`)
  );
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Webhook Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>새로운 웹훅 엔드포인트를 등록하세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                placeholder="https://your-app.com/webhooks/deepsight"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">HTTPS URL만 지원됩니다</p>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Production webhook"
                value={newWebhookDescription}
                onChange={(e) => setNewWebhookDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Events to receive</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {eventTypes.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      selectedEvents.includes(event.id) && "border-primary bg-primary/5"
                    )}
                    onClick={() => toggleEvent(event.id)}
                  >
                    <Checkbox checked={selectedEvents.includes(event.id)} />
                    <div>
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="text-muted-foreground text-xs">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWebhook}
              disabled={!newWebhookUrl || selectedEvents.length === 0}
            >
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Webhook Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>이 웹훅 엔드포인트를 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>주의</AlertTitle>
            <AlertDescription>
              이 작업은 되돌릴 수 없습니다. 삭제 후 이 엔드포인트로 더 이상 이벤트가 전송되지
              않습니다.
            </AlertDescription>
          </Alert>
          {selectedWebhook && (
            <div className="bg-muted rounded-lg p-4">
              <code className="font-mono text-sm">{selectedWebhook.url}</code>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWebhook}>
              Delete Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
