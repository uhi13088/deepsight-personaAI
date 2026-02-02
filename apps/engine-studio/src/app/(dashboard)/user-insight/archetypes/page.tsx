"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  RefreshCw,
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
import {
  MOCK_ARCHETYPES,
  MOCK_ARCHETYPE_STATS,
  type MockArchetype,
} from "@/services/mock-data.service"

// Re-export type for local use
type Archetype = MockArchetype

// Use centralized mock data
const ARCHETYPES = MOCK_ARCHETYPES
const ARCHETYPE_STATS = MOCK_ARCHETYPE_STATS

export default function ArchetypesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newArchetype, setNewArchetype] = useState({
    name: "",
    description: "",
    vector: { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 },
  })

  const handleCreateArchetype = () => {
    if (!newArchetype.name.trim()) {
      toast.error("아키타입 이름을 입력해주세요.")
      return
    }
    toast.success(`"${newArchetype.name}" 아키타입이 생성되었습니다.`)
    setShowCreateDialog(false)
    setNewArchetype({
      name: "",
      description: "",
      vector: { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 },
    })
  }

  const filteredArchetypes = ARCHETYPES.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pieData = ARCHETYPES.map((a) => ({
    name: a.name,
    value: a.percentage,
    color: a.color,
  }))

  const getVectorData = (vector: Archetype["vector"]) => [
    { dimension: "DEPTH", value: vector.depth, fullMark: 1 },
    { dimension: "LENS", value: vector.lens, fullMark: 1 },
    { dimension: "STANCE", value: vector.stance, fullMark: 1 },
    { dimension: "SCOPE", value: vector.scope, fullMark: 1 },
    { dimension: "TASTE", value: vector.taste, fullMark: 1 },
    { dimension: "PURPOSE", value: vector.purpose, fullMark: 1 },
  ]

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
          <Button variant="outline">
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
                <Button onClick={handleCreateArchetype}>생성</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ARCHETYPE_STATS.totalUsers.toLocaleString()}</div>
            <p className="text-muted-foreground mt-1 text-xs">아키타입 분류된 사용자</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">아키타입 수</CardTitle>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ARCHETYPES.length}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {ARCHETYPES.filter((a) => a.status === "active").length}개 활성
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">분류 정확도</CardTitle>
            <Target className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ARCHETYPE_STATS.avgMatchAccuracy}%</div>
            <Progress value={ARCHETYPE_STATS.avgMatchAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">마지막 업데이트</CardTitle>
            <RefreshCw className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{ARCHETYPE_STATS.lastClusterUpdate}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              다음: {ARCHETYPE_STATS.nextScheduledUpdate}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart & List */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>아키타입 분포</CardTitle>
            <CardDescription>전체 사용자의 아키타입별 비율</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
            </div>
            <div className="mt-4 space-y-2">
              {pieData.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>아키타입</TableHead>
                  <TableHead className="text-right">사용자 수</TableHead>
                  <TableHead className="text-right">비율</TableHead>
                  <TableHead className="text-right">추세</TableHead>
                  <TableHead className="text-right">상태</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArchetypes.map((archetype) => (
                  <TableRow
                    key={archetype.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedArchetype(archetype)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: archetype.color }}
                        />
                        <div>
                          <p className="font-medium">{archetype.name}</p>
                          <p className="text-muted-foreground max-w-[200px] truncate text-xs">
                            {archetype.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {archetype.userCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{archetype.percentage.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <div
                        className={`flex items-center justify-end gap-1 ${
                          archetype.trend === "up"
                            ? "text-green-600"
                            : archetype.trend === "down"
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {archetype.trend === "up" && <TrendingUp className="h-3 w-3" />}
                        {archetype.trend === "down" && <TrendingDown className="h-3 w-3" />}
                        {archetype.trendValue > 0 ? "+" : ""}
                        {archetype.trendValue.toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={archetype.status === "active" ? "default" : "secondary"}>
                        {archetype.status === "active" ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            상세 보기
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            복제
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
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
                  style={{ backgroundColor: selectedArchetype.color }}
                />
                <div>
                  <CardTitle>{selectedArchetype.name}</CardTitle>
                  <CardDescription>{selectedArchetype.description}</CardDescription>
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
                  <RadarChart data={getVectorData(selectedArchetype.vector)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" className="text-xs" />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} />
                    <Radar
                      name={selectedArchetype.name}
                      dataKey="value"
                      stroke={selectedArchetype.color}
                      fill={selectedArchetype.color}
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">벡터 상세</h4>
                {Object.entries(selectedArchetype.vector).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="uppercase">{key}</span>
                      <span className="font-mono">{value.toFixed(2)}</span>
                    </div>
                    <Progress value={value * 100} className="h-2" />
                  </div>
                ))}

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">생성일</p>
                    <p className="font-medium">{selectedArchetype.createdAt}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">사용자 수</p>
                    <p className="font-medium">{selectedArchetype.userCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
