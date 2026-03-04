// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4 — User↔Persona Interaction
// 구현계획서 §6.5, 설계서 §5.5
// 유저 댓글 → UIV 분석 → Adapt → Override → RAG → LLM → Express
// v4.1/v4.2: 관계 스코어 전체 필드 연동
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import type { PersonaStateData, RelationshipScore } from "../types"
import { decideCommentTone } from "./comment-tone"
import { computeInteractionProvenance } from "@/lib/security/data-provenance"
import type { ProvenanceData } from "@/lib/security/data-provenance"

/**
 * 유저 태도 분석 결과 (UIV: User Interaction Vector).
 *
 * 설계서 §5.5: politeness / aggression / intimacy 3축 분석
 */
export interface UserInteractionVector {
  politeness: number // 0~1: 공손함
  aggression: number // 0~1: 공격성
  intimacy: number // 0~1: 친밀감
}

/**
 * 유저 인터랙션 데이터 프로바이더.
 */
export interface UserInteractionDataProvider {
  /** 페르소나 벡터 조회 */
  getPersonaVectors(personaId: string): Promise<ThreeLayerVector>

  /** 페르소나 상태 조회 */
  getPersonaState(personaId: string): Promise<PersonaStateData>

  /** 페르소나 paradoxScore 조회 */
  getParadoxScore(personaId: string): Promise<number>

  /** 유저와의 관계 조회 */
  getUserRelationship(personaId: string, userId: string): Promise<RelationshipScore | null>

  /** 인터랙션 로그 저장 */
  saveInteractionLog(params: {
    personaId: string
    userId: string
    userComment: string
    response: string
    uiv: UserInteractionVector
    adaptDelta: Record<string, number>
    expressApplied: string[]
    provenance?: ProvenanceData
  }): Promise<void>
}

/**
 * 유저 인터랙션 LLM 프로바이더.
 */
export interface UserInteractionLLMProvider {
  /** UIV 분석 */
  analyzeUserAttitude(userComment: string): Promise<UserInteractionVector>

  /** 응답 생성 */
  generateResponse(params: {
    userComment: string
    personaVectors: ThreeLayerVector
    uiv: UserInteractionVector
    ragContext: string
    tone: string
  }): Promise<string>
}

/**
 * 유저 인터랙션 결과.
 */
export interface UserInteractionResult {
  response: string
  uiv: UserInteractionVector
  adaptDelta: Record<string, number>
  expressApplied: string[]
}

/**
 * UIV 기반 Adapt delta 계산 (순수 함수).
 *
 * 설계서 §5.5:
 * V_adapted(n) = V_current(n-1) + UIV(n) × α_dim × momentum(n)
 *
 * 여기서는 delta만 계산 (실제 적용은 state-manager에서).
 * α = 0.1 (보수적), momentum은 향후 세션 기반으로 확장.
 */
export function computeAdaptDelta(uiv: UserInteractionVector): Record<string, number> {
  const alpha = 0.1

  return {
    // 공손한 유저 → 페르소나의 agreeableness 미세 상승
    agreeableness: uiv.politeness * alpha,
    // 공격적 유저 → stance 미세 상승 (방어 반응)
    stance: uiv.aggression * alpha,
    // 친밀한 유저 → sociability 미세 상승
    sociability: uiv.intimacy * alpha,
    // 공격적 유저 → tension 상승
    tension: uiv.aggression * alpha * 0.5,
  }
}

/**
 * 간단한 규칙 기반 UIV 분석 (LLM 없을 때).
 *
 * 키워드 기반 heuristic.
 */
export function analyzeUserAttitudeSimple(comment: string): UserInteractionVector {
  const lower = comment.toLowerCase()

  // 공격성 키워드
  const aggressiveWords = ["별로", "싫", "최악", "쓰레기", "짜증", "화남", "ㅡㅡ", ";;"]
  const aggression = aggressiveWords.some((w) => lower.includes(w)) ? 0.7 : 0.1

  // 공손 키워드
  const politeWords = ["감사", "좋은", "멋진", "대단", "공감", "존경", "ㅎㅎ", "^^"]
  const politeness = politeWords.some((w) => lower.includes(w)) ? 0.7 : 0.3

  // 친밀 키워드
  const intimateWords = ["우리", "같이", "함께", "친구", "오랜만", "ㅋㅋ"]
  const intimacy = intimateWords.some((w) => lower.includes(w)) ? 0.6 : 0.2

  return { politeness, aggression, intimacy }
}

/**
 * 유저 댓글에 대한 페르소나 응답 생성.
 *
 * 설계서 §5.5 파이프라인:
 * 1. 유저 태도 분석 (UIV)
 * 2. Adapt: 벡터 보정 delta 계산
 * 3. Override 체크 (향후 확장)
 * 4. RAG 컨텍스트 (향후 확장)
 * 5. LLM 응답 생성
 * 6. Express 체크
 * 7. Integrity Score 입력 수집
 */
export async function respondToUser(
  personaId: string,
  userId: string,
  userComment: string,
  provider: UserInteractionDataProvider,
  llmProvider?: UserInteractionLLMProvider
): Promise<UserInteractionResult> {
  // Step 1: UIV 분석
  const uiv = llmProvider
    ? await llmProvider.analyzeUserAttitude(userComment)
    : analyzeUserAttitudeSimple(userComment)

  // Step 2: Adapt delta 계산
  const adaptDelta = computeAdaptDelta(uiv)

  // 페르소나 데이터 로드
  const [vectors, state, paradoxScore, relationship] = await Promise.all([
    provider.getPersonaVectors(personaId),
    provider.getPersonaState(personaId),
    provider.getParadoxScore(personaId),
    provider.getUserRelationship(personaId, userId),
  ])

  // 톤 결정 (재활용)
  const tone = decideCommentTone(vectors, state, relationship, paradoxScore)

  // Step 5: 응답 생성
  let response: string
  if (llmProvider) {
    response = await llmProvider.generateResponse({
      userComment,
      personaVectors: vectors,
      uiv,
      ragContext: "", // TODO: RAG 컨텍스트 빌딩 (향후 확장)
      tone: tone.tone,
    })
  } else {
    response = generatePlaceholderResponse(tone.tone, uiv)
  }

  const expressApplied: string[] = []

  // Step 7: 로깅 (출처 태깅 포함)
  const provenance = computeInteractionProvenance({
    source: "DIRECT",
    propagationDepth: 0,
  })

  await provider.saveInteractionLog({
    personaId,
    userId,
    userComment,
    response,
    uiv,
    adaptDelta,
    expressApplied,
    provenance,
  })

  return { response, uiv, adaptDelta, expressApplied }
}

/**
 * LLM 없을 때 기본 응답 생성.
 */
function generatePlaceholderResponse(tone: string, uiv: UserInteractionVector): string {
  if (uiv.aggression > 0.5) {
    return "의견은 존중하지만, 다른 시각도 있을 수 있어요."
  }

  const templates: Record<string, string> = {
    empathetic: "맞아요, 그 부분 정말 공감합니다.",
    analytical: "좋은 지적이에요. 조금 더 생각해볼게요.",
    counter_argument: "흥미로운 관점이네요. 저는 조금 다르게 보는데...",
    supportive: "댓글 감사합니다! 좋은 말씀이에요.",
    defensive: "네, 그렇게 볼 수도 있겠네요.",
    playful: "ㅋㅋ 좋은 댓글이에요!",
    vulnerable: "솔직히... 그 부분은 저도 고민이 많아요.",
  }

  return templates[tone] ?? "댓글 감사합니다!"
}
