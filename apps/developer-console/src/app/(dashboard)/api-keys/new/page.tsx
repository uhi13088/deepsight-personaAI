"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Key,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type Environment = "test" | "live"

interface Permission {
  id: string
  name: string
  description: string
  endpoints: string[]
}

const permissions: Permission[] = [
  {
    id: "catalog",
    name: "Catalog API",
    description: "등록된 페르소나 검색 및 상세 조회",
    endpoints: ["GET /v1/personas", "GET /v1/personas/:id"],
  },
  {
    id: "profiling",
    name: "Profiling API",
    description: "유저 6D 벡터 프로필 생성 및 조회",
    endpoints: ["POST /v1/profiles", "GET /v1/profiles/:id"],
  },
  {
    id: "matching",
    name: "Matching API",
    description: "유저 프로필과 페르소나 간 최적 매칭",
    endpoints: ["POST /v1/match"],
  },
  {
    id: "recommendation",
    name: "Recommendation API",
    description: "매칭된 페르소나가 콘텐츠 추천 및 이유 설명",
    endpoints: ["POST /v1/recommend"],
  },
  {
    id: "evaluation",
    name: "Evaluation API",
    description: "페르소나 관점에서 콘텐츠 리뷰 및 분석",
    endpoints: ["POST /v1/evaluate"],
  },
  {
    id: "feedback",
    name: "Feedback API",
    description: "추천/평가 결과에 대한 피드백 제출",
    endpoints: ["POST /v1/feedback"],
  },
  {
    id: "analytics",
    name: "Analytics API",
    description: "API 사용량 및 매칭 정확도 통계 조회",
    endpoints: ["GET /v1/analytics/*"],
  },
]

const steps = [
  { id: 1, name: "기본 정보", description: "Key 이름 설정" },
  { id: 2, name: "환경 선택", description: "Test 또는 Live" },
  { id: 3, name: "권한 설정", description: "API 접근 권한" },
  { id: 4, name: "완료", description: "Key 생성 완료" },
]

export default function NewApiKeyPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(1)
  const [keyName, setKeyName] = React.useState("")
  const [environment, setEnvironment] = React.useState<Environment | null>(null)
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([])
  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null)
  const [copiedKey, setCopiedKey] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return keyName.trim().length >= 3
      case 2:
        return environment !== null
      case 3:
        return selectedPermissions.length > 0
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (currentStep === 3) {
      // Create API key
      setIsCreating(true)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const prefix = environment === "live" ? "pk_live_" : "pk_test_"
      const randomPart = Array.from({ length: 32 }, () =>
        "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36))
      ).join("")
      setGeneratedKey(prefix + randomPart)
      setIsCreating(false)
      setCurrentStep(4)
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const copyToClipboard = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    )
  }

  const selectAllPermissions = () => {
    if (selectedPermissions.length === permissions.length) {
      setSelectedPermissions([])
    } else {
      setSelectedPermissions(permissions.map((p) => p.id))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/api-keys">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">새 API Key 생성</h1>
          <p className="text-muted-foreground">단계별로 API Key를 생성하세요</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "z-10 flex flex-col items-center gap-2",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  currentStep > step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </p>
                <p className="text-muted-foreground hidden text-xs sm:block">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-muted absolute left-0 right-0 top-5 -z-0 h-0.5">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="keyName">API Key 이름</Label>
                <Input
                  id="keyName"
                  placeholder="예: Production Server, Development, Mobile App"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="max-w-md"
                />
                <p className="text-muted-foreground text-sm">
                  식별하기 쉬운 이름을 입력하세요 (최소 3자)
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>API Key 명명 규칙</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li>용도를 쉽게 파악할 수 있는 이름 사용</li>
                    <li>
                      예: &quot;Production Server&quot;, &quot;iOS App&quot;,
                      &quot;Development&quot;
                    </li>
                    <li>환경(Live/Test)은 다음 단계에서 선택합니다</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Environment Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => setEnvironment("test")}
                  className={cn(
                    "hover:border-primary/50 relative rounded-lg border-2 p-6 text-left transition-all",
                    environment === "test" ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  {environment === "test" && (
                    <div className="absolute right-3 top-3">
                      <CheckCircle className="text-primary h-5 w-5" />
                    </div>
                  )}
                  <div className="mb-3 flex items-center gap-3">
                    <div className="bg-secondary rounded-lg p-2">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Test Environment</h3>
                      <Badge variant="secondary">테스트</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3 text-sm">
                    개발 및 테스트용 API Key입니다. 실제 과금이 발생하지 않습니다.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      무료 사용 가능
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Rate limit: 100 req/min
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      샌드박스 데이터 사용
                    </li>
                  </ul>
                </button>

                <button
                  onClick={() => setEnvironment("live")}
                  className={cn(
                    "hover:border-primary/50 relative rounded-lg border-2 p-6 text-left transition-all",
                    environment === "live" ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  {environment === "live" && (
                    <div className="absolute right-3 top-3">
                      <CheckCircle className="text-primary h-5 w-5" />
                    </div>
                  )}
                  <div className="mb-3 flex items-center gap-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Shield className="text-primary h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Live Environment</h3>
                      <Badge>프로덕션</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3 text-sm">
                    프로덕션용 API Key입니다. 실제 서비스에서 사용됩니다.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      실제 API 호출 과금
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Rate limit: 플랜에 따라 다름
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      실제 프로덕션 데이터
                    </li>
                  </ul>
                </button>
              </div>

              {environment === "live" && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>프로덕션 환경 주의사항</AlertTitle>
                  <AlertDescription>
                    Live API Key는 실제 과금이 발생합니다. 먼저 Test 환경에서 충분히 테스트한 후
                    사용하세요.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Permissions */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">API 권한 선택</h3>
                  <p className="text-muted-foreground text-sm">
                    이 Key로 접근할 수 있는 API를 선택하세요
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={selectAllPermissions}>
                  {selectedPermissions.length === permissions.length ? "전체 해제" : "전체 선택"}
                </Button>
              </div>

              <div className="space-y-3">
                {permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className={cn(
                      "cursor-pointer rounded-lg border-2 p-4 transition-colors",
                      selectedPermissions.includes(perm.id)
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    )}
                    onClick={() => togglePermission(perm.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedPermissions.includes(perm.id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{perm.name}</h4>
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">{perm.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {perm.endpoints.map((endpoint) => (
                            <code
                              key={endpoint}
                              className="bg-muted rounded px-2 py-1 font-mono text-xs"
                            >
                              {endpoint}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>최소 권한 원칙</AlertTitle>
                <AlertDescription>
                  보안을 위해 필요한 권한만 선택하세요. 나중에 언제든지 권한을 변경할 수 있습니다.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && generatedKey && (
            <div className="space-y-6">
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold">API Key 생성 완료!</h2>
                <p className="text-muted-foreground mt-1">
                  새로운 API Key가 성공적으로 생성되었습니다
                </p>
              </div>

              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>중요: API Key를 안전하게 보관하세요</AlertTitle>
                <AlertDescription>
                  이 키는 한 번만 표시됩니다. 창을 닫기 전에 안전한 곳에 복사해 두세요. 보안을 위해
                  키를 다시 확인할 수 없습니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <div className="bg-muted flex-1 break-all rounded-lg p-4 font-mono text-sm">
                      {generatedKey}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                      className="shrink-0"
                    >
                      {copiedKey ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">이름</p>
                    <p className="font-medium">{keyName}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">환경</p>
                    <Badge variant={environment === "live" ? "default" : "secondary"}>
                      {environment === "live" ? "Live" : "Test"}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">권한</p>
                    <p className="font-medium">{selectedPermissions.length} APIs</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="mb-2 font-medium">다음 단계</h4>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    API Key를 환경 변수 또는 시크릿 매니저에 저장
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    문서를 참고하여 첫 API 호출 테스트
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Playground에서 API 동작 확인
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || currentStep === 4}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          이전
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed() || isCreating}>
            {isCreating ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                생성 중...
              </>
            ) : currentStep === 3 ? (
              <>
                <Key className="mr-2 h-4 w-4" />
                API Key 생성
              </>
            ) : (
              <>
                다음
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/docs">문서 보기</Link>
            </Button>
            <Button asChild>
              <Link href="/api-keys">API Keys 목록</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
