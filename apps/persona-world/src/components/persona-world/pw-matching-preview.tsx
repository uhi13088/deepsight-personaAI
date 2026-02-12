"use client"

import { useEffect, useState } from "react"
import { PWCard, PWButton, PWProfileRing, PWSpinner } from "@/components/persona-world"
import { clientApi } from "@/lib/api"
import type { MatchingPreviewResponse, MatchingPreviewPersona } from "@/lib/types"
import { ArrowRight, Play, Trophy, Star, Medal } from "lucide-react"

interface PWMatchingPreviewProps {
  phase: number
  userId: string
  onContinue: () => void
  onFinish: () => void
}

export function PWMatchingPreview({ phase, userId, onContinue, onFinish }: PWMatchingPreviewProps) {
  const [data, setData] = useState<MatchingPreviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchPreview() {
      try {
        setLoading(true)
        setError(null)
        const result = await clientApi.getMatchingPreview(phase, userId)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "매칭 프리뷰를 불러올 수 없습니다")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPreview()
    return () => {
      cancelled = true
    }
  }, [phase, userId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <PWSpinner size="lg" />
        <p className="text-sm text-gray-500">매칭 분석 중...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-gray-500">{error ?? "데이터를 불러올 수 없습니다"}</p>
        <PWButton onClick={onContinue}>계속하기</PWButton>
      </div>
    )
  }

  const isLastPhase = phase === 3

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {/* 신뢰도 헤더 */}
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2">
          <Star className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">
            매칭 정밀도: {Math.round(data.confidence * 100)}%
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          {phase === 1 && "비슷한 페르소나를 찾았어요!"}
          {phase === 2 && "매칭이 더 정확해졌어요!"}
          {phase === 3 && "최고 수준의 매칭이 완성되었어요!"}
        </h2>
      </div>

      {/* 페르소나 카드 목록 */}
      <div className="space-y-3">
        {data.topPersonas.map((persona, idx) => (
          <PersonaMatchCard
            key={persona.personaId}
            persona={persona}
            rank={idx + 1}
            phase={phase}
          />
        ))}
      </div>

      {/* Phase 2: 차원 비교 바 */}
      {phase >= 2 && data.topPersonas[0]?.dimComparison && (
        <PWCard className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">취향 벡터 비교</h3>
          <div className="space-y-2">
            {data.topPersonas[0].dimComparison.map((dim) => (
              <DimComparisonBar key={dim.dimension} dim={dim} />
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> 나
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-400" /> {data.topPersonas[0].name}
            </span>
          </div>
        </PWCard>
      )}

      {/* CTA 버튼 */}
      <div className="flex flex-col gap-3">
        {!isLastPhase && data.nextPhaseInfo && (
          <>
            <PWButton onClick={onContinue} icon={ArrowRight} className="w-full">
              Phase {data.nextPhaseInfo.nextPhase} 시작 (+{data.nextPhaseInfo.expectedImprovement}%
              향상)
            </PWButton>
            <button
              onClick={onFinish}
              className="text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              여기서 시작하기
            </button>
          </>
        )}
        {isLastPhase && (
          <PWButton onClick={onFinish} icon={Play} className="w-full">
            PersonaWorld 시작하기
          </PWButton>
        )}
      </div>
    </div>
  )
}

// ── 페르소나 매칭 카드 ──────────────────────────────────────

function PersonaMatchCard({
  persona,
  rank,
  phase,
}: {
  persona: MatchingPreviewPersona
  rank: number
  phase: number
}) {
  const RankIcon = rank === 1 ? Trophy : rank === 2 ? Medal : Star
  const rankColors = ["", "text-yellow-500", "text-gray-400", "text-orange-400"]

  return (
    <PWCard className="flex items-center gap-4 p-4">
      <div className="relative">
        <PWProfileRing size="sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-sm font-bold text-purple-600">
            {persona.name[0]}
          </div>
        </PWProfileRing>
        {phase === 3 && rank <= 3 && (
          <RankIcon
            className={`absolute -right-1 -top-1 h-4 w-4 ${rankColors[rank] || "text-gray-300"}`}
          />
        )}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{persona.name}</p>
        <p className="text-xs text-gray-500">{persona.tagline ?? persona.handle}</p>
      </div>
      <div className="text-right">
        <span className="pw-text-gradient text-lg font-bold">{persona.similarity}%</span>
        <p className="text-[10px] text-gray-400">유사도</p>
      </div>
    </PWCard>
  )
}

// ── 차원 비교 바 ────────────────────────────────────────────

const DIM_LABELS: Record<string, string> = {
  depth: "분석 깊이",
  lens: "판단 렌즈",
  stance: "비평 태도",
  scope: "디테일",
  taste: "취향 성향",
  purpose: "목적 지향",
}

function DimComparisonBar({
  dim,
}: {
  dim: { dimension: string; userValue: number; personaValue: number }
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-right text-[11px] text-gray-500">
        {DIM_LABELS[dim.dimension] ?? dim.dimension}
      </span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-purple-400"
          style={{ width: `${dim.userValue * 100}%`, opacity: 0.7 }}
        />
        <div
          className="absolute inset-y-0 left-0 h-full rounded-full bg-orange-300"
          style={{ width: `${dim.personaValue * 100}%`, opacity: 0.5 }}
        />
      </div>
    </div>
  )
}
