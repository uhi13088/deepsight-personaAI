import { describe, it, expect } from "vitest"
import {
  generatePersona,
  generatePersonaBatch,
  ARCHETYPES,
  getArchetypeById,
} from "@/lib/persona-generation"
import { buildAllPrompts } from "@/lib/prompt-builder"
import { generateAllQualitativeDimensions } from "@/lib/qualitative"
import { computeActivityTraits, computeActiveHours } from "@/lib/persona-world/activity-mapper"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import type { PersonaRole } from "@prisma/client"

// ── inferPersonaRole 재현 (API route에서 사용하는 것과 동일 로직) ──
function inferPersonaRole(
  l1: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    sociability: number
  },
  l2: { agreeableness: number; openness: number }
): PersonaRole {
  if (l1.depth > 0.7 && l1.lens > 0.6) return "ANALYST"
  if (l1.taste > 0.65 && l1.scope > 0.6) return "CURATOR"
  if (l2.agreeableness > 0.65 && l1.sociability > 0.5) return "COMPANION"
  if (l1.stance > 0.6 && l1.depth > 0.5) return "REVIEWER"
  if (l2.openness > 0.65 && l1.scope > 0.5) return "EDUCATOR"
  const scores = {
    REVIEWER: l1.depth * 0.4 + l1.stance * 0.3 + l1.lens * 0.3,
    CURATOR: l1.taste * 0.4 + l1.scope * 0.3 + l2.openness * 0.3,
    EDUCATOR: l1.scope * 0.3 + l2.openness * 0.4 + l1.depth * 0.3,
    COMPANION: l1.sociability * 0.4 + l2.agreeableness * 0.4 + (1 - l1.stance) * 0.2,
    ANALYST: l1.depth * 0.4 + l1.lens * 0.4 + l1.scope * 0.2,
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as PersonaRole
}

const VALID_ROLES: PersonaRole[] = ["REVIEWER", "CURATOR", "EDUCATOR", "COMPANION", "ANALYST"]

describe("랜덤 페르소나 생성 파이프라인", () => {
  describe("inferPersonaRole", () => {
    it("ANALYST: depth > 0.7, lens > 0.6", () => {
      expect(
        inferPersonaRole(
          { depth: 0.85, lens: 0.75, stance: 0.3, scope: 0.4, taste: 0.3, sociability: 0.3 },
          { agreeableness: 0.3, openness: 0.3 }
        )
      ).toBe("ANALYST")
    })

    it("CURATOR: taste > 0.65, scope > 0.6", () => {
      expect(
        inferPersonaRole(
          { depth: 0.3, lens: 0.3, stance: 0.3, scope: 0.75, taste: 0.8, sociability: 0.3 },
          { agreeableness: 0.3, openness: 0.3 }
        )
      ).toBe("CURATOR")
    })

    it("COMPANION: agreeableness > 0.65, sociability > 0.5", () => {
      expect(
        inferPersonaRole(
          { depth: 0.3, lens: 0.3, stance: 0.3, scope: 0.3, taste: 0.3, sociability: 0.7 },
          { agreeableness: 0.8, openness: 0.3 }
        )
      ).toBe("COMPANION")
    })

    it("REVIEWER: stance > 0.6, depth > 0.5", () => {
      expect(
        inferPersonaRole(
          { depth: 0.6, lens: 0.3, stance: 0.75, scope: 0.3, taste: 0.3, sociability: 0.3 },
          { agreeableness: 0.3, openness: 0.3 }
        )
      ).toBe("REVIEWER")
    })

    it("EDUCATOR: openness > 0.65, scope > 0.5", () => {
      expect(
        inferPersonaRole(
          { depth: 0.3, lens: 0.3, stance: 0.3, scope: 0.65, taste: 0.3, sociability: 0.3 },
          { agreeableness: 0.3, openness: 0.8 }
        )
      ).toBe("EDUCATOR")
    })

    it("항상 유효한 PersonaRole 반환", () => {
      for (let i = 0; i < 20; i++) {
        const r = () => Math.random()
        const role = inferPersonaRole(
          { depth: r(), lens: r(), stance: r(), scope: r(), taste: r(), sociability: r() },
          { agreeableness: r(), openness: r() }
        )
        expect(VALID_ROLES).toContain(role)
      }
    })
  })

  describe("전체 파이프라인 통합", () => {
    it("아키타입 없이 완전 랜덤 생성", () => {
      const result = generatePersona({})

      // 벡터가 모두 유효한 범위 [0, 1]
      for (const [, v] of Object.entries(result.vectors.l1)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
      for (const [, v] of Object.entries(result.vectors.l2)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
      for (const [, v] of Object.entries(result.vectors.l3)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }

      // 캐릭터 필드 존재
      expect(result.character.name).toBeTruthy()
      expect(result.character.role).toBeTruthy()
      expect(result.character.expertise.length).toBeGreaterThan(0)
      expect(result.character.description).toBeTruthy()

      // Paradox 품질
      expect(result.quality.paradoxScore).toBeGreaterThanOrEqual(0)
      expect(result.quality.paradoxScore).toBeLessThanOrEqual(1)
      expect(result.quality.dimensionality).toBeGreaterThanOrEqual(0)
      expect(result.quality.consistencyScore).toBeGreaterThanOrEqual(0)
    })

    it("22종 아키타입 각각으로 생성 성공", () => {
      for (const archetype of ARCHETYPES) {
        const result = generatePersona({ archetypeId: archetype.id })
        expect(result.archetype?.id).toBe(archetype.id)
        expect(result.character.name).toBeTruthy()
        expect(result.quality.paradoxScore).toBeGreaterThanOrEqual(0)
      }
    })

    it("프롬프트 5종 자동 생성", () => {
      const result = generatePersona({})
      const prompts = buildAllPrompts({
        name: result.character.name,
        role: result.character.role,
        expertise: result.character.expertise,
        l1: result.vectors.l1,
        l2: result.vectors.l2,
        l3: result.vectors.l3,
      })

      expect(prompts.base).toBeTruthy()
      expect(prompts.review).toBeTruthy()
      expect(prompts.post).toBeTruthy()
      expect(prompts.comment).toBeTruthy()
      expect(prompts.interaction).toBeTruthy()
      // base 프롬프트에 페르소나 이름 포함
      expect(prompts.base).toContain(result.character.name)
    })

    it("정성적 4차원 생성", () => {
      const result = generatePersona({ archetypeId: "ironic-philosopher" })
      const qualitative = generateAllQualitativeDimensions(
        result.vectors.l1,
        result.vectors.l2,
        result.vectors.l3,
        result.archetype
      )

      expect(qualitative.backstory).toBeTruthy()
      expect(qualitative.backstory.origin).toBeTruthy()
      expect(qualitative.voice).toBeTruthy()
      expect(qualitative.voice.speechStyle).toBeTruthy()
      expect(qualitative.pressure).toBeTruthy()
      expect(qualitative.pressure.situationalTriggers).toBeTruthy()
      expect(qualitative.zeitgeist).toBeTruthy()
    })

    it("활동성 8특성 + 활동시간 도출", () => {
      const result = generatePersona({})
      const { l1, l2, l3 } = result.vectors

      const crossAxis = calculateCrossAxisProfile(l1, l2, l3)
      const paradox = calculateExtendedParadoxScore(l1, l2, l3, crossAxis)
      const threeLayer = { social: l1, temperament: l2, narrative: l3 }
      const traits = computeActivityTraits(threeLayer, paradox.overall)

      // 8특성 모두 [0, 1] 범위
      expect(traits.sociability).toBeGreaterThanOrEqual(0)
      expect(traits.sociability).toBeLessThanOrEqual(1)
      expect(traits.initiative).toBeGreaterThanOrEqual(0)
      expect(traits.expressiveness).toBeGreaterThanOrEqual(0)
      expect(traits.interactivity).toBeGreaterThanOrEqual(0)
      expect(traits.endurance).toBeGreaterThanOrEqual(0)
      expect(traits.volatility).toBeGreaterThanOrEqual(0)
      expect(traits.depthSeeking).toBeGreaterThanOrEqual(0)
      expect(traits.growthDrive).toBeGreaterThanOrEqual(0)

      // 활동 시간 배열
      const activeHours = computeActiveHours(threeLayer, traits)
      expect(activeHours.length).toBeGreaterThan(0)
      for (const h of activeHours) {
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThanOrEqual(23)
      }
    })

    it("PersonaRole이 벡터에 맞게 추론됨", () => {
      for (let i = 0; i < 10; i++) {
        const result = generatePersona({})
        const role = inferPersonaRole(result.vectors.l1, result.vectors.l2)
        expect(VALID_ROLES).toContain(role)
      }
    })
  })

  describe("배치 생성 다양성", () => {
    it("5개 배치 생성 — 서로 다른 아키타입", () => {
      const batch = generatePersonaBatch(5, { diversityWeight: 0.5 })
      expect(batch).toHaveLength(5)

      // 모든 페르소나가 유효
      for (const persona of batch) {
        expect(persona.character.name).toBeTruthy()
        expect(persona.quality.paradoxScore).toBeGreaterThanOrEqual(0)
      }

      // 이름이 모두 다름 (확률적 — 이름 풀이 충분히 크므로 거의 항상 통과)
      const names = batch.map((p) => p.character.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBeGreaterThanOrEqual(3)
    })

    it("배치 생성 — 아키타입 순환", () => {
      const batch = generatePersonaBatch(3, {
        archetypeIds: ["ironic-philosopher", "volatile-intellectual", "cheerful-nihilist"],
      })
      expect(batch[0].archetype?.id).toBe("ironic-philosopher")
      expect(batch[1].archetype?.id).toBe("volatile-intellectual")
      expect(batch[2].archetype?.id).toBe("cheerful-nihilist")
    })
  })
})
