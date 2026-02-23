// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4 — Voice Adjustment Layer
// Phase RA T193: L2 기질 + tension → 말투/스타일 보정
//
// 설계 원칙:
// - tension < 0.5 → null (조정 없음, 자연 말투 유지)
// - tension ≥ 0.5 → 기질별 차등 보정
// - 기존 11종 tone 시스템을 교체하지 않고 allowedTones 필터링으로 보정
// ═══════════════════════════════════════════════════════════════

import type { L2ConflictPattern } from "./l2-pattern"
import type { CommentTone, VoiceStyleParams } from "../types"

/**
 * 말투 보정 파라미터.
 * 기존 VoiceStyleParams를 override하거나 허용 톤 목록을 좁힌다.
 */
export interface VoiceAdjustment {
  /** 허용 톤 추가 제한. mergeAllowedTones()로 기존 프로토콜 allowedTones와 교집합 처리 */
  toneFilter?: CommentTone[]
  /** VoiceStyleParams 부분 override (0~1 범위 클램핑 없음 — 호출부에서 책임) */
  styleOverride?: Partial<VoiceStyleParams>
  /** 댓글 길이 배율. LLM 프롬프트에 max_length 힌트로 전달 */
  lengthMultiplier?: number
  /** true이면 "감정", "슬픔", "기뻐" 등 감정 표현 단어 지시 억제 */
  suppressEmotionWords?: boolean
}

/**
 * L2 기질 + tension → VoiceAdjustment 계산.
 *
 * tension < 0.5이면 null 반환 (변화 없음).
 * tension ≥ 0.5이면 기질에 따라 말투 보정.
 *
 * 기질별 보정 방향:
 * - Avoidant: 격식체↑, 유머↓, 길이 단축, 감정어 억제
 * - Aggressive: assertiveness↑, 유머↓, 반박 톤 우선
 * - Dominant: 길이 확장, 분석/반박 톤 우선
 * - Anxious: 길이 단축, 감정어 억제, 부드러운 톤만 허용
 * - Stable: 소폭 격식체↑ (고갈등 시)
 */
export function computeVoiceAdjustment(
  pattern: L2ConflictPattern,
  tension: number
): VoiceAdjustment | null {
  if (tension < 0.5) return null

  const isHigh = tension > 0.7

  switch (pattern) {
    case "Avoidant":
      return isHigh
        ? {
            toneFilter: ["formal_analysis", "soft_rebuttal", "supportive"],
            styleOverride: { formality: 0.8, humor: 0.1, emotionExpression: 0.1 },
            lengthMultiplier: 0.2,
            suppressEmotionWords: true,
          }
        : {
            toneFilter: ["formal_analysis", "soft_rebuttal", "supportive", "empathetic"],
            styleOverride: { formality: 0.65, humor: 0.2, emotionExpression: 0.2 },
            lengthMultiplier: 0.5,
          }

    case "Aggressive":
      return isHigh
        ? {
            toneFilter: ["direct_rebuttal", "formal_analysis"],
            styleOverride: { assertiveness: 0.9, humor: 0.1 },
          }
        : {
            toneFilter: ["direct_rebuttal", "soft_rebuttal", "unique_perspective"],
            styleOverride: { assertiveness: 0.7 },
          }

    case "Dominant":
      return isHigh
        ? {
            toneFilter: ["deep_analysis", "formal_analysis", "direct_rebuttal"],
            styleOverride: { assertiveness: 0.8, vocabularyLevel: 0.75 },
            lengthMultiplier: 1.5,
          }
        : {
            toneFilter: [
              "deep_analysis",
              "formal_analysis",
              "direct_rebuttal",
              "unique_perspective",
            ],
            styleOverride: { assertiveness: 0.7 },
            lengthMultiplier: 1.3,
          }

    case "Anxious":
      return isHigh
        ? {
            toneFilter: ["supportive"],
            styleOverride: { formality: 0.6, humor: 0.1, emotionExpression: 0.1 },
            lengthMultiplier: 0.3,
            suppressEmotionWords: true,
          }
        : {
            toneFilter: ["soft_rebuttal", "supportive", "empathetic"],
            styleOverride: { emotionExpression: 0.3 },
            lengthMultiplier: 0.5,
          }

    case "Stable":
      // Stable은 고갈등에서만 소폭 조정
      return isHigh
        ? {
            styleOverride: { formality: 0.6 },
            lengthMultiplier: 0.85,
          }
        : null

    default:
      return null
  }
}

/**
 * VoiceAdjustment.toneFilter와 기존 프로토콜 allowedTones를 병합.
 *
 * 우선순위:
 * 1. 둘 다 있으면 교집합 (더 엄격한 쪽)
 * 2. toneFilter만 있으면 toneFilter 사용
 * 3. existingAllowed만 있으면 기존 유지
 * 4. 교집합이 비어있으면 toneFilter 사용 (기존 프로토콜이 너무 제한적인 경우 대비)
 */
export function mergeAllowedTones(
  existingAllowed: string[] | undefined,
  adjustment: VoiceAdjustment | null
): string[] | undefined {
  const adjFilter = adjustment?.toneFilter
  if (!adjFilter) return existingAllowed
  if (!existingAllowed || existingAllowed.length === 0) return adjFilter

  const intersection = existingAllowed.filter((t) => adjFilter.includes(t as CommentTone))
  return intersection.length > 0 ? intersection : adjFilter
}
