"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Settings,
  Brain,
  Shield,
  Globe,
  Database,
  Bell,
  Lock,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"

// AI models - empty by default, will be loaded from API
const AI_MODELS: { id: string; name: string; provider: string; status: string; usage: number }[] =
  []

// TODO: Move CONFIG_CATEGORIES to @/services/mock-data.service when configuration management is expanded
// 설정 카테고리
const CONFIG_CATEGORIES = [
  {
    id: "models",
    name: "AI 모델",
    description: "사용할 AI 모델 및 파라미터 설정",
    icon: Brain,
    href: "/global-config/models",
    status: "configured",
  },
  {
    id: "safety",
    name: "안전 필터",
    description: "콘텐츠 안전성 필터 설정",
    icon: Shield,
    href: "/global-config/safety-filters",
    status: "configured",
  },
  {
    id: "api",
    name: "API 설정",
    description: "API 엔드포인트 및 인증 설정",
    icon: Globe,
    href: "/global-config/api-endpoints",
    status: "configured",
  },
  {
    id: "storage",
    name: "저장소",
    description: "데이터 저장 및 캐시 설정",
    icon: Database,
    href: "#",
    status: "configured",
  },
  {
    id: "notifications",
    name: "알림",
    description: "시스템 알림 및 경고 설정",
    icon: Bell,
    href: "#",
    status: "needs_attention",
  },
  {
    id: "security",
    name: "보안",
    description: "인증 및 암호화 설정",
    icon: Lock,
    href: "#",
    status: "configured",
  },
]

export default function GlobalConfigPage() {
  const [activeTab, setActiveTab] = useState("general")
  const [isSaving, setIsSaving] = useState(false)
  const [generalSettings, setGeneralSettings] = useState({
    systemName: "DeepSight Engine Studio",
    environment: "production",
    defaultLanguage: "ko",
    timezone: "Asia/Seoul",
    debugMode: false,
    maintenanceMode: false,
  })
  const [performanceSettings, setPerformanceSettings] = useState({
    cacheTTL: 300,
    maxConcurrentRequests: 100,
    requestTimeout: 5000,
    responseCompression: true,
    queryCaching: true,
  })
  const [advancedSettings, setAdvancedSettings] = useState({
    customHeaders: "",
    envOverrides: "",
    experimentalFeatures: false,
  })

  const handleResetSettings = () => {
    setGeneralSettings({
      systemName: "DeepSight Engine Studio",
      environment: "production",
      defaultLanguage: "ko",
      timezone: "Asia/Seoul",
      debugMode: false,
      maintenanceMode: false,
    })
    setPerformanceSettings({
      cacheTTL: 300,
      maxConcurrentRequests: 100,
      requestTimeout: 5000,
      responseCompression: true,
      queryCaching: true,
    })
    setAdvancedSettings({
      customHeaders: "",
      envOverrides: "",
      experimentalFeatures: false,
    })
    toast.success("설정이 초기화되었습니다")
  }

  const handleSaveAllSettings = async () => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("모든 설정이 저장되었습니다")
    } catch {
      toast.error("설정 저장 중 오류가 발생했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "configured":
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            설정됨
          </Badge>
        )
      case "needs_attention":
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
            <AlertCircle className="h-3 w-3" />
            확인 필요
          </Badge>
        )
      default:
        return <Badge variant="outline">미설정</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Settings className="h-6 w-6 text-gray-500" />
            전역 설정
          </h2>
          <p className="text-muted-foreground">시스템 전체에 적용되는 설정을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetSettings}>
            <RefreshCw className="mr-2 h-4 w-4" />
            초기화
          </Button>
          <Button onClick={handleSaveAllSettings} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "저장 중..." : "모든 설정 저장"}
          </Button>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {CONFIG_CATEGORIES.map((category) => (
          <Link key={category.id} href={category.href}>
            <Card className="hover:border-primary h-full cursor-pointer transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 mb-3 rounded-lg p-3">
                    <category.icon className="text-primary h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold">{category.name}</h3>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                    {category.description}
                  </p>
                  <div className="mt-3">{getStatusBadge(category.status)}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">일반</TabsTrigger>
          <TabsTrigger value="performance">성능</TabsTrigger>
          <TabsTrigger value="advanced">고급</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>일반 설정</CardTitle>
              <CardDescription>기본적인 시스템 설정을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>시스템 이름</Label>
                  <Input
                    value={generalSettings.systemName}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, systemName: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>환경</Label>
                  <Select
                    value={generalSettings.environment}
                    onValueChange={(value) =>
                      setGeneralSettings({ ...generalSettings, environment: value })
                    }
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>기본 언어</Label>
                  <Select
                    value={generalSettings.defaultLanguage}
                    onValueChange={(value) =>
                      setGeneralSettings({ ...generalSettings, defaultLanguage: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>시간대</Label>
                  <Select
                    value={generalSettings.timezone}
                    onValueChange={(value) =>
                      setGeneralSettings({ ...generalSettings, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Seoul">Asia/Seoul (KST)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>디버그 모드</Label>
                    <p className="text-muted-foreground text-sm">
                      상세 로그 및 디버그 정보를 활성화합니다.
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.debugMode}
                    onCheckedChange={(checked) =>
                      setGeneralSettings({ ...generalSettings, debugMode: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      유지보수 모드
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>활성화 시 외부 API 요청이 차단됩니다.</TooltipContent>
                      </Tooltip>
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      시스템 점검을 위해 서비스를 일시 중단합니다.
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setGeneralSettings({ ...generalSettings, maintenanceMode: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active AI Models */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>활성 AI 모델</CardTitle>
                  <CardDescription>현재 사용 중인 AI 모델 현황</CardDescription>
                </div>
                <Link href="/global-config/models">
                  <Button variant="outline" size="sm">
                    모델 관리
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {AI_MODELS.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Brain className="text-muted-foreground mb-4 h-10 w-10" />
                  <h3 className="mb-2 font-medium">등록된 AI 모델이 없습니다</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    모델 관리 페이지에서 AI 모델을 추가하세요.
                  </p>
                  <Link href="/global-config/models">
                    <Button variant="outline" size="sm">
                      모델 추가하기
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {AI_MODELS.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Brain className="text-primary h-5 w-5" />
                        <div>
                          <p className="font-medium">{model.name}</p>
                          <p className="text-muted-foreground text-sm">{model.provider}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{model.usage}%</p>
                          <p className="text-muted-foreground text-xs">사용량</p>
                        </div>
                        <Badge className="bg-green-500">활성</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>성능 설정</CardTitle>
              <CardDescription>시스템 성능 관련 설정을 조정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>캐시 TTL (초)</Label>
                    <span className="font-mono text-sm">{performanceSettings.cacheTTL}</span>
                  </div>
                  <Slider
                    value={[performanceSettings.cacheTTL]}
                    min={60}
                    max={3600}
                    step={60}
                    onValueChange={(value) => {
                      setPerformanceSettings({ ...performanceSettings, cacheTTL: value[0] })
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>최대 동시 요청</Label>
                    <span className="font-mono text-sm">
                      {performanceSettings.maxConcurrentRequests}
                    </span>
                  </div>
                  <Slider
                    value={[performanceSettings.maxConcurrentRequests]}
                    min={10}
                    max={500}
                    step={10}
                    onValueChange={(value) => {
                      setPerformanceSettings({
                        ...performanceSettings,
                        maxConcurrentRequests: value[0],
                      })
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>요청 타임아웃 (ms)</Label>
                    <span className="font-mono text-sm">{performanceSettings.requestTimeout}</span>
                  </div>
                  <Slider
                    value={[performanceSettings.requestTimeout]}
                    min={1000}
                    max={30000}
                    step={1000}
                    onValueChange={(value) => {
                      setPerformanceSettings({ ...performanceSettings, requestTimeout: value[0] })
                    }}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>응답 압축</Label>
                  <p className="text-muted-foreground text-sm">
                    GZIP 압축을 사용하여 응답 크기를 줄입니다.
                  </p>
                </div>
                <Switch
                  checked={performanceSettings.responseCompression}
                  onCheckedChange={(checked) => {
                    setPerformanceSettings({ ...performanceSettings, responseCompression: checked })
                    toast.success(
                      checked ? "응답 압축이 활성화되었습니다" : "응답 압축이 비활성화되었습니다"
                    )
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>쿼리 캐싱</Label>
                  <p className="text-muted-foreground text-sm">
                    자주 사용되는 쿼리 결과를 캐시합니다.
                  </p>
                </div>
                <Switch
                  checked={performanceSettings.queryCaching}
                  onCheckedChange={(checked) => {
                    setPerformanceSettings({ ...performanceSettings, queryCaching: checked })
                    toast.success(
                      checked ? "쿼리 캐싱이 활성화되었습니다" : "쿼리 캐싱이 비활성화되었습니다"
                    )
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>고급 설정</CardTitle>
              <CardDescription>
                주의: 이 설정은 시스템 동작에 큰 영향을 미칠 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-600">주의</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      고급 설정 변경은 시스템 관리자와 상의 후 진행하세요.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>커스텀 헤더</Label>
                  <Textarea
                    placeholder="X-Custom-Header: value"
                    className="font-mono text-sm"
                    value={advancedSettings.customHeaders}
                    onChange={(e) =>
                      setAdvancedSettings({ ...advancedSettings, customHeaders: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label>환경 변수 오버라이드</Label>
                  <Textarea
                    placeholder="KEY=value"
                    className="font-mono text-sm"
                    value={advancedSettings.envOverrides}
                    onChange={(e) =>
                      setAdvancedSettings({ ...advancedSettings, envOverrides: e.target.value })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>실험적 기능</Label>
                  <p className="text-muted-foreground text-sm">
                    안정성이 검증되지 않은 실험적 기능을 활성화합니다.
                  </p>
                </div>
                <Switch
                  checked={advancedSettings.experimentalFeatures}
                  onCheckedChange={(checked) => {
                    setAdvancedSettings({ ...advancedSettings, experimentalFeatures: checked })
                    if (checked) {
                      toast.warning("실험적 기능이 활성화되었습니다. 주의하세요!")
                    } else {
                      toast.info("실험적 기능이 비활성화되었습니다")
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
