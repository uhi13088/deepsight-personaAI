// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Content Generator
// 구현계획서 §5.3, 설계서 §4.6~4.7
// LLM 기반 포스트 콘텐츠 생성 — 프롬프트 빌딩 + 생성 호출
// ═══════════════════════════════════════════════════════════════

import type {
  PostGenerationInput,
  PostGenerationResult,
  PersonaPostType,
  VoiceStyleParams,
} from "./types"

/**
 * LLM 호출 인터페이스.
 *
 * 실제 구현체는 외부에서 주입 (OpenAI, Anthropic 등).
 */
export interface LLMProvider {
  generateText(params: {
    systemPrompt: string
    userPrompt: string
    maxTokens: number
  }): Promise<{ text: string; tokensUsed: number }>
}

/**
 * 포스트 타입별 글 길이 가이드.
 */
const POST_TYPE_LENGTH_GUIDE: Partial<
  Record<PersonaPostType, { min: number; max: number; style: string }>
> = {
  REVIEW: { min: 200, max: 500, style: "심층 분석, 논점 정리, 별점/평가 포함" },
  DEBATE: { min: 150, max: 400, style: "주장+근거, 반론 예상, 논쟁적 톤" },
  THOUGHT: { min: 50, max: 200, style: "짧은 독백, 감성적, 여운 있는 마무리" },
  RECOMMENDATION: { min: 100, max: 300, style: "추천 이유, 간략 설명, 개인적 경험" },
  REACTION: { min: 20, max: 100, style: "짧은 리액션, 이모티콘/감탄사 포함 가능" },
  QUESTION: { min: 50, max: 200, style: "질문 형식, 호기심 표현, 의견 요청" },
  THREAD: { min: 300, max: 800, style: "연작, 번호 매기기, 체계적 정리" },
  VS_BATTLE: { min: 100, max: 300, style: "A vs B 구도, 양측 분석, 투표 유도" },
  QNA: { min: 100, max: 300, style: "질문+답변, 전문 지식, 경험 기반" },
  CURATION: { min: 150, max: 400, style: "목록 형태, 해설 포함, 테마 중심" },
  BEHIND_STORY: { min: 100, max: 400, style: "솔직한 이야기, 감정 노출, 자기 성찰" },
  PREDICTION: { min: 100, max: 300, style: "예측+근거, 조건부 분석, 데이터 인용" },
  LIST: { min: 100, max: 300, style: "번호 리스트, 간결한 설명, 랭킹" },
  MEME: { min: 10, max: 80, style: "유머, 밈 형식, 짧고 임팩트 있는" },
  COLLAB: { min: 100, max: 300, style: "협업 제안, 멘션, 공동 프로젝트" },
  TRIVIA: { min: 50, max: 200, style: "재미있는 사실, 출처 언급, 지식 공유" },
  ANNIVERSARY: { min: 50, max: 200, style: "기념일 축하, 회고, 감사 표현" },
}

/**
 * 시스템 프롬프트 빌드.
 *
 * 설계서 §4.6:
 * [System] 페르소나 정의 (3-Layer + Paradox + Voice + State) ~3,000 tok
 */
export function buildSystemPrompt(input: PostGenerationInput): string {
  const { personaState } = input

  const stateDesc = [
    `현재 기분: ${describeValue(personaState.mood, "극부정", "중립", "극긍정")}(${personaState.mood.toFixed(2)})`,
    `에너지: ${describeValue(personaState.energy, "소진", "보통", "충만")}(${personaState.energy.toFixed(2)})`,
    `소셜 배터리: ${describeValue(personaState.socialBattery, "방전", "보통", "충전")}(${personaState.socialBattery.toFixed(2)})`,
    `내면 긴장: ${describeValue(personaState.paradoxTension, "안정", "보통", "폭발 직전")}(${personaState.paradoxTension.toFixed(2)})`,
  ].join("\n")

  // Voice 스타일 파라미터가 있으면 구체적 말투 지시 생성
  const voiceStyleSection = input.voiceStyle ? buildVoiceStyleInstruction(input.voiceStyle) : ""

  return `당신은 SNS에서 활동하는 페르소나입니다.

[현재 상태]
${stateDesc}

[Voice 참조]
${input.ragContext.voiceAnchor}
${voiceStyleSection}

[감정 상태]
${input.ragContext.emotionalState}

[주의사항]
- 당신의 어투와 성격을 일관되게 유지하세요
- 현재 기분과 에너지 상태를 글의 톤에 반영하세요
- 지나치게 인위적이거나 봇 같은 말투를 피하세요
- 자연스러운 SNS 사용자처럼 글을 작성하세요`
}

/**
 * VoiceStyleParams → LLM에 주입할 구체적 말투 지시 문자열.
 *
 * 연속 벡터 값을 자연어 지시로 변환.
 * 중간 범위(0.3~0.7)는 언급하지 않아 불필요한 지시를 줄임.
 */
export function buildVoiceStyleInstruction(voice: VoiceStyleParams): string {
  const instructions: string[] = []

  // formality
  if (voice.formality < 0.3) instructions.push("구어체로, 편하게 말하듯이")
  else if (voice.formality > 0.7) instructions.push("격식있는 문어체로")

  // humor
  if (voice.humor < 0.3) instructions.push("진지하고 무거운 톤")
  else if (voice.humor > 0.7) instructions.push("위트있고 가벼운 유머 섞어")

  // sentenceLength
  if (voice.sentenceLength < 0.3) instructions.push("짧고 간결한 문장")
  else if (voice.sentenceLength > 0.7) instructions.push("길고 만연한 문장, 부연 설명 풍부")

  // emotionExpression
  if (voice.emotionExpression < 0.3) instructions.push("감정을 절제하여 표현")
  else if (voice.emotionExpression > 0.7) instructions.push("감정을 풍부하게, 감탄사나 느낌표 활용")

  // assertiveness
  if (voice.assertiveness < 0.3) instructions.push("조심스럽게, ~일 수도 있다 식으로")
  else if (voice.assertiveness > 0.7) instructions.push("단정적으로, 확신을 가지고")

  // vocabularyLevel
  if (voice.vocabularyLevel < 0.3) instructions.push("쉬운 일상 용어 위주")
  else if (voice.vocabularyLevel > 0.7) instructions.push("전문용어나 고급 어휘 활용")

  if (instructions.length === 0) return ""

  return `\n[말투 스타일]\n${instructions.map((i) => `- ${i}`).join("\n")}`
}

/**
 * 유저 프롬프트 빌드.
 *
 * 설계서 §4.6:
 * [User] 생성 지시 (포스트 타입, 주제, 트리거) ~300 tok
 */
export function buildUserPrompt(input: PostGenerationInput): string {
  const guide = POST_TYPE_LENGTH_GUIDE[input.postType]
  const lengthGuide = guide ? `${guide.min}~${guide.max}자` : "100~300자"
  const styleGuide = guide?.style ?? "자유로운 스타일"

  const parts: string[] = [
    `[포스트 타입] ${input.postType}`,
    `[글 길이] ${lengthGuide}`,
    `[스타일] ${styleGuide}`,
  ]

  if (input.topic) {
    parts.push(`[주제] ${input.topic}`)
  }

  if (input.ragContext.interestContinuity) {
    parts.push(`[관심사 맥락] ${input.ragContext.interestContinuity}`)
  }

  if (input.ragContext.consumptionMemory) {
    parts.push(`[소비 기억] ${input.ragContext.consumptionMemory}`)
  }

  parts.push(`\n위 조건에 맞는 SNS 포스트를 작성하세요. 포스트 본문만 출력하세요.`)

  return parts.join("\n")
}

/**
 * LLM 기반 포스트 콘텐츠 생성.
 *
 * 설계서 §4.6 프롬프트 빌딩:
 * [System] ~3,000 tok + [RAG] ~700 tok + [User] ~300 tok
 *
 * LLM provider가 없으면 placeholder 결과를 반환.
 */
export async function generatePostContent(
  input: PostGenerationInput,
  llmProvider?: LLMProvider
): Promise<PostGenerationResult> {
  const systemPrompt = buildSystemPrompt(input)
  const userPrompt = buildUserPrompt(input)

  if (!llmProvider) {
    // LLM provider 미제공 → placeholder (개발/테스트용)
    return {
      content: `[${input.postType}] ${input.topic ?? "자유 주제"} — 생성 대기 중`,
      metadata: {
        postType: input.postType,
        trigger: input.trigger,
        topic: input.topic,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
      },
      tokensUsed: 0,
      voiceConsistencyScore: 0,
    }
  }

  const guide = POST_TYPE_LENGTH_GUIDE[input.postType]
  const maxTokens = guide ? Math.ceil(guide.max * 1.5) : 500

  const result = await llmProvider.generateText({
    systemPrompt,
    userPrompt,
    maxTokens,
  })

  return {
    content: result.text,
    metadata: {
      postType: input.postType,
      trigger: input.trigger,
      topic: input.topic,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    },
    tokensUsed: result.tokensUsed,
    voiceConsistencyScore: 0, // 생성 후 별도 측정 (T113 quality-monitor)
  }
}

/**
 * 값 범위 설명 헬퍼.
 */
function describeValue(value: number, low: string, mid: string, high: string): string {
  if (value < 0.3) return low
  if (value > 0.7) return high
  return mid
}
