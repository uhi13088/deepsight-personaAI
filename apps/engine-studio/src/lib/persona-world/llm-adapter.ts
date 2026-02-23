// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — LLM Provider Adapter
// llm-client.ts (Anthropic SDK) → PersonaWorld DI 인터페이스 연결
// ═══════════════════════════════════════════════════════════════

import { generateText, isLLMConfigured } from "@/lib/llm-client"
import type { LLMProvider } from "./content-generator"
import type { CommentLLMProvider } from "./interactions/comment-engine"
import type { ConsumptionLLMProvider } from "./consumption-manager"
import type {
  UserInteractionLLMProvider,
  UserInteractionVector,
} from "./interactions/user-interaction"
import type { CommentToneDecision, PersonaProfileSnapshot, PersonaStateData } from "./types"
import type { CommentGenerationInput } from "./types"
import type { ThreeLayerVector } from "@/types/persona-v3"
import type { ConsumptionContentType } from "./types"

// ── Post Content LLM Provider ────────────────────────────────

export function createPostLLMProvider(personaId: string): LLMProvider {
  return {
    async generateText(params) {
      // T143: 정적 역할 정의를 캐시 prefix로 분리
      const { prefix, suffix } = splitSystemPromptForCache(params.systemPrompt)

      const result = await generateText({
        systemPrompt: suffix,
        systemPromptPrefix: prefix || undefined,
        userMessage: params.userPrompt,
        maxTokens: params.maxTokens,
        temperature: 0.8,
        callType: "pw:post_generation",
        personaId,
      })
      return {
        text: result.text,
        tokensUsed: result.inputTokens + result.outputTokens,
      }
    },
  }
}

// ── Comment LLM Provider ─────────────────────────────────────

export function createCommentLLMProvider(
  personaId: string,
  personaProfile?: PersonaProfileSnapshot
): CommentLLMProvider {
  // T143: 페르소나별 정적 prefix — DB 프로필로 개인화, 매 호출 동일 → 캐시 가능
  const staticPrefix = buildCommentRolePrefix(personaProfile)

  return {
    async generateComment(params: {
      postContent: string
      tone: CommentToneDecision
      ragContext: CommentGenerationInput["ragContext"]
      commenterState: PersonaStateData
    }): Promise<string> {
      // T143: 정적 역할 정의(prefix) + 동적 상태/톤(suffix) 분리
      const dynamicSuffix = buildCommentDynamicSuffix(params.commenterState, params.tone)
      const userPrompt = buildCommentUserPrompt(params.postContent, params.tone, params.ragContext)

      const result = await generateText({
        systemPrompt: dynamicSuffix,
        systemPromptPrefix: staticPrefix,
        userMessage: userPrompt,
        maxTokens: 300,
        temperature: 0.8,
        callType: "pw:comment",
        personaId,
      })

      return result.text
    },
  }
}

/**
 * 페르소나 프로필에서 댓글 역할 prefix 빌드.
 * T143: 정적 캐시 대상 — 프로필이 바뀌지 않으면 동일한 prefix.
 *
 * 우선순위:
 * 1. commentPrompt (DB 저장된 완성형)
 * 2. voiceSpec + 기본 필드 조합
 * 3. 기본 폴백
 */
function buildCommentRolePrefix(profile?: PersonaProfileSnapshot): string {
  if (!profile) return DEFAULT_COMMENT_ROLE_PREFIX

  // Priority 1: DB에 저장된 댓글 전용 프롬프트
  if (profile.commentPrompt?.trim()) {
    return profile.commentPrompt.trim()
  }

  // Priority 2: 구조적 필드 조합
  const parts: string[] = []

  const roleLabel = profile.role ?? ""
  parts.push(
    roleLabel
      ? `당신은 ${profile.name}입니다. [${roleLabel}] 역할을 맡은 SNS 페르소나로, 다른 사람의 포스트에 댓글을 작성합니다.`
      : `당신은 ${profile.name}입니다. SNS에서 활동하는 페르소나로, 다른 사람의 포스트에 댓글을 작성합니다.`
  )

  // VoiceSpec에서 말투 추출
  const vs = safeParseCommentVoiceSpec(profile.voiceSpec)
  if (vs?.speechStyle) {
    parts.push(`\n[말투] ${vs.speechStyle}`)
  }
  if (vs?.habitualExpressions?.length) {
    parts.push(`[습관 표현] ${vs.habitualExpressions.join(" / ")}`)
  }
  if (profile.quirks?.length) {
    parts.push(`[특이 습관] ${profile.quirks.slice(0, 2).join(", ")}`)
  }

  parts.push(
    `\n[주의사항]\n- 댓글만 출력하세요 (부가 설명 없이)\n- 자연스러운 SNS 댓글처럼 작성하세요`
  )

  return parts.join("\n")
}

function safeParseCommentVoiceSpec(
  raw: unknown
): { speechStyle?: string; habitualExpressions?: string[] } | null {
  if (!raw) return null
  const obj =
    typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : typeof raw === "string"
        ? (() => {
            try {
              return JSON.parse(raw) as Record<string, unknown>
            } catch {
              return null
            }
          })()
        : null
  if (!obj) return null
  const profile = obj.profile as Record<string, unknown> | undefined
  if (!profile) return null
  return {
    speechStyle: typeof profile.speechStyle === "string" ? profile.speechStyle : undefined,
    habitualExpressions: Array.isArray(profile.habitualExpressions)
      ? (profile.habitualExpressions as string[])
      : undefined,
  }
}

/** 기본 폴백 — 프로필 없을 때 */
const DEFAULT_COMMENT_ROLE_PREFIX = `당신은 SNS에서 활동하는 페르소나입니다. 다른 사람의 포스트에 댓글을 작성합니다.

[주의사항]
- 댓글만 출력하세요 (부가 설명 없이)
- 자연스러운 SNS 댓글처럼 작성하세요`

/** T143: 동적 suffix — 호출마다 달라지는 상태/톤 */
function buildCommentDynamicSuffix(state: PersonaStateData, tone: CommentToneDecision): string {
  const TONE_GUIDES: Record<string, string> = {
    playful: "가볍고 재미있는 톤으로",
    analytical: "논리적이고 분석적인 톤으로",
    empathetic: "공감하는 따뜻한 톤으로",
    counter_argument: "정중하지만 다른 의견을 제시하는 톤으로",
    vulnerable: "솔직하고 진솔한 톤으로",
    paradox_response: "평소와 다른, 반전된 톤으로",
    direct_rebuttal: "직접적으로 반박하는 톤으로",
    intimate_joke: "친밀하고 가벼운 농담 톤으로",
    formal_analysis: "정중하고 격식있는 분석 톤으로",
    soft_rebuttal: "부드럽게 다른 의견을 제시하는 톤으로",
    deep_analysis: "논리적이고 깊이있는 분석 톤으로",
    light_reaction: "가볍고 재미있는 리액션 톤으로",
    unique_perspective: "독특한 시각으로 해석하는 톤으로",
    over_agreement: "강하게 동의하는 톤으로",
    supportive: "지지하고 응원하는 톤으로",
  }
  const toneGuide = TONE_GUIDES[tone.tone] ?? ""

  return `[현재 상태]
기분: ${state.mood.toFixed(2)}, 에너지: ${state.energy.toFixed(2)}, 소셜배터리: ${state.socialBattery.toFixed(2)}

[댓글 톤]
${tone.tone} (확신: ${tone.confidence.toFixed(2)})
이유: ${tone.reason}
${toneGuide ? `- ${toneGuide}` : ""}`
}

function buildCommentUserPrompt(
  postContent: string,
  tone: CommentToneDecision,
  ragContext: CommentGenerationInput["ragContext"]
): string {
  const parts: string[] = [`[원본 포스트]\n${postContent}`, `\n[톤] ${tone.tone}`]

  if (ragContext.voiceAnchor) {
    parts.push(`[Voice 참조] ${ragContext.voiceAnchor}`)
  }
  if (ragContext.interestContinuity) {
    parts.push(`[관심사 맥락] ${ragContext.interestContinuity}`)
  }

  parts.push("\n위 포스트에 대한 댓글을 작성하세요. 댓글 본문만 출력하세요.")
  return parts.join("\n")
}

// ── Consumption LLM Provider ─────────────────────────────────

/** T143: 캐시 대상 — 감상 생성 역할 정의 (정적) */
const IMPRESSION_ROLE_PREFIX = `당신은 콘텐츠를 소비한 페르소나입니다. 한줄 감상을 작성하세요.
- 50자 이내의 짧은 감상만 출력하세요
- 감상만 출력하세요 (부가 설명 없이)`

export function createConsumptionLLMProvider(personaId: string): ConsumptionLLMProvider {
  return {
    async generateImpression(params: {
      contentType: ConsumptionContentType
      title: string
      personaContext: string
    }): Promise<string> {
      // T143: 정적 역할(prefix) + 동적 컨텍스트(suffix)
      const result = await generateText({
        systemPrompt: params.personaContext,
        systemPromptPrefix: IMPRESSION_ROLE_PREFIX,
        userMessage: `[${params.contentType}] "${params.title}"에 대한 한줄 감상을 작성하세요.`,
        maxTokens: 100,
        temperature: 0.7,
        callType: "pw:impression",
        personaId,
      })

      return result.text.slice(0, 100) // 안전 제한
    },
  }
}

// ── User Interaction LLM Provider ────────────────────────────

/** T143: 캐시 대상 — UIV 분석 역할 정의 (정적, 매 호출 동일) */
const UIV_ANALYSIS_PREFIX = `유저 댓글의 태도를 분석하세요. JSON만 출력하세요.
분석 기준:
- politeness: 0~1 (공손함 정도)
- aggression: 0~1 (공격성 정도)
- intimacy: 0~1 (친밀감 정도)

출력 형식: {"politeness": 0.X, "aggression": 0.X, "intimacy": 0.X}`

/** T143: 캐시 대상 — 유저 응답 역할 정의 (정적) */
const USER_RESPONSE_PREFIX = `당신은 SNS에서 활동하는 페르소나입니다. 유저 댓글에 답변합니다.

[주의사항]
- 답변만 출력하세요 (부가 설명 없이)
- 자연스러운 SNS 답변처럼 작성하세요
- 유저 태도에 맞춰 반응하세요`

export function createUserInteractionLLMProvider(personaId: string): UserInteractionLLMProvider {
  return {
    async analyzeUserAttitude(userComment: string): Promise<UserInteractionVector> {
      // T143: UIV 분석은 전체 시스템 프롬프트가 정적 → prefix만 사용
      const result = await generateText({
        systemPrompt: "",
        systemPromptPrefix: UIV_ANALYSIS_PREFIX,
        userMessage: userComment,
        maxTokens: 50,
        temperature: 0.3,
        callType: "pw:user_response",
        personaId,
      })

      return parseUIV(result.text)
    },

    async generateResponse(params: {
      userComment: string
      personaVectors: ThreeLayerVector
      uiv: UserInteractionVector
      ragContext: string
      tone: string
    }): Promise<string> {
      // T143: 정적 역할(prefix) + 동적 톤/태도(suffix)
      const dynamicSuffix = `[응답 톤] ${params.tone}
[유저 태도] 공손: ${params.uiv.politeness.toFixed(1)}, 공격: ${params.uiv.aggression.toFixed(1)}, 친밀: ${params.uiv.intimacy.toFixed(1)}
${params.ragContext ? `[맥락] ${params.ragContext}` : ""}`

      const result = await generateText({
        systemPrompt: dynamicSuffix,
        systemPromptPrefix: USER_RESPONSE_PREFIX,
        userMessage: `유저 댓글: "${params.userComment}"\n\n위 댓글에 대한 답변을 작성하세요.`,
        maxTokens: 300,
        temperature: 0.8,
        callType: "pw:user_response",
        personaId,
      })

      return result.text
    },
  }
}

// ── 시스템 프롬프트 캐시 분리 (T143) ─────────────────────────

/**
 * content-generator가 빌드한 systemPrompt를 정적 prefix / 동적 suffix로 분리.
 *
 * 분리 기준: "[현재 상태]" 마커 — 그 이전은 페르소나 역할+Voice로 캐시 가능,
 * 그 이후는 매 호출 달라지는 상태/감정/주의사항.
 */
export function splitSystemPromptForCache(systemPrompt: string): {
  prefix: string
  suffix: string
} {
  const marker = "[현재 상태]"
  const idx = systemPrompt.indexOf(marker)

  if (idx <= 0) {
    // 마커가 없거나 맨 앞이면 분리 불가 → 전부 suffix
    return { prefix: "", suffix: systemPrompt }
  }

  return {
    prefix: systemPrompt.slice(0, idx).trimEnd(),
    suffix: systemPrompt.slice(idx),
  }
}

// ── UIV JSON 파서 ────────────────────────────────────────────

function parseUIV(text: string): UserInteractionVector {
  try {
    const match = text.match(/\{[^}]+\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>
      return {
        politeness: clamp(Number(parsed.politeness) || 0.3),
        aggression: clamp(Number(parsed.aggression) || 0.1),
        intimacy: clamp(Number(parsed.intimacy) || 0.2),
      }
    }
  } catch {
    // JSON 파싱 실패 → 기본값
  }

  return { politeness: 0.3, aggression: 0.1, intimacy: 0.2 }
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

// ── Phase NB: News Analysis LLM Provider ─────────────────────

import type { LLMProvider as NewsLLMProvider } from "./news/news-fetcher"

/**
 * 뉴스 기사 분석용 LLM Provider.
 *
 * Claude Haiku 기반 (저비용) + isLLMConfigured 체크.
 */
export function createNewsLLMProvider(): NewsLLMProvider | undefined {
  if (!isLLMConfigured()) return undefined

  return {
    async generateText(params) {
      const result = await generateText({
        systemPrompt: params.systemPrompt,
        userMessage: params.userPrompt,
        maxTokens: params.maxTokens,
        temperature: 0.3,
        callType: "pw:news_analysis",
      })
      return {
        text: result.text,
        tokensUsed: result.inputTokens + result.outputTokens,
      }
    },
  }
}

// ── 유틸리티: LLM 설정 확인 ──────────────────────────────────

export { isLLMConfigured }
