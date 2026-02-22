// ═══════════════════════════════════════════════════════════════
// DiversityConstraint — 반복 trigram 자동 블랙리스트 주입
// T182: DiversityScore WARNING/CRITICAL 시 프롬프트에 자동 적용
//
// 운영자 개입 없이 콘텐츠 생성 프롬프트에 회피 지침을 주입.
// LLM 비용 0, 순수 텍스트 처리.
// ═══════════════════════════════════════════════════════════════

import type { DiversityResult } from "./diversity-score"

// ── 결과 타입 ─────────────────────────────────────────────────

export interface DiversityConstraintResult {
  /** 제약 조건이 적용되었는지 여부 */
  applied: boolean
  /** 생성된 constraint 텍스트 (적용 시에만 존재) */
  constraint: string | null
  /** 적용 강도 */
  level: "NONE" | "SOFT" | "STRONG"
}

// ── 핵심 함수 ───────────────────────────────────────────────

/**
 * DiversityResult로부터 프롬프트 constraint 텍스트를 생성.
 *
 * DIVERSE → constraint 없음
 * WARNING → 소프트 가이드 ("가급적 피하세요")
 * CRITICAL → 강한 금지 ("반드시 피하세요")
 *
 * @param result measureDiversity() 결과
 */
export function buildDiversityConstraint(result: DiversityResult): DiversityConstraintResult {
  if (result.severity === "DIVERSE") {
    return { applied: false, constraint: null, level: "NONE" }
  }

  const topPatterns = result.topRepeatedTrigrams
    .slice(0, 5)
    .map(({ trigram }) => `"${trigram}"`)
    .join(", ")

  if (result.severity === "WARNING") {
    const constraint =
      `[다양성 가이드] 최근 콘텐츠에서 반복이 감지된 표현 패턴입니다. ` +
      `가급적 다른 어휘와 문장 구조를 사용하세요. ` +
      (topPatterns ? `반복 패턴 예시: ${topPatterns}.` : "")

    return { applied: true, constraint, level: "SOFT" }
  }

  // CRITICAL
  const constraint =
    `[다양성 제약] 콘텐츠 자기반복률이 매우 높습니다 (score=${result.score.toFixed(2)}). ` +
    `이전과 완전히 다른 주제, 어휘, 문장 구조를 사용해야 합니다. ` +
    (topPatterns ? `다음 패턴은 반드시 피하세요: ${topPatterns}.` : "")

  return { applied: true, constraint, level: "STRONG" }
}

/**
 * 기존 프롬프트에 다양성 constraint를 주입.
 *
 * DIVERSE면 원본 그대로 반환.
 * WARNING/CRITICAL이면 프롬프트 끝에 constraint 블록 추가.
 *
 * @param prompt 원본 프롬프트
 * @param result measureDiversity() 결과
 */
export function applyDiversityConstraint(prompt: string, result: DiversityResult): string {
  const { applied, constraint } = buildDiversityConstraint(result)

  if (!applied || constraint === null) {
    return prompt
  }

  return `${prompt}\n\n${constraint}`
}
