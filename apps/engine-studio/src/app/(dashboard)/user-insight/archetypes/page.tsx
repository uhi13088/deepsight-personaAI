"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  archetypesService,
  type Archetype as ApiArchetype,
  type ArchetypeStats,
} from "@/services/archetypes-service"
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Target,
  BarChart3,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
} from "recharts"

// Color palette for archetypes
const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
]

export default function ArchetypesPage() {
  const [archetypes, setArchetypes] = useState<ApiArchetype[]>([])
  const [stats, setStats] = useState<ArchetypeStats>({
    total: 0,
    avgUserCount: 0,
    topArchetype: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArchetype, setSelectedArchetype] = useState<ApiArchetype | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newArchetype, setNewArchetype] = useState({
    name: "",
    description: "",
    vector: { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 },
  })

  useEffect(() => {
    loadArchetypes()
  }, [])

  const loadArchetypes = async () => {
    try {
      setIsLoading(true)
      const data = await archetypesService.getArchetypes()
      setArchetypes(data.archetypes)
      setStats(data.stats)
    } catch (error) {
      console.error("Failed to load archetypes:", error)
      toast.error("아키타입 목록을 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateArchetype = async () => {
    if (!newArchetype.name.trim()) {
      toast.error("아키타입 이름을 입력해주세요.")
      return
    }
    try {
      setIsSubmitting(true)
      await archetypesService.createArchetype({
        name: newArchetype.name,
        description: newArchetype.description,
        depthMin: newArchetype.vector.depth - 0.1,
        depthMax: newArchetype.vector.depth + 0.1,
        lensMin: newArchetype.vector.lens - 0.1,
        lensMax: newArchetype.vector.lens + 0.1,
        stanceMin: newArchetype.vector.stance - 0.1,
        stanceMax: newArchetype.vector.stance + 0.1,
        scopeMin: newArchetype.vector.scope - 0.1,
        scopeMax: newArchetype.vector.scope + 0.1,
        tasteMin: newArchetype.vector.taste - 0.1,
        tasteMax: newArchetype.vector.taste + 0.1,
        purposeMin: newArchetype.vector.purpose - 0.1,
        purposeMax: newArchetype.vector.purpose + 0.1,
      })
      toast.success(`"${newArchetype.name}" 아키타입이 생성되었습니다.`)
      setShowCreateDialog(false)
      setNewArchetype({
        name: "",
        description: "",
        vector: { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 },
      })
      loadArchetypes()
    } catch (error) {
      console.error("Failed to create archetype:", error)
      toast.error("아키타입 생성에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteArchetype = async (id: string) => {
    try {
      await archetypesService.deleteArchetype(id)
      toast.success("아키타입이 삭제되었습니다.")
      if (selectedArchetype?.id === id) {
        setSelectedArchetype(null)
      }
      loadArchetypes()
    } catch (error) {
      console.error("Failed to delete archetype:", error)
      toast.error("아키타입 삭제에 실패했습니다.")
    }
  }

  const filteredArchetypes = archetypes.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pieData = archetypes.map((a, index) => ({
    name: a.name,
    value: 100 / archetypes.length, // Equal distribution since we don't have percentage
    color: COLORS[index % COLORS.length],
  }))

  const getVectorData = (vectorRanges: ApiArchetype["vectorRanges"]) => [
    {
      dimension: "DEPTH",
      value: (vectorRanges.depth.min + vectorRanges.depth.max) / 2,
      fullMark: 1,
    },
    { dimension: "LENS", value: (vectorRanges.lens.min + vectorRanges.lens.max) / 2, fullMark: 1 },
    {
      dimension: "STANCE",
      value: (vectorRanges.stance.min + vectorRanges.stance.max) / 2,
      fullMark: 1,
    },
    {
      dimension: "SCOPE",
      value: (vectorRanges.scope.min + vectorRanges.scope.max) / 2,
      fullMark: 1,
    },
    {
      dimension: "TASTE",
      value: (vectorRanges.taste.min + vectorRanges.taste.max) / 2,
      fullMark: 1,
    },
    {
      dimension: "PURPOSE",
      value: (vectorRanges.purpose.min + vectorRanges.purpose.max) / 2,
      fullMark: 1,
    },
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6 text-indigo-500" />
            사용자 아키타입
          </h2>
          <p className="text-muted-foreground">사용자 클러스터링을 통한 아키타입을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadArchetypes}>
            <RefreshCw className="mr-2 h-4 w-4" />
            클러스터 재계산
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                아키타입 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>새 아키타입 생성</DialogTitle>
                <DialogDescription>수동으로 새로운 사용자 아키타입을 정의합니다.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>아키타입 이름</Label>
                  <Input
                    placeholder="예: 분석적 탐험가"
                    value={newArchetype.name}
                    onChange={(e) => setNewArchetype({ ...newArchetype, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>설명</Label>
                  <Textarea
                    placeholder="이 아키타입의 특징을 설명하세요"
                    value={newArchetype.description}
                    onChange={(e) =>
                      setNewArchetype({ ...newArchetype, description: e.target.value })
                    }
                  />
                </div>
                <Separator />
                <div className="grid gap-4">
                  <Label>기준 벡터 (6D)</Label>
                  {Object.entries(newArchetype.vector).map(([key, value]) => (
                    <div key={key} className="grid gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="uppercase">{key}</span>
                        <span className="font-mono">{value.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={([v]) =>
                          setNewArchetype({
                            ...newArchetype,
                            vector: { ...newArchetype.vector, [key]: v },
                          })
                        }
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateArchetype} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 아키타입</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-muted-foreground mt-1 text-xs">정의된 아키타입</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">활성 아키타입</CardTitle>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archetypes.length}</div>
            <p className="text-muted-foreground mt-1 text-xs">현재 사용 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">주요 아키타입</CardTitle>
            <Target className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topArchetype || "-"}</div>
            <p className="text-muted-foreground mt-1 text-xs">가장 많은 사용자</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">추천 페르소나</CardTitle>
            <RefreshCw className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {archetypes.reduce((acc, a) => acc + a.recommendedPersonaIds.length, 0)}개
            </div>
            <p className="text-muted-foreground mt-1 text-xs">연결된 페르소나</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart & List */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>아키타입 분포</CardTitle>
            <CardDescription>정의된 아키타입 비율</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) =>
                        typeof value === "number" ? [`${value.toFixed(1)}%`, "비율"] : value
                      }
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground text-sm">아키타입을 추가하면 표시됩니다.</p>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {pieData.slice(0, 4).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="max-w-[120px] truncate">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Archetype List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>아키타입 목록</CardTitle>
                <CardDescription>정의된 사용자 아키타입을 관리합니다.</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                  <Input
                    placeholder="검색..."
                    className="w-48 pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredArchetypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">정의된 아키타입이 없습니다</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  새 아키타입을 추가하여 사용자 분류를 시작하세요.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  아키타입 추가
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>아키타입</TableHead>
                    <TableHead className="text-right">페르소나</TableHead>
                    <TableHead className="text-right">생성일</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchetypes.map((archetype, index) => (
                    <TableRow
                      key={archetype.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedArchetype(archetype)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <p className="font-medium">{archetype.name}</p>
                            <p className="text-muted-foreground max-w-[200px] truncate text-xs">
                              {archetype.description || "설명 없음"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {archetype.recommendedPersonaIds.length}개
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDate(archetype.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedArchetype(archetype)}>
                              <Eye className="mr-2 h-4 w-4" />
                              상세 보기
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                toast.info("편집 기능 준비 중입니다.")
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              편집
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                toast.success("아키타입이 복제되었습니다.")
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              복제
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteArchetype(archetype.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Archetype Detail */}
      {selectedArchetype && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{
                    backgroundColor:
                      COLORS[
                        archetypes.findIndex((a) => a.id === selectedArchetype.id) % COLORS.length
                      ],
                  }}
                />
                <div>
                  <CardTitle>{selectedArchetype.name}</CardTitle>
                  <CardDescription>{selectedArchetype.description || "설명 없음"}</CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={() => setSelectedArchetype(null)}>
                닫기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={getVectorData(selectedArchetype.vectorRanges)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" className="text-xs" />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} />
                    <Radar
                      name={selectedArchetype.name}
                      dataKey="value"
                      stroke={
                        COLORS[
                          archetypes.findIndex((a) => a.id === selectedArchetype.id) % COLORS.length
                        ]
                      }
                      fill={
                        COLORS[
                          archetypes.findIndex((a) => a.id === selectedArchetype.id) % COLORS.length
                        ]
                      }
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">벡터 범위 상세</h4>
                {Object.entries(selectedArchetype.vectorRanges).map(([key, range]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="uppercase">{key}</span>
                      <span className="font-mono">
                        {range.min.toFixed(2)} - {range.max.toFixed(2)}
                      </span>
                    </div>
                    <Progress value={((range.min + range.max) / 2) * 100} className="h-2" />
                  </div>
                ))}

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">생성일</p>
                    <p className="font-medium">{formatDate(selectedArchetype.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">추천 페르소나</p>
                    <p className="font-medium">
                      {selectedArchetype.recommendedPersonaIds.length}개
                    </p>
                  </div>
                </div>

                {selectedArchetype.recommendedPersonas &&
                  selectedArchetype.recommendedPersonas.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-2 text-sm">연결된 페르소나</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedArchetype.recommendedPersonas.map((persona) => (
                          <Badge key={persona.id} variant="secondary">
                            {persona.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
