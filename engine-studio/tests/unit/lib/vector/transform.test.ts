import { describe, it, expect } from "vitest"
import {
  transformDBUserVectorToFrontend,
  transformFrontendUserVectorToDB,
  transformDBArchetypeToFrontend,
  transformFrontendArchetypeToDB,
  type DBUserVector,
  type FrontendUserVector,
  type DBArchetype,
  type FrontendArchetype,
} from "@/lib/utils"

describe("Data Transform Functions", () => {
  describe("UserVector Transforms", () => {
    const mockDBUserVector: DBUserVector = {
      id: "uv-123",
      userId: "user-456",
      onboardingLevel: "MEDIUM",
      depth: 0.75,
      lens: 0.8,
      stance: 0.6,
      scope: 0.7,
      taste: 0.4,
      purpose: 0.85,
      archetype: "ANALYTICAL_DEEP",
      confidenceDepth: 0.9,
      confidenceLens: 0.85,
      confidenceStance: 0.8,
      confidenceScope: 0.75,
      confidenceTaste: 0.7,
      confidencePurpose: 0.88,
      updatedAt: new Date("2024-01-15"),
    }

    const mockFrontendUserVector: FrontendUserVector = {
      id: "uv-123",
      userId: "user-456",
      onboardingLevel: "MEDIUM",
      vector: {
        depth: 0.75,
        lens: 0.8,
        stance: 0.6,
        scope: 0.7,
        taste: 0.4,
        purpose: 0.85,
      },
      archetype: "ANALYTICAL_DEEP",
      confidenceScores: {
        depth: 0.9,
        lens: 0.85,
        stance: 0.8,
        scope: 0.75,
        taste: 0.7,
        purpose: 0.88,
      },
      updatedAt: new Date("2024-01-15"),
    }

    describe("transformDBUserVectorToFrontend", () => {
      it("DB 형식을 Frontend 형식으로 올바르게 변환해야 함", () => {
        const result = transformDBUserVectorToFrontend(mockDBUserVector)

        expect(result.id).toBe(mockDBUserVector.id)
        expect(result.userId).toBe(mockDBUserVector.userId)
        expect(result.onboardingLevel).toBe(mockDBUserVector.onboardingLevel)
        expect(result.archetype).toBe(mockDBUserVector.archetype)
      })

      it("벡터 값이 올바르게 중첩 객체로 변환되어야 함", () => {
        const result = transformDBUserVectorToFrontend(mockDBUserVector)

        expect(result.vector.depth).toBe(mockDBUserVector.depth)
        expect(result.vector.lens).toBe(mockDBUserVector.lens)
        expect(result.vector.stance).toBe(mockDBUserVector.stance)
        expect(result.vector.scope).toBe(mockDBUserVector.scope)
        expect(result.vector.taste).toBe(mockDBUserVector.taste)
        expect(result.vector.purpose).toBe(mockDBUserVector.purpose)
      })

      it("신뢰도 점수가 올바르게 중첩 객체로 변환되어야 함", () => {
        const result = transformDBUserVectorToFrontend(mockDBUserVector)

        expect(result.confidenceScores?.depth).toBe(mockDBUserVector.confidenceDepth)
        expect(result.confidenceScores?.lens).toBe(mockDBUserVector.confidenceLens)
      })

      it("신뢰도 점수가 null인 경우 처리해야 함", () => {
        const dbWithNullConfidence: DBUserVector = {
          ...mockDBUserVector,
          confidenceDepth: null,
          confidenceLens: null,
          confidenceStance: null,
          confidenceScope: null,
          confidenceTaste: null,
          confidencePurpose: null,
        }

        const result = transformDBUserVectorToFrontend(dbWithNullConfidence)
        expect(result.confidenceScores).toBeNull()
      })
    })

    describe("transformFrontendUserVectorToDB", () => {
      it("Frontend 형식을 DB 형식으로 올바르게 변환해야 함", () => {
        const result = transformFrontendUserVectorToDB(mockFrontendUserVector)

        expect(result.userId).toBe(mockFrontendUserVector.userId)
        expect(result.onboardingLevel).toBe(mockFrontendUserVector.onboardingLevel)
        expect(result.archetype).toBe(mockFrontendUserVector.archetype)
      })

      it("중첩된 벡터 객체가 개별 칼럼으로 변환되어야 함", () => {
        const result = transformFrontendUserVectorToDB(mockFrontendUserVector)

        expect(result.depth).toBe(mockFrontendUserVector.vector.depth)
        expect(result.lens).toBe(mockFrontendUserVector.vector.lens)
        expect(result.stance).toBe(mockFrontendUserVector.vector.stance)
        expect(result.scope).toBe(mockFrontendUserVector.vector.scope)
        expect(result.taste).toBe(mockFrontendUserVector.vector.taste)
        expect(result.purpose).toBe(mockFrontendUserVector.vector.purpose)
      })

      it("신뢰도 점수가 null인 경우 null로 변환되어야 함", () => {
        const frontendWithNullConfidence: FrontendUserVector = {
          ...mockFrontendUserVector,
          confidenceScores: null,
        }

        const result = transformFrontendUserVectorToDB(frontendWithNullConfidence)
        expect(result.confidenceDepth).toBeNull()
        expect(result.confidenceLens).toBeNull()
      })
    })

    describe("Round-trip Transform", () => {
      it("DB → Frontend → DB 변환 후 원래 값이 유지되어야 함", () => {
        const frontend = transformDBUserVectorToFrontend(mockDBUserVector)
        const backToDB = transformFrontendUserVectorToDB(frontend)

        expect(backToDB.depth).toBe(mockDBUserVector.depth)
        expect(backToDB.lens).toBe(mockDBUserVector.lens)
        expect(backToDB.archetype).toBe(mockDBUserVector.archetype)
      })
    })
  })

  describe("Archetype Transforms", () => {
    const mockDBArchetype: DBArchetype = {
      id: "arch-001",
      name: "분석적 탐험가",
      description: "깊이 있는 분석과 새로운 시도를 즐기는 유형",
      depthMin: 0.7,
      depthMax: 1.0,
      lensMin: 0.6,
      lensMax: 0.9,
      stanceMin: 0.4,
      stanceMax: 0.7,
      scopeMin: 0.5,
      scopeMax: 0.8,
      tasteMin: 0.6,
      tasteMax: 1.0,
      purposeMin: 0.5,
      purposeMax: 0.9,
      recommendedPersonaIds: ["persona-1", "persona-2"],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-15"),
    }

    describe("transformDBArchetypeToFrontend", () => {
      it("DB 형식을 Frontend 형식으로 올바르게 변환해야 함", () => {
        const result = transformDBArchetypeToFrontend(mockDBArchetype)

        expect(result.id).toBe(mockDBArchetype.id)
        expect(result.name).toBe(mockDBArchetype.name)
        expect(result.description).toBe(mockDBArchetype.description)
        expect(result.recommendedPersonaIds).toEqual(mockDBArchetype.recommendedPersonaIds)
      })

      it("벡터 범위가 올바르게 중첩 객체로 변환되어야 함", () => {
        const result = transformDBArchetypeToFrontend(mockDBArchetype)

        expect(result.vectorRanges.depth.min).toBe(mockDBArchetype.depthMin)
        expect(result.vectorRanges.depth.max).toBe(mockDBArchetype.depthMax)
        expect(result.vectorRanges.lens.min).toBe(mockDBArchetype.lensMin)
        expect(result.vectorRanges.lens.max).toBe(mockDBArchetype.lensMax)
      })
    })

    describe("transformFrontendArchetypeToDB", () => {
      const mockFrontendArchetype: FrontendArchetype = {
        id: "arch-001",
        name: "분석적 탐험가",
        description: "깊이 있는 분석과 새로운 시도를 즐기는 유형",
        vectorRanges: {
          depth: { min: 0.7, max: 1.0 },
          lens: { min: 0.6, max: 0.9 },
          stance: { min: 0.4, max: 0.7 },
          scope: { min: 0.5, max: 0.8 },
          taste: { min: 0.6, max: 1.0 },
          purpose: { min: 0.5, max: 0.9 },
        },
        recommendedPersonaIds: ["persona-1", "persona-2"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      }

      it("Frontend 형식을 DB 형식으로 올바르게 변환해야 함", () => {
        const result = transformFrontendArchetypeToDB(mockFrontendArchetype)

        expect(result.name).toBe(mockFrontendArchetype.name)
        expect(result.depthMin).toBe(mockFrontendArchetype.vectorRanges.depth.min)
        expect(result.depthMax).toBe(mockFrontendArchetype.vectorRanges.depth.max)
      })
    })
  })
})
