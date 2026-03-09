import { describe, it, expect } from "vitest"
import {
  selectReactionCandidates,
  toImagePostContext,
} from "@/lib/multimodal/image-reaction-service"
import type { ImageAnalysis } from "@/lib/multimodal/image-analyzer"

const sampleAnalysis: ImageAnalysis = {
  description: "따뜻한 석양이 비치는 해변 풍경이다.",
  mood: "평화로운",
  tags: ["해변", "석양", "바다", "여행"],
  dominantColors: ["오렌지", "네이비 블루"],
  sentiment: 0.8,
  category: "풍경",
}

const samplePersonas = [
  {
    id: "p1",
    knowledgeAreas: ["여행", "사진", "해변"],
    expertise: ["풍경 사진"],
    mood: 0.9,
  },
  {
    id: "p2",
    knowledgeAreas: ["프로그래밍", "AI"],
    expertise: ["머신러닝"],
    mood: 0.5,
  },
  {
    id: "p3",
    knowledgeAreas: ["음악", "여행"],
    expertise: ["기타 연주"],
    mood: 0.7,
  },
]

describe("selectReactionCandidates", () => {
  it("태그가 겹치는 페르소나에 높은 점수를 부여한다", () => {
    const candidates = selectReactionCandidates(sampleAnalysis, samplePersonas, {
      minMatchScore: 0,
      maxReactors: 10,
      jitter: 0,
    })

    // p1은 "여행", "해변", "풍경" 매칭 → 높은 점수
    const p1 = candidates.find((c) => c.personaId === "p1")
    const p2 = candidates.find((c) => c.personaId === "p2")

    expect(p1).toBeDefined()
    expect(p2).toBeDefined()
    expect(p1!.matchScore).toBeGreaterThan(p2!.matchScore)
  })

  it("minMatchScore 미만이면 후보에서 제외된다", () => {
    const candidates = selectReactionCandidates(sampleAnalysis, samplePersonas, {
      minMatchScore: 0.5,
      maxReactors: 10,
      jitter: 0,
    })

    // p2는 태그 겹침 없으므로 0.5 미만
    const p2 = candidates.find((c) => c.personaId === "p2")
    expect(p2).toBeUndefined()
  })

  it("maxReactors만큼만 반환한다", () => {
    const candidates = selectReactionCandidates(sampleAnalysis, samplePersonas, {
      minMatchScore: 0,
      maxReactors: 1,
      jitter: 0,
    })

    expect(candidates).toHaveLength(1)
  })

  it("점수 내림차순으로 정렬된다", () => {
    const candidates = selectReactionCandidates(sampleAnalysis, samplePersonas, {
      minMatchScore: 0,
      maxReactors: 10,
      jitter: 0,
    })

    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].matchScore).toBeGreaterThanOrEqual(candidates[i].matchScore)
    }
  })

  it("matchReason에 매칭 사유가 포함된다", () => {
    const candidates = selectReactionCandidates(sampleAnalysis, samplePersonas, {
      minMatchScore: 0,
      maxReactors: 10,
      jitter: 0,
    })

    const p1 = candidates.find((c) => c.personaId === "p1")!
    expect(p1.matchReason).toContain("태그 매칭")
  })

  it("빈 페르소나 배열이면 빈 배열을 반환한다", () => {
    const candidates = selectReactionCandidates(sampleAnalysis, [])
    expect(candidates).toEqual([])
  })
})

describe("toImagePostContext", () => {
  it("ImageAnalysis를 ImagePostContext로 변환한다", () => {
    const ctx = toImagePostContext(["url1", "url2"], sampleAnalysis)

    expect(ctx.imageUrls).toEqual(["url1", "url2"])
    expect(ctx.imageAnalysis.description).toBe("따뜻한 석양이 비치는 해변 풍경이다.")
    expect(ctx.imageAnalysis.mood).toBe("평화로운")
    expect(ctx.imageAnalysis.tags).toEqual(["해변", "석양", "바다", "여행"])
    expect(ctx.imageAnalysis.sentiment).toBe(0.8)
  })
})
