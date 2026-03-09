// ═══════════════════════════════════════════════════════════════
// v4.2.0: Image Reaction Service
// 유저 이미지 포스트 → Vision 분석 → 관련 페르소나 선택 → 자동 댓글/반응
// ═══════════════════════════════════════════════════════════════

import type { ImageAnalysis } from "./image-analyzer"
import type { ImagePostContext } from "../persona-world/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ImageReactionCandidate {
  personaId: string
  matchScore: number
  matchReason: string
}

export interface ImageReactionConfig {
  /** 반응 생성 최소 매칭 점수 (0~1) */
  minMatchScore: number
  /** 최대 반응 페르소나 수 */
  maxReactors: number
  /** 랜덤 변동 (점수에 ±jitter 추가) */
  jitter: number
}

const DEFAULT_CONFIG: ImageReactionConfig = {
  minMatchScore: 0.3,
  maxReactors: 3,
  jitter: 0.1,
}

// ── 이미지 태그 ↔ 페르소나 관심사 매칭 ──────────────────────

/**
 * 이미지 분석 결과 기반으로 반응할 페르소나 후보를 선정.
 *
 * 매칭 기준:
 * 1. 이미지 태그 ↔ 페르소나 knowledgeAreas/expertise 겹침
 * 2. 이미지 카테고리 ↔ 페르소나 관심 콘텐츠 타입
 * 3. 이미지 sentiment ↔ 페르소나 현재 mood (유사하면 공감, 반대면 반응적)
 */
export function selectReactionCandidates(
  analysis: ImageAnalysis,
  personas: Array<{
    id: string
    knowledgeAreas: string[]
    expertise: string[]
    mood: number
  }>,
  config: ImageReactionConfig = DEFAULT_CONFIG
): ImageReactionCandidate[] {
  const imageTags = new Set(analysis.tags.map((t) => t.toLowerCase()))
  const imageCategory = analysis.category.toLowerCase()

  const candidates: ImageReactionCandidate[] = []

  for (const persona of personas) {
    let score = 0
    const reasons: string[] = []

    // 1. 태그 매칭 (knowledgeAreas + expertise)
    const personaInterests = [
      ...persona.knowledgeAreas.map((k) => k.toLowerCase()),
      ...persona.expertise.map((e) => e.toLowerCase()),
    ]

    let tagOverlap = 0
    for (const interest of personaInterests) {
      for (const tag of imageTags) {
        if (interest.includes(tag) || tag.includes(interest)) {
          tagOverlap++
        }
      }
    }

    if (tagOverlap > 0) {
      const tagScore = Math.min(tagOverlap * 0.2, 0.6)
      score += tagScore
      reasons.push(`태그 매칭 ${tagOverlap}건`)
    }

    // 2. 카테고리 매칭
    const categoryMatch = personaInterests.some(
      (interest) => interest.includes(imageCategory) || imageCategory.includes(interest)
    )
    if (categoryMatch) {
      score += 0.2
      reasons.push(`카테고리 매칭: ${analysis.category}`)
    }

    // 3. 감정 공명 (mood 유사도 → 공감 점수)
    const moodDiff = Math.abs(persona.mood - (analysis.sentiment * 0.5 + 0.5))
    if (moodDiff < 0.3) {
      score += 0.15
      reasons.push("감정 공명")
    }

    // 4. 랜덤 변동 (다양성 확보)
    score += (Math.random() - 0.5) * 2 * config.jitter

    // 최소 점수 필터
    if (score >= config.minMatchScore) {
      candidates.push({
        personaId: persona.id,
        matchScore: Math.min(1, Math.max(0, score)),
        matchReason: reasons.join(", ") || "기본 반응",
      })
    }
  }

  // 점수 내림차순 정렬 → 최대 수 제한
  return candidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, config.maxReactors)
}

/**
 * ImageAnalysis → ImagePostContext 변환 헬퍼.
 */
export function toImagePostContext(imageUrls: string[], analysis: ImageAnalysis): ImagePostContext {
  return {
    imageUrls,
    imageAnalysis: {
      description: analysis.description,
      mood: analysis.mood,
      tags: analysis.tags,
      dominantColors: analysis.dominantColors,
      sentiment: analysis.sentiment,
      category: analysis.category,
    },
  }
}
