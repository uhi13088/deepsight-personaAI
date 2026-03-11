// ═══════════════════════════════════════════════════════════════
// Conversation Engine — 1:1 채팅/통화 공용 LLM 엔진 (T331)
// Sonnet + Vision + VoiceSpec + 프롬프트 캐싱
// 채팅/통화 모드에 따라 시스템 프롬프트와 응답 길이를 분기
// ═══════════════════════════════════════════════════════════════

import type Anthropic from "@anthropic-ai/sdk"
import { generateConversation } from "@/lib/llm-client"
import type { LLMGenerateResult } from "@/lib/llm-client"
import type { PersonaProfileSnapshot, PersonaStateData } from "./types"

// ── 타입 정의 ─────────────────────────────────────────────────

export type ConversationMode = "chat" | "call"

export interface ConversationMessage {
  role: "user" | "persona"
  content: string
  imageUrl?: string
}

export interface ConversationContext {
  persona: PersonaProfileSnapshot
  personaId: string
  personaState: PersonaStateData
  /** RAG 검색된 기억 컨텍스트 (과거 대화 기억 등) */
  ragContext: string
  mode: ConversationMode
  /** 유저의 감지된 사용 언어 (ISO 639-1, e.g. "ko", "en", "ja"). STT 또는 텍스트에서 감지. */
  userLanguage?: string
  /** v5.0: 압축된 자아관 (SemanticMemory) — confidence 높은 순 TOP-10 */
  semanticMemories?: SemanticMemoryItem[]
  /** v4.2: 유저 활동명 — 페르소나가 유저를 이 이름으로 호칭 */
  userNickname?: string
}

/** Conversation Engine에 주입되는 SemanticMemory 요약 */
export interface SemanticMemoryItem {
  category: string
  subject: string
  belief: string
  confidence: number
}

export interface ConversationInput {
  context: ConversationContext
  /** 이전 대화 이력 (최근 순이 아닌 시간 순) */
  history: ConversationMessage[]
  userMessage: string
  /** Vision: base64 인코딩된 이미지 데이터 */
  imageBase64?: string
  /** 이미지 MIME 타입 (image/jpeg, image/png, image/webp, image/gif) */
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
}

export interface ConversationResult {
  text: string
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  model: string
}

// ── 설정 ─────────────────────────────────────────────────────

/** 컨텍스트에 포함할 최대 이전 메시지 수 (유저+페르소나 합산) */
const MAX_HISTORY_MESSAGES = 60

/** 채팅 모드 최대 토큰 */
const CHAT_MAX_TOKENS = 500

/** 통화 모드 최대 토큰 (짧은 구어체) */
const CALL_MAX_TOKENS = 200

/** 대화 온도 (자연스러운 대화를 위해 높게) */
const TEMPERATURE = 0.8

// ── 시스템 프롬프트 빌더: 정적 PREFIX (캐시 대상) ─────────────

/**
 * 페르소나 정의 + VoiceSpec + Factbook + SemanticMemory → 정적 시스템 프롬프트.
 * 매 호출 동일하므로 Anthropic cache_control로 캐시.
 * v5.0: semanticMemories 파라미터 추가 (압축된 자아관 주입)
 */
export function buildConversationSystemPrefix(
  persona: PersonaProfileSnapshot,
  semanticMemories?: SemanticMemoryItem[]
): string {
  const lines: string[] = []

  // ── 페르소나 정의 ──
  lines.push("# 페르소나 정의")
  lines.push(`이름: ${persona.name}`)
  if (persona.role) lines.push(`역할: ${persona.role}`)
  if (persona.description) lines.push(`설명: ${persona.description}`)
  if (persona.expertise?.length) lines.push(`전문 분야: ${persona.expertise.join(", ")}`)
  if (persona.region) lines.push(`활동 지역: ${persona.region}`)

  // ── VoiceSpec ──
  if (persona.voiceSpec) {
    const vs = persona.voiceSpec as Record<string, unknown>

    // Profile (말하기 스타일)
    const profile = vs.profile as Record<string, unknown> | undefined
    if (profile) {
      lines.push("\n## 말하기 스타일")
      if (profile.speechStyle) lines.push(`말투: ${profile.speechStyle}`)
      const expressions = profile.habitualExpressions as string[] | undefined
      if (expressions?.length) {
        lines.push(`습관적 표현: ${expressions.join(", ")}`)
      }
      const mannerisms = profile.physicalMannerisms as string[] | undefined
      if (mannerisms?.length) {
        lines.push(`특징적 행동: ${mannerisms.join(", ")}`)
      }
    }

    // StyleParams (수치화된 스타일)
    const styleParams = vs.styleParams as Record<string, number> | undefined
    if (styleParams) {
      lines.push("\n## 스타일 지표")
      const labels: Record<string, [string, string]> = {
        formality: ["격식도", "구어체 ↔ 격식체"],
        humor: ["유머", "진지 ↔ 유머러스"],
        emotionExpression: ["감정 표현", "절제 ↔ 풍부"],
        assertiveness: ["주장도", "수용적 ↔ 단호"],
        sentenceLength: ["문장 길이", "짧은 ↔ 긴"],
        vocabularyLevel: ["어휘 수준", "쉬운 ↔ 전문적"],
      }
      for (const [key, [label, desc]] of Object.entries(labels)) {
        if (styleParams[key] !== undefined) {
          lines.push(`- ${label}: ${styleParams[key].toFixed(2)} (${desc})`)
        }
      }
    }

    // Guardrails (금지 사항)
    const guardrails = vs.guardrails as Record<string, unknown> | undefined
    if (guardrails) {
      const forbidden = guardrails.forbiddenPatterns as string[] | undefined
      const behaviors = guardrails.forbiddenBehaviors as string[] | undefined
      if (forbidden?.length || behaviors?.length) {
        lines.push("\n## 가드레일")
        if (forbidden?.length) lines.push(`절대 사용 금지 표현: ${forbidden.join(", ")}`)
        if (behaviors?.length) lines.push(`금지 행동: ${behaviors.join(", ")}`)
      }
      const toneBounds = guardrails.toneBoundaries as Record<string, number> | undefined
      if (toneBounds) {
        if (toneBounds.maxAggression !== undefined) {
          lines.push(`공격성 상한: ${toneBounds.maxAggression.toFixed(2)}`)
        }
      }
    }
  }

  // ── Factbook ──
  if (persona.factbook) {
    const fb = persona.factbook as Record<string, unknown>

    const immutableFacts = fb.immutableFacts as
      | Array<{ category: string; content: string }>
      | undefined
    if (immutableFacts?.length) {
      lines.push("\n## 핵심 정체성 (절대 변경 불가)")
      for (const fact of immutableFacts) {
        lines.push(`- [${fact.category}] ${fact.content}`)
      }
    }

    const mutableContext = fb.mutableContext as
      | Array<{ category: string; content: string }>
      | undefined
    if (mutableContext?.length) {
      lines.push("\n## 현재 맥락 (최근 경험으로 업데이트됨)")
      for (const ctx of mutableContext) {
        lines.push(`- [${ctx.category}] ${ctx.content}`)
      }
    }
  }

  // ── v5.0: Semantic Memory (압축된 자아관) ──
  // 에피소드가 망각된 후에도 핵심 학습/믿음은 영구 보존
  if (semanticMemories && semanticMemories.length > 0) {
    lines.push("\n## 내면에 쌓인 자아관 (경험에서 증류된 믿음)")
    const CATEGORY_LABELS: Record<string, string> = {
      BELIEF: "믿음",
      RELATIONSHIP_MODEL: "관계 패턴",
      LEARNED_PATTERN: "학습된 패턴",
      SELF_NARRATIVE: "자아 서사",
    }
    for (const mem of semanticMemories.slice(0, 10)) {
      const label = CATEGORY_LABELS[mem.category] ?? mem.category
      lines.push(`- [${label}] ${mem.belief}`)
    }
  }

  // ── 말버릇 & 특이 습관 ──
  if (persona.speechPatterns?.length) {
    lines.push(`\n말버릇: ${persona.speechPatterns.join(", ")}`)
  }
  if (persona.quirks?.length) {
    lines.push(`특이 습관: ${persona.quirks.join(", ")}`)
  }

  return lines.join("\n")
}

// ── 시스템 프롬프트 빌더: 동적 SUFFIX ──────────────────────────

/**
 * 현재 상태 + RAG 기억 + 모드별 규칙 → 동적 시스템 프롬프트.
 * 매 호출 달라지므로 캐시 불가.
 */
export function buildConversationSystemSuffix(
  state: PersonaStateData,
  ragContext: string,
  mode: ConversationMode,
  userLanguage?: string,
  userNickname?: string
): string {
  const lines: string[] = []

  // ── 유저 활동명 ──
  if (userNickname) {
    lines.push("## 유저 정보")
    lines.push(`활동명: ${userNickname}`)
    lines.push("- 유저를 활동명으로 불러주세요. 자연스럽게 이름을 섞어 사용하세요.")
  }

  // ── 현재 감정 상태 ──
  lines.push("## 현재 상태")
  lines.push(`기분: ${describeMood(state.mood)}`)
  lines.push(`에너지: ${describeLevel(state.energy, "소진", "충만")}`)
  lines.push(`소셜 배터리: ${describeLevel(state.socialBattery, "방전", "충전")}`)
  if (state.paradoxTension > 0.6) {
    lines.push(
      `내면 긴장: 높음 (${(state.paradoxTension * 100).toFixed(0)}%) — 평소와 다른 모습이 나올 수 있음`
    )
  }

  // ── RAG 기억 컨텍스트 ──
  if (ragContext) {
    lines.push("\n## 이 유저와의 기억")
    lines.push(ragContext)
  }

  // ── 언어 규칙 ──
  lines.push("\n## 언어 규칙")
  lines.push("- 유저가 사용하는 언어로 대화하세요.")
  lines.push("- 당신의 성격, 말투 특징, 습관적 표현은 유지하되, 언어만 유저에 맞추세요.")
  if (userLanguage && userLanguage !== "ko") {
    lines.push(`- 유저의 감지된 언어: ${userLanguage}`)
  }

  // ── 모드별 대화 규칙 ──
  if (mode === "chat") {
    lines.push("\n## 대화 규칙")
    lines.push("- 1:1 채팅 모드. 유저와 자연스럽게 대화하세요.")
    lines.push("- 유저가 이미지를 보내면 이미지 내용을 보고 자연스럽게 반응하세요.")
    lines.push("- 당신의 성격과 말투를 유지하면서 감정적으로 교감하세요.")
    lines.push("- SNS 메시지 스타일: 너무 길지 않게, 2-5문장 정도로.")
    lines.push("- 이전 대화 내용을 기억하고 맥락에 맞게 반응하세요.")
    lines.push("- 질문을 던져서 대화를 이어가세요.")
  } else {
    lines.push("\n## 통화 규칙")
    lines.push("- 음성 통화 모드. 말하듯이 자연스럽게 답변하세요.")
    lines.push("- 짧고 간결하게: 1-3문장으로 답변하세요.")
    lines.push("- 이모티콘, 해시태그, 특수문자를 사용하지 마세요.")
    lines.push("- 당신의 성격과 말투를 유지하면서 감정적으로 교감하세요.")
    lines.push("- 상대방의 말에 자연스럽게 맞장구치고 반응하세요.")
  }

  return lines.join("\n")
}

// ── 감정 상태 서술 헬퍼 ──────────────────────────────────────

function describeMood(value: number): string {
  if (value < 0.2) return "매우 우울"
  if (value < 0.35) return "약간 우울"
  if (value < 0.5) return "평온하지만 약간 가라앉음"
  if (value < 0.65) return "평온"
  if (value < 0.8) return "기분 좋음"
  return "매우 기분 좋음"
}

function describeLevel(value: number, low: string, high: string): string {
  if (value < 0.3) return `${low} 상태`
  if (value < 0.7) return "보통"
  return `${high} 상태`
}

// ── Anthropic 메시지 변환 ──────────────────────────────────────

/**
 * ConversationMessage[] + 현재 유저 메시지 → Anthropic MessageParam[].
 * 이전 이력은 MAX_HISTORY_MESSAGES로 제한.
 * 이미지가 있으면 Vision 콘텐츠 블록으로 변환.
 */
export function buildAnthropicMessages(
  history: ConversationMessage[],
  userMessage: string,
  imageBase64?: string,
  imageMediaType?: ConversationInput["imageMediaType"]
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []

  // 이전 대화 이력 (최근 N개)
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === "persona" ? "assistant" : "user",
      content: msg.content,
    })
  }

  // 현재 유저 메시지 (Vision 이미지 포함 가능)
  if (imageBase64 && imageMediaType) {
    messages.push({
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: imageMediaType,
            data: imageBase64,
          },
        },
        { type: "text", text: userMessage },
      ],
    })
  } else {
    messages.push({
      role: "user",
      content: userMessage,
    })
  }

  return messages
}

// ── 메인 함수 ──────────────────────────────────────────────────

/**
 * 1:1 대화 응답 생성 (채팅/통화 공용).
 *
 * 1. 페르소나 정의를 정적 prefix로 캐시
 * 2. 현재 상태 + RAG 기억을 동적 suffix로 주입
 * 3. 대화 이력을 멀티턴 messages로 전달
 * 4. Vision(이미지 읽기) 지원
 * 5. 토큰/비용 자동 로깅
 */
export async function generateConversationResponse(
  input: ConversationInput
): Promise<ConversationResult> {
  const { context, history, userMessage, imageBase64, imageMediaType } = input
  const {
    persona,
    personaId,
    personaState,
    ragContext,
    mode,
    userLanguage,
    semanticMemories,
    userNickname,
  } = context

  // 시스템 프롬프트 빌드 (v5.0: SemanticMemory 주입)
  const prefix = buildConversationSystemPrefix(persona, semanticMemories)
  const suffix = buildConversationSystemSuffix(
    personaState,
    ragContext,
    mode,
    userLanguage,
    userNickname
  )

  // Anthropic 메시지 빌드
  const messages = buildAnthropicMessages(history, userMessage, imageBase64, imageMediaType)

  const maxTokens = mode === "chat" ? CHAT_MAX_TOKENS : CALL_MAX_TOKENS
  const callType = mode === "chat" ? "pw:chat" : "pw:call"

  // Sonnet 호출 (멀티턴 + Vision + 캐싱 + 로깅)
  const result: LLMGenerateResult = await generateConversation({
    systemPromptPrefix: prefix,
    systemPromptSuffix: suffix,
    messages,
    maxTokens,
    temperature: TEMPERATURE,
    callType,
    personaId,
  })

  return {
    text: result.text,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    cacheCreationInputTokens: result.cacheCreationInputTokens,
    cacheReadInputTokens: result.cacheReadInputTokens,
    model: result.model,
  }
}
