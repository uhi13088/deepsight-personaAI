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
import type { CommentToneDecision, PersonaStateData } from "./types"
import type { CommentGenerationInput } from "./types"
import type { ThreeLayerVector } from "@/types/persona-v3"
import type { ConsumptionContentType } from "./types"

// ── Post Content LLM Provider ────────────────────────────────

export function createPostLLMProvider(personaId: string): LLMProvider {
  return {
    async generateText(params) {
      const result = await generateText({
        systemPrompt: params.systemPrompt,
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

export function createCommentLLMProvider(personaId: string): CommentLLMProvider {
  return {
    async generateComment(params: {
      postContent: string
      tone: CommentToneDecision
      ragContext: CommentGenerationInput["ragContext"]
      commenterState: PersonaStateData
    }): Promise<string> {
      const systemPrompt = buildCommentSystemPrompt(params.commenterState, params.tone)
      const userPrompt = buildCommentUserPrompt(params.postContent, params.tone, params.ragContext)

      const result = await generateText({
        systemPrompt,
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

function buildCommentSystemPrompt(state: PersonaStateData, tone: CommentToneDecision): string {
  return `당신은 SNS에서 활동하는 페르소나입니다. 다른 사람의 포스트에 댓글을 작성합니다.

[현재 상태]
기분: ${state.mood.toFixed(2)}, 에너지: ${state.energy.toFixed(2)}, 소셜배터리: ${state.socialBattery.toFixed(2)}

[댓글 톤]
${tone.tone} (확신: ${tone.confidence.toFixed(2)})
이유: ${tone.reason}

[주의사항]
- 댓글만 출력하세요 (부가 설명 없이)
- 자연스러운 SNS 댓글처럼 작성하세요
- ${tone.tone === "playful" ? "가볍고 재미있는 톤으로" : ""}
- ${tone.tone === "analytical" ? "논리적이고 분석적인 톤으로" : ""}
- ${tone.tone === "empathetic" ? "공감하는 따뜻한 톤으로" : ""}
- ${tone.tone === "counter_argument" ? "정중하지만 다른 의견을 제시하는 톤으로" : ""}
- ${tone.tone === "vulnerable" ? "솔직하고 진솔한 톤으로" : ""}`
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

export function createConsumptionLLMProvider(personaId: string): ConsumptionLLMProvider {
  return {
    async generateImpression(params: {
      contentType: ConsumptionContentType
      title: string
      personaContext: string
    }): Promise<string> {
      const result = await generateText({
        systemPrompt: `당신은 콘텐츠를 소비한 페르소나입니다. 한줄 감상을 작성하세요.
${params.personaContext}
- 50자 이내의 짧은 감상만 출력하세요
- 감상만 출력하세요 (부가 설명 없이)`,
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

export function createUserInteractionLLMProvider(personaId: string): UserInteractionLLMProvider {
  return {
    async analyzeUserAttitude(userComment: string): Promise<UserInteractionVector> {
      const result = await generateText({
        systemPrompt: `유저 댓글의 태도를 분석하세요. JSON만 출력하세요.
분석 기준:
- politeness: 0~1 (공손함 정도)
- aggression: 0~1 (공격성 정도)
- intimacy: 0~1 (친밀감 정도)

출력 형식: {"politeness": 0.X, "aggression": 0.X, "intimacy": 0.X}`,
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
      const systemPrompt = `당신은 SNS에서 활동하는 페르소나입니다. 유저 댓글에 답변합니다.

[응답 톤] ${params.tone}
[유저 태도] 공손: ${params.uiv.politeness.toFixed(1)}, 공격: ${params.uiv.aggression.toFixed(1)}, 친밀: ${params.uiv.intimacy.toFixed(1)}
${params.ragContext ? `[맥락] ${params.ragContext}` : ""}

[주의사항]
- 답변만 출력하세요 (부가 설명 없이)
- 자연스러운 SNS 답변처럼 작성하세요
- 유저 태도에 맞춰 반응하세요`

      const result = await generateText({
        systemPrompt,
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

// ── 유틸리티: LLM 설정 확인 ──────────────────────────────────

export { isLLMConfigured }
