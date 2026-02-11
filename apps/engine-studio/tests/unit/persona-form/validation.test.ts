// ═══════════════════════════════════════════════════════════════
// Persona Form Validation Tests
// persona-form.ts: validateStep1, validateStep2, validateStep3
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  validateStep1,
  validateStep2,
  validateStep3,
  PERSONA_ROLES,
  EXPERTISE_OPTIONS,
  INITIAL_FORM_STATE,
} from "@/types/persona-form"
import type { BasicInfoFormData, VectorFormData, PromptFormData } from "@/types"

// ── Helpers ─────────────────────────────────────────────────
const validBasicInfo: BasicInfoFormData = {
  name: "테스트 페르소나",
  role: "REVIEWER",
  expertise: ["영화", "음악"],
  profileImageUrl: "",
  description: "테스트 설명",
}

const validVectors: VectorFormData = {
  l1: {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
    sociability: 0.5,
  },
  l2: {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  },
  l3: { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
  archetypeId: null,
}

const validPrompt: PromptFormData = {
  basePrompt:
    "이것은 테스트 프롬프트입니다. 최소 50자 이상이어야 합니다. 길이를 충분히 맞추기 위한 텍스트입니다.",
  promptVersion: "1.0",
}

// ═══════════════════════════════════════════════════════════════
// validateStep1 — Basic Info
// ═══════════════════════════════════════════════════════════════
describe("validateStep1", () => {
  it("passes with valid data", () => {
    const result = validateStep1(validBasicInfo)
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  it("fails when name is empty", () => {
    const result = validateStep1({ ...validBasicInfo, name: "" })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it("fails when name is whitespace only", () => {
    const result = validateStep1({ ...validBasicInfo, name: "   " })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it("fails when name is 1 character", () => {
    const result = validateStep1({ ...validBasicInfo, name: "A" })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toContain("2자")
  })

  it("passes with exactly 2 characters", () => {
    const result = validateStep1({ ...validBasicInfo, name: "AB" })
    expect(result.valid).toBe(true)
  })

  it("passes with exactly 30 characters", () => {
    const result = validateStep1({ ...validBasicInfo, name: "A".repeat(30) })
    expect(result.valid).toBe(true)
  })

  it("fails when name exceeds 30 characters", () => {
    const result = validateStep1({ ...validBasicInfo, name: "A".repeat(31) })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toContain("30자")
  })

  it("fails when role is empty", () => {
    const result = validateStep1({ ...validBasicInfo, role: "" as BasicInfoFormData["role"] })
    expect(result.valid).toBe(false)
    expect(result.errors.role).toBeDefined()
  })

  it("passes with empty expertise array", () => {
    const result = validateStep1({ ...validBasicInfo, expertise: [] })
    expect(result.valid).toBe(true)
  })

  it("fails when description exceeds 100 characters", () => {
    const result = validateStep1({ ...validBasicInfo, description: "A".repeat(101) })
    expect(result.valid).toBe(false)
    expect(result.errors.description).toContain("100자")
  })

  it("passes with description at exactly 100 characters", () => {
    const result = validateStep1({ ...validBasicInfo, description: "A".repeat(100) })
    expect(result.valid).toBe(true)
  })

  it("passes with empty description", () => {
    const result = validateStep1({ ...validBasicInfo, description: "" })
    expect(result.valid).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// validateStep2 — Vector Data
// ═══════════════════════════════════════════════════════════════
describe("validateStep2", () => {
  it("passes with valid vectors (all 0.5)", () => {
    const result = validateStep2(validVectors)
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  it("passes with boundary values (0.0 and 1.0)", () => {
    const result = validateStep2({
      ...validVectors,
      l1: { depth: 0, lens: 1, stance: 0, scope: 1, taste: 0, purpose: 1, sociability: 0 },
    })
    expect(result.valid).toBe(true)
  })

  it("fails when L1 dimension is below 0", () => {
    const result = validateStep2({
      ...validVectors,
      l1: { ...validVectors.l1, depth: -0.1 },
    })
    expect(result.valid).toBe(false)
    expect(result.errors["l1.depth"]).toBeDefined()
  })

  it("fails when L2 dimension exceeds 1", () => {
    const result = validateStep2({
      ...validVectors,
      l2: { ...validVectors.l2, openness: 1.1 },
    })
    expect(result.valid).toBe(false)
    expect(result.errors["l2.openness"]).toBeDefined()
  })

  it("fails when L3 dimension is out of range", () => {
    const result = validateStep2({
      ...validVectors,
      l3: { ...validVectors.l3, volatility: -0.5 },
    })
    expect(result.valid).toBe(false)
    expect(result.errors["l3.volatility"]).toBeDefined()
  })

  it("accumulates multiple errors across layers", () => {
    const result = validateStep2({
      l1: {
        depth: -1,
        lens: 2,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
      l2: {
        openness: -1,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      },
      l3: { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
      archetypeId: null,
    })
    expect(result.valid).toBe(false)
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(3)
  })
})

// ═══════════════════════════════════════════════════════════════
// validateStep3 — Prompt
// ═══════════════════════════════════════════════════════════════
describe("validateStep3", () => {
  it("passes with valid prompt", () => {
    const result = validateStep3(validPrompt)
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  it("fails when prompt is empty", () => {
    const result = validateStep3({ ...validPrompt, basePrompt: "" })
    expect(result.valid).toBe(false)
    expect(result.errors.basePrompt).toBeDefined()
  })

  it("fails when prompt is whitespace only", () => {
    const result = validateStep3({ ...validPrompt, basePrompt: "     " })
    expect(result.valid).toBe(false)
    expect(result.errors.basePrompt).toBeDefined()
  })

  it("fails when prompt is under 50 characters", () => {
    const result = validateStep3({ ...validPrompt, basePrompt: "짧은 프롬프트" })
    expect(result.valid).toBe(false)
    expect(result.errors.basePrompt).toContain("50자")
  })

  it("passes with exactly 50 characters", () => {
    const result = validateStep3({ ...validPrompt, basePrompt: "A".repeat(50) })
    expect(result.valid).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════
describe("Form Constants", () => {
  it("PERSONA_ROLES has 5 roles", () => {
    expect(PERSONA_ROLES).toHaveLength(5)
  })

  it("all roles have value, label, description", () => {
    for (const role of PERSONA_ROLES) {
      expect(role.value).toBeTruthy()
      expect(role.label).toBeTruthy()
      expect(role.description).toBeTruthy()
    }
  })

  it("EXPERTISE_OPTIONS has 16 items", () => {
    expect(EXPERTISE_OPTIONS).toHaveLength(16)
  })

  it("INITIAL_FORM_STATE has correct default step", () => {
    expect(INITIAL_FORM_STATE.step).toBe(0)
  })

  it("INITIAL_FORM_STATE has all L1 vectors at 0.5", () => {
    const l1 = INITIAL_FORM_STATE.vectors.l1
    expect(l1.depth).toBe(0.5)
    expect(l1.lens).toBe(0.5)
    expect(l1.stance).toBe(0.5)
    expect(l1.scope).toBe(0.5)
    expect(l1.taste).toBe(0.5)
    expect(l1.purpose).toBe(0.5)
    expect(l1.sociability).toBe(0.5)
  })

  it("INITIAL_FORM_STATE has all L2 vectors at 0.5", () => {
    const l2 = INITIAL_FORM_STATE.vectors.l2
    expect(l2.openness).toBe(0.5)
    expect(l2.conscientiousness).toBe(0.5)
    expect(l2.extraversion).toBe(0.5)
    expect(l2.agreeableness).toBe(0.5)
    expect(l2.neuroticism).toBe(0.5)
  })

  it("INITIAL_FORM_STATE has all L3 vectors at 0.5", () => {
    const l3 = INITIAL_FORM_STATE.vectors.l3
    expect(l3.lack).toBe(0.5)
    expect(l3.moralCompass).toBe(0.5)
    expect(l3.volatility).toBe(0.5)
    expect(l3.growthArc).toBe(0.5)
  })

  it("INITIAL_FORM_STATE prompt defaults", () => {
    expect(INITIAL_FORM_STATE.prompt.basePrompt).toBe("")
    expect(INITIAL_FORM_STATE.prompt.promptVersion).toBe("1.0")
  })
})
