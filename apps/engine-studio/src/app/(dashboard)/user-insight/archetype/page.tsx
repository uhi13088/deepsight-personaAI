"use client"

import { useState, useMemo, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  BASE_ARCHETYPES,
  classifyUser,
  createCustomArchetype,
  addArchetype,
  removeArchetype,
  computeArchetypeStats,
} from "@/lib/user-insight/user-archetype"
import type { UserArchetype, UserArchetypeProfile } from "@/lib/user-insight/user-archetype"
import { L1_DIMENSIONS } from "@/constants/v3/dimensions"
import type { SocialPersonaVector, SocialDimension } from "@/types"
import { Plus, Trash2, Target, Users, FlaskConical } from "lucide-react"

const DEFAULT_VECTOR: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

export default function ArchetypePage() {
  const [archetypes, setArchetypes] = useState<UserArchetype[]>([...BASE_ARCHETYPES])
  const [testVector, setTestVector] = useState<SocialPersonaVector>({ ...DEFAULT_VECTOR })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newNameKo, setNewNameKo] = useState("")
  const [newDesc, setNewDesc] = useState("")

  // 분류 테스트
  const classification = useMemo(
    () => classifyUser(testVector, archetypes),
    [testVector, archetypes]
  )

  // 통계 (샘플 프로필 기반)
  const sampleStats = useMemo(() => {
    const profiles: UserArchetypeProfile[] = []
    for (const arch of archetypes) {
      if (arch.id === "hybrid") continue
      const profile = classifyUser(arch.referenceVector as SocialPersonaVector, archetypes)
      profiles.push({ ...profile, userId: arch.id })
    }
    return computeArchetypeStats(profiles)
  }, [archetypes])

  const handleAddCustom = useCallback(() => {
    if (!newName.trim() || !newNameKo.trim()) return
    const custom = createCustomArchetype(
      newName.trim(),
      newNameKo.trim(),
      newDesc.trim() || `${newNameKo} 커스텀 아키타입`,
      { ...DEFAULT_VECTOR } as Record<SocialDimension, number>,
      []
    )
    try {
      setArchetypes((prev) => addArchetype(prev, custom))
      setNewName("")
      setNewNameKo("")
      setNewDesc("")
      setShowAddForm(false)
    } catch {
      // 중복 ID
    }
  }, [newName, newNameKo, newDesc])

  const handleRemoveCustom = useCallback((id: string) => {
    try {
      setArchetypes((prev) => removeArchetype(prev, id))
    } catch {
      // 기본 아키타입 삭제 시도
    }
  }, [])

  return (
    <>
      <Header title="Archetype Manager" description="유저 아키타입 10종 관리 및 분류 테스트" />

      <div className="space-y-6 p-6">
        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              기본 아키타입
            </div>
            <p className="text-2xl font-bold">{archetypes.filter((a) => !a.isCustom).length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              커스텀 아키타입
            </div>
            <p className="text-2xl font-bold">{archetypes.filter((a) => a.isCustom).length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" />
              전체 아키타입
            </div>
            <p className="text-2xl font-bold">{archetypes.length}</p>
          </div>
        </div>

        {/* 아키타입 카드 그리드 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">아키타입 목록</h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="mr-1 h-4 w-4" />
              커스텀 추가
            </Button>
          </div>

          {/* 추가 폼 */}
          {showAddForm && (
            <div className="bg-card mb-4 rounded-lg border p-4">
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="이름 (EN)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-40"
                />
                <Input
                  placeholder="이름 (KO)"
                  value={newNameKo}
                  onChange={(e) => setNewNameKo(e.target.value)}
                  className="w-40"
                />
                <Input
                  placeholder="설명"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddCustom}
                  disabled={!newName.trim() || !newNameKo.trim()}
                >
                  추가
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {archetypes.map((arch) => (
              <div key={arch.id} className="bg-card rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{arch.nameKo}</span>
                    <Badge variant={arch.isCustom ? "warning" : "muted"}>
                      {arch.isCustom ? "커스텀" : "기본"}
                    </Badge>
                  </div>
                  {arch.isCustom && (
                    <button
                      onClick={() => handleRemoveCustom(arch.id)}
                      className="text-muted-foreground hover:text-destructive rounded p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                  {arch.description}
                </p>
                {/* 7D 벡터 바 */}
                <div className="space-y-1.5">
                  {L1_DIMENSIONS.map((dim) => {
                    const val = arch.referenceVector[dim.key as SocialDimension] ?? 0.5
                    return (
                      <div key={dim.key} className="flex items-center gap-2">
                        <span className="text-muted-foreground w-12 text-[10px]">{dim.label}</span>
                        <div className="bg-muted h-1.5 flex-1 rounded-full">
                          <div
                            className="h-full rounded-full bg-blue-500/70"
                            style={{ width: `${val * 100}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-7 text-right text-[10px]">
                          {val.toFixed(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {/* 임계값 규칙 */}
                {arch.thresholds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {arch.thresholds.map((t, i) => {
                      const dimDef = L1_DIMENSIONS.find((d) => d.key === t.dimension)
                      return (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {dimDef?.label ?? t.dimension} {t.operator === "gte" ? "≥" : "≤"}{" "}
                          {t.value}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 분류 테스터 */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            <h3 className="text-sm font-medium">분류 테스터</h3>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 벡터 입력 */}
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                유저 벡터를 조절하여 아키타입 분류 결과를 확인하세요
              </p>
              {L1_DIMENSIONS.map((dim) => (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{dim.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {testVector[dim.key as keyof SocialPersonaVector].toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[testVector[dim.key as keyof SocialPersonaVector] * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) =>
                      setTestVector((prev) => ({ ...prev, [dim.key]: v / 100 }))
                    }
                  />
                </div>
              ))}
            </div>

            {/* 분류 결과 */}
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground mb-1 text-xs">1차 아키타입</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {classification.primaryArchetype.archetypeName}
                  </span>
                  <Badge variant="success">
                    {(classification.primaryArchetype.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  거리: {classification.primaryArchetype.distance.toFixed(3)} · 규칙 매칭:{" "}
                  {classification.primaryArchetype.matchedThresholds}/
                  {classification.primaryArchetype.totalThresholds}
                </p>
              </div>

              {classification.secondaryArchetype && (
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground mb-1 text-xs">2차 아키타입</p>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {classification.secondaryArchetype.archetypeName}
                    </span>
                    <Badge variant="muted">
                      {(classification.secondaryArchetype.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              )}

              {/* 전체 순위 */}
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground mb-2 text-xs">전체 순위 (거리순)</p>
                <div className="space-y-1">
                  {classification.allScores.slice(0, 5).map((score, i) => (
                    <div
                      key={score.archetypeId}
                      className="flex items-center justify-between text-xs"
                    >
                      <span>
                        <span className="text-muted-foreground mr-2">{i + 1}.</span>
                        {score.archetypeName}
                      </span>
                      <span className="text-muted-foreground">
                        d={score.distance.toFixed(2)} · {(score.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 아키타입별 통계 */}
        {sampleStats.length > 0 && (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">아키타입별 분포 (참조벡터 기준)</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {sampleStats.map((stat) => (
                <div key={stat.archetypeId} className="rounded border p-3 text-center">
                  <p className="text-xs font-medium">{stat.archetypeName}</p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    신뢰도 {(stat.avgConfidence * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
