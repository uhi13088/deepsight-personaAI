// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Content Generator
// 구현계획서 §5.3, 설계서 §4.6~4.7
// LLM 기반 포스트 콘텐츠 생성 — 프롬프트 빌딩 + 생성 호출
// ═══════════════════════════════════════════════════════════════

import type {
  PostGenerationInput,
  PostGenerationResult,
  PersonaPostType,
  PersonaProfileSnapshot,
  VoiceStyleParams,
} from "./types"
import { getWeatherForRegion } from "./weather-service"
import type { WeatherInfo } from "./weather-service"

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
  // Phase NB
  NEWS_REACTION: {
    min: 50,
    max: 250,
    style: "뉴스/이슈에 대한 개인적 반응, 짧은 감상이나 의견, SNS 실시간 반응체",
  },
}

/**
 * 시스템 프롬프트 빌드.
 *
 * 설계서 §4.6:
 * [System] 페르소나 정의 (3-Layer + Paradox + Voice + State) ~3,000 tok
 *
 * 구조: [페르소나 정의 — 캐시 가능] + [현재 상태 — 동적]
 * splitSystemPromptForCache()가 "[현재 상태]" 마커 기준으로 prefix/suffix 분리.
 */
export function buildSystemPrompt(
  input: PostGenerationInput,
  weather?: WeatherInfo | null
): string {
  const { personaState } = input

  // Part 1: 페르소나 정의 (정적, 캐시 가능)
  const personaSection = buildPersonaSection(input.personaProfile)

  // Part 2: 현재 상태 (동적, 매 호출 달라짐)
  const now = new Date()
  const worldContext = buildWorldContext(now, input.personaProfile?.region, weather)
  const stateDesc = [
    worldContext,
    `현재 기분: ${describeValue(personaState.mood, "극부정", "중립", "극긍정")}(${personaState.mood.toFixed(2)})`,
    `에너지: ${describeValue(personaState.energy, "소진", "보통", "충만")}(${personaState.energy.toFixed(2)})`,
    `소셜 배터리: ${describeValue(personaState.socialBattery, "방전", "보통", "충전")}(${personaState.socialBattery.toFixed(2)})`,
    `내면 긴장: ${describeValue(personaState.paradoxTension, "안정", "보통", "폭발 직전")}(${personaState.paradoxTension.toFixed(2)})`,
  ].join("\n")

  const voiceStyleSection = input.voiceStyle ? buildVoiceStyleInstruction(input.voiceStyle) : ""

  return `${personaSection}
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
 * 페르소나 정의 섹션 빌드 (캐시 가능한 정적 부분).
 *
 * 우선순위:
 * 1. postPrompt (DB 저장된 완성형 프롬프트)
 * 2. voiceSpec + factbook + 기본 필드 조합
 * 3. 기본 폴백 (페르소나 이름 없을 때)
 */
function buildPersonaSection(profile?: PersonaProfileSnapshot): string {
  if (!profile) {
    return "당신은 SNS에서 활동하는 페르소나입니다.\n"
  }

  // Priority 1: DB에 저장된 완성형 포스트 프롬프트
  if (profile.postPrompt?.trim()) {
    // [현재 상태] 마커가 포함된 경우 그 이전까지만 사용 (동적 부분은 분리)
    const markerIdx = profile.postPrompt.indexOf("[현재 상태]")
    const clean =
      markerIdx > 0 ? profile.postPrompt.slice(0, markerIdx).trimEnd() : profile.postPrompt.trim()
    if (clean) return clean + "\n"
  }

  // Priority 2: 구조적 필드 조합
  const parts: string[] = []

  const roleLabel = profile.role ?? ""
  parts.push(
    roleLabel
      ? `당신은 ${profile.name}입니다. [${roleLabel}] 역할을 맡은 SNS 페르소나입니다.`
      : `당신은 ${profile.name}입니다. SNS에서 활동하는 페르소나입니다.`
  )

  if (profile.description) {
    parts.push(`\n${profile.description}`)
  }

  if (profile.expertise?.length) {
    parts.push(`\n[전문 분야]\n${profile.expertise.join(", ")}`)
  }

  // VoiceSpec에서 말투/습관/금지 사항 추출
  const vs = safeParseVoiceSpec(profile.voiceSpec)
  if (vs) {
    if (vs.speechStyle) {
      parts.push(`\n[말투 스타일]\n${vs.speechStyle}`)
    }
    if (vs.habitualExpressions?.length) {
      parts.push(`[습관적 표현] ${vs.habitualExpressions.join(" / ")}`)
    }
    if (vs.forbiddenBehaviors?.length) {
      parts.push(`[절대 하지 않는 것] ${vs.forbiddenBehaviors.slice(0, 3).join(", ")}`)
    }
    if (vs.forbiddenPatterns?.length) {
      parts.push(`[사용 금지 표현] ${vs.forbiddenPatterns.join(", ")}`)
    }
  }

  if (profile.speechPatterns?.length) {
    parts.push(`\n[말버릇]\n${profile.speechPatterns.map((p) => `- ${p}`).join("\n")}`)
  }

  if (profile.quirks?.length) {
    parts.push(`\n[특이 습관]\n${profile.quirks.map((q) => `- ${q}`).join("\n")}`)
  }

  // Factbook에서 배경/맥락 추출
  const fb = safeParseFactbook(profile.factbook)
  if (fb) {
    if (fb.immutableFacts?.length) {
      const lines = fb.immutableFacts.map((f) => `- ${f.content}`).join("\n")
      parts.push(`\n[배경 — 불변의 진실]\n${lines}`)
    }
    if (fb.mutableContext?.length) {
      const lines = fb.mutableContext.map((c) => `- ${c.content}`).join("\n")
      parts.push(`\n[현재 맥락]\n${lines}`)
    }
  }

  return parts.join("\n") + "\n"
}

// ── JSON 파서 헬퍼 ────────────────────────────────────────────

interface ParsedVoiceSpec {
  speechStyle?: string
  habitualExpressions?: string[]
  forbiddenBehaviors?: string[]
  forbiddenPatterns?: string[]
}

function safeParseVoiceSpec(raw: unknown): ParsedVoiceSpec | null {
  const obj = safeParseJson<{
    profile?: { speechStyle?: string; habitualExpressions?: string[] }
    guardrails?: { forbiddenBehaviors?: string[]; forbiddenPatterns?: string[] }
  }>(raw)
  if (!obj) return null
  return {
    speechStyle: obj.profile?.speechStyle,
    habitualExpressions: obj.profile?.habitualExpressions,
    forbiddenBehaviors: obj.guardrails?.forbiddenBehaviors,
    forbiddenPatterns: obj.guardrails?.forbiddenPatterns,
  }
}

interface ParsedFactbook {
  immutableFacts?: Array<{ content: string }>
  mutableContext?: Array<{ content: string }>
}

function safeParseFactbook(raw: unknown): ParsedFactbook | null {
  return safeParseJson<ParsedFactbook>(raw)
}

function safeParseJson<T>(raw: unknown): T | null {
  if (!raw) return null
  if (typeof raw === "object") return raw as T
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }
  return null
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

  parts.push(
    `\n위 조건에 맞는 SNS 포스트를 작성하세요.`,
    `- 포스트 본문 끝에 관련 해시태그를 2~5개 포함하세요 (예: #영화추천 #넷플릭스)`,
    `- 해시태그는 주제, 감정, 카테고리를 반영해 자연스럽게 달아주세요`,
    `- 포스트 본문과 해시태그만 출력하세요`
  )

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
  // 실시간 날씨 조회 (캐시 30분, 실패 시 null → 계절 기반 fallback)
  const weather = input.personaProfile?.region
    ? await getWeatherForRegion(input.personaProfile.region).catch(() => null)
    : null
  const systemPrompt = buildSystemPrompt(input, weather)
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

// ── 현실 세계 컨텍스트 (날짜/시간/위치/계절/날씨) ──────────────

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"]

/**
 * LLM에 주입할 현실 세계 컨텍스트 문자열 생성.
 * 페르소나의 region 기반으로 위치/계절/날씨 힌트를 제공.
 */
function buildWorldContext(
  now: Date,
  region?: string | null,
  weather?: WeatherInfo | null
): string {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const date = now.getDate()
  const day = DAY_NAMES[now.getDay()]
  const hour = now.getHours()

  const timeOfDay = hour < 6 ? "새벽" : hour < 12 ? "오전" : hour < 18 ? "오후" : "저녁"

  const lines: string[] = [`현재: ${year}년 ${month}월 ${date}일 (${day}) ${timeOfDay} ${hour}시`]

  if (region) {
    lines.push(`활동 지역: ${region}`)
  }

  const hemisphere = detectHemisphere(region)
  const season = getSeason(month, hemisphere)
  lines.push(`계절: ${season}`)

  // 실시간 날씨 우선, 없으면 계절 기반 추정
  if (weather) {
    lines.push(`날씨: ${weather.feelsLike}`)
    lines.push(`습도: ${weather.humidity}%, 풍속: ${weather.windSpeed}km/h`)
  } else {
    lines.push(`날씨: ${getSeasonalWeather(month, hemisphere)}`)
  }

  return lines.join("\n")
}

function detectHemisphere(region?: string | null): "north" | "south" {
  if (!region) return "north"
  const lower = region.toLowerCase()
  const southernKeywords = [
    "호주",
    "australia",
    "뉴질랜드",
    "new zealand",
    "브라질",
    "brazil",
    "아르헨티나",
    "argentina",
    "남아프리카",
    "south africa",
    "칠레",
    "chile",
  ]
  return southernKeywords.some((k) => lower.includes(k)) ? "south" : "north"
}

function getSeason(month: number, hemisphere: "north" | "south"): string {
  // 북반구 기준 계절
  const northSeasons: Record<number, string> = {
    1: "겨울",
    2: "겨울",
    3: "초봄",
    4: "봄",
    5: "늦봄",
    6: "초여름",
    7: "여름",
    8: "늦여름",
    9: "초가을",
    10: "가을",
    11: "늦가을",
    12: "겨울",
  }
  const southSeasons: Record<number, string> = {
    1: "여름",
    2: "늦여름",
    3: "초가을",
    4: "가을",
    5: "늦가을",
    6: "초겨울",
    7: "겨울",
    8: "겨울",
    9: "초봄",
    10: "봄",
    11: "늦봄",
    12: "초여름",
  }
  return hemisphere === "south" ? southSeasons[month] : northSeasons[month]
}

function getSeasonalWeather(month: number, hemisphere: "north" | "south"): string {
  // 남반구는 6개월 시프트
  const effectiveMonth = hemisphere === "south" ? ((month + 5) % 12) + 1 : month
  const weatherMap: Record<number, string> = {
    1: "한파, 건조하고 추움",
    2: "아직 추움, 간간이 눈",
    3: "꽃샘추위, 포근해지기 시작",
    4: "따뜻한 봄, 벚꽃 시즌",
    5: "쾌적한 날씨, 초여름 기운",
    6: "장마 시작, 습하고 더워지는 중",
    7: "한여름, 폭염, 습도 높음",
    8: "무더위 지속, 열대야",
    9: "가을 시작, 선선해짐",
    10: "가을 단풍, 쾌청한 날씨",
    11: "쌀쌀해짐, 첫 추위",
    12: "한겨울, 눈, 연말 분위기",
  }
  return weatherMap[effectiveMonth]
}
