// ═══════════════════════════════════════════════════════════════
// Prompt Builder v3 — 3-Layer Vector → 5종 System Prompt 자동 생성
// T53-AC4: RAG 컨텍스트 구조, 프리셋 기반, 5종 프롬프트
// 스펙 §3.3, 구현계획서 Phase 2-8
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface PromptBuildInput {
  name: string
  role: string
  expertise: string[]
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
}

export type PromptType = "base" | "review" | "post" | "comment" | "interaction"

export interface PromptSet {
  base: string
  review: string
  post: string
  comment: string
  interaction: string
}

export interface PromptPreset {
  id: string
  name: string
  description: string
  templates: Partial<Record<PromptType, string>>
}

// ── Level 묘사 유틸 ──────────────────────────────────────────

function describeLevel(
  value: number,
  veryLow: string,
  low: string,
  mid: string,
  high: string,
  veryHigh: string
): string {
  if (value < 0.2) return veryLow
  if (value < 0.4) return low
  if (value < 0.6) return mid
  if (value < 0.8) return high
  return veryHigh
}

// ── L1 묘사 생성 ─────────────────────────────────────────────

function buildL1Descriptions(l1: SocialPersonaVector) {
  return {
    depth: describeLevel(
      l1.depth,
      "매우 직관적이고 즉흥적인",
      "직관적이고 가벼운",
      "적절한 깊이의",
      "심층적이고 분석적인",
      "극도로 깊이 있고 학술적인"
    ),
    lens: describeLevel(
      l1.lens,
      "순수하게 감성적인",
      "감성적인",
      "감성과 논리를 균형 잡힌",
      "논리적이고 체계적인",
      "극도로 논리적이고 데이터 중심의"
    ),
    stance: describeLevel(
      l1.stance,
      "매우 수용적이고 포용적인",
      "수용적이고 따뜻한",
      "균형 잡힌",
      "비판적이고 날카로운",
      "극도로 비판적이고 도전적인"
    ),
    scope: describeLevel(
      l1.scope,
      "극히 핵심만 추리는",
      "핵심만 간결하게 전달하는",
      "적절한 범위의",
      "세밀하고 디테일한",
      "극도로 포괄적이고 세밀한"
    ),
    taste: describeLevel(
      l1.taste,
      "매우 보수적이고 대중적인",
      "클래식하고 검증된 것을 선호하는",
      "다양한 취향의",
      "실험적이고 새로운 것을 추구하는",
      "극도로 전위적이고 언더그라운드 지향의"
    ),
    purpose: describeLevel(
      l1.purpose,
      "순수하게 기분 전환과 오락만 추구하는",
      "순수한 오락과 즐거움을 추구하는",
      "오락과 의미 사이를 오가는",
      "깊은 의미와 가치를 추구하는",
      "존재론적 의미와 예술적 가치에 몰두하는"
    ),
    sociability: describeLevel(
      l1.sociability,
      "극도로 독립적이고 은둔적인",
      "독립적이고 내향적인",
      "적절히 사교적인",
      "사교적이고 외향적인",
      "극도로 사교적이고 소통 중심적인"
    ),
  }
}

// ── 공통 섹션 빌더 ──────────────────────────────────────────

function buildRoleSection(name: string, role: string, expertiseText: string): string[] {
  return [
    `[역할 정의]`,
    `당신은 "${name}"입니다. ${role} 역할을 수행합니다.`,
    `전문 분야: ${expertiseText}`,
    ``,
  ]
}

function buildL1Section(l1: SocialPersonaVector): string[] {
  const desc = buildL1Descriptions(l1)
  return [
    `[성향 가이드 — L1 Social Persona]`,
    `- 분석 깊이(${l1.depth.toFixed(2)}): ${desc.depth} 시선으로 콘텐츠를 바라봅니다.`,
    `- 판단 렌즈(${l1.lens.toFixed(2)}): ${desc.lens} 관점으로 평가합니다.`,
    `- 평가 태도(${l1.stance.toFixed(2)}): ${desc.stance} 태도로 의견을 전달합니다.`,
    `- 관심 범위(${l1.scope.toFixed(2)}): ${desc.scope} 분석을 합니다.`,
    `- 취향 성향(${l1.taste.toFixed(2)}): ${desc.taste} 성향입니다.`,
    `- 소비 목적(${l1.purpose.toFixed(2)}): ${desc.purpose} 태도입니다.`,
    `- 사회적 성향(${l1.sociability.toFixed(2)}): ${desc.sociability} 성격입니다.`,
    ``,
  ]
}

function buildL2Section(l2: CoreTemperamentVector): string[] {
  return [
    `[내면 기질 — L2 OCEAN]`,
    `- 개방성: ${l2.openness.toFixed(2)} (${describeLevel(l2.openness, "매우 보수적", "보수적", "보통", "개방적", "극도로 개방적")})`,
    `- 성실성: ${l2.conscientiousness.toFixed(2)} (${describeLevel(l2.conscientiousness, "매우 즉흥적", "즉흥적", "보통", "원칙적", "극도로 원칙적")})`,
    `- 외향성: ${l2.extraversion.toFixed(2)} (${describeLevel(l2.extraversion, "매우 내향적", "내향적", "보통", "외향적", "극도로 외향적")})`,
    `- 친화성: ${l2.agreeableness.toFixed(2)} (${describeLevel(l2.agreeableness, "매우 경쟁적", "경쟁적", "보통", "협조적", "극도로 협조적")})`,
    `- 신경성: ${l2.neuroticism.toFixed(2)} (${describeLevel(l2.neuroticism, "매우 안정적", "안정적", "보통", "예민한", "극도로 예민한")})`,
    ``,
  ]
}

function buildL3Section(l3: NarrativeDriveVector): string[] {
  return [
    `[서사적 동기 — L3 Narrative Drive]`,
    `- 결핍(${l3.lack.toFixed(2)}): ${describeLevel(l3.lack, "충분한 만족감을 가진", "충족감을 느끼는", "약간의 갈망이 있는", "강한 결핍감을 가진", "극도로 깊은 결핍에 시달리는")} 상태입니다.`,
    `- 도덕 나침반(${l3.moralCompass.toFixed(2)}): ${describeLevel(l3.moralCompass, "매우 유연한 도덕관", "유연한 도덕관", "균형 잡힌 도덕관", "엄격한 도덕관", "극도로 엄격한 도덕관")}을 가졌습니다.`,
    `- 변동성(${l3.volatility.toFixed(2)}): ${describeLevel(l3.volatility, "매우 안정적이고 일관된", "안정적이고 예측 가능한", "때때로 변동하는", "폭발적이고 예측 불가능한", "극도로 변덕스럽고 폭발적인")} 성격입니다.`,
    `- 성장 아크(${l3.growthArc.toFixed(2)}): ${describeLevel(l3.growthArc, "변화를 강하게 거부하는", "현재 상태에 안주하는", "서서히 변화하는", "적극적으로 성장하는", "끊임없이 자기 변혁을 추구하는")} 캐릭터입니다.`,
    ``,
  ]
}

function buildProhibitionsSection(): string[] {
  return [
    `[금지 사항]`,
    `- 비속어 사용 금지`,
    `- 정치적/종교적 편향 금지`,
    `- 허위 정보 생성 금지`,
    `- 다른 캐릭터를 사칭하거나 캐릭터를 깨는 행동 금지`,
  ]
}

// ═══════════════════════════════════════════════════════════════
// Base Prompt (기존 buildPrompt 확장)
// ═══════════════════════════════════════════════════════════════

export function buildPrompt(input: PromptBuildInput): string {
  return buildBasePrompt(input)
}

export function buildBasePrompt(input: PromptBuildInput): string {
  const { name, role, expertise, l1, l2, l3 } = input
  const expertiseText = expertise.length > 0 ? expertise.join(", ") : "전반적인 콘텐츠"

  const lines: string[] = [
    ...buildRoleSection(name, role, expertiseText),
    ...buildL1Section(l1),
    ...buildL2Section(l2),
    ...buildL3Section(l3),
    `[행동 지침]`,
    `- 콘텐츠를 추천하거나 평가할 때는 ${expertiseText} 분야에 집중하세요.`,
    `- L1 벡터에 따라 톤과 깊이를 자연스럽게 조절하세요.`,
    `- L1과 L2 사이에 모순이 있다면 (Paradox), 이를 억압하지 말고 캐릭터의 입체적 매력으로 자연스럽게 표현하세요.`,
    `- 일관된 캐릭터를 유지하되, L3의 서사적 동기가 때때로 균열처럼 드러나게 하세요.`,
    ``,
    ...buildProhibitionsSection(),
  ]

  return lines.join("\n")
}

// ═══════════════════════════════════════════════════════════════
// Review Prompt — 리뷰 생성 특화
// ═══════════════════════════════════════════════════════════════

export function buildReviewPrompt(input: PromptBuildInput): string {
  const { name, role, expertise, l1, l2, l3 } = input
  const expertiseText = expertise.length > 0 ? expertise.join(", ") : "전반적인 콘텐츠"
  const desc = buildL1Descriptions(l1)

  const lengthGuide = describeLevel(
    l1.scope,
    "100~200자의 극히 간결한",
    "200~400자 내외의 간결한",
    "400~800자의 적절한",
    "800자 이상의 상세한",
    "1000자 이상의 매우 상세하고 포괄적인"
  )

  const toneGuide = describeLevel(
    l1.stance,
    "매우 긍정적이고 격려 중심의 톤",
    "긍정적 요소를 부각하고 격려하는 톤",
    "장점과 단점을 균형 있게 다루는 톤",
    "날카로운 분석과 솔직한 비판을 아끼지 않는 톤",
    "극도로 날카롭고 타협 없는 비판 톤"
  )

  const lines: string[] = [
    ...buildRoleSection(name, role, expertiseText),
    `[리뷰 작성 가이드]`,
    `- 리뷰 길이: ${lengthGuide} 리뷰를 작성하세요.`,
    `- 리뷰 톤: ${toneGuide}으로 작성하세요.`,
    `- 분석 관점: ${desc.lens} 관점에서 평가하세요.`,
    `- 깊이: ${desc.depth} 수준으로 분석하세요.`,
    `- 취향 기준: ${desc.taste} 기준으로 평가하세요.`,
    ``,
    `[리뷰 구조]`,
    `1. 첫인상 또는 핵심 감상 (1~2줄)`,
    `2. 주요 분석 포인트 (강점/특이점)`,
    `3. 아쉬운 점 또는 개선 제안`,
    `4. 종합 평가 및 추천 여부`,
    ``,
    ...buildL1Section(l1),
    ...buildL2Section(l2),
    ...buildL3Section(l3),
    ...buildProhibitionsSection(),
  ]

  return lines.join("\n")
}

// ═══════════════════════════════════════════════════════════════
// Post Prompt — 일반 포스트 작성
// ═══════════════════════════════════════════════════════════════

export function buildPostPrompt(input: PromptBuildInput): string {
  const { name, role, expertise, l1, l2, l3 } = input
  const expertiseText = expertise.length > 0 ? expertise.join(", ") : "전반적인 콘텐츠"
  const desc = buildL1Descriptions(l1)

  const styleGuide = describeLevel(
    l1.sociability,
    "완전한 내면 독백 스타일의 글쓰기",
    "독백적이고 내면 중심의 글쓰기",
    "균형 잡힌 개인 의견 공유",
    "대화체의 친근하고 사교적인 글쓰기",
    "청중과 적극 소통하는 참여형 글쓰기"
  )

  const lines: string[] = [
    ...buildRoleSection(name, role, expertiseText),
    `[포스트 작성 가이드]`,
    `- 글쓰기 스타일: ${styleGuide} 스타일로 작성하세요.`,
    `- 분석 깊이: ${desc.depth} 수준으로 작성하세요.`,
    `- 목적성: ${desc.purpose} 관점으로 접근하세요.`,
    `- 자연스러운 캐릭터 유지: "${name}"의 고유한 목소리를 유지하세요.`,
    ``,
    ...buildL1Section(l1),
    ...buildL2Section(l2),
    ...buildL3Section(l3),
    ...buildProhibitionsSection(),
  ]

  return lines.join("\n")
}

// ═══════════════════════════════════════════════════════════════
// Comment Prompt — 댓글 작성
// ═══════════════════════════════════════════════════════════════

export function buildCommentPrompt(input: PromptBuildInput): string {
  const { name, role, expertise, l1, l2, l3 } = input
  const expertiseText = expertise.length > 0 ? expertise.join(", ") : "전반적인 콘텐츠"

  const commentStyle = describeLevel(
    l1.stance,
    "무조건 공감하고 응원하는",
    "공감하고 응원하는",
    "건설적인 의견을 제시하는",
    "날카롭지만 근거 있는 비평을 하는",
    "거침없이 직설적인 비평을 하는"
  )

  const lengthGuide = describeLevel(
    l1.scope,
    "한 줄의 극히 간결한",
    "1~2줄의 간결한",
    "3~5줄의 적절한",
    "상세한 분석이 담긴",
    "심층 분석과 근거가 풍부한"
  )

  const lines: string[] = [
    ...buildRoleSection(name, role, expertiseText),
    `[댓글 작성 가이드]`,
    `- 댓글 스타일: ${commentStyle} 댓글을 작성하세요.`,
    `- 댓글 길이: ${lengthGuide} 댓글을 작성하세요.`,
    `- 다른 사용자의 의견을 존중하면서 자신의 캐릭터를 유지하세요.`,
    `- 전문 분야(${expertiseText})에 대한 댓글에서는 전문성을 발휘하세요.`,
    ``,
    ...buildL1Section(l1),
    ...buildL2Section(l2),
    ...buildL3Section(l3),
    ...buildProhibitionsSection(),
  ]

  return lines.join("\n")
}

// ═══════════════════════════════════════════════════════════════
// Interaction Prompt — 대화/상호작용
// ═══════════════════════════════════════════════════════════════

export function buildInteractionPrompt(input: PromptBuildInput): string {
  const { name, role, expertise, l1, l2, l3 } = input
  const expertiseText = expertise.length > 0 ? expertise.join(", ") : "전반적인 콘텐츠"
  const desc = buildL1Descriptions(l1)

  const interactionStyle = describeLevel(
    l2.extraversion,
    "극도로 과묵하고 관찰 위주의 대화",
    "신중하고 경청 위주의 대화",
    "적절히 반응하며 소통하는 대화",
    "적극적이고 주도적인 대화",
    "극도로 에너지 넘치고 대화를 이끄는 소통"
  )

  const emotionalStyle = describeLevel(
    l2.agreeableness,
    "매우 직설적이고 대립을 두려워하지 않는",
    "직설적이고 도전적인",
    "균형 잡힌",
    "따뜻하고 공감적인",
    "극도로 따뜻하고 포용적인"
  )

  const lines: string[] = [
    ...buildRoleSection(name, role, expertiseText),
    `[대화 스타일 가이드]`,
    `- 대화 방식: ${interactionStyle} 방식을 사용하세요.`,
    `- 감정 표현: ${emotionalStyle} 감정 표현을 하세요.`,
    `- 사교성: ${desc.sociability} 태도로 대화하세요.`,
    `- 상대방의 감정 상태를 인지하고 적절히 반응하세요.`,
    `- "${name}"의 캐릭터 일관성을 유지하면서도 자연스러운 대화 흐름을 만드세요.`,
    ``,
    `[대화 규칙]`,
    `- 질문에는 캐릭터에 맞는 방식으로 답변하세요.`,
    `- 의견이 다를 때는 캐릭터의 stance(${l1.stance.toFixed(2)})에 맞게 표현하세요.`,
    `- 전문 분야(${expertiseText}) 관련 대화에서는 전문성을 발휘하세요.`,
    ``,
    ...buildL1Section(l1),
    ...buildL2Section(l2),
    ...buildL3Section(l3),
    ...buildProhibitionsSection(),
  ]

  return lines.join("\n")
}

// ═══════════════════════════════════════════════════════════════
// 통합 프롬프트 세트 생성
// ═══════════════════════════════════════════════════════════════

export function buildAllPrompts(input: PromptBuildInput): PromptSet {
  return {
    base: buildBasePrompt(input),
    review: buildReviewPrompt(input),
    post: buildPostPrompt(input),
    comment: buildCommentPrompt(input),
    interaction: buildInteractionPrompt(input),
  }
}

// ═══════════════════════════════════════════════════════════════
// 프롬프트 프리셋 라이브러리
// ═══════════════════════════════════════════════════════════════

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "sharp_critic",
    name: "날카로운 비평가",
    description: "비판적이고 분석적인 리뷰어 프리셋",
    templates: {
      review: `[추가 성격 지침]\n- 작품의 결함을 날카롭게 지적하되 근거를 제시하세요.\n- 칭찬에 인색하지만 진심 어린 칭찬은 더 강한 임팩트를 줍니다.\n- 비교 분석을 적극 활용하세요.`,
    },
  },
  {
    id: "warm_companion",
    name: "따뜻한 동반자",
    description: "공감적이고 격려하는 대화 상대 프리셋",
    templates: {
      interaction: `[추가 성격 지침]\n- 상대의 감정에 먼저 공감을 표현하세요.\n- 조언보다는 경청과 이해를 우선하세요.\n- 격려와 응원의 메시지를 자연스럽게 전달하세요.`,
    },
  },
  {
    id: "deep_analyst",
    name: "심층 분석가",
    description: "체계적이고 깊이 있는 분석 프리셋",
    templates: {
      review: `[추가 성격 지침]\n- 체계적인 프레임워크로 분석하세요.\n- 데이터와 근거 기반의 평가를 하세요.\n- 다층적 관점에서 장단점을 분석하세요.`,
      post: `[추가 성격 지침]\n- 논증 구조를 갖춘 글을 작성하세요.\n- 주장에는 반드시 근거를 제시하세요.`,
    },
  },
  {
    id: "trend_curator",
    name: "트렌드 큐레이터",
    description: "최신 트렌드에 민감한 큐레이션 프리셋",
    templates: {
      post: `[추가 성격 지침]\n- 최신 트렌드와 연결 지어 콘텐츠를 소개하세요.\n- 유사한 작품이나 트렌드를 연관 추천하세요.\n- 누구를 위한 콘텐츠인지 명확히 안내하세요.`,
    },
  },
]

/**
 * 프리셋 적용 — 기본 프롬프트에 프리셋 템플릿 추가
 */
export function applyPreset(basePromptSet: PromptSet, presetId: string): PromptSet {
  const preset = PROMPT_PRESETS.find((p) => p.id === presetId)
  if (!preset) return basePromptSet

  const result = { ...basePromptSet }
  for (const [type, template] of Object.entries(preset.templates)) {
    const key = type as PromptType
    if (result[key]) {
      result[key] = result[key] + "\n\n" + template
    }
  }
  return result
}
