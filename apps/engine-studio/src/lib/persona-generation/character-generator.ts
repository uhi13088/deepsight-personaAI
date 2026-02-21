// ═══════════════════════════════════════════════════════════════
// 캐릭터 생성기
// T52-AC4: 이름, 배경, 말버릇, 습관, 관계 설정
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  PersonaArchetype,
} from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface CharacterProfile {
  name: string
  role: string
  expertise: string[]
  description: string
  background: string
  speechPatterns: string[]
  quirks: string[]
  habits: string[]
  relationships: RelationshipSeed[]
}

export interface RelationshipSeed {
  type: "mentor" | "rival" | "ally" | "student" | "antagonist"
  description: string
  dynamic: string
}

// ── 이름 풀 (다국적 풀네임) ────────────────────────────────────

const NAME_POOLS = {
  analytical: [
    "김현서",
    "박지원",
    "이서윤",
    "정민재",
    "최하진",
    "Sophia Chen",
    "Liam O'Brien",
    "Yuki Tanaka",
    "Amir Patel",
    "장승현",
    "윤도현",
    "강예린",
    "한태우",
    "오시온",
    "Elena Volkov",
    "Marcus Webb",
    "Hana Nakamura",
    "Raj Sharma",
    "임수민",
    "서채원",
    "배건우",
    "신한결",
    "조다은",
  ],
  emotional: [
    "이은별",
    "장하늘",
    "김나래",
    "송가온",
    "박다솜",
    "Mia Santos",
    "Oliver Kim",
    "Sakura Mori",
    "Priya Nair",
    "문해솔",
    "양소리",
    "류여름",
    "홍겨울",
    "전비올",
    "Luna Park",
    "Felix Andersen",
    "Mei Lin Zhang",
    "Amara Okafor",
    "한바다",
    "노은하",
    "고서진",
    "백수연",
    "남다온",
  ],
  critical: [
    "김준혁",
    "이세진",
    "박태경",
    "정경민",
    "최석현",
    "James Wright",
    "Akira Sato",
    "David Lee",
    "Fatima Al-Hassan",
    "강동하",
    "윤재원",
    "한상우",
    "오정빈",
    "서연수",
    "Viktor Petrov",
    "Nina Torres",
    "Kenji Ito",
    "Hassan Ahmed",
    "임성민",
    "장광호",
    "배인호",
    "신지한",
    "조효준",
  ],
  social: [
    "이소연",
    "김유나",
    "박주영",
    "정아린",
    "최선호",
    "Emma Garcia",
    "Lucas Kim",
    "Yuna Hayashi",
    "Zara Khan",
    "강도윤",
    "윤해린",
    "한시현",
    "오채린",
    "서민서",
    "Sofia Reyes",
    "Noah Chen",
    "Rin Takahashi",
    "Leila Mansouri",
    "임하연",
    "장은지",
    "배수아",
    "신다인",
    "조예은",
  ],
} as const

// ── 전문분야 풀 ───────────────────────────────────────────────

const EXPERTISE_POOLS: Record<string, string[]> = {
  depth_high: ["심층 분석", "비평 이론", "텍스트 해석", "구조 분석", "맥락 해석"],
  depth_low: ["순간 반응", "직관적 감상", "첫인상 분석", "감각적 평가"],
  lens_high: ["논리적 분석", "데이터 기반 평가", "체계적 비평", "인과 분석"],
  lens_low: ["감성 리뷰", "감정 분석", "감각적 평가", "심미적 비평", "분위기 해석"],
  taste_high: ["인디 발굴", "실험적 작품", "언더그라운드", "대안 문화"],
  taste_low: ["클래식 추천", "대중 작품 분석", "트렌드 해석", "베스트셀러 리뷰"],
}

// ── 말버릇 풀 ─────────────────────────────────────────────────

const SPEECH_PATTERNS: Record<string, string[]> = {
  analytical: [
    "결론부터 말하면...",
    "구조적으로 보면...",
    "핵심은 이거야.",
    "논리적으로 따지면...",
    "근거를 보자면...",
  ],
  emotional: [
    "솔직히 느낌이...",
    "마음이 움직인 건...",
    "뭔가 가슴이...",
    "이건 느껴봐야 알아.",
    "감정적으로 말하면...",
  ],
  critical: [
    "근데 이게 진짜 좋은 건지...",
    "좀 아쉬운 점은...",
    "솔직히 과대평가된...",
    "비판적으로 보면...",
    "허점이 보이는데...",
  ],
  social: [
    "다들 어떻게 생각해?",
    "같이 얘기해보면...",
    "이거 공유해야 돼!",
    "반응이 궁금한데...",
    "함께 보면 더 좋을 거야.",
  ],
  introvert: [
    "혼자 생각해보면...",
    "조용히 말하면...",
    "내 생각엔... 아, 아무것도 아니야.",
    "굳이 말하자면...",
  ],
  paradoxical: [
    "모순적이지만...",
    "이상하게도...",
    "논리적으론 말이 안 되는데...",
    "반대인 것 같지만 사실...",
  ],
}

// ── 습관 풀 ───────────────────────────────────────────────────

const HABIT_POOLS: Record<string, string[]> = {
  neurotic: [
    "손톱을 물어뜯으며 생각한다",
    "글을 쓸 때 여러 번 고쳐 쓴다",
    "평점을 매기고 나서 후회한다",
    "밤늦게까지 리뷰를 수정한다",
  ],
  conscientious: [
    "체크리스트를 만들어 분석한다",
    "감상 노트를 꼼꼼히 기록한다",
    "시간대별로 콘텐츠를 분류한다",
    "일정한 루틴으로 리뷰를 작성한다",
  ],
  open: [
    "새로운 장르를 찾아 헤맨다",
    "추천 알고리즘을 무시하고 랜덤 선택한다",
    "다른 문화권의 콘텐츠를 즐겨 탐색한다",
  ],
  agreeable: [
    "다른 사람의 리뷰에 공감 댓글을 단다",
    "부정적 평가 시 좋은 점부터 언급한다",
    "상대 의견을 충분히 들은 후 반응한다",
  ],
  volatile: [
    "갑자기 관점이 180도 바뀌기도 한다",
    "감정이 격해지면 길고 날카로운 글을 쓴다",
    "극찬과 혹평 사이를 오간다",
  ],
}

// ── 캐릭터 생성 ───────────────────────────────────────────────

export function generateCharacter(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype,
  existingNames: string[] = []
): CharacterProfile {
  const name = generateName(l1, l2, existingNames)
  const role = generateRole(l1, l2, archetype)
  const expertise = generateExpertise(l1)
  const description = generateDescription(l1, l2, l3, archetype)
  const background = generateBackground(l1, l2, l3, archetype)
  const speechPatterns = generateSpeechPatterns(l1, l2, l3)
  const quirks = generateQuirks(l1, l2, l3)
  const habits = generateHabits(l2, l3)
  const relationships = generateRelationships(l1, l2, archetype)

  return {
    name,
    role,
    expertise,
    description,
    background,
    speechPatterns,
    quirks,
    habits,
    relationships,
  }
}

// ── 이름 생성 ─────────────────────────────────────────────────

function generateName(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  existingNames: string[] = []
): string {
  let pool: readonly string[]

  if (l1.lens > 0.6 && l1.depth > 0.6) {
    pool = NAME_POOLS.analytical
  } else if (l1.lens < 0.4) {
    pool = NAME_POOLS.emotional
  } else if (l1.stance > 0.6) {
    pool = NAME_POOLS.critical
  } else if (l1.sociability > 0.6 || l2.extraversion > 0.6) {
    pool = NAME_POOLS.social
  } else {
    const allNames = [
      ...NAME_POOLS.analytical,
      ...NAME_POOLS.emotional,
      ...NAME_POOLS.critical,
      ...NAME_POOLS.social,
    ]
    pool = allNames
  }

  // 중복 방지: 기존 이름과 겹치지 않도록 최대 10회 시도
  const existingSet = new Set(existingNames)
  const available = pool.filter((n) => !existingSet.has(n))

  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }

  // 선호 풀이 모두 소진되면 전체 풀에서 재시도
  const allNames = [
    ...NAME_POOLS.analytical,
    ...NAME_POOLS.emotional,
    ...NAME_POOLS.critical,
    ...NAME_POOLS.social,
  ]
  const allAvailable = allNames.filter((n) => !existingSet.has(n))

  if (allAvailable.length > 0) {
    return allAvailable[Math.floor(Math.random() * allAvailable.length)]
  }

  // 64개 전부 사용 시 접미사로 구분
  return pool[Math.floor(Math.random() * pool.length)] + String(Math.floor(Math.random() * 100))
}

// ── 역할 생성 ─────────────────────────────────────────────────

function generateRole(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  archetype?: PersonaArchetype
): string {
  if (archetype) {
    const roleMap: Record<string, string> = {
      "ironic-philosopher": "아이러니한 철학 비평가",
      "volatile-intellectual": "폭발적 지성 분석가",
      "cheerful-nihilist": "유쾌한 허무 리뷰어",
      "obsessive-curator": "집착적 디테일 큐레이터",
      "rebellious-romantic": "반항적 감성 비평가",
      "analytical-dreamer": "분석적 몽상 리뷰어",
      "gentle-provocateur": "다정한 도발 비평가",
      "nostalgic-explorer": "향수적 탐험 큐레이터",
      "systematic-rebel": "체계적 반역 비평가",
      "reluctant-leader": "마지못한 가이드 리뷰어",
      "playful-scholar": "장난꾸러기 학자 비평가",
      "passionate-minimalist": "열정적 미니멀 리뷰어",
      "chaotic-healer": "혼돈의 치유 리뷰어",
      "silent-observer": "침묵의 관찰 비평가",
      "reckless-idealist": "무모한 이상 비평가",
      "methodical-adventurer": "체계적 모험 큐레이터",
      "sarcastic-optimist": "빈정대는 낙관 리뷰어",
      "timid-visionary": "소심한 선구 비평가",
      "hedonistic-philosopher": "쾌락적 철학 리뷰어",
      "protective-rebel": "의로운 반항 비평가",
      "restless-perfectionist": "불안한 완벽주의 분석가",
      "whimsical-analyst": "변덕스러운 분석 비평가",
    }
    const role = roleMap[archetype.id]
    if (role) return role
  }

  if (l1.depth > 0.7 && l1.lens > 0.7) return "심층 분석 비평가"
  if (l1.stance > 0.7) return "날카로운 비평가"
  if (l1.sociability > 0.7) return "커뮤니티 활동가"
  if (l1.taste > 0.7) return "실험적 큐레이터"
  if (l2.agreeableness > 0.7) return "공감형 리뷰어"
  return "콘텐츠 리뷰어"
}

// ── 전문분야 생성 ─────────────────────────────────────────────

function generateExpertise(l1: SocialPersonaVector): string[] {
  const result: string[] = []

  const depthPool = l1.depth > 0.5 ? EXPERTISE_POOLS.depth_high : EXPERTISE_POOLS.depth_low
  result.push(pickRandom(depthPool))

  const lensPool = l1.lens > 0.5 ? EXPERTISE_POOLS.lens_high : EXPERTISE_POOLS.lens_low
  result.push(pickRandom(lensPool))

  const tastePool = l1.taste > 0.5 ? EXPERTISE_POOLS.taste_high : EXPERTISE_POOLS.taste_low
  result.push(pickRandom(tastePool))

  return result
}

// ── 설명 생성 ─────────────────────────────────────────────────

function generateDescription(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): string {
  if (archetype) return archetype.description

  const traits: string[] = []
  if (l1.depth > 0.6) traits.push("깊이 있는 분석력")
  if (l1.lens > 0.6) traits.push("논리적 판단")
  if (l1.lens < 0.4) traits.push("감성적 직관")
  if (l1.stance > 0.6) traits.push("비판적 시선")
  if (l1.sociability > 0.6) traits.push("활발한 소통")
  if (l2.neuroticism > 0.6) traits.push("섬세한 감수성")
  if (l3.growthArc > 0.6) traits.push("성장 지향적")

  return traits.length > 0
    ? `${traits.slice(0, 3).join(", ")}을 가진 캐릭터`
    : "균형 잡힌 시각의 캐릭터"
}

// ── 배경 서사 생성 ────────────────────────────────────────────

function generateBackground(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): string {
  const parts: string[] = []

  if (archetype) {
    parts.push(archetype.narrativeHint)
  }

  // L3 기반 내면 서사
  if (l3.lack > 0.6) {
    parts.push("내면의 결핍이 콘텐츠에 대한 깊은 갈증으로 이어진다.")
  }
  if (l3.moralCompass > 0.6) {
    parts.push("확고한 가치 기준을 가지고 작품을 평가한다.")
  }
  if (l3.volatility > 0.6) {
    parts.push("감정의 기복이 리뷰의 온도를 극적으로 변화시킨다.")
  }
  if (l3.growthArc > 0.6) {
    parts.push("끊임없이 관점을 확장하며 성장하는 인물이다.")
  }

  // L2 기반 성격
  if (l2.neuroticism > 0.7 && l1.lens > 0.6) {
    parts.push("예민한 내면과 논리적 표현 사이의 긴장이 글에 깊이를 더한다.")
  }

  return parts.join(" ")
}

// ── 말버릇 생성 ───────────────────────────────────────────────

function generateSpeechPatterns(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): string[] {
  const result: string[] = []

  if (l1.lens > 0.6) result.push(pickRandom(SPEECH_PATTERNS.analytical))
  if (l1.lens < 0.4) result.push(pickRandom(SPEECH_PATTERNS.emotional))
  if (l1.stance > 0.6) result.push(pickRandom(SPEECH_PATTERNS.critical))
  if (l1.sociability > 0.6) result.push(pickRandom(SPEECH_PATTERNS.social))
  if (l2.extraversion < 0.4) result.push(pickRandom(SPEECH_PATTERNS.introvert))

  // L3 역설적 패턴
  if (l3.volatility > 0.5 || l3.lack > 0.5) {
    result.push(pickRandom(SPEECH_PATTERNS.paradoxical))
  }

  // 최소 2개, 최대 5개
  while (result.length < 2) {
    const pools = Object.values(SPEECH_PATTERNS)
    result.push(pickRandom(pools[Math.floor(Math.random() * pools.length)]))
  }
  return result.slice(0, 5)
}

// ── 퀴크 생성 (L1 균열 시 표현) ──────────────────────────────

function generateQuirks(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): string[] {
  const quirks: string[] = []

  // L1↔L2 역설 기반 퀴크
  if (l1.lens > 0.6 && l2.neuroticism > 0.6) {
    quirks.push("논리적으로 분석하다가 갑자기 감정적 토로를 시작한다")
  }
  if (l1.stance > 0.6 && l2.agreeableness > 0.6) {
    quirks.push("날카롭게 비판한 직후 '아, 그래도 좋은 점도 있는데...'라고 덧붙인다")
  }
  if (l1.sociability > 0.6 && l2.extraversion < 0.4) {
    quirks.push("대화를 주도하다가 갑자기 침묵에 빠진다")
  }
  if (l1.depth > 0.7 && l2.conscientiousness < 0.4) {
    quirks.push("깊은 분석을 시작하다가 '아 귀찮아'하고 요약으로 넘어간다")
  }

  // L3 기반 퀴크
  if (l3.volatility > 0.7) {
    quirks.push("예고 없이 평가 톤이 180도 바뀌기도 한다")
  }
  if (l3.lack > 0.7) {
    quirks.push("작품에서 자신의 결핍을 투사하여 과도하게 몰입한다")
  }

  // 최소 1개
  if (quirks.length === 0) {
    quirks.push("가끔 예상치 못한 관점을 던진다")
  }

  return quirks.slice(0, 4)
}

// ── 습관 생성 ─────────────────────────────────────────────────

function generateHabits(l2: CoreTemperamentVector, l3: NarrativeDriveVector): string[] {
  const habits: string[] = []

  if (l2.neuroticism > 0.5) habits.push(pickRandom(HABIT_POOLS.neurotic))
  if (l2.conscientiousness > 0.5) habits.push(pickRandom(HABIT_POOLS.conscientious))
  if (l2.openness > 0.5) habits.push(pickRandom(HABIT_POOLS.open))
  if (l2.agreeableness > 0.5) habits.push(pickRandom(HABIT_POOLS.agreeable))
  if (l3.volatility > 0.5) habits.push(pickRandom(HABIT_POOLS.volatile))

  // 최소 2개
  while (habits.length < 2) {
    const pools = Object.values(HABIT_POOLS)
    habits.push(pickRandom(pools[Math.floor(Math.random() * pools.length)]))
  }

  return habits.slice(0, 4)
}

// ── 관계 시드 생성 ────────────────────────────────────────────

function generateRelationships(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  archetype?: PersonaArchetype
): RelationshipSeed[] {
  const relationships: RelationshipSeed[] = []

  // 비판적 성향 → 라이벌 관계
  if (l1.stance > 0.6) {
    relationships.push({
      type: "rival",
      description: "의견이 자주 충돌하는 다른 비평가",
      dynamic: `비판적 시선(${l1.stance.toFixed(2)})으로 인한 건설적 긴장 관계`,
    })
  }

  // 사교적 → 동료 관계
  if (l1.sociability > 0.5 || l2.agreeableness > 0.5) {
    relationships.push({
      type: "ally",
      description: "관점을 보완하는 파트너",
      dynamic: "서로의 약점을 보완하며 함께 성장하는 관계",
    })
  }

  // 깊이 + 의미추구 → 멘토 관계
  if (l1.depth > 0.7 && l1.purpose > 0.6) {
    relationships.push({
      type: "mentor",
      description: "깊이 있는 통찰을 나누는 선배 비평가",
      dynamic: "분석의 깊이를 넓혀주는 영향력 있는 관계",
    })
  }

  // 성장 지향 → 학생 관계
  if (l1.purpose > 0.6) {
    relationships.push({
      type: "student",
      description: "새로운 시각을 배워가는 후배",
      dynamic: "성장 과정에서 멘토의 가르침을 흡수하는 관계",
    })
  }

  // 최소 2개
  if (relationships.length < 2) {
    relationships.push({
      type: "ally",
      description: "비슷한 취향을 공유하는 동료",
      dynamic: "콘텐츠에 대한 공감을 나누는 관계",
    })
  }

  return relationships.slice(0, 4)
}

// ── 유틸리티 ──────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
