// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Media Interest Matcher 단위 테스트 (T352)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  computeMediaInterestScore,
  computeRegionalRelevance,
  computeContentTypeAffinity,
  selectPersonasForMediaItem,
  allocateDailyMediaReactions,
  getImportanceGrade,
  getGradeConfig,
  MEDIA_INTEREST_THRESHOLD,
} from "@/lib/persona-world/media/media-interest-matcher"
import type {
  MediaItemForMatching,
  PersonaForMediaMatching,
  MediaType,
} from "@/lib/persona-world/media/media-interest-matcher"

// ── 픽스처 ────────────────────────────────────────────────────

const MOVIE_ITEM: MediaItemForMatching = {
  mediaType: "MOVIE",
  genres: ["공포", "스릴러"],
  tags: ["영화", "한국영화", "2025"],
  region: "KR",
  importanceScore: 0.8,
}

const BOOK_ITEM: MediaItemForMatching = {
  mediaType: "BOOK",
  genres: ["소설", "SF"],
  tags: ["베스트셀러", "과학소설"],
  region: "KR",
  importanceScore: 0.6,
}

const EXHIBITION_ITEM: MediaItemForMatching = {
  mediaType: "EXHIBITION",
  genres: ["현대미술", "설치미술"],
  tags: ["전시", "서울", "무료"],
  region: "KR",
  importanceScore: 0.5,
}

const MUSIC_ITEM: MediaItemForMatching = {
  mediaType: "MUSIC",
  genres: ["K-Pop", "팝"],
  tags: ["차트", "신보"],
  region: "KR",
  importanceScore: 0.9,
}

const PERFORMANCE_ITEM: MediaItemForMatching = {
  mediaType: "PERFORMANCE",
  genres: ["뮤지컬", "공연"],
  tags: ["서울", "대극장"],
  region: "KR",
  importanceScore: 0.7,
}

const GLOBAL_TV: MediaItemForMatching = {
  mediaType: "TV",
  genres: ["드라마", "로맨스"],
  tags: ["넷플릭스", "미드"],
  region: "GLOBAL",
  importanceScore: 0.75,
}

/** 개방적·내향적 독서가 */
const BOOKWORM: PersonaForMediaMatching = {
  id: "persona-bookworm",
  expertise: ["소설", "문학", "독서"],
  role: "작가",
  country: "KR",
  languages: ["ko", "en"],
  temperament: {
    openness: 0.9,
    conscientiousness: 0.7,
    extraversion: 0.2,
    agreeableness: 0.6,
    neuroticism: 0.4,
  },
}

/** 외향적·영화광 */
const CINEPHILE: PersonaForMediaMatching = {
  id: "persona-cinephile",
  expertise: ["영화", "공포영화", "시네마"],
  role: "영화 리뷰어",
  country: "KR",
  languages: ["ko"],
  temperament: {
    openness: 0.7,
    conscientiousness: 0.5,
    extraversion: 0.85,
    agreeableness: 0.5,
    neuroticism: 0.3,
  },
}

/** 균형 잡힌 음악 팬 */
const MUSIC_FAN: PersonaForMediaMatching = {
  id: "persona-music-fan",
  expertise: ["음악", "K-Pop", "팝"],
  role: null,
  country: "KR",
  languages: ["ko"],
  temperament: {
    openness: 0.6,
    conscientiousness: 0.5,
    extraversion: 0.7,
    agreeableness: 0.7,
    neuroticism: 0.3,
  },
}

/** 미술 큐레이터 */
const ART_CURATOR: PersonaForMediaMatching = {
  id: "persona-art-curator",
  expertise: ["현대미술", "설치미술", "갤러리"],
  role: "큐레이터",
  country: "KR",
  languages: ["ko", "en"],
  temperament: {
    openness: 0.95,
    conscientiousness: 0.8,
    extraversion: 0.4,
    agreeableness: 0.7,
    neuroticism: 0.25,
  },
}

/** 해외 사용자 (일본인) */
const JP_USER: PersonaForMediaMatching = {
  id: "persona-jp",
  expertise: ["애니메이션", "만화"],
  role: null,
  country: "JP",
  languages: ["ja", "en"],
  temperament: {
    openness: 0.65,
    conscientiousness: 0.7,
    extraversion: 0.5,
    agreeableness: 0.6,
    neuroticism: 0.4,
  },
}

const ALL_PERSONAS = [BOOKWORM, CINEPHILE, MUSIC_FAN, ART_CURATOR, JP_USER]

// ── getImportanceGrade ────────────────────────────────────────

describe("getImportanceGrade", () => {
  it("0.9 → HIGH", () => expect(getImportanceGrade(0.9)).toBe("HIGH"))
  it("0.7 → HIGH", () => expect(getImportanceGrade(0.7)).toBe("HIGH"))
  it("0.5 → NORMAL", () => expect(getImportanceGrade(0.5)).toBe("NORMAL"))
  it("0.4 → NORMAL", () => expect(getImportanceGrade(0.4)).toBe("NORMAL"))
  it("0.39 → LOW", () => expect(getImportanceGrade(0.39)).toBe("LOW"))
  it("0.1 → LOW", () => expect(getImportanceGrade(0.1)).toBe("LOW"))
})

// ── getGradeConfig ────────────────────────────────────────────

describe("getGradeConfig", () => {
  it("HIGH 10명 → threshold=0.25", () => {
    const c = getGradeConfig("HIGH", 10)
    expect(c.threshold).toBe(0.25)
    expect(c.maxReactors).toBeGreaterThanOrEqual(1)
  })
  it("LOW 페르소나 수 증가 시 maxReactors 비율 감소", () => {
    const small = getGradeConfig("LOW", 10)
    const large = getGradeConfig("LOW", 100)
    expect(large.maxReactors / 100).toBeLessThan(small.maxReactors / 10)
  })
})

// ── computeRegionalRelevance ─────────────────────────────────

describe("computeRegionalRelevance", () => {
  const krPersona = { country: "KR", languages: ["ko"] }
  const jpPersona = { country: "JP", languages: ["ja"] }

  it("GLOBAL → 0.35", () => expect(computeRegionalRelevance("GLOBAL", krPersona)).toBe(0.35))
  it("KR 아이템 × KR 페르소나 → 0.9", () =>
    expect(computeRegionalRelevance("KR", krPersona)).toBe(0.9))
  it("US 아이템 × KR 페르소나(영어 없음) → 0.08", () =>
    expect(computeRegionalRelevance("US", krPersona)).toBe(0.08))
  it("KR 아이템 × JP 페르소나 → 0.08", () =>
    expect(computeRegionalRelevance("KR", jpPersona)).toBe(0.08))
  it("US 아이템 × 영어권 페르소나 → 0.5", () => {
    expect(computeRegionalRelevance("US", { country: "KR", languages: ["ko", "en"] })).toBe(0.5)
  })
})

// ── computeContentTypeAffinity ───────────────────────────────

describe("computeContentTypeAffinity", () => {
  const highOpenness = {
    openness: 0.95,
    conscientiousness: 0.5,
    extraversion: 0.2,
    agreeableness: 0.5,
    neuroticism: 0.3,
  }
  const highExtra = {
    openness: 0.3,
    conscientiousness: 0.5,
    extraversion: 0.95,
    agreeableness: 0.5,
    neuroticism: 0.3,
  }

  it("개방적 페르소나 → EXHIBITION 친화도 높음", () => {
    expect(computeContentTypeAffinity("EXHIBITION", highOpenness)).toBeGreaterThan(0.7)
  })
  it("개방적 페르소나 → BOOK 친화도 높음", () => {
    expect(computeContentTypeAffinity("BOOK", highOpenness)).toBeGreaterThan(0.6)
  })
  it("외향적 페르소나 → PERFORMANCE 친화도 높음", () => {
    expect(computeContentTypeAffinity("PERFORMANCE", highExtra)).toBeGreaterThan(0.5)
  })
  it("외향적 페르소나 → MUSIC 친화도 높음", () => {
    expect(computeContentTypeAffinity("MUSIC", highExtra)).toBeGreaterThan(0.5)
  })
  it("TV는 성향 무관 중간값 반환", () => {
    const score = computeContentTypeAffinity("TV", highOpenness)
    expect(score).toBeGreaterThan(0.1)
    expect(score).toBeLessThan(0.6)
  })
})

// ── computeMediaInterestScore ────────────────────────────────

describe("computeMediaInterestScore", () => {
  it("영화광 → MOVIE 점수 높음", () => {
    const result = computeMediaInterestScore(MOVIE_ITEM, CINEPHILE)
    expect(result.score).toBeGreaterThan(MEDIA_INTEREST_THRESHOLD)
    expect(result.personaId).toBe("persona-cinephile")
  })

  it("독서가 → BOOK 점수 높음", () => {
    const result = computeMediaInterestScore(BOOK_ITEM, BOOKWORM)
    expect(result.score).toBeGreaterThan(MEDIA_INTEREST_THRESHOLD)
  })

  it("미술 큐레이터 → EXHIBITION 점수 높음", () => {
    const result = computeMediaInterestScore(EXHIBITION_ITEM, ART_CURATOR)
    expect(result.score).toBeGreaterThan(0.5)
  })

  it("음악 팬 → MUSIC 점수 높음", () => {
    const result = computeMediaInterestScore(MUSIC_ITEM, MUSIC_FAN)
    expect(result.score).toBeGreaterThan(MEDIA_INTEREST_THRESHOLD)
  })

  it("독서가 → MUSIC 점수 낮음 (태그 오버랩 없음)", () => {
    const result = computeMediaInterestScore(MUSIC_ITEM, BOOKWORM)
    expect(result.score).toBeLessThan(0.55) // 성향만으로는 높지 않음
  })

  it("해외 페르소나 → KR 콘텐츠 지역 점수 낮음", () => {
    const result = computeMediaInterestScore(MOVIE_ITEM, JP_USER)
    const krResult = computeMediaInterestScore(MOVIE_ITEM, CINEPHILE)
    expect(result.score).toBeLessThan(krResult.score)
  })

  it("점수는 0~1 범위", () => {
    for (const persona of ALL_PERSONAS) {
      for (const item of [MOVIE_ITEM, BOOK_ITEM, EXHIBITION_ITEM, MUSIC_ITEM]) {
        const r = computeMediaInterestScore(item, persona)
        expect(r.score).toBeGreaterThanOrEqual(0)
        expect(r.score).toBeLessThanOrEqual(1)
      }
    }
  })

  it("breakdown 합산 검증 (가중치 총합 1.0)", () => {
    const r = computeMediaInterestScore(MOVIE_ITEM, CINEPHILE)
    const recomputed =
      r.breakdown.tagOverlap * 0.4 +
      r.breakdown.openness * 0.2 +
      r.breakdown.extraversion * 0.15 +
      r.breakdown.regionalRelevance * 0.15 +
      r.breakdown.contentTypeAffinity * 0.1
    expect(Math.abs(recomputed - r.score)).toBeLessThan(0.001)
  })
})

// ── selectPersonasForMediaItem ───────────────────────────────

describe("selectPersonasForMediaItem", () => {
  it("MOVIE → 영화광이 상위에 선정", () => {
    const results = selectPersonasForMediaItem(MOVIE_ITEM, ALL_PERSONAS)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].personaId).toBe("persona-cinephile")
  })

  it("EXHIBITION → 미술 큐레이터가 상위에 선정", () => {
    const results = selectPersonasForMediaItem(EXHIBITION_ITEM, ALL_PERSONAS)
    expect(results[0].personaId).toBe("persona-art-curator")
  })

  it("BOOK → 독서가가 상위에 선정", () => {
    const results = selectPersonasForMediaItem(BOOK_ITEM, ALL_PERSONAS)
    expect(results[0].personaId).toBe("persona-bookworm")
  })

  it("점수 내림차순 정렬 보장", () => {
    const results = selectPersonasForMediaItem(MOVIE_ITEM, ALL_PERSONAS)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it("threshold 상향 시 선정 페르소나 감소", () => {
    const low = selectPersonasForMediaItem(MOVIE_ITEM, ALL_PERSONAS, 0.1)
    const high = selectPersonasForMediaItem(MOVIE_ITEM, ALL_PERSONAS, 0.8)
    expect(high.length).toBeLessThanOrEqual(low.length)
  })

  it("빈 페르소나 목록 → 빈 배열 반환", () => {
    expect(selectPersonasForMediaItem(MOVIE_ITEM, [])).toEqual([])
  })
})

// ── allocateDailyMediaReactions ──────────────────────────────

describe("allocateDailyMediaReactions", () => {
  const items = [
    { id: "m1", item: MOVIE_ITEM },
    { id: "b1", item: BOOK_ITEM },
    { id: "e1", item: EXHIBITION_ITEM },
    { id: "mu1", item: MUSIC_ITEM },
  ]

  it("dailyBudget 초과하지 않음", () => {
    const result = allocateDailyMediaReactions(items, ALL_PERSONAS, { dailyBudget: 5 })
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it("페르소나당 maxPerPersona 초과하지 않음", () => {
    const result = allocateDailyMediaReactions(items, ALL_PERSONAS, {
      dailyBudget: 30,
      maxPerPersona: 1,
    })
    const byPersona = new Map<string, number>()
    for (const r of result) {
      byPersona.set(r.personaId, (byPersona.get(r.personaId) ?? 0) + 1)
    }
    for (const [, count] of byPersona) {
      expect(count).toBeLessThanOrEqual(1)
    }
  })

  it("빈 아이템 → 빈 배열", () => {
    expect(allocateDailyMediaReactions([], ALL_PERSONAS)).toEqual([])
  })

  it("빈 페르소나 → 빈 배열", () => {
    expect(allocateDailyMediaReactions(items, [])).toEqual([])
  })

  it("반환 페어에 itemId와 personaId 존재", () => {
    const result = allocateDailyMediaReactions(items, ALL_PERSONAS)
    for (const r of result) {
      expect(r.itemId).toBeTruthy()
      expect(r.personaId).toBeTruthy()
      expect(r.score).toBeGreaterThan(0)
    }
  })
})
