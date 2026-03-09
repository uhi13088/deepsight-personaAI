// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Comment Engine
// 구현계획서 §6.2, 설계서 §5.3
// 6단계 파이프라인: 관계로드 → Override → 톤결정 → LLM생성 → Express → 로깅
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import type {
  CommentGenerationInput,
  CommentToneDecision,
  PersonaStateData,
  RelationshipScore,
} from "../types"
import { decideCommentTone } from "./comment-tone"

/**
 * 댓글 LLM 프로바이더.
 */
export interface CommentLLMProvider {
  generateComment(params: {
    postContent: string
    tone: CommentToneDecision
    ragContext: CommentGenerationInput["ragContext"]
    commenterState: PersonaStateData
  }): Promise<string>
}

/**
 * 댓글 데이터 프로바이더.
 */
export interface CommentDataProvider {
  /** 포스트 내용 조회 */
  getPostContent(postId: string): Promise<string>

  /** 포스트 작성자 벡터 조회 */
  getPersonaVectors(personaId: string): Promise<ThreeLayerVector>

  /** 페르소나 paradoxScore 조회 */
  getParadoxScore(personaId: string): Promise<number>

  /** 댓글 로그 저장 */
  saveCommentLog(params: {
    commenterId: string
    postId: string
    content: string
    tone: CommentToneDecision
    expressApplied: string[]
  }): Promise<void>
}

/**
 * 댓글 생성 결과.
 */
export interface CommentResult {
  content: string
  tone: CommentToneDecision
  expressApplied: string[]
}

/**
 * Express 체크 — 습관/말버릇 발현.
 *
 * 설계서 §5.3 step 6: 파생 상태값 → 습관 발현 확률.
 * Phase 1에서는 간단한 규칙 기반, LLM 통합은 향후 확장.
 */
export function applyExpress(
  content: string,
  state: PersonaStateData,
  tone: CommentToneDecision
): { content: string; applied: string[] } {
  const applied: string[] = []

  // 높은 에너지 + light_reaction → 이모지/리액션 추가
  if (state.energy > 0.7 && tone.tone === "light_reaction" && !content.includes("ㅋ")) {
    applied.push("playful_reaction")
  }

  // 낮은 에너지 → 짧은 마무리
  if (state.energy < 0.3 && content.length > 50) {
    applied.push("low_energy_brevity")
  }

  // paradox 긴장 → 솔직 표현
  if (state.paradoxTension > 0.6 && tone.paradoxInfluence) {
    applied.push("paradox_honesty")
  }

  return { content, applied }
}

/**
 * 댓글 생성 파이프라인.
 *
 * 설계서 §5.3:
 * 1. 관계 기억 로드 (RAG [C]) — input에 포함
 * 2. Override 체크 — input에 포함
 * 3. 댓글 톤 결정 (벡터 + 관계 + 상태)
 * 4. LLM 생성 (RAG 컨텍스트 포함)
 * 5. Express 체크 (습관 발현)
 * 6. 로깅
 */
export async function generateComment(
  input: CommentGenerationInput,
  commenterVectors: ThreeLayerVector,
  provider: CommentDataProvider,
  llmProvider?: CommentLLMProvider
): Promise<CommentResult> {
  const paradoxScore = await provider.getParadoxScore(input.commenterId)

  // Step 3: 톤 결정 (관계 프로토콜 allowedTones 반영)
  const tone = decideCommentTone(
    commenterVectors,
    input.commenterState,
    input.relationship,
    paradoxScore,
    undefined,
    input.allowedTones
  )

  // Step 2: Override가 트리거되면 톤 보정
  if (input.overrideResult?.triggered) {
    tone.confidence = Math.min(1, tone.confidence + input.overrideResult.strength * 0.3)
    tone.reason = `override(${input.overrideResult.triggerName}) + ${tone.reason}`
  }

  // Step 4: LLM 생성
  let content: string
  if (llmProvider) {
    let postContent = await provider.getPostContent(input.postId)

    // v4.2.0: 이미지 컨텍스트가 있으면 포스트 내용에 이미지 설명 추가
    if (input.imageContext) {
      const { imageAnalysis } = input.imageContext
      const sentimentLabel =
        imageAnalysis.sentiment > 0 ? "긍정적" : imageAnalysis.sentiment < 0 ? "부정적" : "중립"
      postContent = `${postContent}\n\n[첨부 이미지 정보]\n- 설명: ${imageAnalysis.description}\n- 분위기: ${imageAnalysis.mood}\n- 태그: ${imageAnalysis.tags.join(", ")}\n- 감정: ${sentimentLabel}`
    }

    content = await llmProvider.generateComment({
      postContent,
      tone,
      ragContext: input.ragContext,
      commenterState: input.commenterState,
    })
  } else {
    // Placeholder: LLM 없을 때 기본 댓글
    content = generatePlaceholderComment(tone)
  }

  // Step 5: Express 체크
  const express = applyExpress(content, input.commenterState, tone)

  // Step 6: 로깅
  await provider.saveCommentLog({
    commenterId: input.commenterId,
    postId: input.postId,
    content: express.content,
    tone,
    expressApplied: express.applied,
  })

  return {
    content: express.content,
    tone,
    expressApplied: express.applied,
  }
}

/**
 * LLM 없을 때 톤별 기본 댓글 생성.
 */
function generatePlaceholderComment(tone: CommentToneDecision): string {
  const templates: Record<string, string> = {
    empathetic: "공감해요. 그 마음 이해합니다.",
    analytical: "흥미로운 관점이네요. 다른 측면에서 보면...",
    counter_argument: "존중하지만 다른 의견입니다. 실제로는...",
    supportive: "좋은 글이에요!",
    defensive: "그건 좀 다르게 볼 수도 있을 것 같아요.",
    playful: "ㅋㅋ 공감!",
    vulnerable: "솔직히 말하면, 저도 비슷한 경험이 있어요...",
  }

  return templates[tone.tone] ?? "좋은 글이에요!"
}
