// ═══════════════════════════════════════════════════════════════
// T53: 프롬프트 엔지니어링 테스트
// Prompt Builder v3 + Version Manager + Tester
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  buildPrompt,
  buildBasePrompt,
  buildReviewPrompt,
  buildPostPrompt,
  buildCommentPrompt,
  buildInteractionPrompt,
  buildAllPrompts,
  PROMPT_PRESETS,
  applyPreset,
} from "@/lib/prompt-builder"
import type { PromptBuildInput, PromptSet } from "@/lib/prompt-builder"
import {
  parseVersion,
  formatVersion,
  detectChangeType,
  bumpVersion,
  calculateDiff,
  createInitialVersion,
  createNewVersion,
  rollbackToVersion,
} from "@/lib/prompt-version"
import {
  analyzeTone,
  analyzeStructure,
  checkProhibitedWords,
  analyzeLength,
  checkVectorConsistency,
  testPrompt,
} from "@/lib/prompt-tester"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── Fixtures ──────────────────────────────────────────────────

const L1: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

const L2: CoreTemperamentVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
}

const L3: NarrativeDriveVector = {
  lack: 0.5,
  moralCompass: 0.5,
  volatility: 0.5,
  growthArc: 0.5,
}

const DEFAULT_INPUT: PromptBuildInput = {
  name: "테스트 페르소나",
  role: "REVIEWER",
  expertise: ["영화", "음악"],
  l1: L1,
  l2: L2,
  l3: L3,
}

// ═══════════════════════════════════════════════════════════════
// AC4: Prompt Builder v3
// ═══════════════════════════════════════════════════════════════

describe("Prompt Builder v3", () => {
  describe("buildPrompt (backward compat)", () => {
    it("should generate same output as buildBasePrompt", () => {
      const a = buildPrompt(DEFAULT_INPUT)
      const b = buildBasePrompt(DEFAULT_INPUT)
      expect(a).toBe(b)
    })
  })

  describe("buildBasePrompt", () => {
    it("should contain all required sections", () => {
      const result = buildBasePrompt(DEFAULT_INPUT)
      expect(result).toContain("[역할 정의]")
      expect(result).toContain("[성향 가이드 — L1 Social Persona]")
      expect(result).toContain("[내면 기질 — L2 OCEAN]")
      expect(result).toContain("[서사적 동기 — L3 Narrative Drive]")
      expect(result).toContain("[행동 지침]")
      expect(result).toContain("[금지 사항]")
    })

    it("should include persona name and role", () => {
      const result = buildBasePrompt(DEFAULT_INPUT)
      expect(result).toContain("테스트 페르소나")
      expect(result).toContain("REVIEWER")
    })
  })

  describe("buildReviewPrompt", () => {
    it("should contain review-specific sections", () => {
      const result = buildReviewPrompt(DEFAULT_INPUT)
      expect(result).toContain("[리뷰 작성 가이드]")
      expect(result).toContain("[리뷰 구조]")
      expect(result).toContain("첫인상")
      expect(result).toContain("종합 평가")
    })

    it("should adapt review length based on scope", () => {
      const highScope = buildReviewPrompt({ ...DEFAULT_INPUT, l1: { ...L1, scope: 0.9 } })
      expect(highScope).toContain("800자 이상")

      const lowScope = buildReviewPrompt({ ...DEFAULT_INPUT, l1: { ...L1, scope: 0.1 } })
      expect(lowScope).toContain("200~400자")
    })

    it("should adapt review tone based on stance", () => {
      const highStance = buildReviewPrompt({ ...DEFAULT_INPUT, l1: { ...L1, stance: 0.9 } })
      expect(highStance).toContain("날카로운 분석")

      const lowStance = buildReviewPrompt({ ...DEFAULT_INPUT, l1: { ...L1, stance: 0.1 } })
      expect(lowStance).toContain("긍정적 요소를 부각")
    })
  })

  describe("buildPostPrompt", () => {
    it("should contain post-specific sections", () => {
      const result = buildPostPrompt(DEFAULT_INPUT)
      expect(result).toContain("[포스트 작성 가이드]")
      expect(result).toContain("글쓰기 스타일")
    })

    it("should adapt style based on sociability", () => {
      const highSoc = buildPostPrompt({ ...DEFAULT_INPUT, l1: { ...L1, sociability: 0.9 } })
      expect(highSoc).toContain("대화체의 친근")

      const lowSoc = buildPostPrompt({ ...DEFAULT_INPUT, l1: { ...L1, sociability: 0.1 } })
      expect(lowSoc).toContain("독백적")
    })
  })

  describe("buildCommentPrompt", () => {
    it("should contain comment-specific sections", () => {
      const result = buildCommentPrompt(DEFAULT_INPUT)
      expect(result).toContain("[댓글 작성 가이드]")
      expect(result).toContain("댓글 스타일")
      expect(result).toContain("댓글 길이")
    })
  })

  describe("buildInteractionPrompt", () => {
    it("should contain interaction-specific sections", () => {
      const result = buildInteractionPrompt(DEFAULT_INPUT)
      expect(result).toContain("[대화 스타일 가이드]")
      expect(result).toContain("[대화 규칙]")
    })

    it("should adapt interaction style based on extraversion", () => {
      const highExt = buildInteractionPrompt({
        ...DEFAULT_INPUT,
        l2: { ...L2, extraversion: 0.9 },
      })
      expect(highExt).toContain("적극적이고 주도적인")

      const lowExt = buildInteractionPrompt({
        ...DEFAULT_INPUT,
        l2: { ...L2, extraversion: 0.1 },
      })
      expect(lowExt).toContain("신중하고 경청")
    })
  })

  describe("buildAllPrompts", () => {
    it("should return all 5 prompt types", () => {
      const result = buildAllPrompts(DEFAULT_INPUT)
      expect(result.base).toBeTruthy()
      expect(result.review).toBeTruthy()
      expect(result.post).toBeTruthy()
      expect(result.comment).toBeTruthy()
      expect(result.interaction).toBeTruthy()
    })

    it("should have different content for each type", () => {
      const result = buildAllPrompts(DEFAULT_INPUT)
      expect(result.base).not.toBe(result.review)
      expect(result.review).not.toBe(result.post)
      expect(result.post).not.toBe(result.comment)
      expect(result.comment).not.toBe(result.interaction)
    })
  })

  describe("Presets", () => {
    it("should have 4 presets", () => {
      expect(PROMPT_PRESETS).toHaveLength(4)
    })

    it("should apply preset without modifying unaffected prompts", () => {
      const original = buildAllPrompts(DEFAULT_INPUT)
      const applied = applyPreset(original, "sharp_critic")
      // base should be unchanged
      expect(applied.base).toBe(original.base)
      // review should have extra content
      expect(applied.review.length).toBeGreaterThan(original.review.length)
      expect(applied.review).toContain("추가 성격 지침")
    })

    it("should return unchanged set for unknown preset", () => {
      const original = buildAllPrompts(DEFAULT_INPUT)
      const applied = applyPreset(original, "nonexistent")
      expect(applied).toEqual(original)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Prompt Version Manager
// ═══════════════════════════════════════════════════════════════

describe("Prompt Version Manager", () => {
  describe("parseVersion", () => {
    it("should parse semver string", () => {
      expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 })
    })

    it("should handle short version strings", () => {
      expect(parseVersion("1.0")).toEqual({ major: 1, minor: 0, patch: 0 })
      expect(parseVersion("2")).toEqual({ major: 2, minor: 0, patch: 0 })
    })
  })

  describe("formatVersion", () => {
    it("should format version correctly", () => {
      expect(formatVersion(1, 2, 3)).toBe("1.2.3")
    })
  })

  describe("detectChangeType", () => {
    it("should detect MAJOR when prompt type added", () => {
      const old = { base: "hello" }
      const next = { base: "hello", review: "new review prompt" }
      expect(detectChangeType(old, next)).toBe("MAJOR")
    })

    it("should detect MAJOR when prompt type removed", () => {
      const old = { base: "hello", review: "review" }
      const next = { base: "hello", review: "" }
      expect(detectChangeType(old, next)).toBe("MAJOR")
    })

    it("should detect MINOR for content changes", () => {
      const old = { base: "line 1\nline 2\nline 3\nline 4\nline 5" }
      const next = {
        base: "line 1\nchanged A\nchanged B\nchanged C\nline 5\nnew line 6\nnew line 7",
      }
      expect(detectChangeType(old, next)).toBe("MINOR")
    })

    it("should detect PATCH for small changes", () => {
      const old = { base: "좋은 프롬프트입니다" }
      const next = { base: "좋은 프롬프트입니다." }
      expect(detectChangeType(old, next)).toBe("PATCH")
    })
  })

  describe("bumpVersion", () => {
    it("should bump major version", () => {
      expect(bumpVersion("1.2.3", "MAJOR")).toBe("2.0.0")
    })

    it("should bump minor version", () => {
      expect(bumpVersion("1.2.3", "MINOR")).toBe("1.3.0")
    })

    it("should bump patch version", () => {
      expect(bumpVersion("1.2.3", "PATCH")).toBe("1.2.4")
    })
  })

  describe("createInitialVersion", () => {
    it("should create v1.0.0", () => {
      const v = createInitialVersion({ base: "test prompt" })
      expect(v.versionString).toBe("1.0.0")
      expect(v.major).toBe(1)
      expect(v.changeType).toBe("MAJOR")
      expect(v.prompts.base).toBe("test prompt")
    })
  })

  describe("createNewVersion", () => {
    it("should auto-bump version based on change type", () => {
      const initial = createInitialVersion({ base: "original" })
      const history = { versions: [initial], currentVersion: "1.0.0" }
      const { version, history: newHistory } = createNewVersion(history, {
        base: "original",
        review: "new review prompt",
      })
      // Adding review prompt is MAJOR
      expect(version.major).toBe(2)
      expect(version.versionString).toBe("2.0.0")
      expect(newHistory.versions).toHaveLength(2)
    })

    it("should handle empty history", () => {
      const history = { versions: [], currentVersion: "1.0.0" }
      const { version } = createNewVersion(history, { base: "first prompt" })
      expect(version.versionString).toBe("1.0.0")
    })
  })

  describe("calculateDiff", () => {
    it("should detect added prompts", () => {
      const v1 = createInitialVersion({ base: "test" })
      const v2 = {
        ...v1,
        id: "v2",
        versionString: "2.0.0",
        prompts: { base: "test", review: "review" },
      }
      const diff = calculateDiff(v1, v2)
      const reviewChange = diff.changes.find((c) => c.promptType === "review")
      expect(reviewChange?.type).toBe("added")
    })

    it("should detect modified prompts", () => {
      const v1 = createInitialVersion({ base: "original" })
      const v2 = { ...v1, id: "v2", versionString: "1.1.0", prompts: { base: "modified" } }
      const diff = calculateDiff(v1, v2)
      const baseChange = diff.changes.find((c) => c.promptType === "base")
      expect(baseChange?.type).toBe("modified")
    })
  })

  describe("rollbackToVersion", () => {
    it("should create new version with old prompts", () => {
      const v1 = createInitialVersion({ base: "version 1" })
      const history = { versions: [v1], currentVersion: "1.0.0" }
      const { version: v2, history: h2 } = createNewVersion(history, {
        base: "version 1",
        review: "new review",
      })

      const result = rollbackToVersion(h2, v1.id)
      expect(result).not.toBeNull()
      expect(result!.version.prompts.base).toBe("version 1")
      expect(result!.version.changelog).toContain("롤백")
    })

    it("should return null for unknown version id", () => {
      const v1 = createInitialVersion({ base: "test" })
      const history = { versions: [v1], currentVersion: "1.0.0" }
      const result = rollbackToVersion(history, "nonexistent")
      expect(result).toBeNull()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Prompt Tester
// ═══════════════════════════════════════════════════════════════

describe("Prompt Tester", () => {
  const samplePrompt = buildBasePrompt(DEFAULT_INPUT)

  describe("analyzeStructure", () => {
    it("should score high for well-structured prompt", () => {
      const score = analyzeStructure(samplePrompt)
      expect(score).toBeGreaterThanOrEqual(60)
    })

    it("should score low for empty prompt", () => {
      expect(analyzeStructure("")).toBe(0)
    })

    it("should award points for required sections", () => {
      const minimal = "[역할 정의]\n[성향 가이드]\n[금지 사항]"
      expect(analyzeStructure(minimal)).toBeGreaterThanOrEqual(40)
    })
  })

  describe("analyzeTone", () => {
    it("should detect logical tone from analytical text", () => {
      const result = analyzeTone("분석적인 관점에서 논리적으로 구조를 비교하겠습니다")
      expect(result.logicScore).toBeGreaterThan(0)
      expect(result.dominantTone).toBe("logical")
    })

    it("should detect emotional tone", () => {
      const result = analyzeTone("감동적이고 마음이 따뜻해지는 아름다운 이야기")
      expect(result.emotionScore).toBeGreaterThan(0)
      expect(result.dominantTone).toBe("emotional")
    })

    it("should detect balanced tone", () => {
      const result = analyzeTone("분석과 감정의 균형을 잡자")
      expect(result.dominantTone).toBe("balanced")
    })
  })

  describe("checkProhibitedWords", () => {
    it("should detect profanity", () => {
      const matches = checkProhibitedWords("이것은 시발 테스트")
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].category).toBe("profanity")
      expect(matches[0].severity).toBe("error")
    })

    it("should detect political terms", () => {
      const matches = checkProhibitedWords("좌파적 성향")
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].category).toBe("political")
    })

    it("should return empty for clean text", () => {
      const matches = checkProhibitedWords("이것은 깨끗한 텍스트입니다")
      expect(matches).toEqual([])
    })
  })

  describe("analyzeLength", () => {
    it("should count lines and sections", () => {
      const result = analyzeLength(samplePrompt)
      expect(result.totalChars).toBeGreaterThan(100)
      expect(result.totalLines).toBeGreaterThan(5)
      expect(result.sectionCount).toBeGreaterThan(3)
    })
  })

  describe("checkVectorConsistency", () => {
    it("should score high for auto-generated prompt", () => {
      const score = checkVectorConsistency(samplePrompt, L1)
      expect(score).toBeGreaterThanOrEqual(70)
    })

    it("should penalize missing vector values", () => {
      const score = checkVectorConsistency("random text without any numbers", L1)
      expect(score).toBeLessThan(80)
    })
  })

  describe("testPrompt", () => {
    it("should return comprehensive result", () => {
      const result = testPrompt(samplePrompt, L1)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(result.toneAnalysis).toBeDefined()
      expect(result.structureScore).toBeGreaterThanOrEqual(0)
      expect(result.consistencyScore).toBeGreaterThanOrEqual(0)
      expect(result.lengthAnalysis).toBeDefined()
      expect(Array.isArray(result.prohibitedWords)).toBe(true)
    })

    it("should give high score for well-crafted auto-generated prompt", () => {
      const result = testPrompt(samplePrompt, L1)
      expect(result.overallScore).toBeGreaterThanOrEqual(60)
    })

    it("should penalize prompt with prohibited words", () => {
      const badPrompt = samplePrompt + "\n시발"
      const result = testPrompt(badPrompt, L1)
      expect(result.prohibitedWords.length).toBeGreaterThan(0)
    })

    it("should work without l1 vector", () => {
      const result = testPrompt(samplePrompt)
      expect(result.consistencyScore).toBe(80) // default
    })
  })
})
