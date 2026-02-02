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
    title: "첫 API 호출",
    description: "Match API로 첫 매칭을 시도하세요",
    code: {
      javascript: `import DeepSight from '@deepsight/sdk';

const client = new DeepSight('your-api-key');

const result = await client.match({
  content: "Your content here",
  options: { limit: 5, threshold: 0.7 }
});

console.log(result.matches);`,
      python: `from deepsight import DeepSight

client = DeepSight('your-api-key')

result = client.match(
    content="Your content here",
    options={"limit": 5, "threshold": 0.7}
)

print(result.matches)`,
      curl: `curl -X POST https://api.deepsight.ai/v1/match \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Your content here", "options": {"limit": 5}}'`,
    },
  },
]

const apiEndpoints = [
  {
    method: "POST",
    path: "/v1/match",
    name: "Match",
    description: "콘텐츠와 페르소나 매칭 분석",
    badge: "Core",
  },
  {
    method: "POST",
    path: "/v1/batch-match",
    name: "Batch Match",
    description: "여러 콘텐츠 일괄 매칭",
    badge: "Core",
  },
  {
    method: "GET",
    path: "/v1/personas",
    name: "List Personas",
    description: "페르소나 목록 조회",
    badge: null,
  },
  {
    method: "GET",
    path: "/v1/personas/:id",
    name: "Get Persona",
    description: "페르소나 상세 조회",
    badge: null,
  },
  {
    method: "POST",
    path: "/v1/feedback",
    name: "Feedback",
    description: "매칭 결과 피드백 제출",
    badge: null,
  },
  {
    method: "GET",
    path: "/v1/analytics/usage",
    name: "Usage Analytics",
    description: "사용량 통계 조회",
    badge: "Pro",
  },
]

const docSections = [
  {
    title: "Getting Started",
    icon: Zap,
    items: [
      { name: "Quick Start", href: "/docs/getting-started", description: "5분 만에 시작하기" },
      { name: "Authentication", href: "/docs/authentication", description: "API 인증 가이드" },
      { name: "API Keys", href: "/docs/api-keys", description: "API 키 관리" },
    ],
  },
  {
    title: "API Reference",
    icon: Book,
    items: [
      { name: "Match API", href: "/docs/api-reference/match", description: "콘텐츠 매칭 API" },
      {
        name: "Personas API",
        href: "/docs/api-reference/personas",
        description: "페르소나 조회 API",
      },
      {
        name: "Feedback API",
        href: "/docs/api-reference/feedback",
        description: "피드백 제출 API",
      },
      {
        name: "Analytics API",
        href: "/docs/api-reference/analytics",
        description: "분석 데이터 API",
      },
    ],
  },
  {
    title: "Guides",
    icon: FileText,
    items: [
      {
        name: "6D Vector System",
        href: "/docs/guides/6d-vector",
        description: "6차원 벡터 이해하기",
      },
      {
        name: "Best Practices",
        href: "/docs/guides/best-practices",
        description: "API 활용 모범 사례",
      },
      {
        name: "Rate Limiting",
        href: "/docs/guides/rate-limiting",
        description: "Rate Limit 이해하기",
      },
      {
        name: "Error Handling",
        href: "/docs/guides/error-handling",
        description: "에러 처리 가이드",
      },
    ],
  },
  {
    title: "SDKs & Tools",
    icon: Code,
    items: [
      {
        name: "JavaScript/TypeScript",
        href: "/docs/sdk/javascript",
        description: "Node.js & Browser",
      },
      { name: "Python", href: "/docs/sdk/python", description: "Python 3.8+" },
      { name: "Go", href: "/docs/sdk/go", description: "Go 1.18+" },
      { name: "REST API", href: "/docs/sdk/rest", description: "직접 HTTP 호출" },
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
          { title: "Examples", description: "예제 코드", icon: Code, href: "/docs/examples" },
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
              <Button variant="outline" asChild>
                <Link href="/docs/api-reference">
                  Full Reference
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardDescription>사용 가능한 API 엔드포인트</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {apiEndpoints.map((endpoint) => (
                <Link
                  key={`${endpoint.method}-${endpoint.path}`}
                  href={`/docs/api-reference/${endpoint.name.toLowerCase().replace(" ", "-")}`}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
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
                  <div className="text-muted-foreground flex items-center gap-2">
                    <span className="text-sm">{endpoint.description}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
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
                    <Link
                      key={item.name}
                      href={item.href}
                      className="hover:bg-muted flex items-center justify-between rounded-lg p-3 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      </div>
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    </Link>
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
            <Button variant="outline" asChild>
              <Link href="/docs/guides/6d-vector">
                Learn More about 6D Vector
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
