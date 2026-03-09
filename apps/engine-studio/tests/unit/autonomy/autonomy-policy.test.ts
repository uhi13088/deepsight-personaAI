import { describe, it, expect } from "vitest"
import {
  type AutonomyPolicy,
  DEFAULT_AUTONOMY_POLICY,
  getAutonomyPolicy,
  validateAutonomyPolicy,
} from "@/lib/autonomy/autonomy-policy"

// ── DEFAULT_AUTONOMY_POLICY ──────────────────────────────────

describe("DEFAULT_AUTONOMY_POLICY", () => {
  it("모든 자율 기능이 비활성 (opt-in)", () => {
    expect(DEFAULT_AUTONOMY_POLICY.autoCorrection).toBe(false)
    expect(DEFAULT_AUTONOMY_POLICY.autoMemoryManagement).toBe(false)
    expect(DEFAULT_AUTONOMY_POLICY.metaCognitionEnabled).toBe(false)
  })

  it("correctionConfig 기본값", () => {
    expect(DEFAULT_AUTONOMY_POLICY.correctionConfig).toEqual({
      maxAutoSeverity: "major",
      minConfidence: 0.9,
      dailyLimit: 3,
    })
  })

  it("memoryConfig 기본값", () => {
    expect(DEFAULT_AUTONOMY_POLICY.memoryConfig).toEqual({
      pruneConfidenceThreshold: 0.2,
      maxPerCategory: 100,
    })
  })
})

// ── getAutonomyPolicy ────────────────────────────────────────

describe("getAutonomyPolicy", () => {
  it("autonomyPolicy가 null이면 기본값 반환", () => {
    const result = getAutonomyPolicy({ autonomyPolicy: null })
    expect(result).toEqual(DEFAULT_AUTONOMY_POLICY)
  })

  it("autonomyPolicy가 undefined이면 기본값 반환", () => {
    const result = getAutonomyPolicy({})
    expect(result).toEqual(DEFAULT_AUTONOMY_POLICY)
  })

  it("유효한 policy를 올바르게 파싱", () => {
    const policy: AutonomyPolicy = {
      autoCorrection: true,
      autoMemoryManagement: true,
      metaCognitionEnabled: false,
      correctionConfig: {
        maxAutoSeverity: "minor",
        minConfidence: 0.85,
        dailyLimit: 5,
      },
      memoryConfig: {
        pruneConfidenceThreshold: 0.3,
        maxPerCategory: 200,
      },
    }
    const result = getAutonomyPolicy({ autonomyPolicy: policy })
    expect(result).toEqual(policy)
  })

  it("부분 입력 시 누락 필드는 기본값으로 채움", () => {
    const result = getAutonomyPolicy({
      autonomyPolicy: { autoCorrection: true },
    })
    expect(result.autoCorrection).toBe(true)
    expect(result.autoMemoryManagement).toBe(false)
    expect(result.metaCognitionEnabled).toBe(false)
    expect(result.correctionConfig).toEqual(DEFAULT_AUTONOMY_POLICY.correctionConfig)
    expect(result.memoryConfig).toEqual(DEFAULT_AUTONOMY_POLICY.memoryConfig)
  })

  it("잘못된 boolean 값은 false로 폴백", () => {
    const result = getAutonomyPolicy({
      autonomyPolicy: { autoCorrection: "yes", metaCognitionEnabled: 1 },
    })
    expect(result.autoCorrection).toBe(false)
    expect(result.metaCognitionEnabled).toBe(false)
  })

  it("correctionConfig 부분 입력 시 나머지 기본값", () => {
    const result = getAutonomyPolicy({
      autonomyPolicy: {
        correctionConfig: { maxAutoSeverity: "minor" },
      },
    })
    expect(result.correctionConfig.maxAutoSeverity).toBe("minor")
    expect(result.correctionConfig.minConfidence).toBe(0.9)
    expect(result.correctionConfig.dailyLimit).toBe(3)
  })

  it("범위 밖 minConfidence는 기본값으로 폴백", () => {
    const result = getAutonomyPolicy({
      autonomyPolicy: {
        correctionConfig: { minConfidence: 0.5 }, // 0.7 미만
      },
    })
    expect(result.correctionConfig.minConfidence).toBe(0.9)
  })

  it("범위 밖 dailyLimit는 기본값으로 폴백", () => {
    const result = getAutonomyPolicy({
      autonomyPolicy: {
        correctionConfig: { dailyLimit: 100 }, // 10 초과
      },
    })
    expect(result.correctionConfig.dailyLimit).toBe(3)
  })

  it("범위 밖 pruneConfidenceThreshold는 기본값으로 폴백", () => {
    const result = getAutonomyPolicy({
      autonomyPolicy: {
        memoryConfig: { pruneConfidenceThreshold: 0.8 }, // 0.5 초과
      },
    })
    expect(result.memoryConfig.pruneConfidenceThreshold).toBe(0.2)
  })

  it("범위 밖 maxPerCategory는 기본값으로 폴백", () => {
    const result = getAutonomyPolicy({
      autonomyPolicy: {
        memoryConfig: { maxPerCategory: 5 }, // 10 미만
      },
    })
    expect(result.memoryConfig.maxPerCategory).toBe(100)
  })

  it("반환값은 원본 참조와 독립 (immutable)", () => {
    const result1 = getAutonomyPolicy({ autonomyPolicy: null })
    result1.autoCorrection = true
    const result2 = getAutonomyPolicy({ autonomyPolicy: null })
    expect(result2.autoCorrection).toBe(false)
  })
})

// ── validateAutonomyPolicy ───────────────────────────────────

describe("validateAutonomyPolicy", () => {
  it("유효한 전체 입력은 통과", () => {
    const input = {
      autoCorrection: true,
      autoMemoryManagement: false,
      metaCognitionEnabled: true,
      correctionConfig: {
        maxAutoSeverity: "minor",
        minConfidence: 0.85,
        dailyLimit: 5,
      },
      memoryConfig: {
        pruneConfidenceThreshold: 0.1,
        maxPerCategory: 50,
      },
    }
    const { valid, errors, policy } = validateAutonomyPolicy(input)
    expect(valid).toBe(true)
    expect(errors).toHaveLength(0)
    expect(policy).not.toBeNull()
    expect(policy!.autoCorrection).toBe(true)
  })

  it("빈 객체도 유효 (기본값 적용)", () => {
    const { valid, errors, policy } = validateAutonomyPolicy({})
    expect(valid).toBe(true)
    expect(errors).toHaveLength(0)
    expect(policy).toEqual(DEFAULT_AUTONOMY_POLICY)
  })

  it("null 입력은 실패", () => {
    const { valid, errors } = validateAutonomyPolicy(null)
    expect(valid).toBe(false)
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe("root")
  })

  it("string 입력은 실패", () => {
    const { valid } = validateAutonomyPolicy("not an object")
    expect(valid).toBe(false)
  })

  it("boolean 필드에 잘못된 타입이면 에러", () => {
    const { valid, errors } = validateAutonomyPolicy({ autoCorrection: "yes" })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.field === "autoCorrection")).toBe(true)
  })

  it("correctionConfig가 null이면 에러", () => {
    const { valid, errors } = validateAutonomyPolicy({ correctionConfig: null })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.field === "correctionConfig")).toBe(true)
  })

  it("maxAutoSeverity가 잘못된 값이면 에러", () => {
    const { valid, errors } = validateAutonomyPolicy({
      correctionConfig: { maxAutoSeverity: "critical" },
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.field === "correctionConfig.maxAutoSeverity")).toBe(true)
  })

  it("minConfidence 범위 밖이면 에러", () => {
    const { valid: v1, errors: e1 } = validateAutonomyPolicy({
      correctionConfig: { minConfidence: 0.5 },
    })
    expect(v1).toBe(false)
    expect(e1.some((e) => e.field === "correctionConfig.minConfidence")).toBe(true)

    const { valid: v2, errors: e2 } = validateAutonomyPolicy({
      correctionConfig: { minConfidence: 1.5 },
    })
    expect(v2).toBe(false)
    expect(e2.some((e) => e.field === "correctionConfig.minConfidence")).toBe(true)
  })

  it("dailyLimit가 정수가 아니면 에러", () => {
    const { valid, errors } = validateAutonomyPolicy({
      correctionConfig: { dailyLimit: 3.5 },
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.field === "correctionConfig.dailyLimit")).toBe(true)
  })

  it("dailyLimit 범위 밖이면 에러", () => {
    const { valid, errors } = validateAutonomyPolicy({
      correctionConfig: { dailyLimit: 0 },
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.field === "correctionConfig.dailyLimit")).toBe(true)
  })

  it("memoryConfig가 null이면 에러", () => {
    const { valid, errors } = validateAutonomyPolicy({ memoryConfig: null })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.field === "memoryConfig")).toBe(true)
  })

  it("pruneConfidenceThreshold 범위 밖이면 에러", () => {
    const { valid, errors } = validateAutonomyPolicy({
      memoryConfig: { pruneConfidenceThreshold: -0.1 },
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.field === "memoryConfig.pruneConfidenceThreshold")).toBe(true)
  })

  it("maxPerCategory 범위 밖이면 에러", () => {
    const { valid, errors } = validateAutonomyPolicy({
      memoryConfig: { maxPerCategory: 5000 },
    })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.field === "memoryConfig.maxPerCategory")).toBe(true)
  })

  it("여러 에러를 동시에 반환", () => {
    const { valid, errors } = validateAutonomyPolicy({
      autoCorrection: 42,
      correctionConfig: { minConfidence: 0.1, dailyLimit: 100 },
      memoryConfig: { maxPerCategory: 5 },
    })
    expect(valid).toBe(false)
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })

  it("경계값 테스트 — minConfidence 0.7은 유효", () => {
    const { valid } = validateAutonomyPolicy({
      correctionConfig: { minConfidence: 0.7 },
    })
    expect(valid).toBe(true)
  })

  it("경계값 테스트 — minConfidence 1.0은 유효", () => {
    const { valid } = validateAutonomyPolicy({
      correctionConfig: { minConfidence: 1.0 },
    })
    expect(valid).toBe(true)
  })

  it("경계값 테스트 — dailyLimit 1과 10 유효", () => {
    const { valid: v1 } = validateAutonomyPolicy({
      correctionConfig: { dailyLimit: 1 },
    })
    expect(v1).toBe(true)

    const { valid: v2 } = validateAutonomyPolicy({
      correctionConfig: { dailyLimit: 10 },
    })
    expect(v2).toBe(true)
  })
})
