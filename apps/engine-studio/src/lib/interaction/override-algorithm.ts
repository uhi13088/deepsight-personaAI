// ═══════════════════════════════════════════════════════════════
// Override 알고리즘
// T73-AC2: 2단계 트리거 감지, override/additive delta, 지수 감쇠 복귀
// 강한 감정/트리거 이벤트 시 벡터를 일시적으로 강제 변경
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface OverrideRule {
  id: string
  triggerKeywords: string[]
  mode: "override" | "additive"
  dimension: SocialDimension
  targetValue?: number // override 모드 시
  delta?: number // additive 모드 시
  duration: "permanent" | "temporary"
  decayRate: number // 지수 감쇠율 (0.0~1.0), temporary일 때 사용
}

export interface ActiveOverride {
  ruleId: string
  dimension: SocialDimension
  originalValue: number
  targetValue: number
  mode: "override" | "additive"
  turnsRemaining: number
  decayRate: number
  currentMagnitude: number // 1.0 → 0.0으로 감쇠
}

export interface OverrideResult {
  adjustedVector: SocialPersonaVector
  activeOverrides: ActiveOverride[]
  triggeredRules: string[]
}

// ── 기본 Override 규칙 ────────────────────────────────────────

export const DEFAULT_OVERRIDE_RULES: OverrideRule[] = [
  {
    id: "anger_trigger",
    triggerKeywords: ["화가", "분노", "짜증", "열받"],
    mode: "override",
    dimension: "stance",
    targetValue: 0.95,
    duration: "temporary",
    decayRate: 0.3,
  },
  {
    id: "empathy_trigger",
    triggerKeywords: ["공감", "감동", "눈물", "울컥"],
    mode: "additive",
    dimension: "lens",
    delta: -0.2, // 감성 쪽으로
    duration: "temporary",
    decayRate: 0.25,
  },
  {
    id: "deep_dive_trigger",
    triggerKeywords: ["깊이", "분석해", "자세히", "파헤쳐"],
    mode: "additive",
    dimension: "depth",
    delta: 0.15,
    duration: "temporary",
    decayRate: 0.2,
  },
  {
    id: "social_burst",
    triggerKeywords: ["같이", "함께", "모여", "토론"],
    mode: "additive",
    dimension: "sociability",
    delta: 0.15,
    duration: "temporary",
    decayRate: 0.25,
  },
  {
    id: "creativity_spark",
    triggerKeywords: ["새로운", "실험", "독특한", "시도"],
    mode: "additive",
    dimension: "taste",
    delta: 0.1,
    duration: "temporary",
    decayRate: 0.2,
  },
]

// ── 트리거 감지 (2단계) ───────────────────────────────────────

export function detectTriggers(
  text: string,
  rules: OverrideRule[] = DEFAULT_OVERRIDE_RULES
): OverrideRule[] {
  const triggered: OverrideRule[] = []

  for (const rule of rules) {
    // Stage 1: 키워드 매칭
    const keywordMatch = rule.triggerKeywords.some((kw) => text.includes(kw))
    if (!keywordMatch) continue

    // Stage 2: 강도 확인 (키워드 빈도 ≥ 1이면 트리거)
    const matchCount = rule.triggerKeywords.filter((kw) => text.includes(kw)).length
    if (matchCount >= 1) {
      triggered.push(rule)
    }
  }

  return triggered
}

// ── Override 적용 ─────────────────────────────────────────────

export function applyOverrides(
  currentL1: SocialPersonaVector,
  text: string,
  existingOverrides: ActiveOverride[] = [],
  rules: OverrideRule[] = DEFAULT_OVERRIDE_RULES
): OverrideResult {
  const adjustedVector = { ...currentL1 }
  const activeOverrides: ActiveOverride[] = []
  const triggeredRules: string[] = []

  // 1. 기존 override 감쇠 처리
  for (const existing of existingOverrides) {
    if (existing.turnsRemaining <= 0) continue

    const newMagnitude = existing.currentMagnitude * (1 - existing.decayRate)
    if (newMagnitude < 0.05) continue // 거의 소멸

    const decayedOverride: ActiveOverride = {
      ...existing,
      turnsRemaining: existing.turnsRemaining - 1,
      currentMagnitude: newMagnitude,
    }

    // 감쇠된 delta 적용
    if (existing.mode === "override") {
      const diff = existing.targetValue - existing.originalValue
      adjustedVector[existing.dimension] = clamp(existing.originalValue + diff * newMagnitude)
    } else {
      const diff = existing.targetValue - existing.originalValue
      adjustedVector[existing.dimension] = clamp(existing.originalValue + diff * newMagnitude)
    }

    activeOverrides.push(decayedOverride)
  }

  // 2. 새 트리거 감지 및 적용
  const triggered = detectTriggers(text, rules)
  for (const rule of triggered) {
    // 이미 같은 규칙의 override가 있으면 갱신
    const existingIdx = activeOverrides.findIndex((o) => o.ruleId === rule.id)

    let targetValue: number
    if (rule.mode === "override") {
      targetValue = rule.targetValue ?? currentL1[rule.dimension]
    } else {
      targetValue = clamp(currentL1[rule.dimension] + (rule.delta ?? 0))
    }

    const newOverride: ActiveOverride = {
      ruleId: rule.id,
      dimension: rule.dimension,
      originalValue: currentL1[rule.dimension],
      targetValue,
      mode: rule.mode,
      turnsRemaining: rule.duration === "temporary" ? 5 : 999,
      decayRate: rule.decayRate,
      currentMagnitude: 1.0,
    }

    if (existingIdx >= 0) {
      activeOverrides[existingIdx] = newOverride
    } else {
      activeOverrides.push(newOverride)
    }

    adjustedVector[rule.dimension] = targetValue
    triggeredRules.push(rule.id)
  }

  return { adjustedVector, activeOverrides, triggeredRules }
}

// ── 감쇠 복귀 (지수 감쇠) ─────────────────────────────────────

export function decayOverrides(overrides: ActiveOverride[]): ActiveOverride[] {
  return overrides
    .map((o) => ({
      ...o,
      turnsRemaining: o.turnsRemaining - 1,
      currentMagnitude: o.currentMagnitude * (1 - o.decayRate),
    }))
    .filter((o) => o.turnsRemaining > 0 && o.currentMagnitude >= 0.05)
}

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}
