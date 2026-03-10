"use client"

import { useEffect, useState } from "react"
import { PWCard, PWButton, PWProfileRing, PWSpinner } from "@/components/persona-world"
import { clientApi } from "@/lib/api"
import { useUserStore } from "@/lib/user-store"
import type { MatchingPreviewResponse, MatchingPreviewPersona } from "@/lib/types"
import { ArrowRight, Play, Trophy, Star, Medal, Sparkles, Heart } from "lucide-react"

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
  const [requesting, setRequesting] = useState(false)
  const [requestResult, setRequestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const requestPersona = useUserStore((s) => s.requestPersona)
  const hasActiveRequest = useUserStore((s) => s.hasActiveRequest)

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
  const topSimilarity = data.topPersonas[0]?.similarity ?? 0
  const showRequestButton = topSimilarity < 70

  async function handleRequestPersona() {
    setRequesting(true)
    try {
      const result = await requestPersona(topSimilarity)
      if (result) {
        setRequestResult({
          success: true,
          message:
            result.scheduledDate.slice(0, 10) === new Date().toISOString().slice(0, 10)
              ? "오늘 중으로 당신만의 페르소나가 생성됩니다!"
              : `${result.scheduledDate.slice(0, 10)}에 페르소나가 생성될 예정입니다.`,
        })
      } else {
        setRequestResult({
          success: false,
          message: "요청에 실패했습니다. 다시 시도해주세요.",
        })
      }
    } catch {
      setRequestResult({
        success: false,
        message: "요청에 실패했습니다. 다시 시도해주세요.",
      })
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2">
          <Heart className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">
            취향 일치도: {Math.round(data.confidence * 100)}%
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          {phase === 1 && "비슷한 페르소나를 찾았어요!"}
          {phase === 2 && "매칭이 더 정확해졌어요!"}
          {phase === 3 && "최고 수준의 매칭이 완성되었어요!"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {phase === 1 && "콘텐츠를 즐기는 스타일이 비슷한 페르소나를 찾았어요"}
          {phase === 2 && "성격과 기질까지 분석해서 더 정확한 매칭을 찾았어요"}
          {phase === 3 && "콘텐츠 스타일, 성격, 내면의 이야기까지 모두 반영했어요"}
        </p>
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

      {/* 매칭 기준 */}
      {data.topPersonas[0] && (
        <PWCard className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">이런 점이 비슷해요</h3>
          <MatchReasonChips similarity={data.topPersonas[0].similarity} phase={phase} />
        </PWCard>
      )}

      {/* Phase 2+: 취향 비교 바 */}
      {phase >= 2 && data.topPersonas[0]?.dimComparison && (
        <PWCard className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">나와 비교하기</h3>
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

      {/* 페르소나 요청 (유사도 < 70%) */}
      {showRequestButton && (
        <PWCard className="border-dashed border-purple-200 bg-purple-50/50 p-4">
          <div className="text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-purple-500" />
            <p className="mb-1 text-sm font-semibold text-gray-800">
              아직 딱 맞는 페르소나가 없나요?
            </p>
            <p className="mb-3 text-xs text-gray-500">
              당신의 취향에 맞는 새로운 페르소나를 만들어 드립니다
            </p>
            {requestResult ? (
              <div
                className={`rounded-lg p-3 text-sm ${
                  requestResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                }`}
              >
                {requestResult.message}
              </div>
            ) : (
              <PWButton
                onClick={handleRequestPersona}
                disabled={requesting || hasActiveRequest()}
                icon={Sparkles}
                className="w-full"
              >
                {requesting
                  ? "요청 중..."
                  : hasActiveRequest()
                    ? "이미 요청이 진행 중입니다"
                    : "페르소나 요청하기"}
              </PWButton>
            )}
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
        <p className="text-[10px] text-gray-400">일치</p>
      </div>
    </PWCard>
  )
}

// ── 매칭 기준 칩 ──────────────────────────────────────────────

const MATCH_REASONS_BY_PHASE: Record<number, Array<{ tag: string; desc: string }>> = {
  1: [
    { tag: "콘텐츠 감상 스타일", desc: "콘텐츠를 깊이 파고들거나 가볍게 즐기는 방식이 비슷해요" },
    { tag: "취향 패턴", desc: "좋아하는 장르와 콘텐츠 성향이 닮아있어요" },
  ],
  2: [
    { tag: "콘텐츠 스타일", desc: "콘텐츠를 즐기는 방식이 비슷해요" },
    { tag: "성격 기질", desc: "감정 표현이나 의사소통 스타일이 통해요" },
    { tag: "깊은 공감대", desc: "같은 것에 감동받고 반응하는 패턴이 닮았어요" },
  ],
  3: [
    { tag: "콘텐츠 스타일", desc: "콘텐츠를 즐기는 방식이 비슷해요" },
    { tag: "성격 기질", desc: "소통 방식과 감정 표현이 통해요" },
    { tag: "내면의 이야기", desc: "삶에서 추구하는 가치와 방향이 닮았어요" },
    { tag: "종합 매칭", desc: "세 가지 관점을 모두 반영한 최정밀 매칭이에요" },
  ],
}

function MatchReasonChips({ similarity, phase }: { similarity: number; phase: number }) {
  const reasons = MATCH_REASONS_BY_PHASE[phase] ?? MATCH_REASONS_BY_PHASE[1]
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {reasons.map((r) => (
          <span
            key={r.tag}
            className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-600"
          >
            {r.tag}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {similarity >= 80
          ? "취향이 아주 잘 맞는 페르소나에요!"
          : similarity >= 60
            ? "많은 부분에서 취향이 통하는 페르소나에요"
            : "아직 분석이 더 필요하지만, 비슷한 면이 있는 페르소나에요"}
      </p>
    </div>
  )
}

// ── 차원 비교 바 ────────────────────────────────────────────

const DIM_LABELS: Record<string, string> = {
  depth: "분석 깊이",
  lens: "감성 vs 논리",
  stance: "수용 vs 비판",
  scope: "핵심 vs 디테일",
  taste: "클래식 vs 실험",
  purpose: "재미 vs 의미",
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
