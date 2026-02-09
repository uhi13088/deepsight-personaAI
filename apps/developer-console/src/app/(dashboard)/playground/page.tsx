"use client"

import * as React from "react"
import {
  Play,
  Copy,
  Check,
  Code,
  FileJson,
  Clock,
  Zap,
  RotateCcw,
  ChevronDown,
  Settings2,
  Braces,
  FileText,
  AlertCircle,
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
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { PingerPrint2D } from "@/components/p-inger-print-2d"

// API Endpoints configuration
const endpoints = [
  {
    id: "catalog-list",
    method: "GET",
    path: "/v1/personas",
    name: "Catalog — 페르소나 목록",
    description: "등록된 페르소나를 검색하고 목록을 조회합니다",
    defaultBody: null,
  },
  {
    id: "catalog-detail",
    method: "GET",
    path: "/v1/personas/:id",
    name: "Catalog — 페르소나 상세",
    description: "페르소나 상세 정보 (6D 벡터, 전문분야 등) 조회",
    defaultBody: null,
  },
  {
    id: "profiling",
    method: "POST",
    path: "/v1/profiles",
    name: "Profiling — 프로필 생성",
    description: "유저의 6D 벡터 프로필을 생성합니다",
    defaultBody: {
      method: "cold_start",
      answers: [
        { question_id: "q1", answer: "깊이 있는 분석을 선호합니다" },
        { question_id: "q2", answer: "새로운 관점을 탐색하는 편입니다" },
        { question_id: "q3", answer: "객관적인 시각을 중시합니다" },
      ],
    },
  },
  {
    id: "matching",
    method: "POST",
    path: "/v1/match",
    name: "Matching — 유저-페르소나 매칭",
    description: "유저 프로필에 최적화된 페르소나를 매칭합니다",
    defaultBody: {
      profile_id: "prof_abc123",
      options: {
        limit: 5,
        diversity_factor: 0.3,
      },
    },
  },
  {
    id: "recommendation",
    method: "POST",
    path: "/v1/recommend",
    name: "Recommendation — 콘텐츠 추천",
    description: "매칭된 페르소나가 유저에게 콘텐츠를 추천하고 이유를 설명합니다",
    defaultBody: {
      persona_id: "persona_movie_reviewer",
      profile_id: "prof_abc123",
      content_type: "movie",
      limit: 5,
    },
  },
  {
    id: "evaluation",
    method: "POST",
    path: "/v1/evaluate",
    name: "Evaluation — 콘텐츠 평가",
    description: "페르소나 관점에서 특정 콘텐츠를 리뷰하고 분석합니다",
    defaultBody: {
      persona_id: "persona_movie_reviewer",
      content: {
        title: "기생충",
        type: "movie",
        description: "봉준호 감독의 블랙코미디 스릴러",
      },
    },
  },
  {
    id: "feedback",
    method: "POST",
    path: "/v1/feedback",
    name: "Feedback — 결과 피드백",
    description: "추천/평가 결과에 대한 피드백을 제출합니다",
    defaultBody: {
      reference_id: "rec_xyz789",
      type: "recommendation",
      feedback: "positive",
      comment: "추천 결과가 정확합니다.",
    },
  },
]

type ApiKeyItem = {
  id: string
  name: string
  prefix: string
  lastFour: string
  environment: string
}

// Sample response data
const sampleResponses: Record<string, object> = {
  "catalog-list": {
    success: true,
    data: {
      personas: [
        { id: "persona_movie_reviewer", name: "감성 시네필", expertise: "영화", role: "REVIEWER" },
        { id: "persona_book_critic", name: "날카로운 독서가", expertise: "도서", role: "CRITIC" },
        { id: "persona_music_curator", name: "멜로디 탐험가", expertise: "음악", role: "CURATOR" },
      ],
      total: 24,
      page: 1,
      per_page: 10,
    },
  },
  "catalog-detail": {
    success: true,
    data: {
      id: "persona_movie_reviewer",
      name: "감성 시네필",
      expertise: "영화",
      role: "REVIEWER",
      traits: { depth: 0.85, lens: 0.72, stance: 0.68, scope: 0.55, taste: 0.91, purpose: 0.78 },
      description: "서사와 감정의 깊이를 중시하는 영화 리뷰어",
    },
  },
  profiling: {
    success: true,
    data: {
      id: "prof_abc123",
      traits: { depth: 0.82, lens: 0.75, stance: 0.6, scope: 0.7, taste: 0.88, purpose: 0.65 },
      schema_version: "1.0",
      method: "cold_start",
      created_at: "2025-01-15T09:30:00Z",
    },
  },
  matching: {
    success: true,
    data: {
      matches: [
        { persona_id: "persona_movie_reviewer", name: "감성 시네필", score: 0.94 },
        { persona_id: "persona_book_critic", name: "날카로운 독서가", score: 0.87 },
      ],
      profile_id: "prof_abc123",
      processing_time_ms: 120,
    },
  },
  recommendation: {
    success: true,
    data: {
      items: [
        {
          title: "기생충",
          type: "movie",
          reason: "서사 구조가 탄탄하고 계층 간 긴장감이 뛰어납니다",
        },
        { title: "인터스텔라", type: "movie", reason: "감정선과 SF 요소가 균형 잡혀 있습니다" },
      ],
      persona_id: "persona_movie_reviewer",
      profile_id: "prof_abc123",
    },
  },
  evaluation: {
    success: true,
    data: {
      content: { title: "기생충", type: "movie" },
      review: {
        score: 9.2,
        summary: "계층 구조를 블랙코미디로 풀어낸 수작",
        strengths: ["촘촘한 서사 구조", "상징적 미장센", "배우들의 호연"],
        considerations: ["장르 혼합에 대한 호불호"],
      },
      persona_id: "persona_movie_reviewer",
    },
  },
  feedback: {
    success: true,
    data: {
      feedback_id: "fb_xyz789",
      message: "Feedback submitted successfully",
    },
  },
}

export default function PlaygroundPage() {
  const [selectedEndpoint, setSelectedEndpoint] = React.useState(endpoints[0])
  const [apiKeys, setApiKeys] = React.useState<ApiKeyItem[]>([])
  const [selectedApiKey, setSelectedApiKey] = React.useState("")
  const [requestBody, setRequestBody] = React.useState(
    JSON.stringify(endpoints[0].defaultBody, null, 2)
  )
  const [pathParams, setPathParams] = React.useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = React.useState<Record<string, string>>({})
  const [response, setResponse] = React.useState<string | null>(null)
  const [responseStatus, setResponseStatus] = React.useState<number | null>(null)
  const [responseTime, setResponseTime] = React.useState<number | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingKeys, setIsLoadingKeys] = React.useState(true)
  const [copied, setCopied] = React.useState(false)

  // 응답에서 6D 벡터 추출 → P-inger Print 시각화
  const responseTraits = React.useMemo(() => {
    if (!response) return null
    try {
      const parsed = JSON.parse(response)
      const traits = parsed?.data?.traits
      if (traits && typeof traits === "object" && "depth" in traits) {
        return traits as Record<string, number>
      }
      return null
    } catch {
      return null
    }
  }, [response])
  const [showAdvanced, setShowAdvanced] = React.useState(false)

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
    const endpoint = endpoints.find((e) => e.id === endpointId)
    if (endpoint) {
      setSelectedEndpoint(endpoint)
      setRequestBody(endpoint.defaultBody ? JSON.stringify(endpoint.defaultBody, null, 2) : "")
      setResponse(null)
      setResponseStatus(null)
      setResponseTime(null)
    }
  }

  const handleSendRequest = async () => {
    setIsLoading(true)
    setResponse(null)

    const startTime = Date.now()

    try {
      // Build URL with path parameters
      let url = `/api${selectedEndpoint.path}`
      if (Object.keys(pathParams).length > 0) {
        for (const [key, value] of Object.entries(pathParams)) {
          url = url.replace(`:${key}`, encodeURIComponent(value))
        }
      }

      // Build request options
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${selectedApiKey}`,
        },
      }

      // Add body for non-GET requests
      if (selectedEndpoint.method !== "GET" && requestBody) {
        try {
          options.body = requestBody
        } catch {
          setResponse(
            JSON.stringify(
              { error: { code: "INVALID_JSON", message: "Invalid JSON in request body" } },
              null,
              2
            )
          )
          setResponseStatus(400)
          setResponseTime(Date.now() - startTime)
          setIsLoading(false)
          return
        }
      }

      const res = await fetch(url, options)
      const data = await res.json()

      setResponse(JSON.stringify(data, null, 2))
      setResponseStatus(res.status)
      setResponseTime(Date.now() - startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setResponse(
        JSON.stringify(
          {
            error: {
              code: "REQUEST_FAILED",
              message: errorMessage,
            },
          },
          null,
          2
        )
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
    setResponseStatus(null)
    setResponseTime(null)
    setPathParams({})
    setQueryParams({})
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateCurl = () => {
    const baseUrl = "https://api.deepsight.ai"
    let curl = `curl -X ${selectedEndpoint.method} "${baseUrl}${selectedEndpoint.path}"`
    curl += ` \\\n  -H "Authorization: Bearer ${selectedApiKey}"`
    curl += ` \\\n  -H "Content-Type: application/json"`
    if (requestBody && selectedEndpoint.method !== "GET") {
      curl += ` \\\n  -d '${requestBody.replace(/\n\s*/g, " ")}'`
    }
    return curl
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Playground</h1>
          <p className="text-muted-foreground">API를 테스트하고 응답을 확인하세요</p>
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
        </div>
      </div>

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
                    {endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.id} value={endpoint.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {endpoint.method}
                          </Badge>
                          <span>{endpoint.path}</span>
                          <span className="text-muted-foreground text-sm">- {endpoint.name}</span>
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
                      <Label>Include Headers</Label>
                      <p className="text-muted-foreground text-xs">Show response headers</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Pretty Print</Label>
                      <p className="text-muted-foreground text-xs">Format JSON response</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleSendRequest} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <span className="mr-2 animate-spin">⏳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Send Request
                    </>
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
                  <TabsTrigger value="javascript">JS</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="go">Go</TabsTrigger>
                </TabsList>
                <TabsContent value="curl" className="mt-4">
                  <div className="relative">
                    <pre className="bg-muted max-h-[200px] overflow-auto rounded-lg p-4 font-mono text-xs">
                      {generateCurl()}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => copyToClipboard(generateCurl())}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="javascript" className="mt-4">
                  <pre className="bg-muted max-h-[200px] overflow-auto rounded-lg p-4 font-mono text-xs">
                    {`const response = await fetch('https://api.deepsight.ai${selectedEndpoint.path}', {
  method: '${selectedEndpoint.method}',
  headers: {
    'Authorization': 'Bearer ${selectedApiKey}',
    'Content-Type': 'application/json'
  },${
    selectedEndpoint.method !== "GET"
      ? `
  body: JSON.stringify(${requestBody || "{}"})`
      : ""
  }
});

const data = await response.json();
console.log(data);`}
                  </pre>
                </TabsContent>
                <TabsContent value="python" className="mt-4">
                  <pre className="bg-muted max-h-[200px] overflow-auto rounded-lg p-4 font-mono text-xs">
                    {`import requests

response = requests.${selectedEndpoint.method.toLowerCase()}(
    'https://api.deepsight.ai${selectedEndpoint.path}',
    headers={
        'Authorization': 'Bearer ${selectedApiKey}',
        'Content-Type': 'application/json'
    },${
      selectedEndpoint.method !== "GET"
        ? `
    json=${requestBody || "{}"}`
        : ""
    }
)

print(response.json())`}
                  </pre>
                </TabsContent>
                <TabsContent value="go" className="mt-4">
                  <pre className="bg-muted max-h-[200px] overflow-auto rounded-lg p-4 font-mono text-xs">
                    {`req, _ := http.NewRequest("${selectedEndpoint.method}",
    "https://api.deepsight.ai${selectedEndpoint.path}",
    ${selectedEndpoint.method !== "GET" ? "bytes.NewBuffer(jsonData)" : "nil"})

req.Header.Set("Authorization", "Bearer ${selectedApiKey}")
req.Header.Set("Content-Type", "application/json")

client := &http.Client{}
resp, _ := client.Do(req)`}
                  </pre>
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
                    {responseTime && (
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
                  {responseTraits && (
                    <div className="bg-muted/50 flex flex-col items-center gap-2 rounded-lg border p-4">
                      <span className="text-muted-foreground text-xs font-medium">
                        P-inger Print Preview
                      </span>
                      <PingerPrint2D data={responseTraits} size={180} showLabel={false} />
                    </div>
                  )}
                </div>
              ) : isLoading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="space-y-4 text-center">
                    <div className="animate-spin text-4xl">⏳</div>
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
            <li>응답 데이터는 복사하여 개발에 활용할 수 있습니다</li>
            <li>코드 스니펫을 복사하여 바로 사용하세요</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
