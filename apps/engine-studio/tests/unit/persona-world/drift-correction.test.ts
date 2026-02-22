import { describe, it, expect } from "vitest"
import {
  applyDriftCorrection,
  getCorrectionStrength,
  CORRECTION_ALPHA_WARNING,
  CORRECTION_ALPHA_CRITICAL,
} from "@/lib/persona-world/quality/drift-correction"
import type { VoiceStyleParams } from "@/lib/persona-world/types"
import type { DriftSeverity } from "@/lib/persona-world/quality/persona-drift"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeVoice(overrides: Partial<VoiceStyleParams> = {}): VoiceStyleParams {
  return {
    formality: 0.5,
    humor: 0.5,
    sentenceLength: 0.5,
    emotionExpression: 0.5,
    assertiveness: 0.5,
    vocabularyLevel: 0.5,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// getCorrectionStrength
// ═══════════════════════════════════════════════════════════════

describe("getCorrectionStrength", () => {
  it("STABLE → 0 (보정 없음)", () => {
    expect(getCorrectionStrength("STABLE")).toBe(0)
  })

  it("WARNING → CORRECTION_ALPHA_WARNING (0.3)", () => {
    expect(getCorrectionStrength("WARNING")).toBe(CORRECTION_ALPHA_WARNING)
  })

  it("CRITICAL → CORRECTION_ALPHA_CRITICAL (0.7)", () => {
    expect(getCorrectionStrength("CRITICAL")).toBe(CORRECTION_ALPHA_CRITICAL)
  })

  it("WARNING < CRITICAL (강도 순서 보장)", () => {
    expect(getCorrectionStrength("WARNING")).toBeLessThan(getCorrectionStrength("CRITICAL"))
  })
})

// ═══════════════════════════════════════════════════════════════
// applyDriftCorrection
// ═══════════════════════════════════════════════════════════════

describe("applyDriftCorrection — STABLE", () => {
  it("STABLE → applied=false", () => {
    const baseline = makeVoice()
    const current = makeVoice({ formality: 0.8 })
    const result = applyDriftCorrection(current, baseline, "STABLE")
    expect(result.applied).toBe(false)
  })

  it("STABLE → corrected=null", () => {
    const baseline = makeVoice()
    const current = makeVoice({ formality: 0.8 })
    const result = applyDriftCorrection(current, baseline, "STABLE")
    expect(result.corrected).toBeNull()
  })

  it("STABLE → alpha=0", () => {
    const baseline = makeVoice()
    const current = makeVoice({ formality: 0.8 })
    const result = applyDriftCorrection(current, baseline, "STABLE")
    expect(result.alpha).toBe(0)
  })

  it("STABLE → summary=null", () => {
    const baseline = makeVoice()
    const current = makeVoice()
    const result = applyDriftCorrection(current, baseline, "STABLE")
    expect(result.summary).toBeNull()
  })
})

describe("applyDriftCorrection — WARNING", () => {
  const baseline = makeVoice({ formality: 0.5 })
  const current = makeVoice({ formality: 0.9 }) // 0.4 이탈

  it("WARNING → applied=true", () => {
    const result = applyDriftCorrection(current, baseline, "WARNING")
    expect(result.applied).toBe(true)
  })

  it("WARNING → alpha=0.3", () => {
    const result = applyDriftCorrection(current, baseline, "WARNING")
    expect(result.alpha).toBe(CORRECTION_ALPHA_WARNING)
  })

  it("WARNING → corrected.formality가 current와 baseline 사이에 위치", () => {
    const result = applyDriftCorrection(current, baseline, "WARNING")
    expect(result.corrected!.formality).toBeGreaterThan(baseline.formality)
    expect(result.corrected!.formality).toBeLessThan(current.formality)
  })

  it("WARNING → corrected.formality = current + (baseline - current) * 0.3", () => {
    const result = applyDriftCorrection(current, baseline, "WARNING")
    const expected = current.formality + (baseline.formality - current.formality) * 0.3
    expect(result.corrected!.formality).toBeCloseTo(expected, 3)
  })

  it("WARNING → 이탈 없는 차원은 변화 없음 (humor 유지)", () => {
    const result = applyDriftCorrection(current, baseline, "WARNING")
    expect(result.corrected!.humor).toBeCloseTo(current.humor, 3)
  })

  it("WARNING → summary에 '약한 교정' 포함", () => {
    const result = applyDriftCorrection(current, baseline, "WARNING")
    expect(result.summary).toContain("약한 교정")
  })
})

describe("applyDriftCorrection — CRITICAL", () => {
  const baseline = makeVoice({ formality: 0.3, humor: 0.2 })
  const current = makeVoice({ formality: 0.9, humor: 0.8 })

  it("CRITICAL → applied=true", () => {
    const result = applyDriftCorrection(current, baseline, "CRITICAL")
    expect(result.applied).toBe(true)
  })

  it("CRITICAL → alpha=0.7", () => {
    const result = applyDriftCorrection(current, baseline, "CRITICAL")
    expect(result.alpha).toBe(CORRECTION_ALPHA_CRITICAL)
  })

  it("CRITICAL → corrected.formality가 WARNING보다 baseline에 더 가까움", () => {
    const warning = applyDriftCorrection(current, baseline, "WARNING")
    const critical = applyDriftCorrection(current, baseline, "CRITICAL")
    const distWarning = Math.abs(warning.corrected!.formality - baseline.formality)
    const distCritical = Math.abs(critical.corrected!.formality - baseline.formality)
    expect(distCritical).toBeLessThan(distWarning)
  })

  it("CRITICAL → summary에 '강한 교정' 포함", () => {
    const result = applyDriftCorrection(current, baseline, "CRITICAL")
    expect(result.summary).toContain("강한 교정")
  })

  it("CRITICAL → summary에 변경된 차원 정보 포함", () => {
    const result = applyDriftCorrection(current, baseline, "CRITICAL")
    expect(result.summary).toContain("formality")
  })
})

describe("applyDriftCorrection — 경계값 및 클램프", () => {
  it("보정 후 0 미만이 되어도 0으로 클램프", () => {
    const baseline = makeVoice({ formality: 0.0 })
    const current = makeVoice({ formality: 0.1 })
    const result = applyDriftCorrection(current, baseline, "CRITICAL")
    expect(result.corrected!.formality).toBeGreaterThanOrEqual(0)
  })

  it("보정 후 1 초과가 되어도 1로 클램프", () => {
    const baseline = makeVoice({ formality: 1.0 })
    const current = makeVoice({ formality: 0.9 })
    const result = applyDriftCorrection(current, baseline, "CRITICAL")
    expect(result.corrected!.formality).toBeLessThanOrEqual(1)
  })

  it("baseline === current → corrected === current (이탈 없음)", () => {
    const voice = makeVoice()
    const result = applyDriftCorrection(voice, voice, "WARNING")
    const keys = Object.keys(voice) as Array<keyof VoiceStyleParams>
    for (const k of keys) {
      expect(result.corrected![k]).toBeCloseTo(voice[k], 3)
    }
  })

  it("corrected의 모든 차원이 0~1 범위", () => {
    const baseline = makeVoice()
    const current = makeVoice({
      formality: 0.99,
      humor: 0.01,
      sentenceLength: 0.95,
    })
    const result = applyDriftCorrection(current, baseline, "CRITICAL")
    const keys = Object.keys(baseline) as Array<keyof VoiceStyleParams>
    for (const k of keys) {
      expect(result.corrected![k]).toBeGreaterThanOrEqual(0)
      expect(result.corrected![k]).toBeLessThanOrEqual(1)
    }
  })

  it("순수 함수 — 동일 입력 → 동일 결과", () => {
    const baseline = makeVoice({ formality: 0.3 })
    const current = makeVoice({ formality: 0.9 })
    const r1 = applyDriftCorrection(current, baseline, "WARNING")
    const r2 = applyDriftCorrection(current, baseline, "WARNING")
    expect(r1).toEqual(r2)
  })

  it("입력 객체를 변경하지 않음 (불변성)", () => {
    const baseline = makeVoice({ formality: 0.3 })
    const current = makeVoice({ formality: 0.9 })
    const originalFormality = current.formality
    applyDriftCorrection(current, baseline, "CRITICAL")
    expect(current.formality).toBe(originalFormality)
  })
})

describe("applyDriftCorrection — 6개 차원 전체 보정 검증", () => {
  it("WARNING: 6개 차원 모두 올바른 방향으로 이동", () => {
    const baseline = makeVoice({
      formality: 0.2,
      humor: 0.8,
      sentenceLength: 0.3,
      emotionExpression: 0.9,
      assertiveness: 0.1,
      vocabularyLevel: 0.7,
    })
    const current = makeVoice({
      formality: 0.8,
      humor: 0.2,
      sentenceLength: 0.9,
      emotionExpression: 0.1,
      assertiveness: 0.9,
      vocabularyLevel: 0.1,
    })

    const result = applyDriftCorrection(current, baseline, "WARNING")
    const corrected = result.corrected!
    const keys = Object.keys(baseline) as Array<keyof VoiceStyleParams>

    for (const k of keys) {
      const dir = baseline[k] > current[k] ? 1 : -1
      const moved = (corrected[k] - current[k]) * dir
      expect(moved).toBeGreaterThanOrEqual(0)
    }
  })
})
