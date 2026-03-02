// ═══════════════════════════════════════════════════════════════
// Batch Comment Generator Tests — T329
// 배치 생성 + 품질 게이트 자동 재생성
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from "vitest"

import {
  generateBatchComments,
  scoreCommentQuality,
  buildBatchPrompt,
  parseBatchResponse,
  generateBatchGroupId,
  type BatchCommentInput,
  type BatchLLMProvider,
  type QualityScorer,
} from "@/lib/persona-world/batch-comment-generator"
import type { BatchCommentConfig } from "@/lib/global-config/optimization-config"

// ── 테스트 헬퍼 ──────────────────────────────────────────────

function createMockInput(overrides?: Partial<BatchCommentInput>): BatchCommentInput {
  return {
    personaId: "persona-1",
    postId: "post-1",
    postContent: "오늘 본 영화가 정말 감동적이었어요.",
    tone: {
      tone: "empathetic",
      confidence: 0.8,
      reason: "감성적 포스트",
      paradoxInfluence: false,
    },
    ragContext: {
      voiceAnchor: "",
      relationMemory: "",
      interestContinuity: "",
      consumptionMemory: "",
    },
    commenterState: {
      mood: 0.7,
      energy: 0.6,
      socialBattery: 0.5,
      paradoxTension: 0.3,
    },
    ...overrides,
  }
}

function createMockLLMProvider(options?: {
  batchResponse?: string[]
  singleResponse?: string
  batchFail?: boolean
}): BatchLLMProvider {
  return {
    generateSingle: vi
      .fn()
      .mockResolvedValue(options?.singleResponse ?? "좋은 글이에요! 공감합니다."),
    generateBatch: options?.batchFail
      ? vi.fn().mockRejectedValue(new Error("batch failed"))
      : vi
          .fn()
          .mockResolvedValue(
            options?.batchResponse ?? [
              "정말 공감해요. 저도 비슷한 경험이 있어서 더 와닿네요.",
              "감동적인 이야기네요. 어떤 영화인지 궁금해요!",
              "진짜요? 나도 보고 싶다.. 추천 감사합니다!",
            ]
          ),
  }
}

// ── scoreCommentQuality ──────────────────────────────────────

describe("scoreCommentQuality", () => {
  const input = createMockInput()

  it("적절한 길이의 자연스러운 댓글 → 높은 점수", () => {
    const score = scoreCommentQuality(
      "정말 공감해요. 저도 비슷한 경험이 있어서 더 와닿네요.",
      input
    )
    expect(score).toBeGreaterThanOrEqual(0.8)
  })

  it("너무 짧은 댓글 → 낮은 점수", () => {
    const score = scoreCommentQuality("좋아", input)
    expect(score).toBeLessThan(0.7)
  })

  it("빈 댓글 → 매우 낮은 점수", () => {
    const score = scoreCommentQuality("", input)
    expect(score).toBeLessThan(0.3)
  })

  it("JSON 잔해가 포함된 댓글 → 자연스러움 감점", () => {
    const score = scoreCommentQuality('{"comment": "JSON 형식의 응답"}', input)
    const normalScore = scoreCommentQuality("정말 좋은 글이에요, 공감합니다!", input)
    expect(score).toBeLessThan(normalScore)
  })

  it("번호 매기기 패턴 → 자연스러움 감점", () => {
    const score = scoreCommentQuality("1. 첫번째 포인트입니다", input)
    const normalScore = scoreCommentQuality("첫번째 포인트입니다", input)
    expect(score).toBeLessThan(normalScore)
  })

  it("메타 텍스트 패턴 → 자연스러움 감점", () => {
    const score = scoreCommentQuality("댓글: 좋은 글이에요", input)
    const normalScore = scoreCommentQuality("좋은 글이에요!", input)
    expect(score).toBeLessThan(normalScore)
  })

  it("톤 불일치 → 정상 댓글보다 낮은 점수", () => {
    const empatheticInput = createMockInput({
      tone: { tone: "empathetic", confidence: 0.8, reason: "", paradoxInfluence: false },
    })
    const mismatchScore = scoreCommentQuality(
      "완전 틀렸어. 공격적으로 반박합니다.",
      empatheticInput
    )
    const matchScore = scoreCommentQuality("정말 공감해요. 마음이 따뜻해지네요.", empatheticInput)
    expect(mismatchScore).toBeLessThan(matchScore)
  })

  it("점수는 0~1 범위", () => {
    const score1 = scoreCommentQuality("", input)
    const score2 = scoreCommentQuality("x".repeat(1000), input)
    expect(score1).toBeGreaterThanOrEqual(0)
    expect(score1).toBeLessThanOrEqual(1)
    expect(score2).toBeGreaterThanOrEqual(0)
    expect(score2).toBeLessThanOrEqual(1)
  })
})

// ── generateBatchGroupId ─────────────────────────────────────

describe("generateBatchGroupId", () => {
  it("batch-comment- 접두사를 가져야 함", () => {
    const id = generateBatchGroupId()
    expect(id).toMatch(/^batch-comment-\d{8}-[a-z0-9]+$/)
  })

  it("매번 다른 ID를 생성해야 함", () => {
    const id1 = generateBatchGroupId()
    const id2 = generateBatchGroupId()
    expect(id1).not.toBe(id2)
  })
})

// ── buildBatchPrompt ─────────────────────────────────────────

describe("buildBatchPrompt", () => {
  it("N개 입력에 대한 배치 프롬프트를 생성한다", () => {
    const inputs = [createMockInput(), createMockInput({ postContent: "다른 포스트" })]
    const prompt = buildBatchPrompt(inputs)

    expect(prompt).toContain("2개의 포스트")
    expect(prompt).toContain("[댓글 1]")
    expect(prompt).toContain("[댓글 2]")
    expect(prompt).toContain("JSON 배열")
  })

  it("포스트 내용이 200자 초과 시 잘린다", () => {
    const longContent = "가".repeat(300)
    const inputs = [createMockInput({ postContent: longContent })]
    const prompt = buildBatchPrompt(inputs)

    expect(prompt).not.toContain("가".repeat(300))
    expect(prompt).toContain("가".repeat(200))
  })
})

// ── parseBatchResponse ───────────────────────────────────────

describe("parseBatchResponse", () => {
  it("JSON 배열 응답을 파싱한다", () => {
    const response = '["첫번째 댓글", "두번째 댓글", "세번째 댓글"]'
    const result = parseBatchResponse(response, 3)
    expect(result).toEqual(["첫번째 댓글", "두번째 댓글", "세번째 댓글"])
  })

  it("JSON 배열 앞뒤 텍스트가 있어도 추출한다", () => {
    const response = '다음은 댓글입니다:\n["댓글1", "댓글2"]\n완료'
    const result = parseBatchResponse(response, 2)
    expect(result).toEqual(["댓글1", "댓글2"])
  })

  it("JSON 파싱 실패 시 줄바꿈 기반 폴백", () => {
    const response = "첫번째 댓글입니다\n두번째 댓글입니다\n세번째 댓글입니다"
    const result = parseBatchResponse(response, 3)
    expect(result.length).toBeGreaterThanOrEqual(1)
  })

  it("빈 응답은 빈 배열 반환", () => {
    const result = parseBatchResponse("", 3)
    expect(result).toHaveLength(0)
  })

  it("빈 문자열 항목은 필터링", () => {
    const response = '["좋은 댓글", "", "또 다른 댓글"]'
    const result = parseBatchResponse(response, 3)
    expect(result).toEqual(["좋은 댓글", "또 다른 댓글"])
  })
})

// ── generateBatchComments (핵심 파이프라인) ──────────────────

describe("generateBatchComments", () => {
  const config: BatchCommentConfig = {
    maxBatchSize: 3,
    qualityThreshold: 0.9,
    maxRegenerationAttempts: 2,
    regenerationModel: "claude-sonnet-4-5-20250929",
  }

  it("배치 생성 성공 — 모든 댓글 품질 통과", async () => {
    const inputs = [createMockInput(), createMockInput(), createMockInput()]
    const llm = createMockLLMProvider()
    // 항상 높은 점수를 반환하는 scorer
    const scorer: QualityScorer = { scoreComment: () => 0.95 }

    const result = await generateBatchComments(inputs, llm, config, scorer)

    expect(result.batchGroupId).toMatch(/^batch-comment-/)
    expect(result.results).toHaveLength(3)
    expect(result.results.every((r) => r.passed)).toBe(true)
    expect(result.results.every((r) => !r.regenerated)).toBe(true)
    expect(result.batchCalls).toBe(1) // 3개를 1회 배치로
    expect(result.regenerationCalls).toBe(0)
  })

  it("배치 실패 시 개별 생성으로 폴백", async () => {
    const inputs = [createMockInput(), createMockInput()]
    const llm = createMockLLMProvider({ batchFail: true })
    const scorer: QualityScorer = { scoreComment: () => 0.95 }

    const result = await generateBatchComments(inputs, llm, config, scorer)

    expect(result.results).toHaveLength(2)
    expect(result.batchCalls).toBe(0) // 배치 실패
    expect(llm.generateSingle).toHaveBeenCalledTimes(2) // 개별 2회
  })

  it("품질 미달 시 자동 재생성", async () => {
    const inputs = [createMockInput()]
    const llm = createMockLLMProvider()

    // 첫 번째 채점: 0.7 (미달), 재생성 후 두 번째: 0.95 (통과)
    let callCount = 0
    const scorer: QualityScorer = {
      scoreComment: () => {
        callCount++
        return callCount === 1 ? 0.7 : 0.95
      },
    }

    const result = await generateBatchComments(inputs, llm, config, scorer)

    expect(result.results[0].passed).toBe(true)
    expect(result.results[0].regenerated).toBe(true)
    expect(result.results[0].regenerationAttempts).toBeGreaterThanOrEqual(1)
    expect(result.regenerationCalls).toBeGreaterThanOrEqual(1)
  })

  it("최대 재생성 횟수 초과 시 가장 높은 점수의 결과 사용", async () => {
    const inputs = [createMockInput()]
    const llm = createMockLLMProvider()

    // 항상 미달 점수
    const scorer: QualityScorer = { scoreComment: () => 0.5 }

    const result = await generateBatchComments(inputs, llm, config, scorer)

    expect(result.results[0].passed).toBe(false)
    expect(result.results[0].regenerationAttempts).toBe(config.maxRegenerationAttempts)
    expect(result.results[0].qualityScore).toBe(0.5)
  })

  it("배치 결과가 입력보다 적으면 부족분을 개별 생성", async () => {
    const inputs = [createMockInput(), createMockInput(), createMockInput()]
    const llm = createMockLLMProvider({
      batchResponse: ["댓글 하나만"], // 3개 요청했는데 1개만 반환
    })
    const scorer: QualityScorer = { scoreComment: () => 0.95 }

    const result = await generateBatchComments(inputs, llm, config, scorer)

    expect(result.results).toHaveLength(3)
    // 부족분 2개는 개별 생성
    expect(llm.generateSingle).toHaveBeenCalledTimes(2)
  })

  it("여러 배치로 나뉘어 처리된다 (maxBatchSize=3, 입력=5)", async () => {
    const inputs = Array.from({ length: 5 }, (_, i) => createMockInput({ postId: `post-${i}` }))
    const llm = createMockLLMProvider()
    const scorer: QualityScorer = { scoreComment: () => 0.95 }

    const result = await generateBatchComments(inputs, llm, config, scorer)

    expect(result.results).toHaveLength(5)
    expect(result.batchCalls).toBe(2) // ceil(5/3) = 2 배치
  })

  it("빈 입력 → 빈 결과", async () => {
    const llm = createMockLLMProvider()
    const scorer: QualityScorer = { scoreComment: () => 0.95 }

    const result = await generateBatchComments([], llm, config, scorer)

    expect(result.results).toHaveLength(0)
    expect(result.totalCalls).toBe(0)
  })

  it("비용 절감률이 0 이상이어야 함", async () => {
    const inputs = [createMockInput(), createMockInput(), createMockInput()]
    const llm = createMockLLMProvider()
    const scorer: QualityScorer = { scoreComment: () => 0.95 }

    const result = await generateBatchComments(inputs, llm, config, scorer)

    expect(result.totalCostSaved).toBeGreaterThanOrEqual(0)
    expect(result.totalCostSaved).toBeLessThanOrEqual(1)
  })

  it("재생성 후 더 높은 점수가 나오면 교체한다", async () => {
    const inputs = [createMockInput()]
    const llm = createMockLLMProvider({
      singleResponse: "재생성된 더 좋은 댓글입니다. 정말 공감합니다.",
    })

    // 배치: 0.6 → 재생성 1회: 0.85 (개선 but 미달) → 재생성 2회: 0.95 (통과)
    let callCount = 0
    const scorer: QualityScorer = {
      scoreComment: () => {
        callCount++
        if (callCount === 1) return 0.6
        if (callCount === 2) return 0.85
        return 0.95
      },
    }

    const result = await generateBatchComments(inputs, llm, config, scorer)

    expect(result.results[0].qualityScore).toBe(0.95)
    expect(result.results[0].regenerated).toBe(true)
    expect(result.results[0].passed).toBe(true)
  })
})
