// ═══════════════════════════════════════════════════════════════
// Matching Module — Shared Utilities
// 매칭 모듈 전역에서 사용하는 공통 유틸리티 함수와 상수.
// ═══════════════════════════════════════════════════════════════

/** 소수점 2자리 반올림 */
export function round(v: number): number {
  return Math.round(v * 100) / 100
}

/** 값을 [min, max] 범위로 클램프 (기본: [0, 1]) */
export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}

/** 7D 소셜 차원 한글 레이블 */
export const SOCIAL_DIM_LABELS: Record<string, string> = {
  depth: "분석 깊이",
  lens: "판단 렌즈",
  stance: "비평 태도",
  scope: "디테일 수준",
  taste: "취향 성향",
  purpose: "목적 지향",
  sociability: "소통 성향",
}
