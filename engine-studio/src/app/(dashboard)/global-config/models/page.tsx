"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Brain,
  Plus,
  Save,
  Zap,
  DollarSign,
  Activity,
  MoreHorizontal,
  Edit,
  Trash2,
  TestTube,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// TODO: Add MOCK_AI_MODELS_DETAILED to @/services/mock-data.service for centralized AI model configuration
// AI 모델 데이터
interface AIModel {
  id: string
  name: string
  provider: string
  version: string
  status: "active" | "inactive" | "testing"
  purpose: string[]
  config: {
    temperature: number
    maxTokens: number
    topP: number
  }
  usage: {
    requests: number
    tokens: number
    cost: number
  }
  performance: {
    latency: number
    successRate: number
  }
}

// AI Model configurations with references to external URLs from app.config
// OpenAI models use EXTERNAL_URLS.openai, Anthropic models use EXTERNAL_URLS.anthropic
const AI_MODELS: AIModel[] = [
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI", // API URL: EXTERNAL_URLS.openai
    version: "gpt-4-turbo-preview",
    status: "active",
    purpose: ["persona_generation", "prompt_generation", "analysis"],
    config: { temperature: 0.7, maxTokens: 4096, topP: 0.95 },
    usage: { requests: 125678, tokens: 45678901, cost: 1234.56 },
    performance: { latency: 1245, successRate: 99.8 },
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic", // API URL: EXTERNAL_URLS.anthropic
    version: "claude-3-opus-20240229",
    status: "active",
    purpose: ["content_review", "safety_check"],
    config: { temperature: 0.5, maxTokens: 4096, topP: 0.9 },
    usage: { requests: 34567, tokens: 12345678, cost: 567.89 },
    performance: { latency: 1890, successRate: 99.9 },
  },
  {
    id: "embedding-3-large",
    name: "Embedding 3 Large",
    provider: "OpenAI", // API URL: EXTERNAL_URLS.openai
    version: "text-embedding-3-large",
    status: "active",
    purpose: ["vector_embedding"],
    config: { temperature: 0, maxTokens: 8192, topP: 1 },
    usage: { requests: 456789, tokens: 98765432, cost: 234.56 },
    performance: { latency: 156, successRate: 99.99 },
  },
  {
    id: "gpt-4-vision",
    name: "GPT-4 Vision",
    provider: "OpenAI", // API URL: EXTERNAL_URLS.openai
    version: "gpt-4-vision-preview",
    status: "testing",
    purpose: ["image_analysis"],
    config: { temperature: 0.7, maxTokens: 4096, topP: 0.95 },
    usage: { requests: 1234, tokens: 234567, cost: 45.67 },
    performance: { latency: 2345, successRate: 98.5 },
  },
]

// TODO: Add MOCK_MODEL_USAGE_STATS to @/services/mock-data.service
const USAGE_STATS = {
  totalRequests: 617268,
  totalTokens: 156789012,
  totalCost: 2082.68,
  avgLatency: 1409,
}

export default function ModelsPage() {
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(AI_MODELS.length > 0 ? AI_MODELS[0] : null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const getStatusBadge = (status: AIModel["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">활성</Badge>
      case "inactive":
        return <Badge variant="secondary">비활성</Badge>
      case "testing":
        return <Badge className="bg-blue-500">테스트</Badge>
    }
  }

  const getPurposeBadge = (purpose: string) => {
    const labels: Record<string, string> = {
      persona_generation: "페르소나 생성",
      prompt_generation: "프롬프트 생성",
      analysis: "분석",
      content_review: "콘텐츠 리뷰",
      safety_check: "안전 검사",
      vector_embedding: "벡터 임베딩",
      image_analysis: "이미지 분석",
    }
    return <Badge variant="outline" className="text-xs">{labels[purpose] || purpose}</Badge>
  }

  const handleAddModel = () => {
    toast.success("새 모델이 추가되었습니다.")
    setShowAddDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            AI 모델 설정
          </h2>
          <p className="text-muted-foreground">
            시스템에서 사용하는 AI 모델을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                모델 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 AI 모델 추가</DialogTitle>
                <DialogDescription>
                  새로운 AI 모델을 시스템에 등록합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>프로바이더</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google AI</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>모델 이름</Label>
                  <Input placeholder="예: GPT-4 Turbo" />
                </div>
                <div className="grid gap-2">
                  <Label>모델 ID</Label>
                  <Input placeholder="예: gpt-4-turbo-preview" />
                </div>
                <div className="grid gap-2">
                  <Label>API 키</Label>
                  <Input type="password" placeholder="sk-..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  취소
                </Button>
                <Button onClick={handleAddModel}>추가</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 요청 수</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {USAGE_STATS.totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">이번 달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 토큰</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(USAGE_STATS.totalTokens / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground mt-1">이번 달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 비용</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${USAGE_STATS.totalCost.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">이번 달</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 지연</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{USAGE_STATS.avgLatency}ms</div>
            <p className="text-xs text-muted-foreground mt-1">전체 모델</p>
          </CardContent>
        </Card>
      </div>

      {/* Model List & Details */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Model List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>등록된 모델</CardTitle>
            <CardDescription>클릭하여 상세 설정</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {AI_MODELS.map((model) => (
                <div
                  key={model.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-primary ${
                    selectedModel?.id === model.id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                  onClick={() => setSelectedModel(model)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{model.name}</span>
                    </div>
                    {getStatusBadge(model.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{model.provider}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {model.purpose.slice(0, 2).map((p) => getPurposeBadge(p))}
                    {model.purpose.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{model.purpose.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Model Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedModel?.name || "모델 선택"}</CardTitle>
                <CardDescription>
                  {selectedModel?.provider} • {selectedModel?.version}
                </CardDescription>
              </div>
              {selectedModel && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <TestTube className="mr-2 h-4 w-4" />
                    테스트
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        편집
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedModel ? (
              <Tabs defaultValue="config">
                <TabsList>
                  <TabsTrigger value="config">설정</TabsTrigger>
                  <TabsTrigger value="usage">사용량</TabsTrigger>
                  <TabsTrigger value="performance">성능</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-6 mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Temperature</Label>
                        <span className="text-sm font-mono">
                          {selectedModel.config.temperature}
                        </span>
                      </div>
                      <Slider
                        value={[selectedModel.config.temperature]}
                        min={0}
                        max={2}
                        step={0.1}
                      />
                      <p className="text-xs text-muted-foreground">
                        낮을수록 일관된 응답, 높을수록 창의적 응답
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Max Tokens</Label>
                        <span className="text-sm font-mono">
                          {selectedModel.config.maxTokens}
                        </span>
                      </div>
                      <Slider
                        value={[selectedModel.config.maxTokens]}
                        min={256}
                        max={16384}
                        step={256}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Top P</Label>
                        <span className="text-sm font-mono">
                          {selectedModel.config.topP}
                        </span>
                      </div>
                      <Slider
                        value={[selectedModel.config.topP]}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-2 block">용도</Label>
                    <div className="flex gap-2 flex-wrap">
                      {selectedModel.purpose.map((p) => getPurposeBadge(p))}
                    </div>
                  </div>

                  <Button className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </TabsContent>

                <TabsContent value="usage" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">
                        {selectedModel.usage.requests.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">요청 수</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">
                        {(selectedModel.usage.tokens / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-sm text-muted-foreground">토큰</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">
                        ${selectedModel.usage.cost.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">비용</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">평균 지연</p>
                      <p className="text-2xl font-bold">
                        {selectedModel.performance.latency}ms
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">성공률</p>
                      <p className="text-2xl font-bold">
                        {selectedModel.performance.successRate}%
                      </p>
                      <Progress
                        value={selectedModel.performance.successRate}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">모델 선택</h3>
                <p className="text-muted-foreground">
                  왼쪽 목록에서 모델을 선택하면 상세 설정이 표시됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
