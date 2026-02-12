"use client"

import * as React from "react"
import {
  Play,
  Copy,
  Check,
  Clock,
  Zap,
  RotateCcw,
  ChevronDown,
  Settings2,
  Braces,
  Trash2,
  History,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// ============================================================================
// v3 Endpoint Definitions
// ============================================================================

interface EndpointDef {
  id: string
  method: "GET" | "POST"
  path: string
  name: string
  description: string
  defaultBody: object | null
}

const V3_ENDPOINTS: EndpointDef[] = [
  {
    id: "match",
    method: "POST",
    path: "/v1/match",
    name: "매칭 — 유저-페르소나 매칭",
    description: "유저에게 최적화된 페르소나를 3-Tier 매칭으로 추천합니다",
    defaultBody: {
      user_id: "user_abc123",
      context: {
        category: "movie",
        time_of_day: "evening",
        device: "mobile",
      },
      options: {
        top_n: 5,
        matching_tier: "advanced",
        include_score: true,
      },
    },
  },
  {
    id: "personas-list",
    method: "GET",
    path: "/v1/personas",
    name: "페르소나 목록",
    description: "등록된 페르소나 목록을 조회합니다 (role/expertise 필터 지원)",
    defaultBody: null,
  },
  {
    id: "personas-detail",
    method: "GET",
    path: "/v1/personas/:id",
    name: "페르소나 상세",
    description: "페르소나 상세 정보 (3-Layer 벡터, paradox, 교차축) 조회",
    defaultBody: null,
  },
  {
    id: "personas-filter",
    method: "POST",
    path: "/v1/personas/filter",
    name: "페르소나 필터 (Enterprise)",
    description: "106D+ 다차원 정밀 검색으로 페르소나를 필터링합니다",
    defaultBody: {
      filters: {
        archetype: {
          include: ["ironic-philosopher", "wounded-critic"],
        },
        vectors: {
          l1: {
            depth: { min: 0.6, max: 1.0 },
          },
        },
      },
      sort: { field: "paradox.extendedScore", order: "desc" },
      page: 1,
      per_page: 20,
    },
  },
  {
    id: "feedback",
    method: "POST",
    path: "/v1/feedback",
    name: "피드백 제출",
    description: "매칭 결과에 대한 피드백을 제출합니다",
    defaultBody: {
      user_id: "user_abc123",
      persona_id: "persona_movie_reviewer",
      feedback_type: "LIKE",
    },
  },
  {
    id: "batch-match",
    method: "POST",
    path: "/v1/batch-match",
    name: "배치 매칭",
    description: "여러 유저에 대한 매칭을 한 번에 요청합니다 (최대 100건)",
    defaultBody: {
      items: [
        {
          user_id: "user_abc123",
          context: { category: "movie" },
          options: { top_n: 3, matching_tier: "basic" },
        },
        {
          user_id: "user_def456",
          context: { category: "book" },
          options: { top_n: 5, matching_tier: "advanced" },
        },
      ],
    },
  },
  {
    id: "onboarding",
    method: "POST",
    path: "/v1/users/:id/onboarding",
    name: "온보딩",
    description: "유저 온보딩을 실행하여 성향 벡터를 생성합니다",
    defaultBody: {
      level: "QUICK",
      responses: [
        { question_id: "q1", answer: "A", target_dimensions: ["depth"] },
        { question_id: "q2", answer: "B", target_dimensions: ["lens"] },
        { question_id: "q3", answer: 0.7, target_dimensions: ["stance"] },
        { question_id: "q4", answer: "A", target_dimensions: ["scope"] },
        { question_id: "q5", answer: "B", target_dimensions: ["taste"] },
        { question_id: "q6", answer: 0.4, target_dimensions: ["purpose"] },
        { question_id: "q7", answer: "A", target_dimensions: ["sociability"] },
        { question_id: "q8", answer: "B", target_dimensions: ["depth"] },
        { question_id: "q9", answer: 0.6, target_dimensions: ["lens"] },
        { question_id: "q10", answer: "A", target_dimensions: ["stance"] },
        { question_id: "q11", answer: "B", target_dimensions: ["scope"] },
        { question_id: "q12", answer: 0.5, target_dimensions: ["taste"] },
      ],
      consent: {
        data_collection: true,
        sns_analysis: false,
        third_party_sharing: false,
        marketing: false,
      },
    },
  },
  {
    id: "consent-get",
    method: "GET",
    path: "/v1/users/:id/consent",
    name: "동의 조회",
    description: "유저의 데이터 동의 상태를 조회합니다",
    defaultBody: null,
  },
  {
    id: "consent-post",
    method: "POST",
    path: "/v1/users/:id/consent",
    name: "동의 변경",
    description: "유저의 데이터 동의 상태를 변경합니다",
    defaultBody: {
      consents: [
        { type: "sns_analysis", granted: true },
        { type: "third_party_sharing", granted: true },
      ],
      consent_version: "v2.0",
    },
  },
  {
    id: "profile",
    method: "GET",
    path: "/v1/users/:id/profile",
    name: "유저 프로필",
    description: "유저의 성향 벡터 프로필 (3-Layer + 교차축) 조회",
    defaultBody: null,
  },
]

// ============================================================================
// Types
// ============================================================================

type ApiKeyItem = {
  id: string
  name: string
  prefix: string
  lastFour: string
  environment: string
}

interface RequestHistoryItem {
  id: string
  timestamp: string
  method: string
  path: string
  status: number
  latency: number
}

// ============================================================================
// Code Generation
// ============================================================================

function generateCurl(endpoint: EndpointDef, apiKey: string, body: string): string {
  const baseUrl = "https://api.deepsight.ai"
  let curl = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}"`
  curl += ` \\\n  -H "Authorization: Bearer ${apiKey}"`
  curl += ` \\\n  -H "Content-Type: application/json"`
  if (body && endpoint.method !== "GET") {
    curl += ` \\\n  -d '${body.replace(/\n\s*/g, " ")}'`
  }
  return curl
}

function generateNodejs(endpoint: EndpointDef, apiKey: string, body: string): string {
  const hasBody = endpoint.method !== "GET" && body
  return `const response = await fetch('https://api.deepsight.ai${endpoint.path}', {
  method: '${endpoint.method}',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  },${hasBody ? `\n  body: JSON.stringify(${body})` : ""}
});

const data = await response.json();
console.log(data);`
}

function generatePython(endpoint: EndpointDef, apiKey: string, body: string): string {
  const hasBody = endpoint.method !== "GET" && body
  return `import requests

response = requests.${endpoint.method.toLowerCase()}(
    'https://api.deepsight.ai${endpoint.path}',
    headers={
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json'
    },${hasBody ? `\n    json=${body}` : ""}
)

print(response.json())`
}

function generateJava(endpoint: EndpointDef, apiKey: string, body: string): string {
  const hasBody = endpoint.method !== "GET" && body
  return `HttpClient client = HttpClient.newHttpClient();
${hasBody ? `String jsonBody = ${JSON.stringify(body.replace(/\n\s*/g, " "))};\n` : ""}HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.deepsight.ai${endpoint.path}"))
    .header("Authorization", "Bearer ${apiKey}")
    .header("Content-Type", "application/json")
    .${endpoint.method === "GET" ? "GET()" : `POST(HttpRequest.BodyPublishers.ofString(jsonBody))`}
    .build();

HttpResponse<String> response = client.send(
    request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`
}

// ============================================================================
// Component
// ============================================================================

export default function PlaygroundPage() {
  const [selectedEndpoint, setSelectedEndpoint] = React.useState(V3_ENDPOINTS[0])
  const [apiKeys, setApiKeys] = React.useState<ApiKeyItem[]>([])
  const [selectedApiKey, setSelectedApiKey] = React.useState("")
  const [requestBody, setRequestBody] = React.useState(
    JSON.stringify(V3_ENDPOINTS[0].defaultBody, null, 2)
  )
  const [pathParams, setPathParams] = React.useState<Record<string, string>>({})
  const [response, setResponse] = React.useState<string | null>(null)
  const [responseHeaders, setResponseHeaders] = React.useState<Record<string, string> | null>(null)
  const [responseStatus, setResponseStatus] = React.useState<number | null>(null)
  const [responseTime, setResponseTime] = React.useState<number | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingKeys, setIsLoadingKeys] = React.useState(true)
  const [copied, setCopied] = React.useState(false)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [showHeaders, setShowHeaders] = React.useState(false)
  const [history, setHistory] = React.useState<RequestHistoryItem[]>([])
  const [showHistory, setShowHistory] = React.useState(false)

  // Fetch API keys on mount
  React.useEffect(() => {
    async function fetchApiKeys() {
      try {
        const res = await fetch("/api/api-keys")
        const data = await res.json()
        if (data.apiKeys && data.apiKeys.length > 0) {
          setApiKeys(data.apiKeys)
          setSelectedApiKey(`${data.apiKeys[0].prefix}***${data.apiKeys[0].lastFour}`)
        }
      } catch (error) {
        console.error("Failed to fetch API keys:", error)
      } finally {
        setIsLoadingKeys(false)
      }
    }
    fetchApiKeys()
  }, [])

  const handleEndpointChange = (endpointId: string) => {
    const endpoint = V3_ENDPOINTS.find((e) => e.id === endpointId)
    if (endpoint) {
      setSelectedEndpoint(endpoint)
      setRequestBody(endpoint.defaultBody ? JSON.stringify(endpoint.defaultBody, null, 2) : "")
      setResponse(null)
      setResponseHeaders(null)
      setResponseStatus(null)
      setResponseTime(null)
      setPathParams({})
    }
  }

  const handleSendRequest = async () => {
    setIsLoading(true)
    setResponse(null)
    setResponseHeaders(null)

    const startTime = Date.now()

    try {
      // Build URL with path parameters
      let url = `/api${selectedEndpoint.path}`
      if (Object.keys(pathParams).length > 0) {
        for (const [key, value] of Object.entries(pathParams)) {
          url = url.replace(`:${key}`, encodeURIComponent(value))
        }
      }

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${selectedApiKey}`,
        },
      }

      if (selectedEndpoint.method !== "GET" && requestBody) {
        options.body = requestBody
      }

      const res = await fetch(url, options)
      const data = await res.json()
      const latency = Date.now() - startTime

      // Capture response headers
      const headers: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        headers[key] = value
      })

      setResponse(JSON.stringify(data, null, 2))
      setResponseHeaders(headers)
      setResponseStatus(res.status)
      setResponseTime(latency)

      // Add to history (keep last 10)
      setHistory((prev) => {
        const newItem: RequestHistoryItem = {
          id: `hist_${Date.now()}`,
          timestamp: new Date().toISOString(),
          method: selectedEndpoint.method,
          path: selectedEndpoint.path,
          status: res.status,
          latency,
        }
        return [newItem, ...prev].slice(0, 10)
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setResponse(
        JSON.stringify({ error: { code: "REQUEST_FAILED", message: errorMessage } }, null, 2)
      )
      setResponseStatus(500)
      setResponseTime(Date.now() - startTime)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setRequestBody(
      selectedEndpoint.defaultBody ? JSON.stringify(selectedEndpoint.defaultBody, null, 2) : ""
    )
    setResponse(null)
    setResponseHeaders(null)
    setResponseStatus(null)
    setResponseTime(null)
    setPathParams({})
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Playground</h1>
          <p className="text-muted-foreground">v3 API를 테스트하고 응답을 확인하세요</p>
        </div>
        <div className="flex gap-2">
          {isLoadingKeys ? (
            <div className="text-muted-foreground text-sm">Loading keys...</div>
          ) : apiKeys.length === 0 ? (
            <Button variant="outline" asChild>
              <a href="/api-keys/new">Create API Key</a>
            </Button>
          ) : (
            <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select API Key" />
              </SelectTrigger>
              <SelectContent>
                {apiKeys.map((key) => {
                  const keyDisplay = `${key.prefix}***${key.lastFour}`
                  return (
                    <SelectItem key={key.id} value={keyDisplay}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={key.environment === "live" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {key.environment}
                        </Badge>
                        {key.name}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className="relative"
          >
            <History className="h-4 w-4" />
            {history.length > 0 && (
              <span className="bg-primary text-primary-foreground absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                {history.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Request History Panel */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Request History</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
              <Trash2 className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.method}
                    </Badge>
                    <span className="font-mono text-xs">{item.path}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={item.status >= 200 && item.status < 300 ? "success" : "destructive"}
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{item.latency}ms</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
              <CardDescription>API 요청 구성</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Endpoint Selection */}
              <div className="space-y-2">
                <Label>Endpoint</Label>
                <Select value={selectedEndpoint.id} onValueChange={handleEndpointChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {V3_ENDPOINTS.map((endpoint) => (
                      <SelectItem key={endpoint.id} value={endpoint.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {endpoint.method}
                          </Badge>
                          <span>{endpoint.path}</span>
                          <span className="text-muted-foreground text-sm">— {endpoint.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm">{selectedEndpoint.description}</p>
              </div>

              {/* URL Preview */}
              <div className="space-y-2">
                <Label>URL</Label>
                <div className="bg-muted flex items-center gap-2 rounded-lg p-3 font-mono text-sm">
                  <Badge variant="outline">{selectedEndpoint.method}</Badge>
                  <span className="text-muted-foreground">https://api.deepsight.ai</span>
                  <span>{selectedEndpoint.path}</span>
                </div>
              </div>

              {/* Path Parameters */}
              {selectedEndpoint.path.includes(":") && (
                <div className="space-y-2">
                  <Label>Path Parameters</Label>
                  <div className="space-y-2">
                    {selectedEndpoint.path.match(/:(\w+)/g)?.map((param) => {
                      const paramName = param.slice(1)
                      return (
                        <div key={paramName} className="flex items-center gap-2">
                          <Label className="w-24 font-mono text-sm">{paramName}</Label>
                          <Input
                            placeholder={`Enter ${paramName}`}
                            value={pathParams[paramName] || ""}
                            onChange={(e) =>
                              setPathParams((prev) => ({ ...prev, [paramName]: e.target.value }))
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Request Body */}
              {selectedEndpoint.method !== "GET" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Request Body</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRequestBody(
                          selectedEndpoint.defaultBody
                            ? JSON.stringify(selectedEndpoint.defaultBody, null, 2)
                            : ""
                        )
                      }
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reset
                    </Button>
                  </div>
                  <Textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Enter JSON request body"
                  />
                </div>
              )}

              {/* Advanced Options */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Advanced Options
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Response Headers</Label>
                      <p className="text-muted-foreground text-xs">
                        Rate limit, request ID headers
                      </p>
                    </div>
                    <Switch checked={showHeaders} onCheckedChange={setShowHeaders} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleSendRequest} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">&#9203;</span>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Send Request
                    </span>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Code Snippets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Code Snippets</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="java">Java</TabsTrigger>
                </TabsList>
                <TabsContent value="curl" className="mt-4">
                  <CodeBlock
                    code={generateCurl(selectedEndpoint, selectedApiKey, requestBody)}
                    onCopy={copyToClipboard}
                    copied={copied}
                  />
                </TabsContent>
                <TabsContent value="nodejs" className="mt-4">
                  <CodeBlock
                    code={generateNodejs(selectedEndpoint, selectedApiKey, requestBody)}
                    onCopy={copyToClipboard}
                    copied={copied}
                  />
                </TabsContent>
                <TabsContent value="python" className="mt-4">
                  <CodeBlock
                    code={generatePython(selectedEndpoint, selectedApiKey, requestBody)}
                    onCopy={copyToClipboard}
                    copied={copied}
                  />
                </TabsContent>
                <TabsContent value="java" className="mt-4">
                  <CodeBlock
                    code={generateJava(selectedEndpoint, selectedApiKey, requestBody)}
                    onCopy={copyToClipboard}
                    copied={copied}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Response Panel */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Response</CardTitle>
                  <CardDescription>API 응답 결과</CardDescription>
                </div>
                {responseStatus && (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        responseStatus >= 200 && responseStatus < 300 ? "success" : "destructive"
                      }
                    >
                      {responseStatus}
                    </Badge>
                    {responseTime !== null && (
                      <div className="text-muted-foreground flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4" />
                        {responseTime}ms
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {response ? (
                <div className="space-y-4">
                  {/* Response Headers */}
                  {showHeaders && responseHeaders && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase">Response Headers</Label>
                      <pre className="bg-muted max-h-[150px] overflow-auto rounded-lg p-3 font-mono text-xs">
                        {Object.entries(responseHeaders)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join("\n")}
                      </pre>
                    </div>
                  )}

                  {/* Response Body */}
                  <div className="relative">
                    <pre className="bg-muted max-h-[500px] overflow-auto rounded-lg p-4 font-mono text-xs">
                      {response}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => copyToClipboard(response)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="space-y-4 text-center">
                    <div className="animate-spin text-4xl">&#9203;</div>
                    <p className="text-muted-foreground">Sending request...</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="space-y-4 text-center">
                    <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                      <Braces className="text-muted-foreground h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-medium">No Response Yet</p>
                      <p className="text-muted-foreground text-sm">
                        Send a request to see the response here
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tips */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Playground Tips</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Test API 키를 사용하면 실제 과금 없이 테스트할 수 있습니다</li>
            <li>matching_tier: basic (L1만), advanced (L1+L2+EPS), exploration (L1+L2+L3+EPS)</li>
            <li>코드 스니펫을 복사하여 바로 프로젝트에 통합하세요</li>
            <li>요청 히스토리에서 최근 10개 요청을 확인할 수 있습니다</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

function CodeBlock({
  code,
  onCopy,
  copied,
}: {
  code: string
  onCopy: (text: string) => void
  copied: boolean
}) {
  return (
    <div className="relative">
      <pre className="bg-muted max-h-[200px] overflow-auto rounded-lg p-4 font-mono text-xs">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={() => onCopy(code)}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}
