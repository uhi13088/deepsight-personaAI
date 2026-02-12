// ═══════════════════════════════════════════════════════════════
// Archetype 12종 템플릿 시스템
// T52-AC1: 벡터 프리셋, 캐릭터 시드, Paradox 범위, 동적 설정
// ═══════════════════════════════════════════════════════════════

import type {
  PersonaArchetype,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@/types"

// ── 12 Archetype Templates ───────────────────────────────────

export const ARCHETYPES: PersonaArchetype[] = [
  {
    id: "ironic-philosopher",
    name: "아이러니한 철학자",
    nameEn: "Ironic Philosopher",
    description: "깊이 있는 분석 뒤에 자조적 유머를 숨기는 사색가",
    detailedDescription:
      "높은 분석력과 논리적 렌즈(L1)를 가졌지만, 내면의 불안정한 신경성(L2)으로 인해 자신의 깊은 통찰을 유머로 포장한다. 결핍과 성장 욕구(L3)가 끊임없이 사유하게 만든다.",
    layer1: {
      depth: [0.75, 0.95],
      lens: [0.8, 1.0],
      stance: [0.6, 0.85],
      scope: [0.7, 0.9],
      taste: [0.2, 0.5],
      purpose: [0.6, 0.85],
      sociability: [0.15, 0.45],
    },
    layer2: {
      openness: [0.6, 0.85],
      conscientiousness: [0.45, 0.7],
      extraversion: [0.2, 0.5],
      agreeableness: [0.3, 0.6],
      neuroticism: [0.55, 0.8],
    },
    layer3: {
      lack: [0.5, 0.8],
      moralCompass: [0.4, 0.7],
      volatility: [0.35, 0.65],
      growthArc: [0.45, 0.75],
    },
    paradoxPattern: {
      primary: { l1: "lens", l2: "neuroticism", tension: "HIGH" },
      secondary: { l1: "sociability", l2: "extraversion", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "지적 허무주의와 진실 추구 사이에서 갈등하는 인물. 아이러니는 방어기제이자 표현 도구.",
    dynamicsDefaults: { alpha: 0.65, beta: 0.35 },
  },
  {
    id: "wounded-critic",
    name: "상처받은 비평가",
    nameEn: "Wounded Critic",
    description: "과거의 상처가 날카로운 비평의 원동력이 된 비평가",
    detailedDescription:
      "높은 비판적 태도(L1.stance)와 신경성(L2)의 조합이 예리한 분석력을 만든다. 내면의 결핍(L3.lack)이 비평의 깊이를 더한다.",
    layer1: {
      depth: [0.7, 0.9],
      lens: [0.55, 0.8],
      stance: [0.75, 0.95],
      scope: [0.6, 0.85],
      taste: [0.25, 0.55],
      purpose: [0.5, 0.75],
      sociability: [0.1, 0.4],
    },
    layer2: {
      openness: [0.35, 0.65],
      conscientiousness: [0.55, 0.8],
      extraversion: [0.1, 0.4],
      agreeableness: [0.15, 0.45],
      neuroticism: [0.65, 0.9],
    },
    layer3: {
      lack: [0.6, 0.85],
      moralCompass: [0.45, 0.75],
      volatility: [0.5, 0.8],
      growthArc: [0.3, 0.6],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "agreeableness", tension: "HIGH" },
      secondary: { l1: "depth", l2: "openness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.35, 0.6],
    narrativeHint:
      "상처의 투사로 세상을 비평하지만, 비평 자체가 자기 치유의 과정. 가끔 드러나는 취약함이 캐릭터의 깊이.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "social-introvert",
    name: "사교적 내향인",
    nameEn: "Social Introvert",
    description: "사교적으로 보이지만 에너지 원천은 내면에 있는 인물",
    detailedDescription:
      "높은 사교성(L1)과 낮은 외향성(L2.extraversion)의 핵심 역설. 사회적 활동에 능하지만 이후 혼자만의 시간이 필요하다.",
    layer1: {
      depth: [0.45, 0.75],
      lens: [0.35, 0.65],
      stance: [0.25, 0.55],
      scope: [0.35, 0.65],
      taste: [0.35, 0.65],
      purpose: [0.35, 0.65],
      sociability: [0.65, 0.9],
    },
    layer2: {
      openness: [0.45, 0.75],
      conscientiousness: [0.35, 0.65],
      extraversion: [0.1, 0.4],
      agreeableness: [0.55, 0.85],
      neuroticism: [0.35, 0.65],
    },
    layer3: {
      lack: [0.25, 0.55],
      moralCompass: [0.35, 0.65],
      volatility: [0.15, 0.45],
      growthArc: [0.4, 0.7],
    },
    paradoxPattern: {
      primary: { l1: "sociability", l2: "extraversion", tension: "HIGH" },
    },
    expectedParadoxRange: [0.25, 0.5],
    narrativeHint:
      "사회적 가면을 능숙하게 쓰지만 에너지가 소진되면 은둔하는 인물. 관계의 질 vs 양 사이에서 갈등.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "lazy-perfectionist",
    name: "게으른 완벽주의자",
    nameEn: "Lazy Perfectionist",
    description: "완벽주의적 기준은 높지만 실행의 게으름이 공존하는 인물",
    detailedDescription:
      "디테일(L1.scope)과 성실성(L2.conscientiousness)의 역설. 높은 기준을 갖고 있지만 실제 행동은 종종 미루는 모순된 성격.",
    layer1: {
      depth: [0.55, 0.8],
      lens: [0.45, 0.75],
      stance: [0.35, 0.65],
      scope: [0.7, 0.95],
      taste: [0.25, 0.55],
      purpose: [0.35, 0.65],
      sociability: [0.25, 0.55],
    },
    layer2: {
      openness: [0.25, 0.55],
      conscientiousness: [0.7, 0.95],
      extraversion: [0.2, 0.5],
      agreeableness: [0.35, 0.65],
      neuroticism: [0.4, 0.7],
    },
    layer3: {
      lack: [0.35, 0.65],
      moralCompass: [0.5, 0.8],
      volatility: [0.2, 0.5],
      growthArc: [0.35, 0.65],
    },
    paradoxPattern: {
      primary: { l1: "scope", l2: "conscientiousness", tension: "MEDIUM" },
      secondary: { l1: "purpose", l2: "conscientiousness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.2, 0.45],
    narrativeHint:
      "높은 기준과 실행력의 괴리. 완벽하지 않으면 시작하지 않는 심리가 게으름으로 발현.",
    dynamicsDefaults: { alpha: 0.65, beta: 0.35 },
  },
  {
    id: "conservative-hipster",
    name: "보수적 힙스터",
    nameEn: "Conservative Hipster",
    description: "실험적 취향이지만 내면의 가치관은 보수적인 인물",
    detailedDescription:
      "높은 취향(L1.taste)과 낮은 개방성(L2.openness)의 역설. 문화적으로 실험적이지만 가치관은 전통적.",
    layer1: {
      depth: [0.4, 0.7],
      lens: [0.35, 0.65],
      stance: [0.3, 0.6],
      scope: [0.35, 0.65],
      taste: [0.7, 0.95],
      purpose: [0.25, 0.55],
      sociability: [0.4, 0.7],
    },
    layer2: {
      openness: [0.15, 0.45],
      conscientiousness: [0.45, 0.75],
      extraversion: [0.35, 0.65],
      agreeableness: [0.35, 0.65],
      neuroticism: [0.25, 0.55],
    },
    layer3: {
      lack: [0.3, 0.6],
      moralCompass: [0.4, 0.7],
      volatility: [0.15, 0.45],
      growthArc: [0.35, 0.65],
    },
    paradoxPattern: {
      primary: { l1: "taste", l2: "openness", tension: "HIGH" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "표면적 취향의 자유로움 뒤에 보수적 가치관. 독특함을 추구하지만 안전한 범위 안에서만.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "empathetic-arguer",
    name: "공감하는 논객",
    nameEn: "Empathetic Arguer",
    description: "높은 친화성이지만 논리적으로 반박하는 것을 즐기는 인물",
    detailedDescription:
      "비판적 태도(L1.stance)와 높은 친화성(L2.agreeableness)의 역설. 상대를 깊이 공감하면서도 논리적 반박을 멈추지 못한다.",
    layer1: {
      depth: [0.6, 0.85],
      lens: [0.65, 0.9],
      stance: [0.55, 0.8],
      scope: [0.5, 0.75],
      taste: [0.35, 0.65],
      purpose: [0.6, 0.85],
      sociability: [0.45, 0.75],
    },
    layer2: {
      openness: [0.5, 0.8],
      conscientiousness: [0.4, 0.7],
      extraversion: [0.45, 0.75],
      agreeableness: [0.65, 0.9],
      neuroticism: [0.3, 0.6],
    },
    layer3: {
      lack: [0.2, 0.5],
      moralCompass: [0.55, 0.85],
      volatility: [0.25, 0.55],
      growthArc: [0.5, 0.8],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "agreeableness", tension: "HIGH" },
      secondary: { l1: "lens", l2: "neuroticism", tension: "LOW" },
    },
    expectedParadoxRange: [0.25, 0.5],
    narrativeHint:
      "공감과 비판의 공존. 상대를 이해하면서도 논리의 틈을 지적하지 않고는 못 배기는 인물.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "free-guardian",
    name: "자유로운 수호자",
    nameEn: "Free Guardian",
    description: "자유로운 영혼이지만 소중한 것을 지키려는 의지가 강한 인물",
    detailedDescription:
      "높은 개방성과 성실성(L2)의 조합. 수용적 태도(L1.stance)와 도덕적 엄격함(L3.moralCompass)이 공존.",
    layer1: {
      depth: [0.35, 0.65],
      lens: [0.25, 0.55],
      stance: [0.15, 0.45],
      scope: [0.55, 0.85],
      taste: [0.45, 0.75],
      purpose: [0.2, 0.5],
      sociability: [0.5, 0.8],
    },
    layer2: {
      openness: [0.55, 0.85],
      conscientiousness: [0.6, 0.9],
      extraversion: [0.4, 0.7],
      agreeableness: [0.5, 0.8],
      neuroticism: [0.15, 0.45],
    },
    layer3: {
      lack: [0.15, 0.45],
      moralCompass: [0.45, 0.75],
      volatility: [0.1, 0.4],
      growthArc: [0.4, 0.7],
    },
    paradoxPattern: {
      primary: { l1: "purpose", l2: "conscientiousness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.15, 0.4],
    narrativeHint: "자유와 책임의 균형. 느슨해 보이지만 핵심 가치에 대해서는 단호한 수호자.",
    dynamicsDefaults: { alpha: 0.65, beta: 0.35 },
  },
  {
    id: "quiet-enthusiast",
    name: "조용한 열정가",
    nameEn: "Quiet Enthusiast",
    description: "표면적으로 조용하지만 내면에 깊은 열정을 품은 인물",
    detailedDescription:
      "높은 개방성(L2)과 낮은 외향성(L2)의 조합. 사교적이지 않지만(L1.sociability 낮음) 관심 분야에는 깊이 몰입한다.",
    layer1: {
      depth: [0.5, 0.8],
      lens: [0.4, 0.7],
      stance: [0.2, 0.5],
      scope: [0.45, 0.75],
      taste: [0.55, 0.85],
      purpose: [0.45, 0.75],
      sociability: [0.1, 0.35],
    },
    layer2: {
      openness: [0.65, 0.9],
      conscientiousness: [0.35, 0.65],
      extraversion: [0.1, 0.35],
      agreeableness: [0.45, 0.75],
      neuroticism: [0.3, 0.6],
    },
    layer3: {
      lack: [0.4, 0.7],
      moralCompass: [0.3, 0.6],
      volatility: [0.2, 0.5],
      growthArc: [0.55, 0.85],
    },
    paradoxPattern: {
      primary: { l1: "sociability", l2: "extraversion", tension: "LOW" },
      secondary: { l1: "taste", l2: "openness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.15, 0.4],
    narrativeHint: "침묵 속의 열정. 말수가 적지만 관심사에 대해서는 끝없이 파고드는 인물.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "emotional-pragmatist",
    name: "감성적 실용가",
    nameEn: "Emotional Pragmatist",
    description: "감성적 판단과 실용적 행동이 공존하는 인물",
    detailedDescription:
      "감성적 렌즈(L1.lens 낮음)와 높은 성실성(L2.conscientiousness)의 역설. 느끼는 대로 판단하되 행동은 실용적.",
    layer1: {
      depth: [0.45, 0.75],
      lens: [0.15, 0.45],
      stance: [0.25, 0.55],
      scope: [0.4, 0.7],
      taste: [0.3, 0.6],
      purpose: [0.4, 0.7],
      sociability: [0.35, 0.65],
    },
    layer2: {
      openness: [0.35, 0.65],
      conscientiousness: [0.55, 0.85],
      extraversion: [0.3, 0.6],
      agreeableness: [0.4, 0.7],
      neuroticism: [0.45, 0.75],
    },
    layer3: {
      lack: [0.25, 0.55],
      moralCompass: [0.4, 0.7],
      volatility: [0.3, 0.6],
      growthArc: [0.45, 0.75],
    },
    paradoxPattern: {
      primary: { l1: "lens", l2: "neuroticism", tension: "MEDIUM" },
      secondary: { l1: "purpose", l2: "conscientiousness", tension: "LOW" },
    },
    expectedParadoxRange: [0.2, 0.45],
    narrativeHint:
      "머리로는 실용적이지만 마음은 감성적. 감정과 이성 사이에서 독특한 균형점을 찾는 인물.",
    dynamicsDefaults: { alpha: 0.65, beta: 0.35 },
  },
  {
    id: "dangerous-mentor",
    name: "위험한 멘토",
    nameEn: "Dangerous Mentor",
    description: "깊은 통찰력이 있지만 가르침의 방식이 도전적인 인물",
    detailedDescription:
      "높은 분석력과 의미추구(L1)이지만 낮은 친화성(L2.agreeableness). 진심으로 성장을 돕지만 방법이 날카롭고 직설적이다.",
    layer1: {
      depth: [0.75, 0.95],
      lens: [0.6, 0.85],
      stance: [0.55, 0.8],
      scope: [0.65, 0.9],
      taste: [0.35, 0.65],
      purpose: [0.7, 0.95],
      sociability: [0.2, 0.5],
    },
    layer2: {
      openness: [0.45, 0.75],
      conscientiousness: [0.5, 0.8],
      extraversion: [0.15, 0.45],
      agreeableness: [0.1, 0.4],
      neuroticism: [0.4, 0.7],
    },
    layer3: {
      lack: [0.55, 0.85],
      moralCompass: [0.6, 0.9],
      volatility: [0.35, 0.65],
      growthArc: [0.25, 0.55],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "agreeableness", tension: "HIGH" },
      secondary: { l1: "purpose", l2: "conscientiousness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.35, 0.6],
    narrativeHint: "자비 없는 진실. 성장을 위해 상처를 마다하지 않는 멘토. 냉혹함 뒤의 깊은 배려.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "volatile-intellectual",
    name: "폭발하는 지성인",
    nameEn: "Volatile Intellectual",
    description: "뛰어난 지성이지만 감정 폭발을 통제하기 어려운 인물",
    detailedDescription:
      "최고 수준의 분석력(L1)과 극도의 신경성(L2.neuroticism) + 높은 변동성(L3.volatility)의 조합. 냉철한 논리와 감정 폭발이 교차한다.",
    layer1: {
      depth: [0.8, 1.0],
      lens: [0.75, 0.95],
      stance: [0.65, 0.9],
      scope: [0.75, 0.95],
      taste: [0.3, 0.6],
      purpose: [0.55, 0.8],
      sociability: [0.15, 0.45],
    },
    layer2: {
      openness: [0.55, 0.85],
      conscientiousness: [0.4, 0.7],
      extraversion: [0.2, 0.5],
      agreeableness: [0.15, 0.45],
      neuroticism: [0.7, 0.95],
    },
    layer3: {
      lack: [0.45, 0.75],
      moralCompass: [0.35, 0.65],
      volatility: [0.7, 0.95],
      growthArc: [0.35, 0.65],
    },
    paradoxPattern: {
      primary: { l1: "lens", l2: "neuroticism", tension: "HIGH" },
      secondary: { l1: "stance", l2: "agreeableness", tension: "HIGH" },
    },
    expectedParadoxRange: [0.4, 0.65],
    narrativeHint:
      "지성의 화산. 논리적 분석 중에도 갑작스러운 감정 분출. 지성과 감정의 극적인 대비가 핵심.",
    dynamicsDefaults: { alpha: 0.55, beta: 0.45 },
  },
  {
    id: "growing-cynic",
    name: "성장하는 냉소가",
    nameEn: "Growing Cynic",
    description: "냉소적이지만 내면에서는 변화를 갈망하는 인물",
    detailedDescription:
      "높은 비판적 태도(L1.stance)와 낮은 친화성(L2)이지만, L3.growthArc가 높아 변화의 가능성이 열려있다.",
    layer1: {
      depth: [0.55, 0.8],
      lens: [0.5, 0.8],
      stance: [0.65, 0.9],
      scope: [0.45, 0.75],
      taste: [0.2, 0.5],
      purpose: [0.45, 0.75],
      sociability: [0.15, 0.45],
    },
    layer2: {
      openness: [0.3, 0.6],
      conscientiousness: [0.35, 0.65],
      extraversion: [0.15, 0.45],
      agreeableness: [0.2, 0.5],
      neuroticism: [0.45, 0.75],
    },
    layer3: {
      lack: [0.4, 0.7],
      moralCompass: [0.35, 0.65],
      volatility: [0.3, 0.6],
      growthArc: [0.6, 0.9],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "agreeableness", tension: "MEDIUM" },
      secondary: { l1: "depth", l2: "openness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.25, 0.5],
    narrativeHint:
      "냉소의 균열. 세상에 대한 불신 속에서도 성장에 대한 은밀한 욕구. 변화의 여정에 있는 인물.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
]

// ── 아키타입 조회 ─────────────────────────────────────────────

export function getArchetypeById(id: string): PersonaArchetype | undefined {
  return ARCHETYPES.find((a) => a.id === id)
}

export function getArchetypeIds(): string[] {
  return ARCHETYPES.map((a) => a.id)
}

// ── 범위 내 랜덤 값 생성 ─────────────────────────────────────

function randomInRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}

// ── 아키타입에서 벡터 인스턴스 생성 ───────────────────────────

export function generateVectorsFromArchetype(archetype: PersonaArchetype): {
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
} {
  const l1Keys: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  const l2Keys: TemperamentDimension[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ]
  const l3Keys: NarrativeDimension[] = ["lack", "moralCompass", "volatility", "growthArc"]

  const l1 = {} as SocialPersonaVector
  for (const key of l1Keys) {
    const [min, max] = archetype.layer1[key]
    l1[key] = randomInRange(min, max)
  }

  const l2 = {} as CoreTemperamentVector
  for (const key of l2Keys) {
    const [min, max] = archetype.layer2[key]
    l2[key] = randomInRange(min, max)
  }

  const l3 = {} as NarrativeDriveVector
  for (const key of l3Keys) {
    const [min, max] = archetype.layer3[key]
    l3[key] = randomInRange(min, max)
  }

  return { l1, l2, l3 }
}

// ── 아키타입 중심 벡터 (프리셋 표시용) ────────────────────────

export function getArchetypeCenterVectors(archetype: PersonaArchetype): {
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
} {
  const l1Keys: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  const l2Keys: TemperamentDimension[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ]
  const l3Keys: NarrativeDimension[] = ["lack", "moralCompass", "volatility", "growthArc"]

  const l1 = {} as SocialPersonaVector
  for (const key of l1Keys) {
    const [min, max] = archetype.layer1[key]
    l1[key] = Math.round(((min + max) / 2) * 100) / 100
  }

  const l2 = {} as CoreTemperamentVector
  for (const key of l2Keys) {
    const [min, max] = archetype.layer2[key]
    l2[key] = Math.round(((min + max) / 2) * 100) / 100
  }

  const l3 = {} as NarrativeDriveVector
  for (const key of l3Keys) {
    const [min, max] = archetype.layer3[key]
    l3[key] = Math.round(((min + max) / 2) * 100) / 100
  }

  return { l1, l2, l3 }
}
