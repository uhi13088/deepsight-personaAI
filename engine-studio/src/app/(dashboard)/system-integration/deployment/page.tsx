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
import { Progress } from "@/components/ui/progress"
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
  Trash2,
  Plus,
  RefreshCw,
  Terminal,
  FileCode,
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

// 목 데이터
const mockPipelines: Pipeline[] = [
  {
    id: "pipe-001",
    name: "Persona Engine Deploy",
    environment: "production",
    status: "success",
    version: "v2.4.1",
    triggeredBy: "김민수",
    startedAt: "2024-01-15T10:30:00Z",
    finishedAt: "2024-01-15T10:45:00Z",
    commitHash: "a1b2c3d4",
    branch: "main",
    stages: [
      { id: "s1", name: "Build", status: "success", duration: 180 },
      { id: "s2", name: "Test", status: "success", duration: 300 },
      { id: "s3", name: "Security Scan", status: "success", duration: 120 },
      { id: "s4", name: "Deploy", status: "success", duration: 240 },
      { id: "s5", name: "Health Check", status: "success", duration: 60 },
    ],
  },
  {
    id: "pipe-002",
    name: "Matching Algorithm Update",
    environment: "staging",
    status: "running",
    version: "v1.8.0-beta",
    triggeredBy: "이영희",
    startedAt: "2024-01-15T11:00:00Z",
    commitHash: "e5f6g7h8",
    branch: "feature/matching-v2",
    stages: [
      { id: "s1", name: "Build", status: "success", duration: 200 },
      { id: "s2", name: "Test", status: "success", duration: 350 },
      { id: "s3", name: "Security Scan", status: "running" },
      { id: "s4", name: "Deploy", status: "pending" },
      { id: "s5", name: "Health Check", status: "pending" },
    ],
  },
  {
    id: "pipe-003",
    name: "User Insight Module",
    environment: "development",
    status: "failed",
    version: "v3.0.0-alpha",
    triggeredBy: "박지훈",
    startedAt: "2024-01-15T09:00:00Z",
    finishedAt: "2024-01-15T09:15:00Z",
    commitHash: "i9j0k1l2",
    branch: "develop",
    stages: [
      { id: "s1", name: "Build", status: "success", duration: 150 },
      { id: "s2", name: "Test", status: "failed", duration: 180, logs: ["Error: Test case failed - expected 0.85, got 0.72", "AssertionError in matching_accuracy_test.py:45"] },
      { id: "s3", name: "Security Scan", status: "skipped" },
      { id: "s4", name: "Deploy", status: "skipped" },
      { id: "s5", name: "Health Check", status: "skipped" },
    ],
  },
]

const mockTargets: DeploymentTarget[] = [
  {
    id: "target-001",
    name: "Production Cluster",
    environment: "production",
    url: "https://api.deepsight.ai",
    status: "healthy",
    lastDeployed: "2024-01-15T10:45:00Z",
    version: "v2.4.1",
    region: "ap-northeast-2",
  },
  {
    id: "target-002",
    name: "Staging Environment",
    environment: "staging",
    url: "https://staging-api.deepsight.ai",
    status: "healthy",
    lastDeployed: "2024-01-14T16:30:00Z",
    version: "v2.4.0",
    region: "ap-northeast-2",
  },
  {
    id: "target-003",
    name: "Development Server",
    environment: "development",
    url: "https://dev-api.deepsight.ai",
    status: "degraded",
    lastDeployed: "2024-01-15T09:00:00Z",
    version: "v3.0.0-alpha",
    region: "ap-northeast-2",
  },
]

export default function DeploymentPipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>(mockPipelines)
  const [targets] = useState<DeploymentTarget[]>(mockTargets)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false)
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false)
  const [deployConfig, setDeployConfig] = useState({
    environment: "staging" as "development" | "staging" | "production",
    version: "",
    branch: "main",
    enableRollback: true,
    runTests: true,
    notifySlack: true,
  })

  const getStatusBadge = (status: PipelineStatus | StageStatus) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
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

  const handleDeploy = () => {
    // 새 파이프라인 시작 시뮬레이션
    const newPipeline: Pipeline = {
      id: `pipe-${Date.now()}`,
      name: "Manual Deployment",
      environment: deployConfig.environment,
      status: "running",
      version: deployConfig.version || "v2.4.2",
      triggeredBy: "현재 사용자",
      startedAt: new Date().toISOString(),
      commitHash: "new12345",
      branch: deployConfig.branch,
      stages: [
        { id: "s1", name: "Build", status: "running" },
        { id: "s2", name: "Test", status: "pending" },
        { id: "s3", name: "Security Scan", status: "pending" },
        { id: "s4", name: "Deploy", status: "pending" },
        { id: "s5", name: "Health Check", status: "pending" },
      ],
    }
    setPipelines([newPipeline, ...pipelines])
    setIsDeployDialogOpen(false)
  }

  const handleCancelPipeline = (pipelineId: string) => {
    setPipelines(pipelines.map(p =>
      p.id === pipelineId ? { ...p, status: "cancelled" as PipelineStatus } : p
    ))
  }

  const handleRetryPipeline = (pipelineId: string) => {
    setPipelines(pipelines.map(p =>
      p.id === pipelineId ? {
        ...p,
        status: "running" as PipelineStatus,
        stages: p.stages.map(s => ({ ...s, status: "pending" as StageStatus }))
      } : p
    ))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">배포 파이프라인</h1>
          <p className="text-muted-foreground">
            CI/CD 파이프라인 관리 및 배포 자동화
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Rocket className="mr-2 h-4 w-4" />
                새 배포
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>새 배포 시작</DialogTitle>
                <DialogDescription>
                  배포 환경과 설정을 선택하세요.
                </DialogDescription>
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
                      onCheckedChange={(v) => setDeployConfig({ ...deployConfig, enableRollback: v })}
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
                <CardTitle className="text-sm font-medium">총 파이프라인</CardTitle>
                <Rocket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pipelines.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">실행 중</CardTitle>
                <Play className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pipelines.filter(p => p.status === "running").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">성공</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pipelines.filter(p => p.status === "success").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">실패</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pipelines.filter(p => p.status === "failed").length}
                </div>
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
              <div className="space-y-4">
                {pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pipeline.name}</span>
                            {getEnvironmentBadge(pipeline.environment)}
                            {getStatusBadge(pipeline.status)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
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
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-xs
                              ${stage.status === "success" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}
                              ${stage.status === "running" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : ""}
                              ${stage.status === "failed" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : ""}
                              ${stage.status === "pending" ? "bg-gray-100 text-gray-500 dark:bg-gray-800" : ""}
                              ${stage.status === "skipped" ? "bg-gray-100 text-gray-400 dark:bg-gray-800" : ""}
                            `}>
                              {stage.status === "success" && <CheckCircle2 className="h-4 w-4" />}
                              {stage.status === "running" && <Loader2 className="h-4 w-4 animate-spin" />}
                              {stage.status === "failed" && <XCircle className="h-4 w-4" />}
                              {stage.status === "pending" && <Clock className="h-4 w-4" />}
                              {stage.status === "skipped" && <ArrowRight className="h-4 w-4" />}
                            </div>
                            <span className="text-xs mt-1 text-muted-foreground">{stage.name}</span>
                            {stage.duration && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(stage.duration)}
                              </span>
                            )}
                          </div>
                          {index < pipeline.stages.length - 1 && (
                            <div className={`w-8 h-0.5 mx-1 ${
                              stage.status === "success" ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                <Button variant="outline" size="sm">
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
                          <Server className="h-4 w-4 text-muted-foreground" />
                          {target.name}
                        </div>
                      </TableCell>
                      <TableCell>{getEnvironmentBadge(target.environment)}</TableCell>
                      <TableCell>
                        <a
                          href={target.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
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
                      <TableCell className="text-sm text-muted-foreground">
                        {target.lastDeployed ? new Date(target.lastDeployed).toLocaleString("ko-KR") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
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
                  <Select defaultValue="main">
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
                  <Input type="number" defaultValue={3} min={1} max={10} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">자동화 설정</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>자동 배포 (Staging)</Label>
                      <p className="text-sm text-muted-foreground">develop 브랜치 푸시 시 자동 배포</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>자동 롤백</Label>
                      <p className="text-sm text-muted-foreground">헬스체크 실패 시 자동 롤백</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>배포 승인 필요 (Production)</Label>
                      <p className="text-sm text-muted-foreground">프로덕션 배포 전 승인 필요</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">알림 설정</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Slack 웹훅 URL</Label>
                  </div>
                  <Input placeholder="https://hooks.slack.com/services/..." />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>배포 시작 알림</Label>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>배포 완료 알림</Label>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>배포 실패 알림</Label>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Button>설정 저장</Button>
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
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(stage.duration)}
                    </span>
                  )}
                </div>
                {stage.logs && stage.logs.length > 0 && (
                  <div className="rounded bg-gray-900 p-3 font-mono text-sm text-gray-100">
                    {stage.logs.map((log, i) => (
                      <div key={i} className="text-red-400">{log}</div>
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
