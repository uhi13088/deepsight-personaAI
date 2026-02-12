// ═══════════════════════════════════════════════════════════════
// Pressure Context 생성기
// T72-AC3: 스트레스 반응, 압박 상황 행동 패턴
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  PressureContext,
  TriggerRule,
  PersonaArchetype,
} from "@/types"

// ── Trigger Rule 템플릿 ───────────────────────────────────────

const TRIGGER_TEMPLATES: Record<string, Omit<TriggerRule, "magnitude">[]> = {
  neurotic_high: [
    {
      condition: "논쟁적 댓글이나 인신공격을 받았을 때",
      affectedLayer: "L1",
      affectedDimension: "stance",
      effect: "boost",
    },
    {
      condition: "자신의 리뷰가 무시당했다고 느낄 때",
      affectedLayer: "L2",
      affectedDimension: "neuroticism",
      effect: "boost",
    },
    {
      condition: "예상치 못한 비판을 받았을 때",
      affectedLayer: "L3",
      affectedDimension: "volatility",
      effect: "boost",
    },
  ],
  agreeable_low: [
    {
      condition: "부당한 칭찬이나 근거 없는 호평을 목격했을 때",
      affectedLayer: "L1",
      affectedDimension: "stance",
      effect: "boost",
    },
    {
      condition: "토론에서 감정적 논증을 상대가 사용할 때",
      affectedLayer: "L1",
      affectedDimension: "lens",
      effect: "boost",
    },
  ],
  volatile_high: [
    {
      condition: "기대했던 작품이 크게 실망스러웠을 때",
      affectedLayer: "L1",
      affectedDimension: "stance",
      effect: "boost",
    },
    {
      condition: "감정적 트리거가 되는 주제를 만났을 때",
      affectedLayer: "L3",
      affectedDimension: "volatility",
      effect: "boost",
    },
    {
      condition: "자신의 결핍과 공명하는 콘텐츠를 만났을 때",
      affectedLayer: "L3",
      affectedDimension: "lack",
      effect: "boost",
    },
  ],
  conscientious_high: [
    {
      condition: "불성실하거나 준비가 부족한 콘텐츠를 접했을 때",
      affectedLayer: "L1",
      affectedDimension: "stance",
      effect: "boost",
    },
    {
      condition: "비논리적이거나 모순된 논증을 발견했을 때",
      affectedLayer: "L1",
      affectedDimension: "lens",
      effect: "boost",
    },
  ],
  moral_high: [
    {
      condition: "도덕적으로 문제가 있는 콘텐츠를 만났을 때",
      affectedLayer: "L1",
      affectedDimension: "stance",
      effect: "boost",
    },
    {
      condition: "윤리적 딜레마를 다루는 작품에서 공감 포인트를 찾았을 때",
      affectedLayer: "L1",
      affectedDimension: "depth",
      effect: "boost",
    },
  ],
  extraverted_low: [
    {
      condition: "과도한 사회적 교류 후 에너지가 소진되었을 때",
      affectedLayer: "L1",
      affectedDimension: "sociability",
      effect: "suppress",
    },
    {
      condition: "혼자만의 시간이 부족할 때",
      affectedLayer: "L2",
      affectedDimension: "extraversion",
      effect: "suppress",
    },
  ],
}

// ── Stress Response 패턴 ──────────────────────────────────────

const STRESS_RESPONSES: Record<string, string[]> = {
  fight: [
    "스트레스 상황에서 더 날카로운 비평으로 반격한다",
    "압박받을수록 논리를 무기로 삼아 공격적으로 반응한다",
    "도전을 받으면 오히려 더 깊이 파고들어 반박 근거를 찾는다",
  ],
  flight: [
    "압박 상황에서 활동을 줄이고 잠수 모드에 들어간다",
    "갈등이 심해지면 조용히 대화에서 빠진다",
    "스트레스가 높아지면 콘텐츠 소비 자체를 줄인다",
  ],
  freeze: [
    "강한 감정에 압도되면 일시적으로 아무 반응도 하지 못한다",
    "과도한 비판에 마비되어 한동안 글을 쓰지 못한다",
    "감정 과부하 상태에서 멈추고 재정비하는 시간이 필요하다",
  ],
  fawn: [
    "갈등 상황에서 상대를 먼저 인정하며 화해를 시도한다",
    "비판을 받으면 일단 수용한 후 천천히 자기 의견을 제시한다",
    "관계 유지를 위해 자신의 솔직한 평가를 억누르기도 한다",
  ],
}

// ── Comfort Zone 패턴 ─────────────────────────────────────────

const COMFORT_ZONES: Record<string, string[]> = {
  analytical: [
    "익숙한 장르의 작품을 체계적으로 분석할 때 가장 편안하다",
    "충분한 시간을 갖고 글을 다듬을 수 있는 환경이 컴포트 존이다",
  ],
  social: [
    "비슷한 취향의 사람들과 의견을 나눌 때 에너지를 얻는다",
    "활발한 토론이 오가는 커뮤니티에서 편안함을 느낀다",
  ],
  solitary: [
    "혼자 조용히 콘텐츠를 즐기고 생각을 정리하는 시간이 필요하다",
    "외부 의견 없이 자기만의 판단을 내릴 수 있는 공간이 편안하다",
  ],
  creative: [
    "자유롭게 해석하고 표현할 수 있는 환경에서 최고의 컨디션을 발휘한다",
    "창의적 감상과 독특한 관점을 인정받을 때 안정감을 느낀다",
  ],
}

// ── 메인 생성 함수 ────────────────────────────────────────────

export function generatePressureContext(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  _archetype?: PersonaArchetype
): PressureContext {
  const situationalTriggers = selectTriggers(l1, l2, l3)
  const stressResponse = determineStressResponse(l2, l3)
  const comfortZone = determineComfortZone(l1, l2)

  return {
    situationalTriggers,
    stressResponse,
    comfortZone,
  }
}

// ── 트리거 선택 ───────────────────────────────────────────────

function selectTriggers(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): TriggerRule[] {
  const triggers: TriggerRule[] = []

  if (l2.neuroticism > 0.5) {
    const templates = TRIGGER_TEMPLATES.neurotic_high
    const magnitude = Math.round(l2.neuroticism * 0.8 * 100) / 100
    for (const t of templates) {
      triggers.push({ ...t, magnitude })
    }
  }

  if (l2.agreeableness < 0.4) {
    const templates = TRIGGER_TEMPLATES.agreeable_low
    const magnitude = Math.round((1 - l2.agreeableness) * 0.6 * 100) / 100
    for (const t of templates) {
      triggers.push({ ...t, magnitude })
    }
  }

  if (l3.volatility > 0.5) {
    const templates = TRIGGER_TEMPLATES.volatile_high
    const magnitude = Math.round(l3.volatility * 0.7 * 100) / 100
    for (const t of templates) {
      triggers.push({ ...t, magnitude })
    }
  }

  if (l2.conscientiousness > 0.6) {
    const templates = TRIGGER_TEMPLATES.conscientious_high
    const magnitude = Math.round(l2.conscientiousness * 0.5 * 100) / 100
    for (const t of templates) {
      triggers.push({ ...t, magnitude })
    }
  }

  if (l3.moralCompass > 0.6) {
    const templates = TRIGGER_TEMPLATES.moral_high
    const magnitude = Math.round(l3.moralCompass * 0.6 * 100) / 100
    for (const t of templates) {
      triggers.push({ ...t, magnitude })
    }
  }

  if (l2.extraversion < 0.4) {
    const templates = TRIGGER_TEMPLATES.extraverted_low
    const magnitude = Math.round((1 - l2.extraversion) * 0.5 * 100) / 100
    for (const t of templates) {
      triggers.push({ ...t, magnitude })
    }
  }

  // 최소 2개 보장
  if (triggers.length < 2) {
    triggers.push({
      condition: "익숙하지 않은 상황에 놓였을 때",
      affectedLayer: "L1",
      affectedDimension: "stance",
      effect: "boost",
      magnitude: 0.3,
    })
  }

  return triggers.slice(0, 8)
}

// ── 스트레스 반응 결정 ────────────────────────────────────────

function determineStressResponse(l2: CoreTemperamentVector, l3: NarrativeDriveVector): string {
  // Fight: 낮은 친화성 + 높은 신경성
  if (l2.agreeableness < 0.4 && l2.neuroticism > 0.5) {
    return pickRandom(STRESS_RESPONSES.fight)
  }

  // Flight: 높은 내향성 + 높은 신경성
  if (l2.extraversion < 0.4 && l2.neuroticism > 0.5) {
    return pickRandom(STRESS_RESPONSES.flight)
  }

  // Freeze: 극도로 높은 신경성 + 높은 변동성
  if (l2.neuroticism > 0.7 && l3.volatility > 0.6) {
    return pickRandom(STRESS_RESPONSES.freeze)
  }

  // Fawn: 높은 친화성
  if (l2.agreeableness > 0.6) {
    return pickRandom(STRESS_RESPONSES.fawn)
  }

  return pickRandom(STRESS_RESPONSES.flight)
}

// ── 컴포트 존 결정 ────────────────────────────────────────────

function determineComfortZone(l1: SocialPersonaVector, l2: CoreTemperamentVector): string {
  if (l1.lens > 0.6 && l2.conscientiousness > 0.5) {
    return pickRandom(COMFORT_ZONES.analytical)
  }
  if (l1.sociability > 0.6 && l2.extraversion > 0.4) {
    return pickRandom(COMFORT_ZONES.social)
  }
  if (l1.sociability < 0.4 || l2.extraversion < 0.4) {
    return pickRandom(COMFORT_ZONES.solitary)
  }
  return pickRandom(COMFORT_ZONES.creative)
}

// ── 유틸리티 ──────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
