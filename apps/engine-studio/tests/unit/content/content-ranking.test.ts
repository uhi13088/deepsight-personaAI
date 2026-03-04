import { describe, it, expect } from "vitest"
import { scoreContentForUser, rankContents } from "@/lib/content/content-ranking"
import type { ContentItemForRanking } from "@/lib/content/content-ranking"
import type { SocialPersonaVector } from "@deepsight/shared-types"

// ── 픽스처 ───────────────────────────────────────────────────

const USER_VECTOR: SocialPersonaVector = {
  depth: 0.8,
  lens: 0.3,
  stance: 0.6,
  scope: 0.7,
  taste: 0.9,
  purpose: 0.5,
  sociability: 0.4,
}

// 동일 벡터 콘텐츠
const SAME_CONTENT_VECTOR: SocialPersonaVector = { ...USER_VECTOR }

// 직교에 가까운 벡터 (극단적 차이)
const OPPOSITE_CONTENT_VECTOR: SocialPersonaVector = {
  depth: 0.0,
  lens: 1.0,
  stance: 0.0,
  scope: 0.0,
  taste: 0.0,
  purpose: 1.0,
  sociability: 1.0,
}

function makeContent(overrides: Partial<ContentItemForRanking>): ContentItemForRanking {
  return {
    id: "c1",
    contentVector: SAME_CONTENT_VECTOR,
    narrativeTheme: null,
    curationScore: 0.9,
    personaId: "p1",
    personaName: "유나",
    personaMatchScore: 0.8,
    contentType: "MOVIE",
    title: "기묘한 이야기",
    description: null,
    sourceUrl: null,
    genres: ["SF", "호러"],
    tags: ["Netflix"],
    ...overrides,
  }
}

// ── scoreContentForUser ───────────────────────────────────────

describe("scoreContentForUser — 유사도 계산", () => {
  it("동일 벡터 → score 1.0 (or near 1.0)", () => {
    const score = scoreContentForUser(
      USER_VECTOR,
      makeContent({ contentVector: SAME_CONTENT_VECTOR })
    )
    expect(score).toBeCloseTo(1.0, 1)
  })

  it("contentVector null → 0.5 (중간값)", () => {
    const score = scoreContentForUser(USER_VECTOR, makeContent({ contentVector: null }))
    expect(score).toBe(0.5)
  })

  it("score는 [0, 1] 범위", () => {
    const score1 = scoreContentForUser(
      USER_VECTOR,
      makeContent({ contentVector: SAME_CONTENT_VECTOR })
    )
    const score2 = scoreContentForUser(
      USER_VECTOR,
      makeContent({ contentVector: OPPOSITE_CONTENT_VECTOR })
    )

    expect(score1).toBeGreaterThanOrEqual(0)
    expect(score1).toBeLessThanOrEqual(1)
    expect(score2).toBeGreaterThanOrEqual(0)
    expect(score2).toBeLessThanOrEqual(1)
  })

  it("유사 벡터 > 반대 벡터", () => {
    const similar = scoreContentForUser(
      USER_VECTOR,
      makeContent({ contentVector: SAME_CONTENT_VECTOR })
    )
    const opposite = scoreContentForUser(
      USER_VECTOR,
      makeContent({ contentVector: OPPOSITE_CONTENT_VECTOR })
    )
    expect(similar).toBeGreaterThan(opposite)
  })

  it("L3 있으면 L3 없는 경우보다 score 동일하거나 높음", () => {
    const withoutL3 = scoreContentForUser(USER_VECTOR, makeContent({ narrativeTheme: null }))
    const withL3 = scoreContentForUser(
      USER_VECTOR,
      makeContent({
        narrativeTheme: { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
      })
    )
    expect(withL3).toBeGreaterThanOrEqual(withoutL3)
  })
})

// ── rankContents ──────────────────────────────────────────────

describe("rankContents — 배치 랭킹", () => {
  it("finalScore 내림차순 정렬", () => {
    const contents: ContentItemForRanking[] = [
      makeContent({ id: "c1", curationScore: 0.5, contentVector: OPPOSITE_CONTENT_VECTOR }),
      makeContent({ id: "c2", curationScore: 0.9, contentVector: SAME_CONTENT_VECTOR }),
    ]

    const result = rankContents(USER_VECTOR, contents, 10)

    expect(result[0].contentItemId).toBe("c2")
    expect(result[1].contentItemId).toBe("c1")
    expect(result[0].finalScore).toBeGreaterThan(result[1].finalScore)
  })

  it("limit 적용", () => {
    const contents: ContentItemForRanking[] = Array.from({ length: 10 }, (_, i) =>
      makeContent({ id: `c${i}` })
    )

    const result = rankContents(USER_VECTOR, contents, 3)
    expect(result).toHaveLength(3)
  })

  it("동일 contentItemId → 중복 제거 + recommendedBy 병합", () => {
    const contents: ContentItemForRanking[] = [
      makeContent({ id: "c1", personaId: "p1", personaName: "유나", personaMatchScore: 0.8 }),
      makeContent({ id: "c1", personaId: "p2", personaName: "민준", personaMatchScore: 0.7 }),
    ]

    const result = rankContents(USER_VECTOR, contents, 10)

    expect(result).toHaveLength(1)
    expect(result[0].recommendedBy).toHaveLength(2)
    const names = result[0].recommendedBy.map((r) => r.personaName)
    expect(names).toContain("유나")
    expect(names).toContain("민준")
  })

  it("빈 배열 → 빈 결과", () => {
    expect(rankContents(USER_VECTOR, [], 10)).toHaveLength(0)
  })

  it("finalScore = matchScore × curationScore 범위", () => {
    const [result] = rankContents(USER_VECTOR, [makeContent({})], 10)
    expect(result.finalScore).toBeLessThanOrEqual(1)
    expect(result.finalScore).toBeGreaterThanOrEqual(0)
  })
})
