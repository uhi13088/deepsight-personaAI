"use client"

import { useState, useEffect, useCallback } from "react"
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
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

interface AIModel {
  id: string
  name: string
  provider: string
  modelId: string
  status: string
  endpoint: string
  apiKeySet: boolean
  maxTokens: number
  temperature: number
  usage: number
  costPer1kTokens: number
  description: string
}

interface NewModelForm {
  provider: string
  name: string
  modelId: string
  endpoint: string
  maxTokens: number
  temperature: number
  costPer1kTokens: number
  description: string
}

const defaultNewModel: NewModelForm = {
  provider: "",
  name: "",
  modelId: "",
  endpoint: "",
  maxTokens: 4096,
  temperature: 0.7,
  costPer1kTokens: 0,
  description: "",
}

export default function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newModel, setNewModel] = useState<NewModelForm>(defaultNewModel)
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-models")
      const json = await res.json()
      if (json.success && json.data) {
        setModels(json.data.models)
        if (json.data.models.length > 0 && !selectedModel) {
          setSelectedModel(json.data.models[0])
        }
      }
    } catch (error) {
      console.error("Failed to fetch AI models:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedModel])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const usageStats = {
    totalRequests: models.reduce((sum, m) => sum + m.usage, 0),
    totalTokens: 0,
    totalCost: models.reduce((sum, m) => sum + m.costPer1kTokens * m.usage, 0),
    avgLatency: 0,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">활성</Badge>
      case "inactive":
        return <Badge variant="secondary">비활성</Badge>
      case "testing":
        return <Badge className="bg-blue-500">테스트</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAddModel = async () => {
    if (!newModel.provider || !newModel.name || !newModel.modelId) {
      toast.error("필수 항목을 입력해주세요.")
      return
    }

    setIsAdding(true)
    try {
      const res = await fetch("/api/ai-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newModel),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("새 모델이 추가되었습니다.")
        setShowAddDialog(false)
        setNewModel(defaultNewModel)
        await fetchModels()
      } else {
        toast.error(json.error?.message || "모델 추가에 실패했습니다.")
      }
    } catch {
      toast.error("모델 추가 중 오류가 발생했습니다.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteModel = async (id: string) => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/ai-models?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (json.success) {
        toast.success("모델이 삭제되었습니다.")
        if (selectedModel?.id === id) {
          setSelectedModel(null)
        }
        await fetchModels()
      } else {
        toast.error(json.error?.message || "모델 삭제에 실패했습니다.")
      }
    } catch {
      toast.error("모델 삭제 중 오류가 발생했습니다.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground">AI 모델 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="h-6 w-6 text-purple-500" />
            AI 모델 설정
          </h2>
          <p className="text-muted-foreground">시스템에서 사용하는 AI 모델을 관리합니다.</p>
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
                <DialogDescription>새로운 AI 모델을 시스템에 등록합니다.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>프로바이더</Label>
                  <Select
                    value={newModel.provider}
                    onValueChange={(value) => setNewModel({ ...newModel, provider: value })}
                  >
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
                  <Input
                    placeholder="예: GPT-4 Turbo"
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>모델 ID</Label>
                  <Input
                    placeholder="예: gpt-4-turbo-preview"
                    value={newModel.modelId}
                    onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>엔드포인트 (선택)</Label>
                  <Input
                    placeholder="https://api.example.com/v1"
                    value={newModel.endpoint}
                    onChange={(e) => setNewModel({ ...newModel, endpoint: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>설명 (선택)</Label>
                  <Input
                    placeholder="모델 용도나 특성을 설명하세요"
                    value={newModel.description}
                    onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  취소
                </Button>
                <Button onClick={handleAddModel} disabled={isAdding}>
                  {isAdding ? "추가 중..." : "추가"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">등록된 모델</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              활성: {models.filter((m) => m.status === "active").length}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 사용량</CardTitle>
            <Zap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.totalRequests.toLocaleString()}</div>
            <p className="text-muted-foreground mt-1 text-xs">전체 모델 합산</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 비용</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${usageStats.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">추정 비용</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">프로바이더</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(models.map((m) => m.provider)).size}</div>
            <p className="text-muted-foreground mt-1 text-xs">사용 중인 프로바이더</p>
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
            {models.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">등록된 모델이 없습니다</h3>
                <p className="text-muted-foreground mb-4 text-sm">AI 모델을 추가하여 시작하세요.</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  모델 추가
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={`hover:border-primary cursor-pointer rounded-lg border p-3 transition-all ${
                      selectedModel?.id === model.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedModel(model)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="text-primary h-4 w-4" />
                        <span className="text-sm font-medium">{model.name}</span>
                      </div>
                      {getStatusBadge(model.status)}
                    </div>
                    <p className="text-muted-foreground text-xs">{model.provider}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{model.modelId}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedModel?.name || "모델 선택"}</CardTitle>
                <CardDescription>
                  {selectedModel
                    ? `${selectedModel.provider} / ${selectedModel.modelId}`
                    : "왼쪽에서 모델을 선택하세요"}
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
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={isDeleting}
                        onClick={() => handleDeleteModel(selectedModel.id)}
                      >
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
                  <TabsTrigger value="info">정보</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="mt-4 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Temperature</Label>
                        <span className="font-mono text-sm">{selectedModel.temperature}</span>
                      </div>
                      <Slider
                        value={[selectedModel.temperature]}
                        min={0}
                        max={2}
                        step={0.1}
                        disabled
                      />
                      <p className="text-muted-foreground text-xs">
                        낮을수록 일관된 응답, 높을수록 창의적 응답
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Max Tokens</Label>
                        <span className="font-mono text-sm">{selectedModel.maxTokens}</span>
                      </div>
                      <Slider
                        value={[selectedModel.maxTokens]}
                        min={256}
                        max={200000}
                        step={256}
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>1K 토큰당 비용</Label>
                        <span className="font-mono text-sm">
                          ${selectedModel.costPer1kTokens.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-2 block">상태</Label>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedModel.status)}
                      {selectedModel.apiKeySet && (
                        <Badge variant="outline" className="text-xs">
                          API 키 설정됨
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button className="w-full" disabled>
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장 (편집 모드에서 사용)
                  </Button>
                </TabsContent>

                <TabsContent value="usage" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold">{selectedModel.usage.toLocaleString()}</p>
                      <p className="text-muted-foreground text-sm">사용 횟수</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold">
                        $
                        {(selectedModel.costPer1kTokens * selectedModel.usage).toLocaleString(
                          undefined,
                          { maximumFractionDigits: 2 }
                        )}
                      </p>
                      <p className="text-muted-foreground text-sm">추정 비용</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-muted-foreground mb-1 text-sm">모델 ID</p>
                      <p className="font-mono text-sm">{selectedModel.modelId}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-muted-foreground mb-1 text-sm">프로바이더</p>
                      <p className="text-sm font-medium">{selectedModel.provider}</p>
                    </div>
                    {selectedModel.endpoint && (
                      <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground mb-1 text-sm">엔드포인트</p>
                        <p className="font-mono text-sm">{selectedModel.endpoint}</p>
                      </div>
                    )}
                    {selectedModel.description && (
                      <div className="rounded-lg border p-4">
                        <p className="text-muted-foreground mb-1 text-sm">설명</p>
                        <p className="text-sm">{selectedModel.description}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center text-center">
                <Brain className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">모델 선택</h3>
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
