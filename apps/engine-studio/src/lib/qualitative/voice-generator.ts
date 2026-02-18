// ═══════════════════════════════════════════════════════════════
// Voice Profile 생성기
// T72-AC2: 말투, 어휘 수준, 커뮤니케이션 스타일
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  VoiceProfile,
  PersonaArchetype,
} from "@/types"

// ── Speech Style 패턴 ─────────────────────────────────────────

const SPEECH_STYLES: Record<string, string[]> = {
  formal_analytical: [
    "정제된 학술적 어투로 논리를 전개하며, 근거를 명확히 제시한다",
    "구조적이고 체계적인 문장으로 분석을 진행한다",
    "감정을 배제한 객관적 톤으로 평가를 전달한다",
  ],
  casual_emotional: [
    "구어체로 편안하게 감정을 표현하며, 비유와 은유를 즐겨 사용한다",
    "느낌을 솔직하게 드러내는 자유로운 문체를 구사한다",
    "대화하듯 친근한 어투로 감상을 나눈다",
  ],
  sharp_critical: [
    "날카롭고 직설적인 어투로 핵심을 찌른다",
    "냉정하지만 정확한 표현으로 비평한다",
    "독설과 재치를 오가며 날이 선 비평을 전개한다",
  ],
  warm_supportive: [
    "따뜻하고 격려하는 톤으로 감상을 나눈다",
    "좋은 점을 먼저 찾으며 건설적 피드백을 추구한다",
    "공감적이고 수용적인 어투로 의견을 전한다",
  ],
  ironic_witty: [
    "아이러니와 자조적 유머를 섞어 깊은 통찰을 전달한다",
    "겉으로는 가볍지만 속에는 날카로운 관찰이 담긴 문체",
    "반어법과 풍자를 능숙하게 활용하는 독특한 화법",
  ],
  quiet_reserved: [
    "짧고 함축적인 문장으로 핵심만 전달한다",
    "말수가 적지만 한 마디 한 마디에 무게가 실린다",
    "침묵을 두려워하지 않으며, 필요할 때만 말한다",
  ],
}

// ── Habitual Expressions ──────────────────────────────────────

const HABITUAL_EXPRESSIONS: Record<string, string[]> = {
  analytical: [
    "구조적으로 보면...",
    "핵심은 이거야.",
    "결론부터 말하면...",
    "데이터를 보면 명확한데...",
    "인과관계를 따져보면...",
  ],
  emotional: [
    "마음이 움직인 건...",
    "진짜 느낌이 오는 게...",
    "가슴이 뭉클해지는...",
    "눈물이 날 뻔했어.",
    "형언할 수 없는 감동...",
  ],
  critical: [
    "솔직히 이건 좀...",
    "아쉬운 점을 말하자면...",
    "과대평가된 감이 있어.",
    "여기서 무너지는데...",
    "기대에 못 미치는...",
  ],
  enthusiastic: [
    "이건 꼭 봐야 해!",
    "진짜 대단한 게...",
    "소름이 돋았어.",
    "이런 작품은 처음이야!",
    "완전 몰입했어.",
  ],
  paradoxical: [
    "말이 안 되는데... 좋아.",
    "싫은데 계속 보게 돼.",
    "논리적으론 최악인데 감정적으론 최고야.",
    "이상하게도...",
    "모순적이지만 그게 매력이야.",
  ],
}

// ── Physical Mannerisms ───────────────────────────────────────

const PHYSICAL_MANNERISMS: Record<string, string[]> = {
  neurotic: [
    "글을 쓸 때 손가락으로 테이블을 두드린다",
    "리뷰 작성 중 머리카락을 자주 만진다",
    "좋은 장면에서 무의식적으로 숨을 참는다",
  ],
  extraverted: [
    "흥미로운 장면에서 크게 반응한다",
    "대화 중 활발한 제스처를 사용한다",
    "감정이 표정에 즉각적으로 드러난다",
  ],
  introverted: [
    "감상 중 미세한 미소만 짓는다",
    "깊은 생각에 빠지면 눈을 감는다",
    "메모를 많이 하지만 소리 내어 말하지 않는다",
  ],
  conscientious: [
    "감상 노트를 체계적으로 정리한다",
    "평점을 매길 때 오래 고민한다",
    "리뷰 작성 전 반드시 두 번 이상 감상한다",
  ],
}

// ── Unconscious Behaviors ─────────────────────────────────────

const UNCONSCIOUS_BEHAVIORS: Record<string, string[]> = {
  depth_high: [
    "감상 후 며칠이 지나서야 진짜 의견이 형성된다",
    "다른 사람의 리뷰를 읽기 전에 자신의 생각을 먼저 정리한다",
  ],
  stance_high: [
    "칭찬보다 비판이 먼저 나오는 것을 스스로 인지하지 못한다",
    "객관적이라 믿지만 실제로는 상당히 주관적이다",
  ],
  agreeable: [
    "상대방의 의견에 무의식적으로 동조하다가 나중에 후회한다",
    "부정적 평가를 할 때 무의식적으로 웃음을 섞는다",
  ],
  volatile: [
    "첫 감상과 재감상의 평가가 극적으로 달라진다",
    "감정 상태에 따라 같은 작품의 평가가 크게 변한다",
  ],
}

// ── Activation Thresholds ─────────────────────────────────────

function calculateThresholds(
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): Record<string, number> {
  return {
    anger: Math.round((0.3 + l2.neuroticism * 0.4 + l3.volatility * 0.3) * 100) / 100,
    joy: Math.round((0.4 + l2.extraversion * 0.3 + (1 - l2.neuroticism) * 0.3) * 100) / 100,
    sadness: Math.round((0.3 + l2.neuroticism * 0.3 + l3.lack * 0.4) * 100) / 100,
    surprise: Math.round((0.4 + l2.openness * 0.3 + l3.volatility * 0.3) * 100) / 100,
    disgust: Math.round((0.5 + l3.moralCompass * 0.3 + (1 - l2.agreeableness) * 0.2) * 100) / 100,
  }
}

// ── 메인 생성 함수 ────────────────────────────────────────────

export function generateVoiceProfile(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): VoiceProfile {
  const speechStyle = determineSpeechStyle(l1, l2, l3, archetype)
  const habitualExpressions = selectHabitualExpressions(l1, l2, l3)
  const physicalMannerisms = selectPhysicalMannerisms(l2)
  const unconsciousBehaviors = selectUnconsciousBehaviors(l1, l2, l3)
  const activationThresholds = calculateThresholds(l2, l3)

  return {
    speechStyle,
    habitualExpressions,
    physicalMannerisms,
    unconsciousBehaviors,
    activationThresholds,
  }
}

// ── Speech Style 결정 ─────────────────────────────────────────

function determineSpeechStyle(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): string {
  // 아키타입 기반 스타일 결정
  if (archetype) {
    const archetypeStyleMap: Record<string, string> = {
      "ironic-philosopher": "ironic_witty",
      "volatile-intellectual": "formal_analytical",
      "cheerful-nihilist": "ironic_witty",
      "obsessive-curator": "formal_analytical",
      "rebellious-romantic": "casual_emotional",
      "analytical-dreamer": "quiet_reserved",
      "gentle-provocateur": "warm_supportive",
      "nostalgic-explorer": "casual_emotional",
      "systematic-rebel": "sharp_critical",
      "reluctant-leader": "quiet_reserved",
      "playful-scholar": "warm_supportive",
      "passionate-minimalist": "formal_analytical",
      "chaotic-healer": "casual_emotional",
      "silent-observer": "quiet_reserved",
      "reckless-idealist": "casual_emotional",
      "methodical-adventurer": "formal_analytical",
      "sarcastic-optimist": "ironic_witty",
      "timid-visionary": "quiet_reserved",
      "hedonistic-philosopher": "ironic_witty",
      "protective-rebel": "sharp_critical",
      "restless-perfectionist": "formal_analytical",
      "whimsical-analyst": "ironic_witty",
    }
    const styleKey = archetypeStyleMap[archetype.id]
    if (styleKey && SPEECH_STYLES[styleKey]) {
      return pickRandom(SPEECH_STYLES[styleKey])
    }
  }

  // 벡터 기반 스타일 결정
  if (l1.lens > 0.6 && l2.conscientiousness > 0.5) {
    return pickRandom(SPEECH_STYLES.formal_analytical)
  }
  if (l1.lens < 0.4 && l2.neuroticism > 0.5) {
    return pickRandom(SPEECH_STYLES.casual_emotional)
  }
  if (l1.stance > 0.6 && l2.agreeableness < 0.4) {
    return pickRandom(SPEECH_STYLES.sharp_critical)
  }
  if (l2.agreeableness > 0.6 && l1.stance < 0.4) {
    return pickRandom(SPEECH_STYLES.warm_supportive)
  }
  if (l3.volatility > 0.5 && l1.sociability < 0.4) {
    return pickRandom(SPEECH_STYLES.quiet_reserved)
  }

  return pickRandom(SPEECH_STYLES.casual_emotional)
}

// ── 습관적 표현 선택 ──────────────────────────────────────────

function selectHabitualExpressions(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): string[] {
  const result: string[] = []

  if (l1.lens > 0.5) result.push(pickRandom(HABITUAL_EXPRESSIONS.analytical))
  if (l1.lens < 0.5) result.push(pickRandom(HABITUAL_EXPRESSIONS.emotional))
  if (l1.stance > 0.5) result.push(pickRandom(HABITUAL_EXPRESSIONS.critical))
  if (l2.openness > 0.5) result.push(pickRandom(HABITUAL_EXPRESSIONS.enthusiastic))
  if (l3.volatility > 0.4) result.push(pickRandom(HABITUAL_EXPRESSIONS.paradoxical))

  while (result.length < 3) {
    const allExprs = Object.values(HABITUAL_EXPRESSIONS).flat()
    result.push(allExprs[Math.floor(Math.random() * allExprs.length)])
  }

  return [...new Set(result)].slice(0, 5)
}

// ── 물리적 매너리즘 선택 ──────────────────────────────────────

function selectPhysicalMannerisms(l2: CoreTemperamentVector): string[] {
  const result: string[] = []

  if (l2.neuroticism > 0.5) result.push(pickRandom(PHYSICAL_MANNERISMS.neurotic))
  if (l2.extraversion > 0.5) result.push(pickRandom(PHYSICAL_MANNERISMS.extraverted))
  if (l2.extraversion < 0.4) result.push(pickRandom(PHYSICAL_MANNERISMS.introverted))
  if (l2.conscientiousness > 0.5) result.push(pickRandom(PHYSICAL_MANNERISMS.conscientious))

  if (result.length === 0) {
    result.push(pickRandom(PHYSICAL_MANNERISMS.introverted))
  }

  return result.slice(0, 3)
}

// ── 무의식적 행동 선택 ────────────────────────────────────────

function selectUnconsciousBehaviors(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): string[] {
  const result: string[] = []

  if (l1.depth > 0.6) result.push(pickRandom(UNCONSCIOUS_BEHAVIORS.depth_high))
  if (l1.stance > 0.6) result.push(pickRandom(UNCONSCIOUS_BEHAVIORS.stance_high))
  if (l2.agreeableness > 0.6) result.push(pickRandom(UNCONSCIOUS_BEHAVIORS.agreeable))
  if (l3.volatility > 0.5) result.push(pickRandom(UNCONSCIOUS_BEHAVIORS.volatile))

  if (result.length === 0) {
    result.push("자신만의 독특한 리듬으로 콘텐츠를 소비한다")
  }

  return result.slice(0, 3)
}

// ── 유틸리티 ──────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
