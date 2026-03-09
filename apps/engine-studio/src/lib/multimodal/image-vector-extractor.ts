// ═══════════════════════════════════════════════════════════════
// v4.2.0: Image Vector Extractor
// 이미지 분석 결과(ImageAnalysis) → L1 소셜 벡터(7D) 변환
// 텍스트 벡터와 동일 스키마를 사용하여 기존 매칭 엔진과 호환
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector } from "@deepsight/shared-types"
import type { ImageAnalysis } from "./image-analyzer"

// ── 매핑 규칙 ─────────────────────────────────────────────────

/**
 * 카테고리별 기본 벡터 프리셋.
 *
 * 이미지 카테고리가 해당 콘텐츠에 끌리는 사람의 특성을 반영.
 * 예: "예술" → depth 높음, taste 높음 (실험적)
 */
const CATEGORY_PRESETS: Record<string, Partial<SocialPersonaVector>> = {
  풍경: {
    depth: 0.6,
    lens: 0.4,
    stance: 0.3,
    scope: 0.7,
    taste: 0.5,
    purpose: 0.6,
    sociability: 0.4,
  },
  음식: {
    depth: 0.3,
    lens: 0.4,
    stance: 0.3,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.3,
    sociability: 0.7,
  },
  인물: {
    depth: 0.5,
    lens: 0.5,
    stance: 0.4,
    scope: 0.5,
    taste: 0.4,
    purpose: 0.5,
    sociability: 0.7,
  },
  예술: {
    depth: 0.8,
    lens: 0.5,
    stance: 0.5,
    scope: 0.8,
    taste: 0.8,
    purpose: 0.7,
    sociability: 0.5,
  },
  일상: {
    depth: 0.3,
    lens: 0.5,
    stance: 0.3,
    scope: 0.4,
    taste: 0.4,
    purpose: 0.3,
    sociability: 0.6,
  },
  동물: {
    depth: 0.3,
    lens: 0.3,
    stance: 0.2,
    scope: 0.4,
    taste: 0.4,
    purpose: 0.3,
    sociability: 0.6,
  },
  건축: {
    depth: 0.7,
    lens: 0.7,
    stance: 0.5,
    scope: 0.8,
    taste: 0.6,
    purpose: 0.6,
    sociability: 0.4,
  },
  패션: {
    depth: 0.4,
    lens: 0.4,
    stance: 0.5,
    scope: 0.6,
    taste: 0.7,
    purpose: 0.4,
    sociability: 0.7,
  },
  스포츠: {
    depth: 0.3,
    lens: 0.5,
    stance: 0.6,
    scope: 0.4,
    taste: 0.4,
    purpose: 0.4,
    sociability: 0.8,
  },
}

const DEFAULT_PRESET: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

// ── 감정/분위기 기반 보정 ────────────────────────────────────

/**
 * sentiment → lens/stance/purpose 보정.
 *
 * 긍정적 이미지 → 감성적(lens ↓), 수용적(stance ↓)
 * 부정적 이미지 → 논리적(lens ↑), 비판적(stance ↑)
 */
function applySentimentAdjustment(
  base: SocialPersonaVector,
  sentiment: number
): SocialPersonaVector {
  return {
    ...base,
    lens: clamp(base.lens - sentiment * 0.15),
    stance: clamp(base.stance - sentiment * 0.1),
    purpose: clamp(base.purpose + Math.abs(sentiment) * 0.1),
  }
}

/**
 * 태그 수 → scope/depth 보정.
 *
 * 태그 많으면 → 디테일(scope ↑), 심층적(depth ↑)
 */
function applyTagComplexityAdjustment(
  base: SocialPersonaVector,
  tagCount: number
): SocialPersonaVector {
  const complexity = Math.min(tagCount / 8, 1) // 8개 이상이면 최대
  return {
    ...base,
    scope: clamp(base.scope + complexity * 0.15),
    depth: clamp(base.depth + complexity * 0.1),
  }
}

/**
 * 색감 → taste 보정.
 *
 * "파스텔", "비비드" 등 키워드 기반으로 실험적/클래식 성향 판단.
 */
function applyColorAdjustment(base: SocialPersonaVector, colors: string[]): SocialPersonaVector {
  const colorText = colors.join(" ").toLowerCase()
  let tasteAdjust = 0

  if (colorText.includes("파스텔") || colorText.includes("네온") || colorText.includes("비비드")) {
    tasteAdjust += 0.1 // 실험적
  }
  if (colorText.includes("모노") || colorText.includes("흑백") || colorText.includes("베이지")) {
    tasteAdjust -= 0.1 // 클래식
  }

  return {
    ...base,
    taste: clamp(base.taste + tasteAdjust),
  }
}

// ── 메인 추출 함수 ────────────────────────────────────────────

/**
 * 이미지 분석 결과에서 L1 소셜 벡터(7D)를 추출.
 *
 * 매핑: 카테고리 프리셋 → sentiment 보정 → 태그 복잡도 보정 → 색감 보정
 */
export function extractImageVector(analysis: ImageAnalysis): SocialPersonaVector {
  // Step 1: 카테고리 기반 프리셋 선택
  const preset = CATEGORY_PRESETS[analysis.category] ?? {}
  let vector: SocialPersonaVector = { ...DEFAULT_PRESET, ...preset }

  // Step 2: 감정 보정
  vector = applySentimentAdjustment(vector, analysis.sentiment)

  // Step 3: 태그 복잡도 보정
  vector = applyTagComplexityAdjustment(vector, analysis.tags.length)

  // Step 4: 색감 보정
  vector = applyColorAdjustment(vector, analysis.dominantColors)

  return vector
}

/**
 * 텍스트 벡터와 이미지 벡터를 가중 평균으로 합성.
 *
 * 기본 가중치: 텍스트 0.6 + 이미지 0.4
 */
export function blendVectors(
  textVector: SocialPersonaVector,
  imageVector: SocialPersonaVector,
  imageWeight = 0.4
): SocialPersonaVector {
  const textWeight = 1 - imageWeight
  return {
    depth: clamp(textVector.depth * textWeight + imageVector.depth * imageWeight),
    lens: clamp(textVector.lens * textWeight + imageVector.lens * imageWeight),
    stance: clamp(textVector.stance * textWeight + imageVector.stance * imageWeight),
    scope: clamp(textVector.scope * textWeight + imageVector.scope * imageWeight),
    taste: clamp(textVector.taste * textWeight + imageVector.taste * imageWeight),
    purpose: clamp(textVector.purpose * textWeight + imageVector.purpose * imageWeight),
    sociability: clamp(textVector.sociability * textWeight + imageVector.sociability * imageWeight),
  }
}

// ── 유틸리티 ─────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}
