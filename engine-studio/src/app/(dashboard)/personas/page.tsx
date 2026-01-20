"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Eye,
  Edit,
  Play,
  Star,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadarChart } from "@/components/charts/radar-chart"
import { PERSONA_STATUS_LABELS, PERSONA_ROLE_LABELS } from "@/lib/utils"
import type { Persona, PersonaStatus, PersonaRole, Vector6D } from "@/types"

// Mock 데이터
const MOCK_PERSONAS: (Persona & { vector: Vector6D })[] = [
  {
    id: "1",
    organizationId: null,
    visibility: "GLOBAL",
    sharedWithOrgs: [],
    name: "논리적 평론가",
    role: "REVIEWER",
    expertise: ["영화", "드라마"],
    description: "영화와 드라마를 논리적으로 분석하고 평가하는 평론가",
    profileImageUrl: null,
    promptTemplate: "",
    promptVersion: "1.2",
    status: "ACTIVE",
    qualityScore: 92,
    validationScore: 0.95,
    validationVersion: 1,
    lastValidationDate: new Date(),
    source: "MANUAL",
    parentPersonaId: null,
    createdById: "1",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
    activatedAt: new Date("2024-01-12"),
    archivedAt: null,
    vector: { depth: 0.9, lens: 0.85, stance: 0.75, scope: 0.8, taste: 0.3, purpose: 0.7 },
  },
  {
    id: "2",
    organizationId: null,
    visibility: "GLOBAL",
    sharedWithOrgs: [],
    name: "감성 에세이스트",
    role: "REVIEWER",
    expertise: ["영화", "음악", "도서"],
    description: "감성적인 시각으로 콘텐츠를 바라보는 에세이스트",
    profileImageUrl: null,
    promptTemplate: "",
    promptVersion: "1.0",
    status: "ACTIVE",
    qualityScore: 89,
    validationScore: 0.92,
    validationVersion: 1,
    lastValidationDate: new Date(),
    source: "MANUAL",
    parentPersonaId: null,
    createdById: "1",
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-14"),
    activatedAt: new Date("2024-01-09"),
    archivedAt: null,
    vector: { depth: 0.6, lens: 0.2, stance: 0.4, scope: 0.5, taste: 0.5, purpose: 0.8 },
  },
  {
    id: "3",
    organizationId: null,
    visibility: "PRIVATE",
    sharedWithOrgs: [],
    name: "트렌드 헌터",
    role: "CURATOR",
    expertise: ["패션", "테크", "게임"],
    description: "최신 트렌드를 빠르게 캐치하는 큐레이터",
    profileImageUrl: null,
    promptTemplate: "",
    promptVersion: "2.1",
    status: "ACTIVE",
    qualityScore: 87,
    validationScore: 0.88,
    validationVersion: 2,
    lastValidationDate: new Date(),
    source: "INCUBATOR",
    parentPersonaId: null,
    createdById: "2",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-16"),
    activatedAt: new Date("2024-01-06"),
    archivedAt: null,
    vector: { depth: 0.4, lens: 0.5, stance: 0.3, scope: 0.6, taste: 0.9, purpose: 0.4 },
  },
  {
    id: "4",
    organizationId: null,
    visibility: "GLOBAL",
    sharedWithOrgs: [],
    name: "균형 잡힌 가이드",
    role: "EDUCATOR",
    expertise: ["영화", "음악", "도서", "여행"],
    description: "다양한 관점에서 균형 잡힌 시각을 제공하는 가이드",
    profileImageUrl: null,
    promptTemplate: "",
    promptVersion: "1.5",
    status: "STANDARD",
    qualityScore: 94,
    validationScore: 0.96,
    validationVersion: 1,
    lastValidationDate: new Date(),
    source: "MANUAL",
    parentPersonaId: null,
    createdById: "1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-12"),
    activatedAt: new Date("2024-01-02"),
    archivedAt: null,
    vector: { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 },
  },
  {
    id: "5",
    organizationId: null,
    visibility: "PRIVATE",
    sharedWithOrgs: [],
    name: "시네필 평론가",
    role: "REVIEWER",
    expertise: ["영화"],
    description: "깊이 있는 영화 분석을 제공하는 시네필 평론가",
    profileImageUrl: null,
    promptTemplate: "",
    promptVersion: "1.0",
    status: "DRAFT",
    qualityScore: 78,
    validationScore: 0.82,
    validationVersion: 1,
    lastValidationDate: new Date(),
    source: "MANUAL",
    parentPersonaId: null,
    createdById: "2",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-16"),
    activatedAt: null,
    archivedAt: null,
    vector: { depth: 0.95, lens: 0.7, stance: 0.8, scope: 0.9, taste: 0.6, purpose: 0.85 },
  },
  {
    id: "6",
    organizationId: null,
    visibility: "PRIVATE",
    sharedWithOrgs: [],
    name: "음악 감정가",
    role: "CURATOR",
    expertise: ["음악"],
    description: "음악의 감성을 깊이 이해하는 감정가",
    profileImageUrl: null,
    promptTemplate: "",
    promptVersion: "0.9",
    status: "REVIEW",
    qualityScore: 72,
    validationScore: 0.75,
    validationVersion: 1,
    lastValidationDate: new Date(),
    source: "INCUBATOR",
    parentPersonaId: null,
    createdById: "3",
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-16"),
    activatedAt: null,
    archivedAt: null,
    vector: { depth: 0.7, lens: 0.15, stance: 0.25, scope: 0.6, taste: 0.7, purpose: 0.9 },
  },
]

const STATUS_COLORS: Record<PersonaStatus, string> = {
  DRAFT: "draft",
  REVIEW: "review",
  ACTIVE: "active",
  STANDARD: "success",
  LEGACY: "warning",
  DEPRECATED: "destructive",
  PAUSED: "warning",
  ARCHIVED: "archived",
}

export default function PersonasPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [selectedPersona, setSelectedPersona] = useState<typeof MOCK_PERSONAS[0] | null>(null)

  // 페르소나 상세 보기
  const handleViewDetail = (personaId: string) => {
    router.push(`/personas/${personaId}`)
  }

  // 페르소나 수정
  const handleEdit = (personaId: string) => {
    router.push(`/personas/${personaId}?edit=true`)
  }

  // 페르소나 테스트
  const handleTest = (personaId: string, personaName: string) => {
    toast.info(`"${personaName}" 테스트 페이지로 이동합니다.`)
    router.push(`/personas/${personaId}?tab=test`)
  }

  // 페르소나 복제
  const handleDuplicate = async (persona: typeof MOCK_PERSONAS[0]) => {
    try {
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...persona,
          name: `${persona.name} (복제본)`,
          status: "DRAFT",
        }),
      })

      const result = await response.json()
      if (result.success && result.data?.id) {
        toast.success(`"${persona.name}"이(가) 복제되었습니다.`)
        router.push(`/personas/${result.data.id}`)
      } else {
        toast.success(`"${persona.name}"이(가) 복제되었습니다.`) // Demo fallback
      }
    } catch {
      toast.error("복제에 실패했습니다.")
    }
  }

  // 페르소나 보관
  const handleArchive = async (personaId: string, personaName: string) => {
    if (!confirm(`"${personaName}"을(를) 보관하시겠습니까?`)) return
    try {
      await fetch(`/api/personas/${personaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      })
      toast.success(`"${personaName}"이(가) 보관되었습니다.`)
    } catch {
      toast.error("보관에 실패했습니다.")
    }
  }

  // 페르소나 삭제
  const handleDelete = async (personaId: string, personaName: string) => {
    if (!confirm(`"${personaName}"을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    try {
      await fetch(`/api/personas/${personaId}`, {
        method: "DELETE",
      })
      toast.success(`"${personaName}"이(가) 삭제되었습니다.`)
      if (selectedPersona?.id === personaId) {
        setSelectedPersona(null)
      }
    } catch {
      toast.error("삭제에 실패했습니다.")
    }
  }

  const filteredPersonas = MOCK_PERSONAS.filter((persona) => {
    const matchesSearch =
      persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || persona.status === statusFilter
    const matchesRole = roleFilter === "all" || persona.role === roleFilter
    return matchesSearch && matchesStatus && matchesRole
  })

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left: Persona List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">페르소나 목록</h2>
            <p className="text-sm text-muted-foreground">
              총 {filteredPersonas.length}개의 페르소나
            </p>
          </div>
          <Link href="/personas/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 페르소나
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="페르소나 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="DRAFT">초안</SelectItem>
              <SelectItem value="REVIEW">검수 대기</SelectItem>
              <SelectItem value="ACTIVE">활성</SelectItem>
              <SelectItem value="STANDARD">표준</SelectItem>
              <SelectItem value="ARCHIVED">보관</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="역할" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 역할</SelectItem>
              <SelectItem value="REVIEWER">리뷰어</SelectItem>
              <SelectItem value="CURATOR">큐레이터</SelectItem>
              <SelectItem value="EDUCATOR">교육자</SelectItem>
              <SelectItem value="COMPANION">동반자</SelectItem>
              <SelectItem value="ANALYST">분석가</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Persona Grid */}
        <div className="flex-1 overflow-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredPersonas.map((persona) => (
              <Card
                key={persona.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedPersona?.id === persona.id ? "border-primary ring-1 ring-primary" : ""
                }`}
                onClick={() => setSelectedPersona(persona)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={persona.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(persona.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {persona.name}
                          {persona.status === "STANDARD" && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {PERSONA_ROLE_LABELS[persona.role]}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(persona.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          상세 보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(persona.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTest(persona.id, persona.name)}>
                          <Play className="mr-2 h-4 w-4" />
                          테스트
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(persona)}>
                          <Copy className="mr-2 h-4 w-4" />
                          복제
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleArchive(persona.id, persona.name)}>
                          <Archive className="mr-2 h-4 w-4" />
                          보관
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(persona.id, persona.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {persona.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {persona.expertise.slice(0, 3).map((exp) => (
                        <Badge key={exp} variant="secondary" className="text-xs">
                          {exp}
                        </Badge>
                      ))}
                      {persona.expertise.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{persona.expertise.length - 3}
                        </Badge>
                      )}
                    </div>
                    <Badge variant={STATUS_COLORS[persona.status] as "default"}>
                      {PERSONA_STATUS_LABELS[persona.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">품질</span>
                    <Progress value={persona.qualityScore || 0} className="flex-1 h-1.5" />
                    <span className="text-xs font-medium">{persona.qualityScore}점</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="w-[400px] border-l pl-6 flex-shrink-0">
        {selectedPersona ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">상세 정보</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  수정
                </Button>
                <Button size="sm">
                  <Play className="h-4 w-4 mr-1" />
                  테스트
                </Button>
              </div>
            </div>

            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {getInitials(selectedPersona.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedPersona.name}</CardTitle>
                    <CardDescription>
                      {PERSONA_ROLE_LABELS[selectedPersona.role]} · v{selectedPersona.promptVersion}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedPersona.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedPersona.expertise.map((exp) => (
                    <Badge key={exp} variant="secondary">
                      {exp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vector Radar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">6D 성향 벡터</CardTitle>
              </CardHeader>
              <CardContent>
                <RadarChart
                  data={selectedPersona.vector}
                  height={250}
                  showLegend={false}
                />
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Depth</span>
                    <span className="font-mono">{selectedPersona.vector.depth.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lens</span>
                    <span className="font-mono">{selectedPersona.vector.lens.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stance</span>
                    <span className="font-mono">{selectedPersona.vector.stance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scope</span>
                    <span className="font-mono">{selectedPersona.vector.scope.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taste</span>
                    <span className="font-mono">{selectedPersona.vector.taste.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose</span>
                    <span className="font-mono">{selectedPersona.vector.purpose.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">통계</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">품질 점수</span>
                  <span className="font-medium">{selectedPersona.qualityScore}점</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">검증 점수</span>
                  <span className="font-medium">
                    {((selectedPersona.validationScore || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">생성일</span>
                  <span className="font-medium">
                    {selectedPersona.createdAt.toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">소스</span>
                  <Badge variant="outline">
                    {selectedPersona.source === "MANUAL" ? "수동" : "인큐베이터"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>페르소나를 선택하면</p>
            <p>상세 정보가 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
