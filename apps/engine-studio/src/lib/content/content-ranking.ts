// ═══════════════════════════════════════════════════════════════
// content-ranking.ts — ContentItem × Persona 매칭 스코어 계산
// T398: userVector와 contentVector 유사도 기반 콘텐츠 랭킹
// ═══════════════════════════════════════════════════════════════

import { cosineSimilarity } from "@/lib/vector/utils"
import type { SocialPersonaVector, NarrativeDriveVector } from "@deepsight/shared-types"

// ── 타입 ─────────────────────────────────────────────────────

export interface ContentItemForRanking {
  id: string
  contentVector: SocialPersonaVector | null
  narrativeTheme: NarrativeDriveVector | null
  curationScore: number // PersonaCuratedContent.curationScore
  personaId: string
  personaName: string
  personaMatchScore: number // 유저 ↔ 페르소나 매칭 스코어
  contentType: string
  title: string
  description?: string | null
  sourceUrl?: string | null
  genres: string[]
  tags: string[]
}

export interface RankedContent {
  contentItemId: string
  contentType: string
  title: string
  description?: string | null
  sourceUrl?: string | null
  genres: string[]
  tags: string[]
  finalScore: number
  matchScore: number // contentVector ↔ userVector 유사도
  recommendedBy: {
    personaId: string
    personaName: string
    personaMatchScore: number
    curationScore: number
  }[]
}

// ── L1 → number[] 변환 ────────────────────────────────────────

function l1ToArray(v: SocialPersonaVector): number[] {
  return [v.depth, v.lens, v.stance, v.scope, v.taste, v.purpose, v.sociability]
}

function l3ToArray(v: NarrativeDriveVector): number[] {
  return [v.lack, v.moralCompass, v.volatility, v.growthArc]
}

// ── 단건 스코어 계산 ──────────────────────────────────────────

/**
 * 유저 L1 벡터와 ContentItem 벡터의 유사도 계산.
 * L3 보너스 선택적 적용.
 *
 * @returns score [0, 1]
 */
export function scoreContentForUser(
  userVector: SocialPersonaVector,
  content: Pick<ContentItemForRanking, "contentVector" | "narrativeTheme">
): number {
  if (!content.contentVector) {
    return 0.5 // 벡터화 전 콘텐츠는 중간값
  }

  const l1Score = Math.max(
    0,
    cosineSimilarity(l1ToArray(userVector), l1ToArray(content.contentVector))
  )

  // L3 보너스 (0~0.1 범위)
  let l3Bonus = 0
  if (content.narrativeTheme) {
    const userL3Neutral = [0.5, 0.5, 0.5, 0.5] // 유저 L3 없을 때 중립값
    const similarity = Math.max(
      0,
      cosineSimilarity(userL3Neutral, l3ToArray(content.narrativeTheme))
    )
    l3Bonus = similarity * 0.1
  }

  return Math.min(1, l1Score + l3Bonus)
}

// ── 배치 랭킹 ─────────────────────────────────────────────────

/**
 * ContentItem 목록을 finalScore(matchScore × curationScore)로 랭킹.
 * 동일 contentItemId는 최고 finalScore 항목만 유지.
 * 상위 limit개 반환.
 */
export function rankContents(
  userVector: SocialPersonaVector,
  contents: ContentItemForRanking[],
  limit: number
): RankedContent[] {
  // 각 콘텐츠에 matchScore + finalScore 계산
  const scored = contents.map((c) => {
    const matchScore = scoreContentForUser(userVector, c)
    const finalScore = Math.round(matchScore * c.curationScore * 1000) / 1000

    return {
      contentItemId: c.id,
      contentType: c.contentType,
      title: c.title,
      description: c.description,
      sourceUrl: c.sourceUrl,
      genres: c.genres,
      tags: c.tags,
      finalScore,
      matchScore: Math.round(matchScore * 1000) / 1000,
      recommendedBy: [
        {
          personaId: c.personaId,
          personaName: c.personaName,
          personaMatchScore: Math.round(c.personaMatchScore * 1000) / 1000,
          curationScore: Math.round(c.curationScore * 1000) / 1000,
        },
      ],
    }
  })

  // 동일 contentItemId 중복 제거: 최고 finalScore 유지 + recommendedBy 병합
  const deduped = new Map<string, RankedContent>()
  for (const item of scored) {
    const existing = deduped.get(item.contentItemId)
    if (!existing) {
      deduped.set(item.contentItemId, item)
    } else {
      // recommendedBy 병합
      existing.recommendedBy.push(...item.recommendedBy)
      if (item.finalScore > existing.finalScore) {
        existing.finalScore = item.finalScore
        existing.matchScore = item.matchScore
      }
    }
  }

  return [...deduped.values()].sort((a, b) => b.finalScore - a.finalScore).slice(0, limit)
}
