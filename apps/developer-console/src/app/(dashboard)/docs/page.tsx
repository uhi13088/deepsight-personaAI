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
  Box,
  Layers,
  Shield,
  Webhook,
  Settings,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const quickStartSteps = [
  {
    step: 1,
    title: "API Key 생성",
    description: "Dashboard에서 API Key를 생성하세요",
    code: null,
    link: "/api-keys/new",
  },
  {
    step: 2,
    title: "SDK 설치",
    description: "선호하는 언어의 SDK를 설치하세요",
    code: {
      npm: "npm install @deepsight/sdk",
      pip: "pip install deepsight",
      go: "go get github.com/deepsight/deepsight-go",
    },
  },
  {
    step: 3,
    title: "페르소나 검색 → 매칭 → 추천",
    description: "Catalog → Profiling → Matching → Recommendation 파이프라인을 호출하세요",
    code: {
      javascript: `import { DeepSight } from '@deepsight/sdk';

const ds = new DeepSight({ apiKey: 'your-api-key' });

// 1. 영화 전문 페르소나 검색 (Catalog API)
const personas = await ds.personas.list({
  expertise: '영화', role: 'REVIEWER'
});

// 2. 유저 6D 프로필 생성 (Profiling API)
const profile = await ds.profiles.create({
  answers: coldStartAnswers
});

// 3. 유저에게 맞는 페르소나 매칭 (Matching API)
const matches = await ds.match({
  profileId: profile.id
});

// 4. 페르소나가 콘텐츠 추천 + 이유 (Recommendation API)
const recs = await ds.recommend({
  personaId: matches[0].id,
  profileId: profile.id
});
// → { items: [{ title: "기생충", reason: "서사 구조가..." }] }`,
      python: `from deepsight import DeepSight

ds = DeepSight('your-api-key')

# 1. 페르소나 검색 (Catalog API)
personas = ds.personas.list(expertise='영화', role='REVIEWER')

# 2. 유저 프로필 생성 (Profiling API)
profile = ds.profiles.create(answers=cold_start_answers)

# 3. 매칭 (Matching API)
matches = ds.match(profile_id=profile.id)

# 4. 추천 + 이유 (Recommendation API)
recs = ds.recommend(
    persona_id=matches[0].id,
    profile_id=profile.id
)`,
      curl: `# 1. 페르소나 검색
curl https://api.deepsight.ai/v1/personas?expertise=영화&role=REVIEWER \\
  -H "Authorization: Bearer your-api-key"

# 2. 유저 프로필 생성
curl -X POST https://api.deepsight.ai/v1/profiles \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"answers": [...]}'

# 3. 매칭
curl -X POST https://api.deepsight.ai/v1/match \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"profile_id": "prof_abc123"}'`,
    },
  },
]

const apiEndpoints = [
  {
    method: "GET",
    path: "/v1/personas",
    name: "List Personas",
    description: "등록된 페르소나 목록 검색 및 조회",
    badge: "Catalog",
  },
  {
    method: "GET",
    path: "/v1/personas/:id",
    name: "Get Persona",
    description: "페르소나 상세 정보 조회 (6D 벡터, 전문분야 등)",
    badge: "Catalog",
  },
  {
    method: "POST",
    path: "/v1/profiles",
    name: "Create Profile",
    description: "유저의 6D 벡터 프로필 생성 (콜드스타트/SNS 연동)",
    badge: "Profiling",
  },
  {
    method: "GET",
    path: "/v1/profiles/:id",
    name: "Get Profile",
    description: "유저 프로필 상세 조회",
    badge: "Profiling",
  },
  {
    method: "POST",
    path: "/v1/match",
    name: "Match",
    description: "유저 프로필과 페르소나 간 최적 매칭",
    badge: "Matching",
  },
  {
    method: "POST",
    path: "/v1/recommend",
    name: "Recommend",
    description: "매칭된 페르소나가 유저에게 콘텐츠 추천 + 이유 설명",
    badge: "Recommendation",
  },
  {
    method: "POST",
    path: "/v1/evaluate",
    name: "Evaluate",
    description: "페르소나 관점에서 특정 콘텐츠 리뷰 및 분석",
    badge: "Evaluation",
  },
  {
    method: "POST",
    path: "/v1/feedback",
    name: "Feedback",
    description: "추천/평가 결과에 대한 피드백 제출",
    badge: null,
  },
  {
    method: "GET",
    path: "/v1/analytics/usage",
    name: "Usage Analytics",
    description: "API 사용량 및 매칭 정확도 통계 조회",
    badge: "Pro",
  },
]

const docSections = [
  {
    title: "Getting Started",
    icon: Zap,
    items: [
      { name: "Quick Start", description: "5분 만에 시작하기", badge: "아래 참조" },
      { name: "Authentication", description: "API 인증 가이드" },
      { name: "API Keys", description: "API 키 관리" },
    ],
  },
  {
    title: "Core APIs",
    icon: Book,
    items: [
      { name: "Catalog API", description: "페르소나 검색 및 조회" },
      { name: "Profiling API", description: "유저 6D 프로필 생성" },
      { name: "Matching API", description: "유저-페르소나 매칭" },
      { name: "Recommendation API", description: "콘텐츠 추천 + 이유" },
      { name: "Evaluation API", description: "콘텐츠 리뷰 및 분석" },
    ],
  },
  {
    title: "Guides",
    icon: FileText,
    items: [
      { name: "6D Vector System", description: "6차원 벡터 이해하기" },
      { name: "Profiling Methods", description: "콜드스타트 & SNS 연동" },
      { name: "Best Practices", description: "API 활용 모범 사례" },
      { name: "Rate Limiting", description: "Rate Limit 이해하기" },
      { name: "Error Handling", description: "에러 처리 가이드" },
    ],
  },
  {
    title: "SDKs & Tools",
    icon: Code,
    items: [
      { name: "JavaScript/TypeScript", description: "Node.js & Browser" },
      { name: "Python", description: "Python 3.8+" },
      { name: "Go", description: "Go 1.18+" },
      { name: "REST API", description: "직접 HTTP 호출" },
    ],
  },
]

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = React.useState("javascript")

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground text-lg">
          DeepSight API를 시작하는 데 필요한 모든 정보를 찾아보세요
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: "Quick Start", description: "5분 만에 시작", icon: Zap, href: "#quickstart" },
          { title: "API Reference", description: "전체 API 문서", icon: Book, href: "#api" },
          { title: "Playground", description: "API 테스트", icon: Terminal, href: "/playground" },
          { title: "Examples", description: "예제 코드", icon: Code, href: "#quickstart" },
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
            <CardDescription>3단계로 DeepSight API를 시작하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {quickStartSteps.map((step, index) => (
              <div key={step.step} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full font-bold">
                    {step.step}
                  </div>
                  {index < quickStartSteps.length - 1 && (
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

                  {step.code && typeof step.code === "object" && !("javascript" in step.code) && (
                    <div className="space-y-2">
                      {Object.entries(step.code).map(([key, value]) => (
                        <div key={key} className="relative">
                          <pre className="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-sm">
                            <code>{value}</code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2"
                            onClick={() => copyCode(value, `${step.step}-${key}`)}
                          >
                            {copiedCode === `${step.step}-${key}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.code && "javascript" in step.code && (
                    <Tabs value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <TabsList>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
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
                              onClick={() => copyCode(code, `${step.step}-${lang}`)}
                            >
                              {copiedCode === `${step.step}-${lang}` ? (
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

      {/* API Endpoints Section */}
      <section id="api">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Book className="text-primary h-5 w-5" />
                <CardTitle>API Endpoints</CardTitle>
              </div>
              <Button variant="outline" disabled>
                Full Reference
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <CardDescription>사용 가능한 API 엔드포인트</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {apiEndpoints.map((endpoint) => (
                <div
                  key={`${endpoint.method}-${endpoint.path}`}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-xs",
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
                  <span className="text-muted-foreground text-sm">{endpoint.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Documentation Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {docSections.map((section) => {
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
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 6D Vector Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="text-primary h-5 w-5" />
            <CardTitle>6D Vector System</CardTitle>
          </div>
          <CardDescription>DeepSight의 핵심 기술인 6차원 벡터 시스템</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              { name: "Depth", description: "분석의 깊이", color: "bg-blue-500" },
              { name: "Lens", description: "관찰 관점", color: "bg-purple-500" },
              { name: "Stance", description: "입장과 태도", color: "bg-pink-500" },
              { name: "Scope", description: "범위와 규모", color: "bg-orange-500" },
              { name: "Taste", description: "취향과 선호", color: "bg-green-500" },
              { name: "Purpose", description: "목적과 의도", color: "bg-cyan-500" },
            ].map((dimension) => (
              <div key={dimension.name} className="rounded-lg border p-4 text-center">
                <div className={cn("mx-auto mb-3 h-12 w-12 rounded-full", dimension.color)} />
                <h4 className="font-medium">{dimension.name}</h4>
                <p className="text-muted-foreground text-sm">{dimension.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button variant="outline" disabled>
              Learn More about 6D Vector
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
