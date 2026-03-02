// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.1 — Batch Comment Generator (T329)
// N개 댓글을 1 LLM 호출로 생성 + 품질 미달 시 자동 재생성
// 모든 과정 자동화, 수동 개입 없음
// ═══════════════════════════════════════════════════════════════

import { DEFAULT_BATCH_COMMENT_CONFIG } from "@/lib/global-config/optimization-config"
import type { BatchCommentConfig } from "@/lib/global-config/optimization-config"
import type { CommentToneDecision, PersonaStateData } from "./types"
import type { CommentGenerationInput } from "./types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface BatchCommentInput {
  personaId: string
  postId: string
  postContent: string
  tone: CommentToneDecision
  ragContext: CommentGenerationInput["ragContext"]
  commenterState: PersonaStateData
}

export interface BatchCommentResult {
  comment: string
  qualityScore: number
  passed: boolean
  regenerated: boolean
  regenerationAttempts: number
}

export interface BatchGenerationResult {
  batchGroupId: string
  results: BatchCommentResult[]
  totalCalls: number
  batchCalls: number
  regenerationCalls: number
  totalCostSaved: number
}

/** LLM 호출을 추상화하는 인터페이스 (테스트 가능) */
export interface BatchLLMProvider {
  /** 단일 댓글 생성 */
  generateSingle(input: BatchCommentInput): Promise<string>
  /** 여러 댓글을 1회 호출로 배치 생성 (JSON 배열 반환) */
  generateBatch(inputs: BatchCommentInput[]): Promise<string[]>
}

/** 품질 채점 인터페이스 */
export interface QualityScorer {
  /** 댓글 품질 점수 (0~1) */
  scoreComment(comment: string, input: BatchCommentInput): number
}

// ── 배치 ID 생성 ──────────────────────────────────────────────

export function generateBatchGroupId(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "")
  const rand = Math.random().toString(36).slice(2, 8)
  return `batch-comment-${dateStr}-${rand}`
}

// ── 기본 품질 채점 ────────────────────────────────────────────

/**
 * 규칙 기반 댓글 품질 채점.
 *
 * 3가지 기준:
 * 1. 길이 적정성 (0.4) — 너무 짧거나 길지 않은지
 * 2. 톤 매칭 (0.3) — 지정된 톤 키워드가 반영되었는지
 * 3. 자연스러움 (0.3) — JSON 잔해, 번호 매기기 등 비자연적 패턴 없는지
 */
export function scoreCommentQuality(comment: string, input: BatchCommentInput): number {
  // 1. 길이 적정성 (0.4)
  const len = comment.trim().length
  let lengthScore: number
  if (len < 5) lengthScore = 0.1
  else if (len < 15) lengthScore = 0.5
  else if (len <= 300) lengthScore = 1.0
  else if (len <= 500) lengthScore = 0.7
  else lengthScore = 0.4

  // 2. 톤 매칭 (0.3) — 톤별 키워드 존재 여부
  const toneScore = evaluateToneMatch(comment, input.tone)

  // 3. 자연스러움 (0.3) — 비정상 패턴 감지
  const naturalScore = evaluateNaturalness(comment)

  return Math.round((lengthScore * 0.4 + toneScore * 0.3 + naturalScore * 0.3) * 100) / 100
}

function evaluateToneMatch(comment: string, tone: CommentToneDecision): number {
  // 톤 confidence가 높으면 기본 점수도 높음 (LLM이 명확한 지시를 받았으므로)
  const baseScore = Math.min(1, 0.6 + tone.confidence * 0.3)

  // 부정적 신호: 톤과 맞지 않는 패턴
  const hasNegativeSignal =
    (tone.tone === "empathetic" && /공격|반박|틀렸/.test(comment)) ||
    (tone.tone === "light_reaction" && /심각|우려|문제/.test(comment)) ||
    (tone.tone === "deep_analysis" && comment.length < 10)

  return hasNegativeSignal ? Math.max(0, baseScore - 0.3) : baseScore
}

function evaluateNaturalness(comment: string): number {
  let score = 1.0

  // JSON 잔해 감지
  if (/^\s*[\[{]/.test(comment) || /[\]}]\s*$/.test(comment)) score -= 0.4

  // 번호 매기기 패턴 ("1.", "2." 등)
  if (/^\s*\d+[.)]\s/.test(comment)) score -= 0.3

  // "댓글:" 등 메타 텍스트
  if (/^(댓글|comment|reply|답변)\s*[:：]/i.test(comment)) score -= 0.3

  // 빈 문자열
  if (comment.trim().length === 0) score = 0

  return Math.max(0, score)
}

// ── 배치 댓글 생성 파이프라인 ─────────────────────────────────

/**
 * 배치 댓글 생성 + 자동 재생성.
 *
 * 1. N개 입력을 maxBatchSize 단위로 그룹핑
 * 2. 그룹별 1회 LLM 호출 (배치)
 * 3. 각 댓글 개별 품질 채점
 * 4. 0.9 미만 → Sonnet으로 자동 재생성 (최대 2회)
 * 5. 모든 결과 + 로그 반환
 */
export async function generateBatchComments(
  inputs: BatchCommentInput[],
  llmProvider: BatchLLMProvider,
  config: BatchCommentConfig = DEFAULT_BATCH_COMMENT_CONFIG,
  scorer: QualityScorer = { scoreComment: scoreCommentQuality }
): Promise<BatchGenerationResult> {
  const batchGroupId = generateBatchGroupId()
  const results: BatchCommentResult[] = []
  let totalCalls = 0
  let batchCalls = 0
  let regenerationCalls = 0

  // 배치 그룹핑
  const batches = chunkArray(inputs, config.maxBatchSize)

  for (const batch of batches) {
    // 배치 생성
    let comments: string[]
    try {
      comments = await llmProvider.generateBatch(batch)
      batchCalls++
      totalCalls++
    } catch {
      // 배치 실패 시 개별 생성으로 폴백
      comments = []
      for (const input of batch) {
        const single = await llmProvider.generateSingle(input)
        comments.push(single)
        totalCalls++
      }
    }

    // 배치 결과가 입력보다 적으면 부족분을 개별 생성
    while (comments.length < batch.length) {
      const idx = comments.length
      const single = await llmProvider.generateSingle(batch[idx])
      comments.push(single)
      totalCalls++
    }

    // 각 댓글 품질 채점 + 자동 재생성
    for (let i = 0; i < batch.length; i++) {
      const comment = comments[i]
      const input = batch[i]
      let qualityScore = scorer.scoreComment(comment, input)
      let finalComment = comment
      let regenerated = false
      let regenerationAttempts = 0

      // 품질 미달 시 자동 재생성 (최대 maxRegenerationAttempts회)
      if (qualityScore < config.qualityThreshold) {
        for (let attempt = 0; attempt < config.maxRegenerationAttempts; attempt++) {
          regenerationAttempts++
          regenerationCalls++
          totalCalls++

          const regenComment = await llmProvider.generateSingle(input)
          const regenScore = scorer.scoreComment(regenComment, input)

          if (regenScore >= config.qualityThreshold || regenScore > qualityScore) {
            finalComment = regenComment
            qualityScore = regenScore
            regenerated = true
            if (regenScore >= config.qualityThreshold) break
          }
        }

        // 재생성 후에도 미달이면 가장 높은 점수의 결과 사용 + 로그
        if (qualityScore < config.qualityThreshold) {
          regenerated = regenerationAttempts > 0
        }
      }

      results.push({
        comment: finalComment,
        qualityScore,
        passed: qualityScore >= config.qualityThreshold,
        regenerated,
        regenerationAttempts,
      })
    }
  }

  // 비용 절감 계산: 배치 없이 개별 호출 시 총 호출 = inputs.length
  // 실제 호출 = totalCalls, 절감 = (inputs.length - totalCalls) / inputs.length
  const individualCostEstimate = inputs.length
  const totalCostSaved =
    individualCostEstimate > 0
      ? Math.round(
          ((individualCostEstimate - batchCalls - regenerationCalls) / individualCostEstimate) * 100
        ) / 100
      : 0

  return {
    batchGroupId,
    results,
    totalCalls,
    batchCalls,
    regenerationCalls,
    totalCostSaved: Math.max(0, totalCostSaved),
  }
}

// ── 유틸리티 ─────────────────────────────────────────────────

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// ── 배치 프롬프트 빌더 ───────────────────────────────────────

/**
 * 배치 LLM 프롬프트 빌드.
 * N개 댓글을 JSON 배열로 요청하는 프롬프트 생성.
 */
export function buildBatchPrompt(inputs: BatchCommentInput[]): string {
  const items = inputs.map((input, idx) => {
    return `[댓글 ${idx + 1}]
포스트: ${input.postContent.slice(0, 200)}
톤: ${input.tone.tone} (확신: ${input.tone.confidence.toFixed(2)})
이유: ${input.tone.reason}`
  })

  return `다음 ${inputs.length}개의 포스트에 대한 댓글을 각각 작성하세요.
각 댓글은 독립적으로, 지정된 톤에 맞게 작성합니다.

${items.join("\n\n")}

출력 형식 (JSON 배열만 출력, 다른 텍스트 없이):
["첫번째 댓글", "두번째 댓글", ...]`
}

/**
 * 배치 LLM 응답 파서.
 * JSON 배열 형태의 응답을 개별 댓글로 분리.
 */
export function parseBatchResponse(response: string, expectedCount: number): string[] {
  try {
    // JSON 배열 추출
    const match = response.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0]) as unknown[]
      const comments = parsed.map((item) => String(item).trim()).filter((s) => s.length > 0)
      if (comments.length >= 1) {
        return comments
      }
    }
  } catch {
    // JSON 파싱 실패
  }

  // 폴백: 줄바꿈 기반 분리
  const lines = response
    .split(/\n/)
    .map((l) => l.replace(/^\d+[.)]\s*/, "").trim())
    .filter((l) => l.length > 5)

  return lines.slice(0, expectedCount)
}
