"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Server,
  GitBranch,
  Webhook,
  Database,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Play,
  Settings,
  Activity,
  Link2,
  Copy,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// 시스템 상태 데이터 (API 연동 필요)
const SYSTEM_STATUS: Record<
  string,
  {
    status: string
    uptime: number
    latency?: number
    connections?: number
    hitRate?: number
    qps?: number
    jobs?: number
  }
> = {}

// 배포 데이터 (API 연동 필요)
const DEPLOYMENTS: {
  id: string
  component: string
  version: string
  environment: string
  status: string
  deployedAt: string
  deployedBy: string
}[] = []

// 연동 데이터 (API 연동 필요)
const INTEGRATIONS: {
  name: string
  type: string
  status: string
  endpoint: string
  lastSync: string
}[] = []

// 웹훅 데이터 (API 연동 필요)
const WEBHOOKS: { event: string; subscribers: number; lastTriggered: string }[] = []

export default function SystemIntegrationPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    toast.loading("시스템 상태를 새로고침하는 중...")
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsRefreshing(false)
    toast.dismiss()
    toast.success("시스템 상태가 새로고침되었습니다.")
  }

  const handleOpenSettings = () => {
    toast.info("설정 페이지로 이동합니다.", {
      description: "시스템 통합 설정을 관리할 수 있습니다.",
    })
  }

  const handleStartDeployment = () => {
    toast.success("배포를 시작합니다.", {
      description: "배포 파이프라인이 실행됩니다.",
    })
  }

  const handleClearCache = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: "캐시를 초기화하는 중...",
      success: "캐시가 성공적으로 초기화되었습니다.",
      error: "캐시 초기화에 실패했습니다.",
    })
  }

  const handleDbMigration = () => {
    toast.warning("DB 마이그레이션을 시작하시겠습니까?", {
      description: "이 작업은 시간이 소요될 수 있습니다.",
      action: {
        label: "확인",
        onClick: () => {
          toast.promise(new Promise((resolve) => setTimeout(resolve, 3000)), {
            loading: "DB 마이그레이션 진행 중...",
            success: "DB 마이그레이션이 완료되었습니다.",
            error: "DB 마이그레이션에 실패했습니다.",
          })
        },
      },
    })
  }

  const handleHealthCheck = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: "헬스체크 실행 중...",
      success: "모든 시스템이 정상입니다.",
      error: "일부 시스템에 문제가 감지되었습니다.",
    })
  }

  const handleNewDeployment = () => {
    toast.info("새 배포 다이얼로그를 열어주세요.", {
      description: "배포할 컴포넌트와 환경을 선택하세요.",
    })
  }

  const handleAddIntegration = () => {
    toast.info("새 연동을 추가합니다.", {
      description: "외부 시스템 연동 설정을 구성하세요.",
    })
  }

  const handleRefreshIntegration = (integrationName: string) => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: `${integrationName} 동기화 중...`,
      success: `${integrationName} 동기화가 완료되었습니다.`,
      error: `${integrationName} 동기화에 실패했습니다.`,
    })
  }

  const handleIntegrationSettings = (integrationName: string) => {
    toast.info(`${integrationName} 설정`, {
      description: "연동 설정을 수정할 수 있습니다.",
    })
  }

  const handleCopyEndpoint = (endpoint: string) => {
    navigator.clipboard.writeText(endpoint)
    toast.success("엔드포인트가 복사되었습니다.", {
      description: endpoint,
    })
  }

  const handleAddWebhook = () => {
    toast.info("새 웹훅을 추가합니다.", {
      description: "이벤트 타입과 구독자를 설정하세요.",
    })
  }

  const handleWebhookSettings = (event: string) => {
    toast.info(`${event} 웹훅 설정`, {
      description: "웹훅 구성을 수정할 수 있습니다.",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "running":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
      case "degraded":
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
      case "disconnected":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="text-muted-foreground h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "running":
        return <Badge className="bg-green-500">정상</Badge>
      case "warning":
      case "degraded":
        return <Badge className="bg-yellow-500">주의</Badge>
      case "pending":
        return <Badge variant="outline">대기</Badge>
      case "error":
      case "disconnected":
        return <Badge variant="destructive">오류</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Server className="h-6 w-6 text-cyan-500" />
            시스템 통합
          </h2>
          <p className="text-muted-foreground">외부 시스템 연동 및 배포 파이프라인을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshStatus} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            상태 새로고침
          </Button>
          <Button onClick={handleOpenSettings}>
            <Settings className="mr-2 h-4 w-4" />
            설정
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {Object.keys(SYSTEM_STATUS).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="text-muted-foreground mx-auto h-12 w-12" />
            <p className="text-muted-foreground mt-4">시스템 상태 데이터가 없습니다</p>
            <p className="text-muted-foreground mt-1 text-sm">
              API 연동 후 실시간 상태를 확인할 수 있습니다
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-6">
          {Object.entries(SYSTEM_STATUS).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  {getStatusIcon(value.status)}
                </div>
                <div className="text-2xl font-bold">{value.uptime}%</div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {"latency" in value && value.latency
                    ? `${value.latency}ms`
                    : "connections" in value && value.connections
                      ? `${value.connections} conn`
                      : "hitRate" in value && value.hitRate
                        ? `${value.hitRate}% hit`
                        : "qps" in value && value.qps
                          ? `${value.qps} QPS`
                          : "jobs" in value && value.jobs
                            ? `${value.jobs} jobs`
                            : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="deployments">배포</TabsTrigger>
          <TabsTrigger value="integrations">연동</TabsTrigger>
          <TabsTrigger value="webhooks">웹훅</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Deployments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  최근 배포
                </CardTitle>
                <CardDescription>최근 배포된 컴포넌트 목록</CardDescription>
              </CardHeader>
              <CardContent>
                {DEPLOYMENTS.length === 0 ? (
                  <div className="py-8 text-center">
                    <GitBranch className="text-muted-foreground mx-auto h-8 w-8" />
                    <p className="text-muted-foreground mt-2 text-sm">배포 이력이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {DEPLOYMENTS.slice(0, 3).map((deploy) => (
                      <div
                        key={deploy.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{deploy.component}</p>
                          <p className="text-muted-foreground text-sm">
                            {deploy.version} • {deploy.environment}
                          </p>
                        </div>
                        {getStatusBadge(deploy.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Integrations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  활성 연동
                </CardTitle>
                <CardDescription>외부 시스템 연동 상태</CardDescription>
              </CardHeader>
              <CardContent>
                {INTEGRATIONS.length === 0 ? (
                  <div className="py-8 text-center">
                    <Link2 className="text-muted-foreground mx-auto h-8 w-8" />
                    <p className="text-muted-foreground mt-2 text-sm">연동된 시스템이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {INTEGRATIONS.slice(0, 3).map((integration) => (
                      <div
                        key={integration.name}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(integration.status)}
                          <div>
                            <p className="font-medium">{integration.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {integration.type} • {integration.lastSync}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{integration.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>빠른 작업</CardTitle>
              <CardDescription>자주 사용하는 시스템 작업</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button
                  variant="outline"
                  className="flex h-auto flex-col gap-2 py-4"
                  onClick={handleStartDeployment}
                >
                  <Play className="h-6 w-6" />
                  <span>배포 시작</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex h-auto flex-col gap-2 py-4"
                  onClick={handleClearCache}
                >
                  <RefreshCw className="h-6 w-6" />
                  <span>캐시 초기화</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex h-auto flex-col gap-2 py-4"
                  onClick={handleDbMigration}
                >
                  <Database className="h-6 w-6" />
                  <span>DB 마이그레이션</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex h-auto flex-col gap-2 py-4"
                  onClick={handleHealthCheck}
                >
                  <Activity className="h-6 w-6" />
                  <span>헬스체크</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>배포 이력</CardTitle>
                  <CardDescription>모든 컴포넌트 배포 기록</CardDescription>
                </div>
                <Button onClick={handleNewDeployment}>
                  <Play className="mr-2 h-4 w-4" />새 배포
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {DEPLOYMENTS.length === 0 ? (
                <div className="py-12 text-center">
                  <GitBranch className="text-muted-foreground mx-auto h-12 w-12" />
                  <p className="text-muted-foreground mt-4">배포 이력이 없습니다</p>
                  <p className="text-muted-foreground mt-1 text-sm">새 배포를 시작해보세요</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>컴포넌트</TableHead>
                      <TableHead>버전</TableHead>
                      <TableHead>환경</TableHead>
                      <TableHead>배포일시</TableHead>
                      <TableHead>배포자</TableHead>
                      <TableHead className="text-right">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEPLOYMENTS.map((deploy) => (
                      <TableRow key={deploy.id}>
                        <TableCell className="font-medium">{deploy.component}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{deploy.version}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={deploy.environment === "production" ? "default" : "secondary"}
                          >
                            {deploy.environment}
                          </Badge>
                        </TableCell>
                        <TableCell>{deploy.deployedAt}</TableCell>
                        <TableCell>{deploy.deployedBy}</TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(deploy.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>외부 시스템 연동</CardTitle>
                  <CardDescription>연동된 시스템과 API 엔드포인트</CardDescription>
                </div>
                <Button onClick={handleAddIntegration}>
                  <Link2 className="mr-2 h-4 w-4" />
                  연동 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {INTEGRATIONS.length === 0 ? (
                <div className="py-12 text-center">
                  <Link2 className="text-muted-foreground mx-auto h-12 w-12" />
                  <p className="text-muted-foreground mt-4">연동된 시스템이 없습니다</p>
                  <p className="text-muted-foreground mt-1 text-sm">외부 시스템을 연동해보세요</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {INTEGRATIONS.map((integration) => (
                    <div key={integration.name} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(integration.status)}
                          <div>
                            <h4 className="font-semibold">{integration.name}</h4>
                            <Badge variant="outline" className="mt-1">
                              {integration.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefreshIntegration(integration.name)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIntegrationSettings(integration.name)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span className="bg-muted rounded px-2 py-1 font-mono text-xs">
                          {integration.endpoint}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopyEndpoint(integration.endpoint)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>복사</TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">
                        마지막 동기화: {integration.lastSync}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>웹훅 이벤트</CardTitle>
                  <CardDescription>시스템 이벤트 및 구독자 관리</CardDescription>
                </div>
                <Button onClick={handleAddWebhook}>
                  <Webhook className="mr-2 h-4 w-4" />
                  웹훅 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {WEBHOOKS.length === 0 ? (
                <div className="py-12 text-center">
                  <Webhook className="text-muted-foreground mx-auto h-12 w-12" />
                  <p className="text-muted-foreground mt-4">등록된 웹훅이 없습니다</p>
                  <p className="text-muted-foreground mt-1 text-sm">이벤트 웹훅을 추가해보세요</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이벤트</TableHead>
                      <TableHead className="text-center">구독자</TableHead>
                      <TableHead>마지막 트리거</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WEBHOOKS.map((webhook) => (
                      <TableRow key={webhook.event}>
                        <TableCell>
                          <code className="bg-muted rounded px-2 py-1 text-sm">
                            {webhook.event}
                          </code>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{webhook.subscribers}</Badge>
                        </TableCell>
                        <TableCell>{webhook.lastTriggered}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWebhookSettings(webhook.event)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
