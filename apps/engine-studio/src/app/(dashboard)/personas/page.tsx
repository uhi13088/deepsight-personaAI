"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  Search,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { RadarChart } from "@/components/charts/radar-chart"
import { PERSONA_STATUS_LABELS, PERSONA_ROLE_LABELS } from "@/lib/utils"
import type { Persona, PersonaStatus, Vector6D } from "@/types"
import { MOCK_PERSONAS as MOCK_PERSONAS_SERVICE } from "@/services/mock-data.service"

// Transform MockPersona data to full Persona type with all required fields
// MockPersona now uses DB enum values (PersonaRole, PersonaStatus)
const MOCK_PERSONAS: (Persona & { vector: Vector6D })[] = MOCK_PERSONAS_SERVICE.map((p, index) => ({
  id: p.id,
  organizationId: null,
  visibility: index % 2 === 0 ? "GLOBAL" : ("PRIVATE" as const),
  sharedWithOrgs: [],
  name: p.name,
  role: p.role, // 이제 MockPersona가 DB enum (PersonaRole)을 직접 사용
  expertise: p.expertise,
  description: p.promptTemplate.slice(0, 60) + "...",
  profileImageUrl: null,
  promptTemplate: p.promptTemplate,
  promptVersion: "1.0",
  status: p.status, // 이제 MockPersona가 DB enum (PersonaStatus)을 직접 사용
  qualityScore: Math.round(p.accuracy),
  validationScore: p.accuracy / 100,
  validationVersion: 1,
  lastValidationDate: new Date(p.updatedAt),
  source: "MANUAL" as const,
  parentPersonaId: null,
  createdById: "1",
  createdAt: new Date(p.createdAt),
  updatedAt: new Date(p.updatedAt),
  activatedAt: p.status === "ACTIVE" ? new Date(p.createdAt) : null,
  archivedAt: null,
  vector: p.vector,
}))

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
  const [selectedPersona, setSelectedPersona] = useState<(typeof MOCK_PERSONAS)[0] | null>(null)

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
  const handleDuplicate = async (persona: (typeof MOCK_PERSONAS)[0]) => {
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
      const response = await fetch(`/api/personas/${personaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      toast.success(`"${personaName}"이(가) 보관되었습니다.`)
    } catch {
      toast.error("보관에 실패했습니다.")
    }
  }

  // 페르소나 삭제
  const handleDelete = async (personaId: string, personaName: string) => {
    if (!confirm(`"${personaName}"을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`))
      return
    try {
      const response = await fetch(`/api/personas/${personaId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
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
      .map((n) => n?.[0] || "")
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Left: Persona List */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">페르소나 목록</h2>
            <p className="text-muted-foreground text-sm">
              총 {filteredPersonas.length}개의 페르소나
            </p>
          </div>
          <Link href="/personas/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />새 페르소나
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
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
                className={`hover:border-primary cursor-pointer transition-all ${
                  selectedPersona?.id === persona.id ? "border-primary ring-primary ring-1" : ""
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
                        <CardTitle className="flex items-center gap-2 text-base">
                          {persona.name}
                          {persona.status === "STANDARD" && (
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
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
                  <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
                    {persona.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
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
                    <span className="text-muted-foreground text-xs">품질</span>
                    <Progress value={persona.qualityScore || 0} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium">{persona.qualityScore}점</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="w-[400px] flex-shrink-0 border-l pl-6">
        {selectedPersona ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">상세 정보</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="mr-1 h-4 w-4" />
                  수정
                </Button>
                <Button size="sm">
                  <Play className="mr-1 h-4 w-4" />
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
                <p className="text-muted-foreground mb-4 text-sm">{selectedPersona.description}</p>
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
                <RadarChart data={selectedPersona.vector} height={250} showLegend={false} />
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
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
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-center">
            <Users className="mb-4 h-12 w-12 opacity-50" />
            <p>페르소나를 선택하면</p>
            <p>상세 정보가 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
