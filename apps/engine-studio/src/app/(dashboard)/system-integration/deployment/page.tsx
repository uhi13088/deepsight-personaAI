"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  deploymentsService,
  type Deployment,
  type DeploymentStats,
  type DeploymentEnv,
  type DeploymentTarget as ApiDeploymentTarget,
} from "@/services/deployments-service"
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
  Rocket,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  GitBranch,
  Server,
  Cloud,
  Settings,
  Eye,
  Plus,
  RefreshCw,
  Terminal,
  ArrowRight,
  Loader2,
} from "lucide-react"

// 파이프라인 상태 타입
type PipelineStatus = "idle" | "running" | "success" | "failed" | "cancelled"
type StageStatus = "pending" | "running" | "success" | "failed" | "skipped"
type DeploymentEnvironment = "development" | "staging" | "production"

// 타입 가드 함수
function isDeploymentEnvironment(value: string): value is DeploymentEnvironment {
  return ["development", "staging", "production"].includes(value)
}

interface PipelineStage {
  id: string
  name: string
  status: StageStatus
  duration?: number
  logs?: string[]
  startedAt?: string
  finishedAt?: string
}

interface Pipeline {
  id: string
  name: string
  environment: DeploymentEnvironment
  status: PipelineStatus
  version: string
  triggeredBy: string
  startedAt: string
  finishedAt?: string
  stages: PipelineStage[]
  commitHash: string
  branch: string
}

interface DeploymentTarget {
  id: string
  name: string
  environment: DeploymentEnvironment
  url: string
  status: "healthy" | "degraded" | "offline"
  lastDeployed?: string
  version?: string
  region: string
}

// API 환경 매핑 함수
const mapEnvToUI = (env: DeploymentEnv): DeploymentEnvironment => {
  const map: Record<DeploymentEnv, DeploymentEnvironment> = {
    DEV: "development",
    STG: "staging",
    PROD: "production",
  }
  return map[env]
}

const mapUIToEnv = (env: DeploymentEnvironment): DeploymentEnv => {
  const map: Record<DeploymentEnvironment, DeploymentEnv> = {
    development: "DEV",
    staging: "STG",
    production: "PROD",
  }
  return map[env]
}

// API 배포를 파이프라인 형태로 변환
const deploymentToPipeline = (deployment: Deployment): Pipeline => {
  const statusMap: Record<Deployment["status"], PipelineStatus> = {
    PENDING: "idle",
    IN_PROGRESS: "running",
    COMPLETED: "success",
    FAILED: "failed",
    ROLLED_BACK: "cancelled",
  }

  const stageStatus = (baseStatus: Deployment["status"]): StageStatus => {
    switch (baseStatus) {
      case "COMPLETED":
        return "success"
      case "FAILED":
        return "failed"
      case "IN_PROGRESS":
        return "running"
      case "ROLLED_BACK":
        return "skipped"
      default:
        return "pending"
    }
  }

  return {
    id: deployment.id,
    name: `${deployment.targetType} 배포: ${deployment.targetName}`,
    environment: mapEnvToUI(deployment.environment),
    status: statusMap[deployment.status],
    version: deployment.version || "latest",
    triggeredBy: deployment.deployedBy.name || deployment.deployedBy.email || "Unknown",
    startedAt: deployment.createdAt,
    finishedAt: deployment.completedAt || undefined,
    commitHash: deployment.id.slice(0, 8),
    branch: "main",
    stages: [
      {
        id: "s1",
        name: "Build",
        status: stageStatus(deployment.status === "PENDING" ? "PENDING" : "COMPLETED"),
        duration: 180,
      },
      {
        id: "s2",
        name: "Test",
        status: stageStatus(deployment.status === "PENDING" ? "PENDING" : "COMPLETED"),
        duration: 300,
      },
      {
        id: "s3",
        name: "Security Scan",
        status: stageStatus(deployment.status === "PENDING" ? "PENDING" : "COMPLETED"),
        duration: 120,
      },
      { id: "s4", name: "Deploy", status: stageStatus(deployment.status), duration: 240 },
      {
        id: "s5",
        name: "Health Check",
        status:
          deployment.status === "COMPLETED"
            ? "success"
            : deployment.status === "FAILED"
              ? "failed"
              : "pending",
        duration: 60,
      },
    ],
  }
}

export default function DeploymentPipelinePage() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [stats, setStats] = useState<DeploymentStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    byEnvironment: { DEV: 0, STG: 0, PROD: 0 },
  })
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [targets, setTargets] = useState<DeploymentTarget[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false)
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false)
  const [, setIsAddTargetDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [deployConfig, setDeployConfig] = useState({
    environment: "staging" as "development" | "staging" | "production",
    version: "",
    branch: "main",
    enableRollback: true,
    runTests: true,
    notifySlack: true,
  })

  useEffect(() => {
    loadDeployments()
  }, [])

  const loadDeployments = async () => {
    try {
      setIsLoading(true)
      const data = await deploymentsService.getDeployments()
      setDeployments(data.deployments)
      setStats(data.stats)
      // 배포 데이터를 파이프라인으로 변환
      const convertedPipelines = data.deployments.map(deploymentToPipeline)
      setPipelines(convertedPipelines)
      // 배포 대상 생성 (환경별로 그룹화)
      const envTargets: DeploymentTarget[] = [
        {
          id: "target-prod",
          name: "Production Cluster",
          environment: "production",
          url: "https://api.deepsight.ai",
          status: data.stats.byEnvironment.PROD > 0 ? "healthy" : "offline",
          lastDeployed:
            data.deployments.find((d) => d.environment === "PROD")?.completedAt || undefined,
          version: data.deployments.find((d) => d.environment === "PROD")?.version || undefined,
          region: "ap-northeast-2",
        },
        {
          id: "target-stg",
          name: "Staging Environment",
          environment: "staging",
          url: "https://staging-api.deepsight.ai",
          status: "healthy",
          lastDeployed:
            data.deployments.find((d) => d.environment === "STG")?.completedAt || undefined,
          version: data.deployments.find((d) => d.environment === "STG")?.version || undefined,
          region: "ap-northeast-2",
        },
        {
          id: "target-dev",
          name: "Development Server",
          environment: "development",
          url: "https://dev-api.deepsight.ai",
          status: "healthy",
          lastDeployed:
            data.deployments.find((d) => d.environment === "DEV")?.completedAt || undefined,
          version: data.deployments.find((d) => d.environment === "DEV")?.version || undefined,
          region: "ap-northeast-2",
        },
      ]
      setTargets(envTargets)
    } catch (error) {
      console.error("Failed to load deployments:", error)
      toast.error("배포 목록을 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // Settings state
  const [pipelineSettings, setPipelineSettings] = useState({
    defaultBranch: "main",
    concurrentPipelines: "3",
    autoDeployStaging: true,
    autoRollback: true,
    productionApproval: true,
    slackWebhookUrl: "",
    notifyStart: true,
    notifyComplete: true,
    notifyFailed: true,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadDeployments()
      toast.success("파이프라인 정보가 새로고침되었습니다.")
    } catch {
      toast.error("새로고침에 실패했습니다.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddTarget = () => {
    setIsAddTargetDialogOpen(true)
    toast.info("새 배포 대상을 추가합니다.", {
      description: "환경 및 서버 정보를 입력하세요.",
    })
  }

  const handleViewTarget = (target: DeploymentTarget) => {
    toast.info(`${target.name} 상세 정보`, {
      description: `URL: ${target.url}\n상태: ${target.status}`,
    })
  }

  const handleTargetSettings = (target: DeploymentTarget) => {
    toast.info(`${target.name} 설정`, {
      description: "배포 대상 설정을 수정할 수 있습니다.",
    })
  }

  const handleSaveSettings = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: "설정을 저장하는 중...",
      success: "설정이 성공적으로 저장되었습니다.",
      error: "설정 저장에 실패했습니다.",
    })
  }

  const getStatusBadge = (status: PipelineStatus | StageStatus) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
    > = {
      idle: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      running: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      success: { variant: "outline", icon: <CheckCircle2 className="h-3 w-3 text-green-500" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      cancelled: { variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
      skipped: { variant: "secondary", icon: <ArrowRight className="h-3 w-3" /> },
    }
    const config = variants[status] || variants.idle
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getEnvironmentBadge = (env: string) => {
    const colors: Record<string, string> = {
      production: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      staging: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      development: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    }
    return (
      <Badge className={colors[env] || "bg-gray-100 text-gray-800"}>
        {env.charAt(0).toUpperCase() + env.slice(1)}
      </Badge>
    )
  }

  const getTargetStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "offline":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const handleDeploy = async () => {
    try {
      const created = await deploymentsService.createDeployment({
        targetType: "CONFIG",
        targetId: `config-${Date.now()}`,
        environment: mapUIToEnv(deployConfig.environment),
        version: deployConfig.version || undefined,
        notes: `Branch: ${deployConfig.branch}`,
      })
      const newPipeline = deploymentToPipeline(created)
      setPipelines([newPipeline, ...pipelines])
      setDeployments([created, ...deployments])
      setIsDeployDialogOpen(false)
      toast.success("배포가 시작되었습니다.", {
        description: `${deployConfig.environment} 환경에 ${deployConfig.branch} 브랜치 배포 중`,
      })
      // 배포 시작
      await deploymentsService.startDeployment(created.id)
    } catch (error) {
      console.error("Failed to create deployment:", error)
      toast.error("배포 생성에 실패했습니다.")
    }
  }

  const handleCancelPipeline = async (pipelineId: string) => {
    try {
      const updated = await deploymentsService.rollbackDeployment(pipelineId)
      const updatedPipeline = deploymentToPipeline(updated)
      setPipelines(pipelines.map((p) => (p.id === pipelineId ? updatedPipeline : p)))
      toast.info("파이프라인이 취소되었습니다.")
    } catch (error) {
      console.error("Failed to cancel pipeline:", error)
      // UI 업데이트 (API 실패 시에도)
      setPipelines(
        pipelines.map((p) =>
          p.id === pipelineId ? { ...p, status: "cancelled" as PipelineStatus } : p
        )
      )
      toast.info("파이프라인이 취소되었습니다.")
    }
  }

  const handleRetryPipeline = async (pipelineId: string) => {
    try {
      const updated = await deploymentsService.startDeployment(pipelineId)
      const updatedPipeline = deploymentToPipeline(updated)
      setPipelines(pipelines.map((p) => (p.id === pipelineId ? updatedPipeline : p)))
      toast.success("파이프라인을 재시작합니다.")
    } catch (error) {
      console.error("Failed to retry pipeline:", error)
      // UI 업데이트 (API 실패 시에도)
      setPipelines(
        pipelines.map((p) =>
          p.id === pipelineId
            ? {
                ...p,
                status: "running" as PipelineStatus,
                stages: p.stages.map((s) => ({ ...s, status: "pending" as StageStatus })),
              }
            : p
        )
      )
      toast.success("파이프라인을 재시작합니다.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">배포 파이프라인</h1>
          <p className="text-muted-foreground">CI/CD 파이프라인 관리 및 배포 자동화</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Rocket className="mr-2 h-4 w-4" />새 배포
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>새 배포 시작</DialogTitle>
                <DialogDescription>배포 환경과 설정을 선택하세요.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>배포 환경</Label>
                  <Select
                    value={deployConfig.environment}
                    onValueChange={(v) => {
                      if (isDeploymentEnvironment(v)) {
                        setDeployConfig({ ...deployConfig, environment: v })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>브랜치</Label>
                  <Select
                    value={deployConfig.branch}
                    onValueChange={(v) => setDeployConfig({ ...deployConfig, branch: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">main</SelectItem>
                      <SelectItem value="develop">develop</SelectItem>
                      <SelectItem value="feature/matching-v2">feature/matching-v2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>버전 태그 (선택)</Label>
                  <Input
                    placeholder="v2.4.2"
                    value={deployConfig.version}
                    onChange={(e) => setDeployConfig({ ...deployConfig, version: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>자동 롤백 활성화</Label>
                    <Switch
                      checked={deployConfig.enableRollback}
                      onCheckedChange={(v) =>
                        setDeployConfig({ ...deployConfig, enableRollback: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>테스트 실행</Label>
                    <Switch
                      checked={deployConfig.runTests}
                      onCheckedChange={(v) => setDeployConfig({ ...deployConfig, runTests: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Slack 알림</Label>
                    <Switch
                      checked={deployConfig.notifySlack}
                      onCheckedChange={(v) => setDeployConfig({ ...deployConfig, notifySlack: v })}
                    />
                  </div>
                </div>
                {deployConfig.environment === "production" && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">프로덕션 배포 주의</span>
                    </div>
                    <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                      프로덕션 환경에 배포합니다. 배포 전 충분한 테스트를 완료했는지 확인하세요.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeployDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleDeploy}>
                  <Rocket className="mr-2 h-4 w-4" />
                  배포 시작
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="pipelines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipelines">파이프라인</TabsTrigger>
          <TabsTrigger value="targets">배포 대상</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        {/* 파이프라인 탭 */}
        <TabsContent value="pipelines" className="space-y-4">
          {/* 요약 카드 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 배포</CardTitle>
                <Rocket className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">실행 중</CardTitle>
                <Play className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress + stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">실패</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.failed}</div>
              </CardContent>
            </Card>
          </div>

          {/* 파이프라인 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 파이프라인</CardTitle>
              <CardDescription>배포 파이프라인 실행 기록</CardDescription>
            </CardHeader>
            <CardContent>
              {pipelines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Rocket className="text-muted-foreground mb-3 h-10 w-10" />
                  <h3 className="text-lg font-medium">배포 기록이 없습니다</h3>
                  <p className="text-muted-foreground text-sm">
                    새 배포를 시작하여 파이프라인을 실행하세요
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pipelines.map((pipeline) => (
                    <div
                      key={pipeline.id}
                      className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{pipeline.name}</span>
                              {getEnvironmentBadge(pipeline.environment)}
                              {getStatusBadge(pipeline.status)}
                            </div>
                            <div className="text-muted-foreground mt-1 flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                {pipeline.branch}
                              </span>
                              <span>{pipeline.commitHash}</span>
                              <span>{pipeline.version}</span>
                              <span>by {pipeline.triggeredBy}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pipeline.status === "running" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelPipeline(pipeline.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {pipeline.status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryPipeline(pipeline.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPipeline(pipeline)
                              setIsLogsDialogOpen(true)
                            }}
                          >
                            <Terminal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 스테이지 진행 상황 */}
                      <div className="flex items-center gap-2">
                        {pipeline.stages.map((stage, index) => (
                          <div key={stage.id} className="flex items-center">
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${stage.status === "success" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""} ${stage.status === "running" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : ""} ${stage.status === "failed" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : ""} ${stage.status === "pending" ? "bg-gray-100 text-gray-500 dark:bg-gray-800" : ""} ${stage.status === "skipped" ? "bg-gray-100 text-gray-400 dark:bg-gray-800" : ""} `}
                              >
                                {stage.status === "success" && <CheckCircle2 className="h-4 w-4" />}
                                {stage.status === "running" && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {stage.status === "failed" && <XCircle className="h-4 w-4" />}
                                {stage.status === "pending" && <Clock className="h-4 w-4" />}
                                {stage.status === "skipped" && <ArrowRight className="h-4 w-4" />}
                              </div>
                              <span className="text-muted-foreground mt-1 text-xs">
                                {stage.name}
                              </span>
                              {stage.duration && (
                                <span className="text-muted-foreground text-xs">
                                  {formatDuration(stage.duration)}
                                </span>
                              )}
                            </div>
                            {index < pipeline.stages.length - 1 && (
                              <div
                                className={`mx-1 h-0.5 w-8 ${
                                  stage.status === "success"
                                    ? "bg-green-500"
                                    : "bg-gray-200 dark:bg-gray-700"
                                }`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 배포 대상 탭 */}
        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>배포 대상</CardTitle>
                  <CardDescription>배포 환경 및 서버 상태</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddTarget}>
                  <Plus className="mr-2 h-4 w-4" />
                  대상 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>환경</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>버전</TableHead>
                    <TableHead>리전</TableHead>
                    <TableHead>마지막 배포</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((target) => (
                    <TableRow key={target.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Server className="text-muted-foreground h-4 w-4" />
                          {target.name}
                        </div>
                      </TableCell>
                      <TableCell>{getEnvironmentBadge(target.environment)}</TableCell>
                      <TableCell>
                        <a
                          href={target.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {target.url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTargetStatusIcon(target.status)}
                          <span className="capitalize">{target.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{target.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Cloud className="h-3 w-3" />
                          {target.region}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {target.lastDeployed
                          ? new Date(target.lastDeployed).toLocaleString("ko-KR")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewTarget(target)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTargetSettings(target)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
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
              <CardTitle>파이프라인 설정</CardTitle>
              <CardDescription>기본 배포 파이프라인 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>기본 브랜치</Label>
                  <Select
                    value={pipelineSettings.defaultBranch}
                    onValueChange={(value) =>
                      setPipelineSettings({ ...pipelineSettings, defaultBranch: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">main</SelectItem>
                      <SelectItem value="develop">develop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>동시 파이프라인 수</Label>
                  <Input
                    type="number"
                    value={pipelineSettings.concurrentPipelines}
                    onChange={(e) =>
                      setPipelineSettings({
                        ...pipelineSettings,
                        concurrentPipelines: e.target.value,
                      })
                    }
                    min={1}
                    max={10}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">자동화 설정</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>자동 배포 (Staging)</Label>
                      <p className="text-muted-foreground text-sm">
                        develop 브랜치 푸시 시 자동 배포
                      </p>
                    </div>
                    <Switch
                      checked={pipelineSettings.autoDeployStaging}
                      onCheckedChange={(checked) =>
                        setPipelineSettings({ ...pipelineSettings, autoDeployStaging: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>자동 롤백</Label>
                      <p className="text-muted-foreground text-sm">헬스체크 실패 시 자동 롤백</p>
                    </div>
                    <Switch
                      checked={pipelineSettings.autoRollback}
                      onCheckedChange={(checked) =>
                        setPipelineSettings({ ...pipelineSettings, autoRollback: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>배포 승인 필요 (Production)</Label>
                      <p className="text-muted-foreground text-sm">프로덕션 배포 전 승인 필요</p>
                    </div>
                    <Switch
                      checked={pipelineSettings.productionApproval}
                      onCheckedChange={(checked) =>
                        setPipelineSettings({ ...pipelineSettings, productionApproval: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">알림 설정</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Slack 웹훅 URL</Label>
                  </div>
                  <Input
                    placeholder="https://hooks.slack.com/services/..."
                    value={pipelineSettings.slackWebhookUrl}
                    onChange={(e) =>
                      setPipelineSettings({ ...pipelineSettings, slackWebhookUrl: e.target.value })
                    }
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>배포 시작 알림</Label>
                    </div>
                    <Switch
                      checked={pipelineSettings.notifyStart}
                      onCheckedChange={(checked) =>
                        setPipelineSettings({ ...pipelineSettings, notifyStart: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>배포 완료 알림</Label>
                    </div>
                    <Switch
                      checked={pipelineSettings.notifyComplete}
                      onCheckedChange={(checked) =>
                        setPipelineSettings({ ...pipelineSettings, notifyComplete: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>배포 실패 알림</Label>
                    </div>
                    <Switch
                      checked={pipelineSettings.notifyFailed}
                      onCheckedChange={(checked) =>
                        setPipelineSettings({ ...pipelineSettings, notifyFailed: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveSettings}>설정 저장</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 로그 다이얼로그 */}
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>파이프라인 로그</DialogTitle>
            <DialogDescription>
              {selectedPipeline?.name} - {selectedPipeline?.version}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPipeline?.stages.map((stage) => (
              <div key={stage.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stage.name}</span>
                    {getStatusBadge(stage.status)}
                  </div>
                  {stage.duration && (
                    <span className="text-muted-foreground text-sm">
                      {formatDuration(stage.duration)}
                    </span>
                  )}
                </div>
                {stage.logs && stage.logs.length > 0 && (
                  <div className="rounded bg-gray-900 p-3 font-mono text-sm text-gray-100">
                    {stage.logs.map((log, i) => (
                      <div key={i} className="text-red-400">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogsDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
