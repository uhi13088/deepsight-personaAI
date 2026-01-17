"use client"

import { useState } from "react"
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  PieChart,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
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
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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

// 아키타입 정의
interface Archetype {
  id: string
  name: string
  description: string
  userCount: number
  percentage: number
  trend: "up" | "down" | "stable"
  trendValue: number
  vector: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
  }
  color: string
  status: "active" | "inactive"
  createdAt: string
}

const ARCHETYPES: Archetype[] = [
  {
    id: "1",
    name: "분석적 탐험가",
    description: "깊이 있는 분석과 다양한 장르 탐색을 추구하는 유형",
    userCount: 23456,
    percentage: 18.5,
    trend: "up",
    trendValue: 2.3,
    vector: { depth: 0.85, lens: 0.7, stance: 0.65, scope: 0.8, taste: 0.6, purpose: 0.75 },
    color: "#3b82f6",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "2",
    name: "감성 몰입러",
    description: "주관적 감정과 깊은 몰입을 중시하는 유형",
    userCount: 31245,
    percentage: 24.7,
    trend: "up",
    trendValue: 1.8,
    vector: { depth: 0.7, lens: 0.25, stance: 0.35, scope: 0.45, taste: 0.7, purpose: 0.4 },
    color: "#ec4899",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "3",
    name: "트렌드 서퍼",
    description: "인기 콘텐츠와 대중적 취향을 따르는 유형",
    userCount: 28934,
    percentage: 22.9,
    trend: "stable",
    trendValue: 0.2,
    vector: { depth: 0.35, lens: 0.5, stance: 0.4, scope: 0.75, taste: 0.2, purpose: 0.3 },
    color: "#f59e0b",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "4",
    name: "까다로운 비평가",
    description: "엄격한 기준과 깊은 분석으로 콘텐츠를 평가하는 유형",
    userCount: 15678,
    percentage: 12.4,
    trend: "down",
    trendValue: -0.8,
    vector: { depth: 0.9, lens: 0.8, stance: 0.85, scope: 0.5, taste: 0.75, purpose: 0.7 },
    color: "#ef4444",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "5",
    name: "캐주얼 뷰어",
    description: "가벼운 오락 목적으로 콘텐츠를 소비하는 유형",
    userCount: 19234,
    percentage: 15.2,
    trend: "up",
    trendValue: 3.1,
    vector: { depth: 0.2, lens: 0.4, stance: 0.25, scope: 0.6, taste: 0.35, purpose: 0.15 },
    color: "#10b981",
    status: "active",
    createdAt: "2025-01-01",
  },
  {
    id: "6",
    name: "니치 전문가",
    description: "특정 장르에 깊이 몰입하고 전문 지식을 추구하는 유형",
    userCount: 8012,
    percentage: 6.3,
    trend: "stable",
    trendValue: 0.5,
    vector: { depth: 0.95, lens: 0.75, stance: 0.7, scope: 0.15, taste: 0.9, purpose: 0.85 },
    color: "#8b5cf6",
    status: "active",
    createdAt: "2025-01-01",
  },
]

const ARCHETYPE_STATS = {
  totalUsers: 126559,
  avgMatchAccuracy: 89.3,
  lastClusterUpdate: "2025-01-15 03:00",
  nextScheduledUpdate: "2025-01-22 03:00",
}

export default function ArchetypesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newArchetype, setNewArchetype] = useState({
    name: "",
    description: "",
    vector: { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 },
  })

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
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" />
            사용자 아키타입
          </h2>
          <p className="text-muted-foreground">
            사용자 클러스터링을 통한 아키타입을 관리합니다.
          </p>
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
                <DialogDescription>
                  수동으로 새로운 사용자 아키타입을 정의합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>아키타입 이름</Label>
                  <Input
                    placeholder="예: 분석적 탐험가"
                    value={newArchetype.name}
                    onChange={(e) =>
                      setNewArchetype({ ...newArchetype, name: e.target.value })
                    }
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
                <Button>생성</Button>
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
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ARCHETYPE_STATS.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              아키타입 분류된 사용자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">아키타입 수</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ARCHETYPES.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ARCHETYPES.filter((a) => a.status === "active").length}개 활성
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">분류 정확도</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ARCHETYPE_STATS.avgMatchAccuracy}%</div>
            <Progress value={ARCHETYPE_STATS.avgMatchAccuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">마지막 업데이트</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {ARCHETYPE_STATS.lastClusterUpdate}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
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
                    formatter={(value) => typeof value === 'number' ? [`${value.toFixed(1)}%`, "비율"] : value}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieData.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate max-w-[120px]">{item.name}</span>
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
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="검색..."
                    className="pl-8 w-48"
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
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: archetype.color }}
                        />
                        <div>
                          <p className="font-medium">{archetype.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {archetype.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {archetype.userCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {archetype.percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`flex items-center justify-end gap-1 ${
                        archetype.trend === "up"
                          ? "text-green-600"
                          : archetype.trend === "down"
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}>
                        {archetype.trend === "up" && <TrendingUp className="h-3 w-3" />}
                        {archetype.trend === "down" && <TrendingDown className="h-3 w-3" />}
                        {archetype.trendValue > 0 ? "+" : ""}
                        {archetype.trendValue.toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={archetype.status === "active" ? "default" : "secondary"}
                      >
                        {archetype.status === "active" ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                  className="w-4 h-4 rounded-full"
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
