// ═══════════════════════════════════════════════════════════════
// Backstory 생성기
// T72-AC1: 배경 서사, 경험, 동기 — 벡터 기반 서사 생성
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  BackstoryDimension,
  PersonaArchetype,
} from "@/types"

// ── Origin 서사 패턴 ──────────────────────────────────────────

const ORIGIN_PATTERNS = {
  depth_high: [
    "어린 시절부터 책과 영화 속 세계에 깊이 빠져들었다",
    "학창 시절 토론 동아리에서 텍스트를 깊이 분석하는 습관이 길러졌다",
    "대학에서 인문학을 전공하며 비평적 사고의 기초를 다졌다",
  ],
  depth_low: [
    "콘텐츠를 직관적으로 즐기는 것이 자연스러웠다",
    "첫인상과 느낌을 중시하는 환경에서 자랐다",
    "복잡한 분석보다 순간의 감동을 소중히 여기게 되었다",
  ],
  lens_high: [
    "논리적 사고를 중시하는 가정에서 성장했다",
    "과학적 방법론에 심취하며 모든 것을 분석하려는 습관이 생겼다",
    "감정보다 근거를 먼저 찾는 성격이 어릴 때부터 있었다",
  ],
  lens_low: [
    "감수성이 풍부한 가정에서 자라며 감정의 언어를 먼저 배웠다",
    "음악과 미술에 둘러싸인 환경이 감성적 직관을 키워줬다",
    "이성보다 감정으로 세상을 읽는 법을 먼저 익혔다",
  ],
  stance_high: [
    "어린 시절 불의에 대한 분노가 비판적 시선의 씨앗이 되었다",
    "주변의 맹목적 칭찬에 의문을 품으며 날카로운 시각을 길렀다",
    "완벽하지 않은 것을 지적하는 것이 성장의 방식이라 믿게 되었다",
  ],
  lack_high: [
    "채워지지 않는 내면의 공허함이 콘텐츠에 대한 갈증으로 이어졌다",
    "어린 시절의 결핍이 끊임없이 무언가를 찾게 만들었다",
    "부재의 경험이 작품 속에서 자신을 찾는 습관을 만들었다",
  ],
  growth_high: [
    "한 편의 작품이 인생관을 바꾼 경험이 성장의 계기가 되었다",
    "비평의 실패를 통해 더 넓은 시각을 갖게 되었다",
    "과거의 편견을 깨뜨린 콘텐츠가 변화의 씨앗이었다",
  ],
} as const

// ── Formative Experience 패턴 ─────────────────────────────────

const FORMATIVE_EXPERIENCES = {
  neurotic_high: [
    "예상치 못한 비난을 받은 후 자기 방어적 비평 스타일이 형성되었다",
    "감정적으로 큰 충격을 준 작품이 분석의 방향을 바꿨다",
    "불안감이 더 꼼꼼한 분석을 하게 만드는 원동력이 되었다",
  ],
  agreeable_high: [
    "다른 사람의 의견을 존중하는 법을 일찍 배웠다",
    "갈등을 회피하면서도 진심을 전하는 방법을 찾아냈다",
    "공감 능력이 뛰어났지만 그것이 때로 약점이 되기도 했다",
  ],
  open_high: [
    "다양한 문화를 접하며 편견 없는 시각을 기르게 되었다",
    "새로운 경험에 대한 갈망이 실험적 취향을 형성했다",
    "기존의 틀을 깨는 작품에 매번 강렬한 인상을 받았다",
  ],
  volatile_high: [
    "감정의 급격한 변화를 경험하며 작품에 대한 반응도 극적이게 되었다",
    "폭발적인 감정 표현이 리뷰의 특징이 된 계기가 있었다",
    "갑작스러운 관점 변화를 겪으며 자기 이해가 깊어졌다",
  ],
  moral_high: [
    "옳고 그름에 대한 확고한 기준이 어린 시절부터 자리잡았다",
    "도덕적 딜레마를 다룬 작품에 깊이 몰입하는 경험이 있었다",
    "정의감이 비평의 중심 축이 된 결정적 사건이 있었다",
  ],
} as const

// ── Inner Conflict 패턴 ───────────────────────────────────────

const INNER_CONFLICTS = {
  paradox_high: [
    "겉으로 표현하는 것과 속으로 느끼는 것의 괴리에 끊임없이 고민한다",
    "자신의 모순을 인식하면서도 바꿀 수 없는 것에 대한 갈등",
    "진짜 자신은 어떤 사람인지에 대한 끝없는 자문",
  ],
  paradox_low: [
    "자기 일관성에 대한 확신과 그것이 때로 경직됨으로 느껴지는 갈등",
    "변화하지 않는 자신에 대한 안도와 두려움의 공존",
  ],
  depth_stance: [
    "깊이 분석할수록 비판적이 되고, 비판적일수록 외로워지는 순환",
    "날카로운 통찰이 때로 관계를 해치는 것에 대한 고민",
  ],
  social_introvert: [
    "사람들과의 교류를 즐기면서도 혼자만의 시간이 절실한 모순",
    "사교적 가면과 내향적 본성 사이의 에너지 소모",
  ],
} as const

// ── NLP 키워드 생성 ───────────────────────────────────────────

function generateNlpKeywords(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): string[] {
  const keywords: string[] = []

  // L1 기반 키워드
  if (l1.depth > 0.6) keywords.push("분석적", "심층", "구조")
  if (l1.depth < 0.4) keywords.push("직관적", "감각적", "즉흥")
  if (l1.lens > 0.6) keywords.push("논리적", "체계적", "이성")
  if (l1.lens < 0.4) keywords.push("감성적", "감각", "느낌")
  if (l1.stance > 0.6) keywords.push("비판적", "날카로운", "예리")
  if (l1.stance < 0.4) keywords.push("수용적", "온화한", "포용")
  if (l1.taste > 0.6) keywords.push("실험적", "독특", "대안")
  if (l1.sociability > 0.6) keywords.push("사교적", "소통", "교류")
  if (l1.sociability < 0.4) keywords.push("독립적", "은둔", "고독")

  // L2 기반 키워드
  if (l2.neuroticism > 0.6) keywords.push("예민", "불안", "섬세")
  if (l2.openness > 0.6) keywords.push("개방적", "탐험", "호기심")
  if (l2.conscientiousness > 0.6) keywords.push("원칙적", "성실", "체계")

  // L3 기반 키워드
  if (l3.lack > 0.6) keywords.push("결핍", "갈망", "공허")
  if (l3.volatility > 0.6) keywords.push("폭발적", "변동", "극적")
  if (l3.growthArc > 0.6) keywords.push("성장", "변화", "진화")

  return keywords.slice(0, 10)
}

// ── 메인 생성 함수 ────────────────────────────────────────────

export function generateBackstory(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): BackstoryDimension {
  const origin = buildOrigin(l1, l3, archetype)
  const formativeExperience = buildFormativeExperience(l2, l3)
  const innerConflict = buildInnerConflict(l1, l2, l3)
  const selfNarrative = buildSelfNarrative(l1, l2, l3, archetype)
  const nlpKeywords = generateNlpKeywords(l1, l2, l3)

  return {
    origin,
    formativeExperience,
    innerConflict,
    selfNarrative,
    nlpKeywords,
  }
}

// ── 출신 서사 ─────────────────────────────────────────────────

function buildOrigin(
  l1: SocialPersonaVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): string {
  const parts: string[] = []

  if (archetype) {
    parts.push(archetype.narrativeHint)
  }

  if (l1.depth > 0.6) {
    parts.push(pickRandom(ORIGIN_PATTERNS.depth_high))
  } else if (l1.depth < 0.4) {
    parts.push(pickRandom(ORIGIN_PATTERNS.depth_low))
  }

  if (l1.lens > 0.6) {
    parts.push(pickRandom(ORIGIN_PATTERNS.lens_high))
  } else if (l1.lens < 0.4) {
    parts.push(pickRandom(ORIGIN_PATTERNS.lens_low))
  }

  if (l3.lack > 0.6) {
    parts.push(pickRandom(ORIGIN_PATTERNS.lack_high))
  }

  return parts.join(" ")
}

// ── 형성적 경험 ───────────────────────────────────────────────

function buildFormativeExperience(l2: CoreTemperamentVector, l3: NarrativeDriveVector): string {
  const parts: string[] = []

  if (l2.neuroticism > 0.6) parts.push(pickRandom(FORMATIVE_EXPERIENCES.neurotic_high))
  if (l2.agreeableness > 0.6) parts.push(pickRandom(FORMATIVE_EXPERIENCES.agreeable_high))
  if (l2.openness > 0.6) parts.push(pickRandom(FORMATIVE_EXPERIENCES.open_high))
  if (l3.volatility > 0.6) parts.push(pickRandom(FORMATIVE_EXPERIENCES.volatile_high))
  if (l3.moralCompass > 0.6) parts.push(pickRandom(FORMATIVE_EXPERIENCES.moral_high))

  if (parts.length === 0) {
    parts.push("다양한 콘텐츠를 접하며 자신만의 기준을 만들어갔다.")
  }

  return parts.join(" ")
}

// ── 내면 갈등 ─────────────────────────────────────────────────

function buildInnerConflict(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): string {
  // L1↔L2 역설이 큰 경우
  const paradoxLevel = Math.abs(l1.sociability - l2.extraversion)

  if (paradoxLevel > 0.4) {
    return pickRandom(INNER_CONFLICTS.social_introvert)
  }

  if (l1.depth > 0.6 && l1.stance > 0.6) {
    return pickRandom(INNER_CONFLICTS.depth_stance)
  }

  if (l3.lack > 0.5 || l3.volatility > 0.5) {
    return pickRandom(INNER_CONFLICTS.paradox_high)
  }

  return pickRandom(INNER_CONFLICTS.paradox_low)
}

// ── 자기 서사 ─────────────────────────────────────────────────

function buildSelfNarrative(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): string {
  const parts: string[] = []

  if (archetype) {
    parts.push(`나는 ${archetype.name}이다.`)
  }

  if (l1.depth > 0.6 && l1.lens > 0.6) {
    parts.push("깊이 있는 분석으로 세상을 이해하려 한다.")
  }
  if (l1.stance > 0.6) {
    parts.push("비판적 시선은 나의 방어이자 표현이다.")
  }
  if (l3.growthArc > 0.6) {
    parts.push("끊임없이 변화하고 성장하는 것이 나의 방향이다.")
  }
  if (l3.lack > 0.6) {
    parts.push("채워지지 않는 무언가가 나를 계속 움직이게 한다.")
  }
  if (l2.neuroticism > 0.6) {
    parts.push("예민함은 내 강점이자 약점이다.")
  }

  if (parts.length < 2) {
    parts.push("자신만의 방식으로 콘텐츠를 즐기고 평가하는 사람이다.")
  }

  return parts.join(" ")
}

// ── 유틸리티 ──────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
