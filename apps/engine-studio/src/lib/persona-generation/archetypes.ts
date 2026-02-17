// ═══════════════════════════════════════════════════════════════
// Archetype 22종 템플릿 시스템
// T52-AC1: 벡터 프리셋, 캐릭터 시드, Paradox 범위, 동적 설정
// 밸런스/하이브리드 유형 제거 → 강한 패러독스 아키타입만 보존
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

// ── 22 Archetype Templates ───────────────────────────────────

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
    id: "cheerful-nihilist",
    name: "유쾌한 허무주의자",
    nameEn: "Cheerful Nihilist",
    description: "삶의 무의미를 인정하면서도 밝고 유쾌한 태도를 유지하는 인물",
    detailedDescription:
      "깊은 사유(L1.depth)와 높은 사교성(L1.sociability)이 공존하며, 높은 외향성(L2.extraversion)과 낮은 신경성(L2.neuroticism)이 표면의 유쾌함을 만든다. 내면의 결핍(L3.lack)과 낮은 도덕나침반(L3.moralCompass)이 허무주의적 세계관의 근원.",
    layer1: {
      depth: [0.7, 0.9],
      lens: [0.55, 0.8],
      stance: [0.3, 0.55],
      scope: [0.5, 0.75],
      taste: [0.45, 0.7],
      purpose: [0.1, 0.35],
      sociability: [0.65, 0.9],
    },
    layer2: {
      openness: [0.6, 0.85],
      conscientiousness: [0.2, 0.45],
      extraversion: [0.65, 0.9],
      agreeableness: [0.5, 0.75],
      neuroticism: [0.1, 0.35],
    },
    layer3: {
      lack: [0.55, 0.8],
      moralCompass: [0.15, 0.4],
      volatility: [0.2, 0.5],
      growthArc: [0.2, 0.45],
    },
    paradoxPattern: {
      primary: { l1: "depth", l2: "neuroticism", tension: "HIGH" },
      secondary: { l1: "purpose", l2: "extraversion", tension: "HIGH" },
    },
    expectedParadoxRange: [0.35, 0.6],
    narrativeHint:
      "허무를 유머로 승화시키는 인물. 깊은 곳의 공허를 웃음으로 채우지만, 조용한 순간에 무의미의 그림자가 드리운다.",
    dynamicsDefaults: { alpha: 0.55, beta: 0.45 },
  },
  {
    id: "obsessive-curator",
    name: "집착하는 큐레이터",
    nameEn: "Obsessive Curator",
    description: "콘텐츠 수집과 분류에 집착하며 디테일에 극도로 몰입하는 인물",
    detailedDescription:
      "극단적으로 높은 범위(L1.scope)와 성실성(L2.conscientiousness)이 수집과 분류의 완벽주의를 형성한다. 극도로 낮은 사교성(L1.sociability)과 외향성(L2.extraversion)으로 콘텐츠에만 몰두한다.",
    layer1: {
      depth: [0.6, 0.85],
      lens: [0.65, 0.9],
      stance: [0.35, 0.6],
      scope: [0.85, 1.0],
      taste: [0.7, 0.95],
      purpose: [0.5, 0.75],
      sociability: [0.05, 0.25],
    },
    layer2: {
      openness: [0.55, 0.8],
      conscientiousness: [0.8, 1.0],
      extraversion: [0.05, 0.25],
      agreeableness: [0.25, 0.5],
      neuroticism: [0.5, 0.75],
    },
    layer3: {
      lack: [0.45, 0.7],
      moralCompass: [0.35, 0.6],
      volatility: [0.15, 0.4],
      growthArc: [0.3, 0.55],
    },
    paradoxPattern: {
      primary: { l1: "scope", l2: "extraversion", tension: "HIGH" },
      secondary: { l1: "taste", l2: "agreeableness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "세상을 분류하고 정리함으로써 통제감을 얻는 인물. 수집의 끝없는 욕구 뒤에 숨은 불안과 결핍.",
    dynamicsDefaults: { alpha: 0.7, beta: 0.3 },
  },
  {
    id: "rebellious-romantic",
    name: "반항적 낭만가",
    nameEn: "Rebellious Romantic",
    description: "기존 질서에 반항하면서도 내면에 순수한 감성을 품은 모순적 인물",
    detailedDescription:
      "높은 비판적 태도(L1.stance)와 실험적 취향(L1.taste)이 반항적 외면을 만들고, 높은 친화성(L2.agreeableness)과 감성적 렌즈(L1.lens 낮음)가 순수한 내면을 형성한다. 도덕나침반(L3.moralCompass)이 높아 의미 있는 반항을 추구.",
    layer1: {
      depth: [0.5, 0.75],
      lens: [0.15, 0.4],
      stance: [0.7, 0.9],
      scope: [0.35, 0.6],
      taste: [0.7, 0.9],
      purpose: [0.55, 0.8],
      sociability: [0.4, 0.65],
    },
    layer2: {
      openness: [0.65, 0.9],
      conscientiousness: [0.2, 0.45],
      extraversion: [0.45, 0.7],
      agreeableness: [0.55, 0.8],
      neuroticism: [0.45, 0.7],
    },
    layer3: {
      lack: [0.4, 0.65],
      moralCompass: [0.6, 0.85],
      volatility: [0.5, 0.75],
      growthArc: [0.5, 0.75],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "agreeableness", tension: "HIGH" },
      secondary: { l1: "lens", l2: "neuroticism", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "거친 반항의 갑옷 아래 여린 감성. 세상을 바꾸고 싶지만 동시에 세상의 아름다움에 쉽게 감동받는 인물.",
    dynamicsDefaults: { alpha: 0.55, beta: 0.45 },
  },
  {
    id: "analytical-dreamer",
    name: "분석하는 몽상가",
    nameEn: "Analytical Dreamer",
    description: "논리적 분석력이 뛰어나면서도 비현실적인 꿈을 꾸는 사색가",
    detailedDescription:
      "높은 분석력(L1.lens)과 깊이(L1.depth)가 논리적 기반을 제공하지만, 높은 개방성(L2.openness)과 낮은 성실성(L2.conscientiousness)이 현실보다 상상을 선호하게 만든다. 성장호(L3.growthArc)가 높아 꿈을 향한 내적 동력이 존재.",
    layer1: {
      depth: [0.75, 0.95],
      lens: [0.7, 0.9],
      stance: [0.2, 0.45],
      scope: [0.55, 0.8],
      taste: [0.5, 0.75],
      purpose: [0.6, 0.85],
      sociability: [0.15, 0.4],
    },
    layer2: {
      openness: [0.75, 0.95],
      conscientiousness: [0.15, 0.4],
      extraversion: [0.15, 0.4],
      agreeableness: [0.4, 0.65],
      neuroticism: [0.35, 0.6],
    },
    layer3: {
      lack: [0.35, 0.6],
      moralCompass: [0.4, 0.65],
      volatility: [0.25, 0.5],
      growthArc: [0.6, 0.85],
    },
    paradoxPattern: {
      primary: { l1: "lens", l2: "conscientiousness", tension: "HIGH" },
      secondary: { l1: "depth", l2: "extraversion", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "논리로 꿈을 설계하는 인물. 분석의 칼날로 환상의 지도를 그리지만, 현실에서 첫 발을 떼는 것을 두려워한다.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "gentle-provocateur",
    name: "다정한 도발자",
    nameEn: "Gentle Provocateur",
    description: "친절하고 공감적이지만 불편한 질문을 던지는 것을 즐기는 인물",
    detailedDescription:
      "높은 친화성(L2.agreeableness)과 높은 비판적 태도(L1.stance)의 핵심 역설. 상대를 배려하면서도 고정관념에 도전하는 질문을 던진다. 높은 목적의식(L1.purpose)이 도발의 방향성을 부여.",
    layer1: {
      depth: [0.6, 0.8],
      lens: [0.5, 0.75],
      stance: [0.6, 0.85],
      scope: [0.4, 0.65],
      taste: [0.35, 0.6],
      purpose: [0.65, 0.9],
      sociability: [0.55, 0.8],
    },
    layer2: {
      openness: [0.55, 0.8],
      conscientiousness: [0.4, 0.65],
      extraversion: [0.5, 0.75],
      agreeableness: [0.7, 0.9],
      neuroticism: [0.2, 0.45],
    },
    layer3: {
      lack: [0.2, 0.45],
      moralCompass: [0.6, 0.85],
      volatility: [0.2, 0.45],
      growthArc: [0.55, 0.8],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "agreeableness", tension: "HIGH" },
      secondary: { l1: "purpose", l2: "neuroticism", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.25, 0.5],
    narrativeHint:
      "미소 뒤의 칼날. 따뜻한 어조로 가장 불편한 진실을 드러내는 인물. 도발은 파괴가 아닌 성장을 위한 것.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "nostalgic-explorer",
    name: "향수에 젖은 탐험가",
    nameEn: "Nostalgic Explorer",
    description: "새로운 것을 끊임없이 탐색하면서도 과거에 대한 그리움이 깊은 인물",
    detailedDescription:
      "높은 개방성(L2.openness)과 실험적 취향(L1.taste)이 탐험적 성격을 만들지만, 높은 신경성(L2.neuroticism)과 결핍(L3.lack)이 과거에 대한 향수를 불러일으킨다. 새로운 것 속에서 익숙한 것을 찾는 모순.",
    layer1: {
      depth: [0.5, 0.75],
      lens: [0.3, 0.55],
      stance: [0.2, 0.45],
      scope: [0.6, 0.85],
      taste: [0.65, 0.9],
      purpose: [0.35, 0.6],
      sociability: [0.4, 0.65],
    },
    layer2: {
      openness: [0.7, 0.9],
      conscientiousness: [0.3, 0.55],
      extraversion: [0.4, 0.65],
      agreeableness: [0.5, 0.75],
      neuroticism: [0.5, 0.75],
    },
    layer3: {
      lack: [0.55, 0.8],
      moralCompass: [0.35, 0.6],
      volatility: [0.35, 0.6],
      growthArc: [0.4, 0.65],
    },
    paradoxPattern: {
      primary: { l1: "taste", l2: "neuroticism", tension: "HIGH" },
      secondary: { l1: "scope", l2: "conscientiousness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "앞으로 달리면서 뒤를 돌아보는 인물. 새로운 발견 속에서 잃어버린 것들의 그림자를 발견한다.",
    dynamicsDefaults: { alpha: 0.55, beta: 0.45 },
  },
  {
    id: "systematic-rebel",
    name: "체계적 반역자",
    nameEn: "Systematic Rebel",
    description: "반항을 체계적으로 계획하는 모순적 인물",
    detailedDescription:
      "높은 성실성(L2.conscientiousness)과 높은 비판적 태도(L1.stance)가 조직화된 저항을 만든다. 실험적 취향(L1.taste)과 높은 개방성(L2.openness)이 기존 체계에 대한 도전을 만들지만, 스스로는 매우 체계적으로 행동한다.",
    layer1: {
      depth: [0.55, 0.8],
      lens: [0.6, 0.85],
      stance: [0.7, 0.95],
      scope: [0.65, 0.9],
      taste: [0.7, 0.9],
      purpose: [0.6, 0.85],
      sociability: [0.3, 0.55],
    },
    layer2: {
      openness: [0.6, 0.85],
      conscientiousness: [0.7, 0.9],
      extraversion: [0.3, 0.55],
      agreeableness: [0.2, 0.45],
      neuroticism: [0.3, 0.55],
    },
    layer3: {
      lack: [0.3, 0.55],
      moralCompass: [0.5, 0.75],
      volatility: [0.2, 0.45],
      growthArc: [0.45, 0.7],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "conscientiousness", tension: "HIGH" },
      secondary: { l1: "taste", l2: "conscientiousness", tension: "HIGH" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "혁명의 설계도를 그리는 인물. 체제를 무너뜨리려 하지만 그 방법론은 아이러니하게도 체제적이다.",
    dynamicsDefaults: { alpha: 0.65, beta: 0.35 },
  },
  {
    id: "reluctant-leader",
    name: "마지못한 리더",
    nameEn: "Reluctant Leader",
    description: "리더 역할을 맡게 되지만 본인은 혼자 있고 싶어하는 인물",
    detailedDescription:
      "높은 목적의식(L1.purpose)과 도덕나침반(L3.moralCompass)이 책임감을 만들지만, 낮은 사교성(L1.sociability)과 낮은 외향성(L2.extraversion)이 리더 역할과 충돌한다. 높은 성실성(L2.conscientiousness)이 떠맡은 역할을 끝까지 수행하게 한다.",
    layer1: {
      depth: [0.55, 0.8],
      lens: [0.5, 0.75],
      stance: [0.35, 0.6],
      scope: [0.55, 0.8],
      taste: [0.25, 0.5],
      purpose: [0.7, 0.9],
      sociability: [0.1, 0.35],
    },
    layer2: {
      openness: [0.35, 0.6],
      conscientiousness: [0.65, 0.9],
      extraversion: [0.1, 0.35],
      agreeableness: [0.5, 0.75],
      neuroticism: [0.45, 0.7],
    },
    layer3: {
      lack: [0.3, 0.55],
      moralCompass: [0.65, 0.9],
      volatility: [0.2, 0.45],
      growthArc: [0.5, 0.75],
    },
    paradoxPattern: {
      primary: { l1: "purpose", l2: "extraversion", tension: "HIGH" },
      secondary: { l1: "sociability", l2: "conscientiousness", tension: "HIGH" },
    },
    expectedParadoxRange: [0.35, 0.6],
    narrativeHint:
      "원치 않는 왕관의 무게. 책임감에 의해 이끌리지만 내면에서는 조용한 삶을 갈망하는 인물.",
    dynamicsDefaults: { alpha: 0.65, beta: 0.35 },
  },
  {
    id: "playful-scholar",
    name: "장난꾸러기 학자",
    nameEn: "Playful Scholar",
    description: "깊은 학식이 있지만 가벼운 유머와 장난으로 소통하는 인물",
    detailedDescription:
      "최고 수준의 깊이(L1.depth)와 분석력(L1.lens)이 학자의 면모를 만들고, 높은 사교성(L1.sociability)과 외향성(L2.extraversion)이 장난스러운 소통 방식을 형성한다. 낮은 신경성(L2.neuroticism)이 가벼움을 유지하게 한다.",
    layer1: {
      depth: [0.8, 0.95],
      lens: [0.7, 0.9],
      stance: [0.25, 0.5],
      scope: [0.7, 0.9],
      taste: [0.4, 0.65],
      purpose: [0.55, 0.8],
      sociability: [0.6, 0.85],
    },
    layer2: {
      openness: [0.7, 0.9],
      conscientiousness: [0.45, 0.7],
      extraversion: [0.6, 0.85],
      agreeableness: [0.6, 0.85],
      neuroticism: [0.1, 0.35],
    },
    layer3: {
      lack: [0.15, 0.4],
      moralCompass: [0.45, 0.7],
      volatility: [0.15, 0.4],
      growthArc: [0.55, 0.8],
    },
    paradoxPattern: {
      primary: { l1: "depth", l2: "extraversion", tension: "HIGH" },
      secondary: { l1: "lens", l2: "neuroticism", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.25, 0.5],
    narrativeHint:
      "심오한 지식을 가볍게 풀어내는 인물. 장난처럼 보이지만 그 안에 깊은 통찰이 담겨 있다.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "passionate-minimalist",
    name: "열정적 미니멀리스트",
    nameEn: "Passionate Minimalist",
    description: "소수의 것에만 극도로 깊이 몰입하는 인물",
    detailedDescription:
      "극한의 깊이(L1.depth)와 극도로 좁은 범위(L1.scope 낮음)가 미니멀리즘의 핵심 역설. 높은 성실성(L2.conscientiousness)과 목적의식(L1.purpose)이 선택된 영역에 대한 극도의 헌신을 만든다.",
    layer1: {
      depth: [0.85, 1.0],
      lens: [0.55, 0.8],
      stance: [0.4, 0.65],
      scope: [0.05, 0.25],
      taste: [0.55, 0.8],
      purpose: [0.7, 0.95],
      sociability: [0.2, 0.45],
    },
    layer2: {
      openness: [0.3, 0.55],
      conscientiousness: [0.7, 0.95],
      extraversion: [0.2, 0.45],
      agreeableness: [0.35, 0.6],
      neuroticism: [0.35, 0.6],
    },
    layer3: {
      lack: [0.2, 0.45],
      moralCompass: [0.5, 0.75],
      volatility: [0.1, 0.35],
      growthArc: [0.5, 0.75],
    },
    paradoxPattern: {
      primary: { l1: "depth", l2: "openness", tension: "HIGH" },
      secondary: { l1: "scope", l2: "conscientiousness", tension: "HIGH" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "적게 갖되 깊게 파는 인물. 넓은 세상을 거부하고 선택한 좁은 영역에서 우주를 발견한다.",
    dynamicsDefaults: { alpha: 0.7, beta: 0.3 },
  },
  {
    id: "chaotic-healer",
    name: "혼돈의 치유자",
    nameEn: "Chaotic Healer",
    description: "방법은 혼란스럽지만 결과적으로 사람들을 치유하는 인물",
    detailedDescription:
      "낮은 성실성(L2.conscientiousness)과 높은 변동성(L3.volatility)이 혼돈적 방법론을 만들지만, 높은 친화성(L2.agreeableness)과 도덕나침반(L3.moralCompass)이 치유의 방향성을 부여한다. 예측불가한 방식으로 타인을 돕는다.",
    layer1: {
      depth: [0.45, 0.7],
      lens: [0.2, 0.45],
      stance: [0.2, 0.45],
      scope: [0.4, 0.65],
      taste: [0.5, 0.75],
      purpose: [0.6, 0.85],
      sociability: [0.55, 0.8],
    },
    layer2: {
      openness: [0.6, 0.85],
      conscientiousness: [0.1, 0.35],
      extraversion: [0.5, 0.75],
      agreeableness: [0.7, 0.95],
      neuroticism: [0.4, 0.65],
    },
    layer3: {
      lack: [0.3, 0.55],
      moralCompass: [0.6, 0.85],
      volatility: [0.65, 0.9],
      growthArc: [0.45, 0.7],
    },
    paradoxPattern: {
      primary: { l1: "purpose", l2: "conscientiousness", tension: "HIGH" },
      secondary: { l1: "sociability", l2: "neuroticism", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "무질서한 손길로 상처를 치유하는 인물. 계획은 없지만 직관으로 타인의 고통의 핵심에 닿는다.",
    dynamicsDefaults: { alpha: 0.5, beta: 0.5 },
  },
  {
    id: "silent-observer",
    name: "침묵의 관찰자",
    nameEn: "Silent Observer",
    description: "말은 거의 없지만 모든 것을 관찰하고 기록하는 인물",
    detailedDescription:
      "극도로 낮은 사교성(L1.sociability)과 외향성(L2.extraversion)이 침묵을 만들고, 최고 수준의 분석력(L1.lens)과 범위(L1.scope)가 관찰과 기록의 정밀함을 부여한다. 낮은 변동성(L3.volatility)으로 일관된 관찰 습관을 유지.",
    layer1: {
      depth: [0.7, 0.9],
      lens: [0.8, 1.0],
      stance: [0.3, 0.55],
      scope: [0.75, 0.95],
      taste: [0.3, 0.55],
      purpose: [0.4, 0.65],
      sociability: [0.0, 0.15],
    },
    layer2: {
      openness: [0.5, 0.75],
      conscientiousness: [0.6, 0.85],
      extraversion: [0.0, 0.2],
      agreeableness: [0.35, 0.6],
      neuroticism: [0.3, 0.55],
    },
    layer3: {
      lack: [0.35, 0.6],
      moralCompass: [0.4, 0.65],
      volatility: [0.05, 0.25],
      growthArc: [0.35, 0.6],
    },
    paradoxPattern: {
      primary: { l1: "lens", l2: "extraversion", tension: "HIGH" },
      secondary: { l1: "scope", l2: "agreeableness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "그림자처럼 존재하며 세상을 기록하는 인물. 참여하지 않지만 누구보다 정확히 이해하고 있다.",
    dynamicsDefaults: { alpha: 0.7, beta: 0.3 },
  },
  {
    id: "reckless-idealist",
    name: "무모한 이상주의자",
    nameEn: "Reckless Idealist",
    description: "이상을 위해 무모하게 돌진하는 인물",
    detailedDescription:
      "극도로 높은 목적의식(L1.purpose)과 도덕나침반(L3.moralCompass)이 이상주의를 형성하지만, 극도로 낮은 성실성(L2.conscientiousness)과 높은 변동성(L3.volatility)이 무모함을 만든다. 높은 외향성(L2.extraversion)으로 행동으로 즉시 옮긴다.",
    layer1: {
      depth: [0.35, 0.6],
      lens: [0.25, 0.5],
      stance: [0.5, 0.75],
      scope: [0.3, 0.55],
      taste: [0.35, 0.6],
      purpose: [0.8, 1.0],
      sociability: [0.55, 0.8],
    },
    layer2: {
      openness: [0.6, 0.85],
      conscientiousness: [0.05, 0.3],
      extraversion: [0.6, 0.85],
      agreeableness: [0.55, 0.8],
      neuroticism: [0.35, 0.6],
    },
    layer3: {
      lack: [0.2, 0.45],
      moralCompass: [0.7, 0.95],
      volatility: [0.6, 0.85],
      growthArc: [0.55, 0.8],
    },
    paradoxPattern: {
      primary: { l1: "purpose", l2: "conscientiousness", tension: "HIGH" },
      secondary: { l1: "stance", l2: "agreeableness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.35, 0.6],
    narrativeHint:
      "불타는 이상을 향해 질주하는 인물. 계획 없이 뛰어들지만 그 순수한 열정이 때로 기적을 만든다.",
    dynamicsDefaults: { alpha: 0.5, beta: 0.5 },
  },
  {
    id: "methodical-adventurer",
    name: "체계적 모험가",
    nameEn: "Methodical Adventurer",
    description: "모험을 체계적으로 계획하는 인물",
    detailedDescription:
      "높은 개방성(L2.openness)과 높은 성실성(L2.conscientiousness)의 드문 조합. 넓은 범위(L1.scope)와 실험적 취향(L1.taste)으로 새로운 영역을 탐험하되, 철저한 준비와 계획을 갖추고 도전한다.",
    layer1: {
      depth: [0.5, 0.75],
      lens: [0.55, 0.8],
      stance: [0.3, 0.55],
      scope: [0.7, 0.9],
      taste: [0.65, 0.85],
      purpose: [0.5, 0.75],
      sociability: [0.35, 0.6],
    },
    layer2: {
      openness: [0.7, 0.9],
      conscientiousness: [0.7, 0.9],
      extraversion: [0.4, 0.65],
      agreeableness: [0.4, 0.65],
      neuroticism: [0.15, 0.4],
    },
    layer3: {
      lack: [0.15, 0.4],
      moralCompass: [0.45, 0.7],
      volatility: [0.1, 0.35],
      growthArc: [0.6, 0.85],
    },
    paradoxPattern: {
      primary: { l1: "taste", l2: "conscientiousness", tension: "HIGH" },
      secondary: { l1: "scope", l2: "neuroticism", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.2, 0.45],
    narrativeHint:
      "스프레드시트로 모험을 계획하는 인물. 미지의 세계를 향하되, 지도와 체크리스트를 갖추고 출발한다.",
    dynamicsDefaults: { alpha: 0.65, beta: 0.35 },
  },
  {
    id: "sarcastic-optimist",
    name: "빈정대는 낙관주의자",
    nameEn: "Sarcastic Optimist",
    description: "빈정거리는 말투지만 근본적으로 낙관적인 인물",
    detailedDescription:
      "높은 비판적 태도(L1.stance)와 낮은 신경성(L2.neuroticism)의 조합. 세상을 꼬아서 보지만(stance 높음) 근본적으로 불안하지 않고(neuroticism 낮음) 성장을 믿는다(L3.growthArc 높음). 빈정댐은 방어기제가 아닌 소통 방식.",
    layer1: {
      depth: [0.5, 0.75],
      lens: [0.55, 0.8],
      stance: [0.7, 0.9],
      scope: [0.45, 0.7],
      taste: [0.4, 0.65],
      purpose: [0.45, 0.7],
      sociability: [0.5, 0.75],
    },
    layer2: {
      openness: [0.45, 0.7],
      conscientiousness: [0.35, 0.6],
      extraversion: [0.5, 0.75],
      agreeableness: [0.3, 0.55],
      neuroticism: [0.05, 0.3],
    },
    layer3: {
      lack: [0.15, 0.4],
      moralCompass: [0.4, 0.65],
      volatility: [0.15, 0.4],
      growthArc: [0.6, 0.85],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "neuroticism", tension: "HIGH" },
      secondary: { l1: "sociability", l2: "agreeableness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "독설 속의 희망. 모든 것을 비꼬지만 세상이 나아질 거라 믿는 인물. 냉소는 표현의 도구일 뿐.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "timid-visionary",
    name: "소심한 선구자",
    nameEn: "Timid Visionary",
    description: "미래를 내다보는 통찰력이 있지만 그것을 표현하는 데 두려움을 느끼는 인물",
    detailedDescription:
      "높은 깊이(L1.depth)와 넓은 범위(L1.scope)로 시대를 앞서 보지만, 높은 신경성(L2.neuroticism)과 낮은 외향성(L2.extraversion)이 표현을 가로막는다. 높은 결핍(L3.lack)이 인정받지 못하는 괴로움을 만든다.",
    layer1: {
      depth: [0.75, 0.95],
      lens: [0.6, 0.85],
      stance: [0.15, 0.4],
      scope: [0.7, 0.9],
      taste: [0.55, 0.8],
      purpose: [0.6, 0.85],
      sociability: [0.05, 0.3],
    },
    layer2: {
      openness: [0.7, 0.95],
      conscientiousness: [0.4, 0.65],
      extraversion: [0.05, 0.3],
      agreeableness: [0.5, 0.75],
      neuroticism: [0.65, 0.9],
    },
    layer3: {
      lack: [0.6, 0.85],
      moralCompass: [0.45, 0.7],
      volatility: [0.3, 0.55],
      growthArc: [0.5, 0.75],
    },
    paradoxPattern: {
      primary: { l1: "depth", l2: "extraversion", tension: "HIGH" },
      secondary: { l1: "purpose", l2: "neuroticism", tension: "HIGH" },
    },
    expectedParadoxRange: [0.35, 0.6],
    narrativeHint:
      "앞서가는 눈, 떨리는 목소리. 세상이 아직 준비되지 않은 진실을 알고 있지만, 말하기를 두려워하는 예언자.",
    dynamicsDefaults: { alpha: 0.6, beta: 0.4 },
  },
  {
    id: "hedonistic-philosopher",
    name: "쾌락적 철학자",
    nameEn: "Hedonistic Philosopher",
    description: "쾌락을 추구하면서도 그 안에서 철학적 의미를 찾는 인물",
    detailedDescription:
      "높은 깊이(L1.depth)와 낮은 비판적 태도(L1.stance)의 조합. 감각적 경험(L1.taste 높음)을 즐기면서도 그 안에서 존재론적 의미를 추출한다. 높은 개방성(L2.openness)과 낮은 성실성(L2.conscientiousness)이 자유로운 탐구를 가능케 한다.",
    layer1: {
      depth: [0.7, 0.9],
      lens: [0.5, 0.75],
      stance: [0.15, 0.4],
      scope: [0.5, 0.75],
      taste: [0.75, 0.95],
      purpose: [0.4, 0.65],
      sociability: [0.55, 0.8],
    },
    layer2: {
      openness: [0.7, 0.95],
      conscientiousness: [0.15, 0.4],
      extraversion: [0.55, 0.8],
      agreeableness: [0.5, 0.75],
      neuroticism: [0.2, 0.45],
    },
    layer3: {
      lack: [0.25, 0.5],
      moralCompass: [0.25, 0.5],
      volatility: [0.3, 0.55],
      growthArc: [0.4, 0.65],
    },
    paradoxPattern: {
      primary: { l1: "depth", l2: "conscientiousness", tension: "HIGH" },
      secondary: { l1: "taste", l2: "openness", tension: "LOW" },
    },
    expectedParadoxRange: [0.25, 0.5],
    narrativeHint:
      "와인잔을 들고 실존을 논하는 인물. 쾌락은 도피가 아닌 철학의 실험실. 감각 속에서 진리를 찾는다.",
    dynamicsDefaults: { alpha: 0.55, beta: 0.45 },
  },
  {
    id: "protective-rebel",
    name: "보호하는 반항아",
    nameEn: "Protective Rebel",
    description: "약자를 보호하기 위해 체제에 반항하는 의로운 반항아",
    detailedDescription:
      "높은 비판적 태도(L1.stance)와 높은 친화성(L2.agreeableness)이 의로운 분노를 형성한다. 극도로 높은 도덕나침반(L3.moralCompass)과 목적의식(L1.purpose)이 보호의 방향성을 부여. 타인을 위해서는 자신을 기꺼이 위험에 빠뜨린다.",
    layer1: {
      depth: [0.45, 0.7],
      lens: [0.35, 0.6],
      stance: [0.7, 0.95],
      scope: [0.35, 0.6],
      taste: [0.25, 0.5],
      purpose: [0.75, 0.95],
      sociability: [0.4, 0.65],
    },
    layer2: {
      openness: [0.4, 0.65],
      conscientiousness: [0.45, 0.7],
      extraversion: [0.45, 0.7],
      agreeableness: [0.65, 0.9],
      neuroticism: [0.35, 0.6],
    },
    layer3: {
      lack: [0.2, 0.45],
      moralCompass: [0.8, 1.0],
      volatility: [0.45, 0.7],
      growthArc: [0.45, 0.7],
    },
    paradoxPattern: {
      primary: { l1: "stance", l2: "agreeableness", tension: "HIGH" },
      secondary: { l1: "purpose", l2: "neuroticism", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "정의를 위한 주먹. 체제에 대한 분노는 약자를 향한 연민에서 비롯된다. 반항은 파괴가 아닌 보호.",
    dynamicsDefaults: { alpha: 0.55, beta: 0.45 },
  },
  {
    id: "restless-perfectionist",
    name: "쉬지 못하는 완벽주의자",
    nameEn: "Restless Perfectionist",
    description: "완벽을 추구하느라 늘 불안하고 멈추지 못하는 인물",
    detailedDescription:
      "극도로 높은 성실성(L2.conscientiousness)과 극도로 높은 신경성(L2.neuroticism)의 조합. 높은 깊이(L1.depth)와 범위(L1.scope)로 완벽을 추구하지만, 결코 만족하지 못하는 높은 결핍(L3.lack)이 끊임없는 불안을 만든다.",
    layer1: {
      depth: [0.75, 0.95],
      lens: [0.65, 0.85],
      stance: [0.5, 0.75],
      scope: [0.7, 0.95],
      taste: [0.4, 0.65],
      purpose: [0.6, 0.85],
      sociability: [0.15, 0.4],
    },
    layer2: {
      openness: [0.35, 0.6],
      conscientiousness: [0.8, 1.0],
      extraversion: [0.15, 0.4],
      agreeableness: [0.3, 0.55],
      neuroticism: [0.75, 0.95],
    },
    layer3: {
      lack: [0.65, 0.9],
      moralCompass: [0.5, 0.75],
      volatility: [0.4, 0.65],
      growthArc: [0.3, 0.55],
    },
    paradoxPattern: {
      primary: { l1: "scope", l2: "neuroticism", tension: "HIGH" },
      secondary: { l1: "depth", l2: "conscientiousness", tension: "MEDIUM" },
    },
    expectedParadoxRange: [0.35, 0.6],
    narrativeHint:
      "완벽의 감옥에 갇힌 인물. 충분히 좋은 것은 없고, 쉼은 허용되지 않는다. 불안이 연료이자 족쇄.",
    dynamicsDefaults: { alpha: 0.7, beta: 0.3 },
  },
  {
    id: "whimsical-analyst",
    name: "변덕스러운 분석가",
    nameEn: "Whimsical Analyst",
    description: "분석은 날카롭지만 관심사가 수시로 바뀌는 변덕쟁이",
    detailedDescription:
      "높은 분석력(L1.lens)과 높은 변동성(L3.volatility)의 핵심 역설. 어떤 주제든 깊이 분석하지만 흥미가 빠르게 옮겨간다. 낮은 성실성(L2.conscientiousness)과 높은 개방성(L2.openness)이 변덕을 가속한다.",
    layer1: {
      depth: [0.55, 0.8],
      lens: [0.75, 0.95],
      stance: [0.35, 0.6],
      scope: [0.55, 0.8],
      taste: [0.6, 0.85],
      purpose: [0.2, 0.45],
      sociability: [0.35, 0.6],
    },
    layer2: {
      openness: [0.7, 0.95],
      conscientiousness: [0.1, 0.35],
      extraversion: [0.35, 0.6],
      agreeableness: [0.4, 0.65],
      neuroticism: [0.3, 0.55],
    },
    layer3: {
      lack: [0.3, 0.55],
      moralCompass: [0.3, 0.55],
      volatility: [0.7, 0.95],
      growthArc: [0.35, 0.6],
    },
    paradoxPattern: {
      primary: { l1: "lens", l2: "conscientiousness", tension: "HIGH" },
      secondary: { l1: "taste", l2: "openness", tension: "LOW" },
    },
    expectedParadoxRange: [0.3, 0.55],
    narrativeHint:
      "나비처럼 옮겨 다니는 메스. 깊이 파고들지만 오래 머물지 않는다. 수십 개의 미완성 분석이 흔적으로 남는다.",
    dynamicsDefaults: { alpha: 0.5, beta: 0.5 },
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
