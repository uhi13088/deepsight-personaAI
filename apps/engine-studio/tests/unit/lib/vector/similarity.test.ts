import { describe, it, expect } from "vitest"
import {
  calculateCosineSimilarity,
  calculateWeightedSimilarity,
  normalizeVector,
  vectorToMatchScore,
  type Vector6D,
} from "@/lib/utils"

describe("Vector Similarity Functions", () => {
  // 테스트용 벡터 정의
  const vectorA: Vector6D = {
    depth: 0.8,
    lens: 0.9,
    stance: 0.7,
    scope: 0.6,
    taste: 0.3,
    purpose: 0.8,
  }

  const vectorB: Vector6D = {
    depth: 0.7,
    lens: 0.85,
    stance: 0.65,
    scope: 0.55,
    taste: 0.35,
    purpose: 0.75,
  }

  const identicalVector: Vector6D = { ...vectorA }

  const oppositeVector: Vector6D = {
    depth: 0.2,
    lens: 0.1,
    stance: 0.3,
    scope: 0.4,
    taste: 0.7,
    purpose: 0.2,
  }

  const zeroVector: Vector6D = {
    depth: 0,
    lens: 0,
    stance: 0,
    scope: 0,
    taste: 0,
    purpose: 0,
  }

  describe("calculateCosineSimilarity", () => {
    it("동일한 벡터의 유사도는 1이어야 함", () => {
      const similarity = calculateCosineSimilarity(vectorA, identicalVector)
      expect(similarity).toBeCloseTo(1, 5)
    })

    it("유사한 벡터는 높은 유사도를 가져야 함", () => {
      const similarity = calculateCosineSimilarity(vectorA, vectorB)
      expect(similarity).toBeGreaterThan(0.95)
    })

    it("상반된 벡터는 낮은 유사도를 가져야 함", () => {
      const similarity = calculateCosineSimilarity(vectorA, oppositeVector)
      expect(similarity).toBeLessThan(0.9)
    })

    it("제로 벡터는 0을 반환해야 함", () => {
      const similarity = calculateCosineSimilarity(vectorA, zeroVector)
      expect(similarity).toBe(0)
    })

    it("유사도는 -1과 1 사이여야 함", () => {
      const similarity = calculateCosineSimilarity(vectorA, vectorB)
      expect(similarity).toBeGreaterThanOrEqual(-1)
      expect(similarity).toBeLessThanOrEqual(1)
    })

    it("교환법칙이 성립해야 함 (A,B) === (B,A)", () => {
      const sim1 = calculateCosineSimilarity(vectorA, vectorB)
      const sim2 = calculateCosineSimilarity(vectorB, vectorA)
      expect(sim1).toBeCloseTo(sim2, 10)
    })
  })

  describe("calculateWeightedSimilarity", () => {
    const uniformWeights: Vector6D = {
      depth: 1,
      lens: 1,
      stance: 1,
      scope: 1,
      taste: 1,
      purpose: 1,
    }

    const highDepthWeight: Vector6D = {
      depth: 2,
      lens: 1,
      stance: 1,
      scope: 1,
      taste: 1,
      purpose: 1,
    }

    it("균등 가중치는 코사인 유사도와 같아야 함", () => {
      const weighted = calculateWeightedSimilarity(vectorA, vectorB, uniformWeights)
      const cosine = calculateCosineSimilarity(vectorA, vectorB)
      expect(weighted).toBeCloseTo(cosine, 5)
    })

    it("가중치 적용이 결과에 영향을 미쳐야 함", () => {
      const uniform = calculateWeightedSimilarity(vectorA, vectorB, uniformWeights)
      const weighted = calculateWeightedSimilarity(vectorA, vectorB, highDepthWeight)
      // 가중치가 다르면 결과도 달라져야 함 (미세한 차이라도)
      expect(uniform).not.toEqual(weighted)
    })

    it("제로 가중치 벡터는 0을 반환해야 함", () => {
      const zeroWeights: Vector6D = { depth: 0, lens: 0, stance: 0, scope: 0, taste: 0, purpose: 0 }
      const similarity = calculateWeightedSimilarity(vectorA, vectorB, zeroWeights)
      expect(similarity).toBe(0)
    })
  })

  describe("normalizeVector", () => {
    it("정규화된 벡터의 크기는 1이어야 함", () => {
      const normalized = normalizeVector(vectorA)
      const magnitude = Math.sqrt(
        normalized.depth ** 2 +
          normalized.lens ** 2 +
          normalized.stance ** 2 +
          normalized.scope ** 2 +
          normalized.taste ** 2 +
          normalized.purpose ** 2
      )
      expect(magnitude).toBeCloseTo(1, 5)
    })

    it("제로 벡터는 그대로 반환해야 함", () => {
      const normalized = normalizeVector(zeroVector)
      expect(normalized).toEqual(zeroVector)
    })

    it("이미 정규화된 벡터는 변하지 않아야 함", () => {
      const normalized = normalizeVector(vectorA)
      const doubleNormalized = normalizeVector(normalized)
      expect(doubleNormalized.depth).toBeCloseTo(normalized.depth, 5)
      expect(doubleNormalized.lens).toBeCloseTo(normalized.lens, 5)
    })

    it("정규화 후 방향이 유지되어야 함", () => {
      const normalized = normalizeVector(vectorA)
      // 비율이 유지되는지 확인
      const ratioOriginal = vectorA.depth / vectorA.lens
      const ratioNormalized = normalized.depth / normalized.lens
      expect(ratioOriginal).toBeCloseTo(ratioNormalized, 5)
    })
  })

  describe("vectorToMatchScore", () => {
    it("유사도 1은 점수 100이어야 함", () => {
      const score = vectorToMatchScore(1)
      expect(score).toBe(100)
    })

    it("유사도 -1은 점수 0이어야 함", () => {
      const score = vectorToMatchScore(-1)
      expect(score).toBe(0)
    })

    it("유사도 0은 점수 50이어야 함", () => {
      const score = vectorToMatchScore(0)
      expect(score).toBe(50)
    })

    it("점수는 0~100 범위여야 함", () => {
      for (let sim = -1; sim <= 1; sim += 0.1) {
        const score = vectorToMatchScore(sim)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      }
    })

    it("유사도가 높을수록 점수도 높아야 함", () => {
      const score1 = vectorToMatchScore(0.5)
      const score2 = vectorToMatchScore(0.8)
      expect(score2).toBeGreaterThan(score1)
    })
  })
})
