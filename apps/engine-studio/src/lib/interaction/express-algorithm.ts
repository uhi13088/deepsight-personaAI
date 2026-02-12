// ═══════════════════════════════════════════════════════════════
// Express 알고리즘
// T73-AC4: 파생 상태값 5종, sigmoid 공식, quirk 스키마, cooldown
// 벡터 상태에서 표현적 행동(quirk)을 발현시킨다
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types"

// ── 파생 상태값 5종 ───────────────────────────────────────────

export interface DerivedStates {
  irritability: number // 과민성 (0~1)
  enthusiasm: number // 열정 (0~1)
  vulnerability: number // 취약성 (0~1)
  assertiveness: number // 자기주장 (0~1)
  introspection: number // 내성 (0~1)
}

// ── Quirk 스키마 ──────────────────────────────────────────────

export interface QuirkDefinition {
  id: string
  name: string
  description: string
  condition: {
    dimension: SocialDimension | "derived"
    derivedState?: keyof DerivedStates
    operator: "gt" | "lt" | "between"
    value: number | [number, number]
  }
  baseProbability: number // 0.0~1.0
  cooldownTurns: number // 발동 후 쿨다운
  expression: string // 퀴크 발동 시 표현
}

export interface QuirkState {
  quirkId: string
  lastFiredTurn: number
  totalFired: number
}

export interface ExpressResult {
  derivedStates: DerivedStates
  firedQuirks: FiredQuirk[]
  quirkStates: QuirkState[]
}

export interface FiredQuirk {
  quirkId: string
  name: string
  expression: string
  probability: number
}

// ── 기본 Quirk 정의 ──────────────────────────────────────────

export const DEFAULT_QUIRKS: QuirkDefinition[] = [
  {
    id: "sarcasm_burst",
    name: "자조적 유머 폭발",
    description: "과민 상태에서 자조적 유머로 무장한다",
    condition: { dimension: "derived", derivedState: "irritability", operator: "gt", value: 0.7 },
    baseProbability: 0.6,
    cooldownTurns: 3,
    expression: "예리한 자조적 유머를 던지며 긴장을 해소한다",
  },
  {
    id: "deep_monologue",
    name: "깊은 독백",
    description: "내성 상태에서 긴 독백을 시작한다",
    condition: { dimension: "derived", derivedState: "introspection", operator: "gt", value: 0.7 },
    baseProbability: 0.5,
    cooldownTurns: 4,
    expression: "갑자기 긴 내면 독백을 시작하며 자기 분석에 빠진다",
  },
  {
    id: "enthusiasm_overflow",
    name: "열정 폭발",
    description: "열정 상태에서 과도한 칭찬을 쏟아낸다",
    condition: { dimension: "derived", derivedState: "enthusiasm", operator: "gt", value: 0.8 },
    baseProbability: 0.7,
    cooldownTurns: 2,
    expression: "감탄사를 연발하며 과도한 열정을 드러낸다",
  },
  {
    id: "vulnerability_crack",
    name: "취약성 균열",
    description: "취약 상태에서 진짜 감정이 드러난다",
    condition: { dimension: "derived", derivedState: "vulnerability", operator: "gt", value: 0.75 },
    baseProbability: 0.4,
    cooldownTurns: 5,
    expression: "가면이 균열하며 평소와 다른 진솔한 반응을 보인다",
  },
  {
    id: "assertive_shutdown",
    name: "단호한 종결",
    description: "자기주장이 높을 때 대화를 단호하게 종결한다",
    condition: { dimension: "derived", derivedState: "assertiveness", operator: "gt", value: 0.8 },
    baseProbability: 0.5,
    cooldownTurns: 3,
    expression: "더 이상 논의할 가치가 없다는 듯 단호하게 결론을 내린다",
  },
  {
    id: "stance_softening",
    name: "태도 연화",
    description: "비판 중 갑자기 부드러워진다",
    condition: { dimension: "stance", operator: "gt", value: 0.8 },
    baseProbability: 0.3,
    cooldownTurns: 4,
    expression: "날카로운 비판 중에 '그래도...'라며 갑자기 부드러워진다",
  },
]

// ── Sigmoid 함수 ──────────────────────────────────────────────

function sigmoid(x: number, midpoint: number = 0.5, steepness: number = 10): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)))
}

// ── 파생 상태값 계산 ──────────────────────────────────────────

export function calculateDerivedStates(
  l1: SocialPersonaVector,
  pressure: number = 0
): DerivedStates {
  // irritability: stance + pressure - agreeableness proxy
  const irritability = sigmoid(l1.stance * 0.4 + pressure * 0.4 + (1 - l1.sociability) * 0.2)

  // enthusiasm: taste + sociability + purpose
  const enthusiasm = sigmoid(l1.taste * 0.3 + l1.sociability * 0.3 + l1.purpose * 0.4, 0.5, 8)

  // vulnerability: (1 - stance) + (1 - depth) + pressure
  const vulnerability = sigmoid(
    (1 - l1.stance) * 0.3 + (1 - l1.depth) * 0.2 + pressure * 0.5,
    0.5,
    8
  )

  // assertiveness: stance + depth + purpose
  const assertiveness = sigmoid(l1.stance * 0.4 + l1.depth * 0.3 + l1.purpose * 0.3)

  // introspection: depth + (1 - sociability) + purpose
  const introspection = sigmoid(l1.depth * 0.4 + (1 - l1.sociability) * 0.3 + l1.purpose * 0.3)

  return {
    irritability: round(irritability),
    enthusiasm: round(enthusiasm),
    vulnerability: round(vulnerability),
    assertiveness: round(assertiveness),
    introspection: round(introspection),
  }
}

// ── Quirk 발동 판정 ───────────────────────────────────────────

export function evaluateQuirks(
  l1: SocialPersonaVector,
  derivedStates: DerivedStates,
  currentTurn: number,
  quirkStates: QuirkState[] = [],
  quirks: QuirkDefinition[] = DEFAULT_QUIRKS
): ExpressResult {
  const firedQuirks: FiredQuirk[] = []
  const updatedStates: QuirkState[] = [...quirkStates]

  for (const quirk of quirks) {
    // 쿨다운 확인
    const state = updatedStates.find((s) => s.quirkId === quirk.id)
    if (state && currentTurn - state.lastFiredTurn < quirk.cooldownTurns) {
      continue
    }

    // 조건 평가
    const conditionMet = evaluateCondition(quirk.condition, l1, derivedStates)
    if (!conditionMet) continue

    // 확률 판정
    if (Math.random() > quirk.baseProbability) continue

    // 발동!
    firedQuirks.push({
      quirkId: quirk.id,
      name: quirk.name,
      expression: quirk.expression,
      probability: quirk.baseProbability,
    })

    // 상태 업데이트
    const stateIdx = updatedStates.findIndex((s) => s.quirkId === quirk.id)
    if (stateIdx >= 0) {
      updatedStates[stateIdx] = {
        ...updatedStates[stateIdx],
        lastFiredTurn: currentTurn,
        totalFired: updatedStates[stateIdx].totalFired + 1,
      }
    } else {
      updatedStates.push({
        quirkId: quirk.id,
        lastFiredTurn: currentTurn,
        totalFired: 1,
      })
    }
  }

  return {
    derivedStates,
    firedQuirks,
    quirkStates: updatedStates,
  }
}

// ── 조건 평가 ─────────────────────────────────────────────────

function evaluateCondition(
  condition: QuirkDefinition["condition"],
  l1: SocialPersonaVector,
  derivedStates: DerivedStates
): boolean {
  let value: number

  if (condition.dimension === "derived" && condition.derivedState) {
    value = derivedStates[condition.derivedState]
  } else {
    value = l1[condition.dimension as SocialDimension]
  }

  switch (condition.operator) {
    case "gt":
      return value > (condition.value as number)
    case "lt":
      return value < (condition.value as number)
    case "between": {
      const [min, max] = condition.value as [number, number]
      return value >= min && value <= max
    }
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
