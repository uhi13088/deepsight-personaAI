import { describe, it, expect } from "vitest"
import { extractImageVector, blendVectors } from "@/lib/multimodal/image-vector-extractor"
import type { ImageAnalysis } from "@/lib/multimodal/image-analyzer"
import type { SocialPersonaVector } from "@deepsight/shared-types"

const makeAnalysis = (overrides?: Partial<ImageAnalysis>): ImageAnalysis => ({
  description: "테스트 이미지",
  mood: "중립적인",
  tags: ["테스트"],
  dominantColors: ["흰색"],
  sentiment: 0,
  category: "기타",
  ...overrides,
})

describe("extractImageVector", () => {
  it("카테고리별 프리셋이 적용된다 — 예술 카테고리", () => {
    const vector = extractImageVector(makeAnalysis({ category: "예술" }))

    // 예술: depth 높음, taste 높음
    expect(vector.depth).toBeGreaterThan(0.7)
    expect(vector.taste).toBeGreaterThan(0.7)
  })

  it("카테고리별 프리셋이 적용된다 — 스포츠 카테고리", () => {
    const vector = extractImageVector(makeAnalysis({ category: "스포츠" }))

    // 스포츠: sociability 높음
    expect(vector.sociability).toBeGreaterThan(0.7)
  })

  it("미지의 카테고리는 기본 프리셋(0.5)을 사용한다", () => {
    const vector = extractImageVector(makeAnalysis({ category: "알수없음" }))

    expect(vector.depth).toBeCloseTo(0.5, 1)
    expect(vector.sociability).toBeCloseTo(0.5, 1)
  })

  it("긍정 sentiment → lens 감소(감성적), stance 감소(수용적)", () => {
    const positive = extractImageVector(makeAnalysis({ sentiment: 0.8, category: "기타" }))
    const neutral = extractImageVector(makeAnalysis({ sentiment: 0, category: "기타" }))

    expect(positive.lens).toBeLessThan(neutral.lens)
    expect(positive.stance).toBeLessThan(neutral.stance)
  })

  it("부정 sentiment → lens 증가(논리적), stance 증가(비판적)", () => {
    const negative = extractImageVector(makeAnalysis({ sentiment: -0.8, category: "기타" }))
    const neutral = extractImageVector(makeAnalysis({ sentiment: 0, category: "기타" }))

    expect(negative.lens).toBeGreaterThan(neutral.lens)
    expect(negative.stance).toBeGreaterThan(neutral.stance)
  })

  it("태그 많으면 scope/depth 증가", () => {
    const manyTags = extractImageVector(
      makeAnalysis({ tags: ["a", "b", "c", "d", "e", "f", "g", "h"], category: "기타" })
    )
    const fewTags = extractImageVector(makeAnalysis({ tags: ["a"], category: "기타" }))

    expect(manyTags.scope).toBeGreaterThan(fewTags.scope)
    expect(manyTags.depth).toBeGreaterThan(fewTags.depth)
  })

  it("파스텔 색감이면 taste 증가(실험적)", () => {
    const pastel = extractImageVector(
      makeAnalysis({ dominantColors: ["파스텔 핑크", "라벤더"], category: "기타" })
    )
    const neutral = extractImageVector(makeAnalysis({ dominantColors: ["흰색"], category: "기타" }))

    expect(pastel.taste).toBeGreaterThan(neutral.taste)
  })

  it("모든 차원이 0~1 범위 내", () => {
    const extreme = extractImageVector(
      makeAnalysis({
        sentiment: 1,
        tags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
        dominantColors: ["네온 핑크", "비비드 레드"],
        category: "예술",
      })
    )

    const dims: (keyof SocialPersonaVector)[] = [
      "depth",
      "lens",
      "stance",
      "scope",
      "taste",
      "purpose",
      "sociability",
    ]
    for (const dim of dims) {
      expect(extreme[dim]).toBeGreaterThanOrEqual(0)
      expect(extreme[dim]).toBeLessThanOrEqual(1)
    }
  })
})

describe("blendVectors", () => {
  const textVec: SocialPersonaVector = {
    depth: 0.8,
    lens: 0.6,
    stance: 0.7,
    scope: 0.5,
    taste: 0.3,
    purpose: 0.9,
    sociability: 0.4,
  }

  const imageVec: SocialPersonaVector = {
    depth: 0.2,
    lens: 0.4,
    stance: 0.3,
    scope: 0.8,
    taste: 0.9,
    purpose: 0.1,
    sociability: 0.8,
  }

  it("기본 가중치: 텍스트 0.6 + 이미지 0.4", () => {
    const blended = blendVectors(textVec, imageVec)

    // depth: 0.8*0.6 + 0.2*0.4 = 0.56
    expect(blended.depth).toBeCloseTo(0.56, 2)
    // taste: 0.3*0.6 + 0.9*0.4 = 0.54
    expect(blended.taste).toBeCloseTo(0.54, 2)
  })

  it("커스텀 가중치를 적용할 수 있다", () => {
    const blended = blendVectors(textVec, imageVec, 0.5)

    // depth: 0.8*0.5 + 0.2*0.5 = 0.50
    expect(blended.depth).toBeCloseTo(0.5, 2)
  })

  it("imageWeight=0이면 텍스트 벡터와 동일하다", () => {
    const blended = blendVectors(textVec, imageVec, 0)

    expect(blended.depth).toBeCloseTo(textVec.depth, 5)
    expect(blended.taste).toBeCloseTo(textVec.taste, 5)
  })

  it("imageWeight=1이면 이미지 벡터와 동일하다", () => {
    const blended = blendVectors(textVec, imageVec, 1)

    expect(blended.depth).toBeCloseTo(imageVec.depth, 5)
    expect(blended.taste).toBeCloseTo(imageVec.taste, 5)
  })

  it("결과 모든 차원이 0~1 범위 내", () => {
    const blended = blendVectors(textVec, imageVec)

    const dims: (keyof SocialPersonaVector)[] = [
      "depth",
      "lens",
      "stance",
      "scope",
      "taste",
      "purpose",
      "sociability",
    ]
    for (const dim of dims) {
      expect(blended[dim]).toBeGreaterThanOrEqual(0)
      expect(blended[dim]).toBeLessThanOrEqual(1)
    }
  })
})
