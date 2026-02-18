// ═══════════════════════════════════════════════════════════════
// Express 알고리즘
// T73-AC4: 파생 상태값 5종, sigmoid 공식, quirk 스키마, cooldown
// 벡터 상태에서 표현적 행동(quirk)을 발현시킨다
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  SocialDimension,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"

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

// ── L1↔L2 교차축 역설 기반 동적 퀴크 생성 ──────────────────────

interface ParadoxPattern {
  id: string
  name: string
  description: string
  /** L1↔L2 역설 조건: 두 차원의 값이 반대 방향으로 극단적일 때 */
  detect: (l1: SocialPersonaVector, l2: CoreTemperamentVector) => boolean
  /** 역설 강도 (0~1) */
  intensity: (l1: SocialPersonaVector, l2: CoreTemperamentVector) => number
  quirk: Omit<QuirkDefinition, "id" | "condition" | "baseProbability">
  derivedTrigger: keyof DerivedStates
  triggerThreshold: number
}

const PARADOX_PATTERNS: ParadoxPattern[] = [
  {
    id: "social_introvert",
    name: "사교적 내향인",
    description: "sociability(L1) 높고 extraversion(L2) 낮은 역설",
    detect: (l1, l2) => l1.sociability > 0.6 && l2.extraversion < 0.4,
    intensity: (l1, l2) => (l1.sociability - l2.extraversion) / 2,
    quirk: {
      name: "갑작스런 침묵",
      description: "활발하게 대화를 이끌다가 갑자기 침묵에 빠진다",
      cooldownTurns: 4,
      expression: "대화를 주도하다 갑자기 침묵에 빠지며, '...잠깐, 정리 좀 하고'라며 멈춘다",
    },
    derivedTrigger: "enthusiasm",
    triggerThreshold: 0.65,
  },
  {
    id: "critical_agreeable",
    name: "비판적 친화인",
    description: "stance(L1) 높고 agreeableness(L2) 높은 역설",
    detect: (l1, l2) => l1.stance > 0.6 && l2.agreeableness > 0.6,
    intensity: (l1, l2) => Math.min(l1.stance, l2.agreeableness) - 0.5,
    quirk: {
      name: "비판 후 급위로",
      description: "날카로운 비판 직후 즉시 위로하며 동요한다",
      cooldownTurns: 3,
      expression:
        "날카롭게 비판한 직후 '아, 그래도 이런 점은 정말 좋았어'라며 급히 분위기를 수습한다",
    },
    derivedTrigger: "irritability",
    triggerThreshold: 0.6,
  },
  {
    id: "shallow_open",
    name: "직관적 개방인",
    description: "depth(L1) 낮고 openness(L2) 높은 역설",
    detect: (l1, l2) => l1.depth < 0.4 && l2.openness > 0.6,
    intensity: (l1, l2) => (l2.openness - l1.depth) / 2,
    quirk: {
      name: "불시 통찰",
      description: "가벼운 감상 중 갑자기 깊은 통찰을 내뱉는다",
      cooldownTurns: 5,
      expression: "가볍게 떠들다 갑자기 '근데 이거 사실은...'이라며 예상 못 한 깊은 통찰을 던진다",
    },
    derivedTrigger: "introspection",
    triggerThreshold: 0.5,
  },
  {
    id: "purposeful_neurotic",
    name: "의미추구 불안인",
    description: "purpose(L1) 높고 neuroticism(L2) 높은 역설",
    detect: (l1, l2) => l1.purpose > 0.6 && l2.neuroticism > 0.6,
    intensity: (l1, l2) => Math.min(l1.purpose, l2.neuroticism) - 0.5,
    quirk: {
      name: "열정적 자기의심",
      description: "열정적으로 주장하다가 갑자기 자기 의심에 빠진다",
      cooldownTurns: 4,
      expression: "확신에 찬 주장 직후 '...근데 내가 틀렸을 수도 있지'라며 갑자기 흔들린다",
    },
    derivedTrigger: "vulnerability",
    triggerThreshold: 0.6,
  },
]

/**
 * L1↔L2 교차축 역설을 감지하여 동적 퀴크를 생성한다.
 * 기존 DEFAULT_QUIRKS 6개에 추가로 역설 기반 퀴크를 반환한다.
 */
export function generateParadoxQuirks(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector
): QuirkDefinition[] {
  const quirks: QuirkDefinition[] = []

  for (const pattern of PARADOX_PATTERNS) {
    if (!pattern.detect(l1, l2)) continue

    const intensity = pattern.intensity(l1, l2)
    // 역설 강도에 비례하여 발동 확률 조정 (0.3~0.6)
    const baseProbability = Math.round(Math.min(0.6, 0.3 + intensity * 0.6) * 100) / 100

    quirks.push({
      id: `paradox_${pattern.id}`,
      name: pattern.quirk.name,
      description: pattern.quirk.description,
      condition: {
        dimension: "derived",
        derivedState: pattern.derivedTrigger,
        operator: "gt",
        value: pattern.triggerThreshold,
      },
      baseProbability,
      cooldownTurns: pattern.quirk.cooldownTurns,
      expression: pattern.quirk.expression,
    })
  }

  return quirks
}

// ── Sigmoid 함수 ──────────────────────────────────────────────

function sigmoid(x: number, midpoint: number = 0.5, steepness: number = 10): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)))
}

// ── 파생 상태값 계산 ──────────────────────────────────────────

export function calculateDerivedStates(
  l1: SocialPersonaVector,
  pressure: number = 0,
  l2?: CoreTemperamentVector,
  l3?: NarrativeDriveVector
): DerivedStates {
  // L2/L3가 제공되면 교차축 역설 기반 계산, 아니면 L1-only 근사치 사용
  const neuroticism = l2?.neuroticism ?? (1 - l1.sociability) * 0.5 + l1.stance * 0.5
  const agreeableness = l2?.agreeableness ?? (1 - l1.stance) * 0.6 + l1.sociability * 0.4
  const extraversion = l2?.extraversion ?? l1.sociability
  const openness = l2?.openness ?? l1.taste * 0.5 + l1.scope * 0.5
  const conscientiousness = l2?.conscientiousness ?? l1.depth * 0.5 + l1.scope * 0.5
  const volatility = l3?.volatility ?? Math.abs(l1.stance - 0.5) * 2
  const lack = l3?.lack ?? (1 - l1.purpose) * 0.5
  const growthArc = l3?.growthArc ?? l1.purpose * 0.5 + l1.depth * 0.5

  // irritability: stance(L1) + pressure + neuroticism(L2) + volatility(L3) - agreeableness(L2)
  const irritability = sigmoid(
    l1.stance * 0.25 +
      pressure * 0.3 +
      neuroticism * 0.2 +
      volatility * 0.1 +
      (1 - agreeableness) * 0.15
  )

  // enthusiasm: taste(L1) + sociability(L1) + extraversion(L2) + openness(L2) - lack(L3)
  const enthusiasm = sigmoid(
    l1.taste * 0.2 +
      l1.sociability * 0.15 +
      l1.purpose * 0.2 +
      extraversion * 0.2 +
      openness * 0.15 +
      (1 - lack) * 0.1,
    0.5,
    8
  )

  // vulnerability: (1-stance)(L1) + neuroticism(L2) + lack(L3) + pressure
  const vulnerability = sigmoid(
    (1 - l1.stance) * 0.2 +
      (1 - l1.depth) * 0.1 +
      neuroticism * 0.2 +
      lack * 0.15 +
      pressure * 0.35,
    0.5,
    8
  )

  // assertiveness: stance(L1) + depth(L1) + conscientiousness(L2) - agreeableness(L2) + moralCompass(L3)
  const moralCompass = l3?.moralCompass ?? 0.5
  const assertiveness = sigmoid(
    l1.stance * 0.25 +
      l1.depth * 0.2 +
      l1.purpose * 0.15 +
      conscientiousness * 0.15 +
      (1 - agreeableness) * 0.1 +
      moralCompass * 0.15
  )

  // introspection: depth(L1) + (1-sociability)(L1) + (1-extraversion)(L2) + lack(L3) + growthArc(L3)
  const introspection = sigmoid(
    l1.depth * 0.25 +
      (1 - l1.sociability) * 0.15 +
      l1.purpose * 0.15 +
      (1 - extraversion) * 0.2 +
      lack * 0.1 +
      growthArc * 0.15
  )

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
