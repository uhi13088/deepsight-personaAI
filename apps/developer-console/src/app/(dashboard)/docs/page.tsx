"use client"

import * as React from "react"
import Link from "next/link"
import {
  Book,
  Code,
  Zap,
  FileText,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Layers,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// ============================================================================
// Quick Start Steps (v3)
// ============================================================================

const QUICK_START_STEPS = [
  {
    step: 1,
    title: "API Key 생성",
    description: "Dashboard에서 API Key를 생성하세요",
    link: "/api-keys/new",
  },
  {
    step: 2,
    title: "SDK 설치",
    description: "선호하는 언어의 SDK를 설치하세요",
    installCommands: {
      npm: "npm install @deepsight/sdk",
      pip: "pip install deepsight",
      java: 'implementation "ai.deepsight:sdk:3.0.0"',
      go: "go get github.com/deepsight/deepsight-go",
    },
  },
  {
    step: 3,
    title: "첫 번째 호출: 온보딩 → 매칭 → 피드백",
    description: "유저 온보딩 후 3-Tier 매칭을 실행하세요",
    code: {
      nodejs: `import { DeepSight } from '@deepsight/sdk';

const ds = new DeepSight({ apiKey: 'your-api-key' });

// 1. 유저 온보딩 (QUICK: 12문항)
const onboarding = await ds.users.onboard('user_abc123', {
  level: 'QUICK',
  responses: quickResponses,
  consent: { data_collection: true }
});

// 2. 3-Tier 매칭 (basic / advanced / exploration)
const match = await ds.match({
  user_id: 'user_abc123',
  context: { category: 'movie' },
  options: { matching_tier: 'advanced', top_n: 5 }
});

// 3. 피드백
await ds.feedback({
  user_id: 'user_abc123',
  persona_id: match.matches[0].persona_id,
  feedback_type: 'LIKE'
});`,
      python: `from deepsight import DeepSight

ds = DeepSight('your-api-key')

# 1. 유저 온보딩 (QUICK: 12문항)
onboarding = ds.users.onboard('user_abc123',
    level='QUICK',
    responses=quick_responses,
    consent={'data_collection': True}
)

# 2. 3-Tier 매칭
match = ds.match(
    user_id='user_abc123',
    context={'category': 'movie'},
    options={'matching_tier': 'advanced', 'top_n': 5}
)

# 3. 피드백
ds.feedback(
    user_id='user_abc123',
    persona_id=match.matches[0].persona_id,
    feedback_type='LIKE'
)`,
      curl: `# 1. 유저 온보딩
curl -X POST https://api.deepsight.ai/v1/users/user_abc123/onboarding \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"level": "QUICK", "responses": [...], "consent": {"data_collection": true}}'

# 2. 매칭
curl -X POST https://api.deepsight.ai/v1/match \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "user_abc123", "options": {"matching_tier": "advanced"}}'

# 3. 피드백
curl -X POST https://api.deepsight.ai/v1/feedback \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "user_abc123", "persona_id": "p_01", "feedback_type": "LIKE"}'`,
    },
  },
]

// ============================================================================
// v3 API Endpoints
// ============================================================================

const V3_API_ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/match",
    name: "Match",
    description: "유저-페르소나 3-Tier 매칭 (basic / advanced / exploration)",
    badge: "Matching",
  },
  {
    method: "GET",
    path: "/v1/personas",
    name: "List Personas",
    description: "페르소나 목록 조회 (role, expertise 필터)",
    badge: "Catalog",
  },
  {
    method: "GET",
    path: "/v1/personas/:id",
    name: "Get Persona",
    description: "페르소나 상세 (3-Layer 벡터 + paradox + 교차축)",
    badge: "Catalog",
  },
  {
    method: "POST",
    path: "/v1/personas/filter",
    name: "Filter Personas",
    description: "106D+ 다차원 정밀 검색 (아키타입, 벡터 범위, paradox)",
    badge: "Enterprise",
  },
  {
    method: "POST",
    path: "/v1/feedback",
    name: "Submit Feedback",
    description: "매칭 결과 피드백 (LIKE / DISLIKE)",
    badge: null,
  },
  {
    method: "POST",
    path: "/v1/batch-match",
    name: "Batch Match",
    description: "다건 동시 매칭 (최대 100건)",
    badge: null,
  },
  {
    method: "POST",
    path: "/v1/users/:id/onboarding",
    name: "Onboarding",
    description: "유저 온보딩 (QUICK 12 / STANDARD 30 / DEEP 60문항)",
    badge: "User",
  },
  {
    method: "GET",
    path: "/v1/users/:id/profile",
    name: "User Profile",
    description: "유저 성향 벡터 프로필 조회 (3-Layer + 교차축)",
    badge: "User",
  },
  {
    method: "GET",
    path: "/v1/users/:id/consent",
    name: "Get Consent",
    description: "유저 데이터 동의 상태 조회",
    badge: "User",
  },
  {
    method: "POST",
    path: "/v1/users/:id/consent",
    name: "Update Consent",
    description: "유저 데이터 동의 생성/변경 + 부수효과",
    badge: "User",
  },
]

// ============================================================================
// Doc Navigation Sections
// ============================================================================

const DOC_SECTIONS = [
  {
    title: "Getting Started",
    icon: Zap,
    items: [
      { name: "Quick Start", description: "5분 만에 시작하기", anchor: "#quickstart" },
      { name: "Authentication", description: "API Key 인증 + 멀티테넌시" },
      { name: "Error Handling", description: "에러 코드 + 처리 가이드" },
    ],
  },
  {
    title: "Core APIs",
    icon: Book,
    items: [
      { name: "Match API", description: "3-Tier 유저-페르소나 매칭" },
      { name: "Persona Catalog", description: "페르소나 검색 및 상세 조회" },
      { name: "Persona Filter", description: "Enterprise 다차원 검색" },
      { name: "Feedback API", description: "매칭 결과 피드백 루프" },
      { name: "Batch Match", description: "다건 동시 매칭" },
    ],
  },
  {
    title: "User APIs",
    icon: FileText,
    items: [
      { name: "Onboarding", description: "QUICK / STANDARD / DEEP 온보딩" },
      { name: "User Profile", description: "성향 벡터 + 교차축 프로필" },
      { name: "Consent", description: "데이터 동의 관리 (4종)" },
    ],
  },
  {
    title: "SDKs",
    icon: Code,
    items: [
      { name: "Python SDK", description: "Python 3.9+" },
      { name: "Node.js SDK", description: "Node.js 18+" },
      { name: "Java SDK", description: "Java 17+" },
      { name: "Go SDK", description: "Go 1.21+" },
    ],
  },
]

// ============================================================================
// Auth Section Data
// ============================================================================

const AUTH_SECTION = {
  headers: `# 모든 요청에 API Key 포함
Authorization: Bearer ds_live_xxxxxxxxxxxx

# Rate Limit 응답 헤더
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1700000060`,
  errors: [
    { code: "UNAUTHORIZED", status: 401, description: "API Key 누락 또는 유효하지 않음" },
    { code: "FORBIDDEN", status: 403, description: "해당 리소스에 접근 권한 없음" },
    { code: "RATE_LIMIT_EXCEEDED", status: 429, description: "Rate Limit 초과" },
    { code: "CONSENT_REQUIRED", status: 403, description: "유저 동의 미취득 상태" },
    { code: "NOT_FOUND", status: 404, description: "리소스를 찾을 수 없음" },
    { code: "INVALID_FIELD", status: 400, description: "요청 필드 유효성 검증 실패" },
    { code: "CONFLICT", status: 409, description: "리소스 충돌 (온보딩 중복 등)" },
    { code: "INTERNAL_ERROR", status: 500, description: "서버 내부 오류" },
  ],
}

// ============================================================================
// Integration Guide Flow
// ============================================================================

const INTEGRATION_FLOW = [
  {
    step: "1. 온보딩",
    description: "유저 성향 벡터 생성 (QUICK 12문항)",
    api: "POST /v1/users/:id/onboarding",
  },
  { step: "2. 동의 관리", description: "데이터 수집·분석 동의", api: "POST /v1/users/:id/consent" },
  { step: "3. 매칭", description: "3-Tier 유저-페르소나 매칭", api: "POST /v1/match" },
  { step: "4. 피드백", description: "매칭 결과 LIKE/DISLIKE", api: "POST /v1/feedback" },
  {
    step: "5. 프로필 조회",
    description: "성향 벡터 + 정밀도 확인",
    api: "GET /v1/users/:id/profile",
  },
]

// ============================================================================
// Component
// ============================================================================

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar Navigation */}
      <nav className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-6 space-y-6">
          {DOC_SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <div key={section.title}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-semibold">{section.title}</span>
                </div>
                <ul className="space-y-1 border-l pl-4">
                  {section.items.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.anchor || "#"}
                        className="text-muted-foreground hover:text-foreground block py-1 text-sm transition-colors"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <div className="min-w-0 flex-1 space-y-8">
        {/* Header */}
        <div className="max-w-3xl">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="text-muted-foreground text-lg">
            DeepSight v3 API — 3-Layer 106D+ 벡터 매칭 플랫폼
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { title: "Quick Start", description: "5분 만에 시작", icon: Zap, href: "#quickstart" },
            { title: "API Reference", description: "전체 API 문서", icon: Book, href: "#api" },
            {
              title: "Playground",
              description: "API 테스트",
              icon: Terminal,
              href: "/playground",
            },
            { title: "Auth Guide", description: "인증 + 에러", icon: Shield, href: "#auth" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Card
                key={item.title}
                className="hover:border-primary/50 cursor-pointer transition-colors"
              >
                <Link href={item.href}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <Icon className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            )
          })}
        </div>

        {/* Quick Start Section */}
        <section id="quickstart">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="text-primary h-5 w-5" />
                <CardTitle>Quick Start</CardTitle>
              </div>
              <CardDescription>3단계로 DeepSight v3 API를 시작하세요 (약 5분)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {QUICK_START_STEPS.map((step, index) => (
                <div key={step.step} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full font-bold">
                      {step.step}
                    </div>
                    {index < QUICK_START_STEPS.length - 1 && (
                      <div className="bg-border mt-2 h-full w-0.5" />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <h3 className="mb-1 text-lg font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>

                    {step.link && (
                      <Button asChild>
                        <Link href={step.link}>
                          API Key 생성하기
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    )}

                    {step.installCommands && (
                      <div className="space-y-2">
                        {Object.entries(step.installCommands).map(([key, cmd]) => (
                          <div key={key} className="relative">
                            <pre className="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-sm">
                              <code>{cmd}</code>
                            </pre>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2"
                              onClick={() => copyCode(cmd, `install-${key}`)}
                            >
                              {copiedCode === `install-${key}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {step.code && (
                      <Tabs defaultValue="nodejs">
                        <TabsList>
                          <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                          <TabsTrigger value="python">Python</TabsTrigger>
                          <TabsTrigger value="curl">cURL</TabsTrigger>
                        </TabsList>
                        {Object.entries(step.code).map(([lang, code]) => (
                          <TabsContent key={lang} value={lang}>
                            <div className="relative">
                              <pre className="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-sm">
                                <code>{code}</code>
                              </pre>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-2"
                                onClick={() => copyCode(code, `qs-${lang}`)}
                              >
                                {copiedCode === `qs-${lang}` ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* API Reference Section */}
        <section id="api">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Book className="text-primary h-5 w-5" />
                  <CardTitle>API Reference</CardTitle>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/playground">
                    Try in Playground
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>v3 API 엔드포인트 전체 목록</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {V3_API_ENDPOINTS.map((endpoint) => (
                  <div
                    key={`${endpoint.method}-${endpoint.path}`}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-14 justify-center font-mono text-xs",
                          endpoint.method === "GET" && "border-green-600 text-green-600",
                          endpoint.method === "POST" && "border-blue-600 text-blue-600"
                        )}
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="font-mono text-sm">{endpoint.path}</code>
                      {endpoint.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {endpoint.badge}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground hidden text-sm md:block">
                      {endpoint.description}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Auth + Error Codes Section */}
        <section id="auth">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="text-primary h-5 w-5" />
                <CardTitle>Authentication & Error Handling</CardTitle>
              </div>
              <CardDescription>API Key 인증, Rate Limit 헤더, 에러 코드</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auth Headers */}
              <div>
                <h3 className="mb-3 font-semibold">인증 + Rate Limit 헤더</h3>
                <div className="relative">
                  <pre className="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-sm">
                    <code>{AUTH_SECTION.headers}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={() => copyCode(AUTH_SECTION.headers, "auth-headers")}
                  >
                    {copiedCode === "auth-headers" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Error Codes */}
              <div>
                <h3 className="mb-3 font-semibold">에러 코드</h3>
                <div className="space-y-2">
                  {AUTH_SECTION.errors.map((err) => (
                    <div
                      key={err.code}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={err.status >= 500 ? "destructive" : "outline"}
                          className="font-mono text-xs"
                        >
                          {err.status}
                        </Badge>
                        <code className="font-mono text-sm">{err.code}</code>
                      </div>
                      <span className="text-muted-foreground text-sm">{err.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Integration Guide */}
        <section id="integration">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="text-primary h-5 w-5" />
                <CardTitle>Integration Guide</CardTitle>
              </div>
              <CardDescription>온보딩 → 동의 → 매칭 → 피드백 통합 플로우</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {INTEGRATION_FLOW.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 rounded-lg border p-4">
                    <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.step}</h4>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </div>
                    <code className="text-muted-foreground hidden font-mono text-xs md:block">
                      {item.api}
                    </code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3-Layer Vector System */}
        <section id="vectors">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="text-primary h-5 w-5" />
                <CardTitle>3-Layer Vector System</CardTitle>
              </div>
              <CardDescription>
                L1 Social Persona (7D) + L2 Core Temperament (5D) + L3 Narrative Drive (4D) = 106D+
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* L1 */}
              <div>
                <h3 className="mb-3 font-semibold">L1 — Social Persona (7 dimensions)</h3>
                <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
                  {[
                    { name: "Depth", desc: "분석의 깊이", color: "bg-blue-500" },
                    { name: "Lens", desc: "관찰 관점", color: "bg-purple-500" },
                    { name: "Stance", desc: "입장·태도", color: "bg-pink-500" },
                    { name: "Scope", desc: "범위·규모", color: "bg-orange-500" },
                    { name: "Taste", desc: "취향·선호", color: "bg-green-500" },
                    { name: "Purpose", desc: "목적·의도", color: "bg-cyan-500" },
                    { name: "Sociability", desc: "사회성", color: "bg-yellow-500" },
                  ].map((d) => (
                    <div key={d.name} className="rounded-lg border p-3 text-center">
                      <div className={cn("mx-auto mb-2 h-8 w-8 rounded-full", d.color)} />
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-muted-foreground text-xs">{d.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* L2 */}
              <div>
                <h3 className="mb-3 font-semibold">L2 — Core Temperament / OCEAN (5 dimensions)</h3>
                <div className="grid gap-3 md:grid-cols-5">
                  {[
                    { name: "Openness", desc: "개방성" },
                    { name: "Conscientiousness", desc: "성실성" },
                    { name: "Extraversion", desc: "외향성" },
                    { name: "Agreeableness", desc: "친화성" },
                    { name: "Neuroticism", desc: "신경증" },
                  ].map((d) => (
                    <div key={d.name} className="rounded-lg border p-3 text-center">
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-muted-foreground text-xs">{d.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* L3 */}
              <div>
                <h3 className="mb-3 font-semibold">L3 — Narrative Drive (4 dimensions)</h3>
                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    { name: "Lack", desc: "결핍/욕망" },
                    { name: "Moral Compass", desc: "도덕적 나침반" },
                    { name: "Volatility", desc: "변동성" },
                    { name: "Growth Arc", desc: "성장 곡선" },
                  ].map((d) => (
                    <div key={d.name} className="rounded-lg border p-3 text-center">
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-muted-foreground text-xs">{d.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matching Tiers */}
              <div>
                <h3 className="mb-3 font-semibold">3-Tier Matching</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      tier: "Basic",
                      formula: "L1 100%",
                      desc: "Social Persona만으로 빠른 매칭",
                    },
                    {
                      tier: "Advanced",
                      formula: "L1 70% + L2 20% + EPS 10%",
                      desc: "Temperament + Paradox 반영",
                    },
                    {
                      tier: "Exploration",
                      formula: "L1 50% + L2 20% + L3 20% + EPS 10%",
                      desc: "전체 레이어 탐색 매칭",
                    },
                  ].map((t) => (
                    <div key={t.tier} className="rounded-lg border p-4">
                      <Badge variant="outline" className="mb-2">
                        {t.tier}
                      </Badge>
                      <p className="font-mono text-xs">{t.formula}</p>
                      <p className="text-muted-foreground mt-1 text-sm">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SDKs */}
        <section id="sdks">
          <div className="grid gap-6 md:grid-cols-2">
            {DOC_SECTIONS.filter((s) => s.title === "SDKs" || s.title === "User APIs").map(
              (section) => {
                const Icon = section.icon
                return (
                  <Card key={section.title}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon className="text-primary h-5 w-5" />
                        <CardTitle>{section.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {section.items.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-muted-foreground text-sm">{item.description}</p>
                            </div>
                            <ChevronRight className="text-muted-foreground h-4 w-4" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              }
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
