// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Media Reaction Trigger 단위 테스트 (T353)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  triggerMediaReactionPosts,
  runDailyMediaReactions,
  formatMediaItemTopic,
} from "@/lib/persona-world/media/media-reaction-trigger"
import type {
  MediaItemForTrigger,
  PersonaForMediaTrigger,
  MediaReactionDataProvider,
  DailyMediaDataProvider,
} from "@/lib/persona-world/media/media-reaction-trigger"

// ── 픽스처 ────────────────────────────────────────────────────

const MOVIE: MediaItemForTrigger = {
  id: "item-movie-1",
  mediaType: "MOVIE",
  title: "범죄도시4",
  creator: "허명행",
  genres: ["액션", "범죄"],
  tags: ["한국영화", "시리즈"],
  region: "KR",
  importanceScore: 0.85,
}

const EXHIBITION: MediaItemForTrigger = {
  id: "item-exhibition-1",
  mediaType: "EXHIBITION",
  title: "이우환: 침묵의 소리",
  creator: "이우환",
  venue: "국립현대미술관",
  genres: ["현대미술", "설치미술"],
  tags: ["전시", "무료"],
  region: "KR",
  importanceScore: 0.6,
}

const BOOK: MediaItemForTrigger = {
  id: "item-book-1",
  mediaType: "BOOK",
  title: "채식주의자",
  creator: "한강",
  genres: ["소설", "문학"],
  tags: ["베스트셀러"],
  region: "KR",
  importanceScore: 0.75,
}

const PERFORMANCE: MediaItemForTrigger = {
  id: "item-perf-1",
  mediaType: "PERFORMANCE",
  title: "레미제라블",
  venue: "샤롯데씨어터",
  genres: ["뮤지컬"],
  tags: ["대극장", "내한공연"],
  region: "KR",
  importanceScore: 0.7,
}

const MUSIC: MediaItemForTrigger = {
  id: "item-music-1",
  mediaType: "MUSIC",
  title: "APT.",
  creator: "ROSÉ",
  genres: ["K-Pop", "팝"],
  tags: ["차트"],
  region: "KR",
  importanceScore: 0.9,
}

const TV: MediaItemForTrigger = {
  id: "item-tv-1",
  mediaType: "TV",
  title: "오징어게임 시즌2",
  creator: "황동혁",
  genres: ["드라마", "스릴러"],
  tags: ["넷플릭스"],
  region: "GLOBAL",
  importanceScore: 0.95,
}

const CINEPHILE: PersonaForMediaTrigger = {
  id: "persona-cinephile",
  expertise: ["영화", "한국영화", "액션"],
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

const ART_CURATOR: PersonaForMediaTrigger = {
  id: "persona-art",
  expertise: ["현대미술", "설치미술"],
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

function makeProvider(
  personas: PersonaForMediaTrigger[],
  reacted = false
): MediaReactionDataProvider & {
  scheduled: Array<{ personaId: string; mediaItemId: string; topic: string }>
} {
  const scheduled: Array<{ personaId: string; mediaItemId: string; topic: string }> = []
  return {
    scheduled,
    getActivePersonas: vi.fn().mockResolvedValue(personas),
    hasReactedToMediaItem: vi.fn().mockResolvedValue(reacted),
    scheduleMediaReactionPost: vi.fn().mockImplementation(async (params) => {
      scheduled.push(params)
    }),
  }
}

// ── formatMediaItemTopic ─────────────────────────────────────

describe("formatMediaItemTopic", () => {
  it("MOVIE — 감독 포함", () => {
    expect(formatMediaItemTopic(MOVIE)).toBe("영화 [범죄도시4] (허명행) 관람 후기")
  })
  it("MOVIE — 감독 없음", () => {
    expect(formatMediaItemTopic({ ...MOVIE, creator: null })).toBe("영화 [범죄도시4] 관람 후기")
  })
  it("EXHIBITION — 작가+장소 포함", () => {
    expect(formatMediaItemTopic(EXHIBITION)).toBe(
      "전시 [이우환: 침묵의 소리] (이우환) @ 국립현대미술관 관람"
    )
  })
  it("PERFORMANCE — 장소 포함", () => {
    expect(formatMediaItemTopic(PERFORMANCE)).toBe("공연 [레미제라블] @ 샤롯데씨어터 관람")
  })
  it("BOOK — 저자 포함", () => {
    expect(formatMediaItemTopic(BOOK)).toBe("도서 [채식주의자] (한강) 독서")
  })
  it("MUSIC — 아티스트 포함", () => {
    expect(formatMediaItemTopic(MUSIC)).toBe("음악 [APT.] (ROSÉ) 감상")
  })
  it("TV — 감독 포함", () => {
    expect(formatMediaItemTopic(TV)).toBe("드라마/시리즈 [오징어게임 시즌2] (황동혁) 감상")
  })
})

// ── triggerMediaReactionPosts ────────────────────────────────

describe("triggerMediaReactionPosts", () => {
  it("관련 페르소나에게 반응 예약", async () => {
    const provider = makeProvider([CINEPHILE, ART_CURATOR])
    const reactions = await triggerMediaReactionPosts(MOVIE, provider)
    expect(reactions.length).toBeGreaterThan(0)
    expect(reactions[0].mediaItemId).toBe("item-movie-1")
  })

  it("영화광이 영화 아이템에 반응", async () => {
    const provider = makeProvider([CINEPHILE, ART_CURATOR])
    const reactions = await triggerMediaReactionPosts(MOVIE, provider)
    const personaIds = reactions.map((r) => r.personaId)
    expect(personaIds).toContain("persona-cinephile")
  })

  it("이미 반응한 페르소나는 건너뜀", async () => {
    const provider = makeProvider([CINEPHILE, ART_CURATOR], true)
    const reactions = await triggerMediaReactionPosts(MOVIE, provider)
    expect(reactions).toHaveLength(0)
  })

  it("빈 페르소나 → 빈 배열", async () => {
    const provider = makeProvider([])
    const reactions = await triggerMediaReactionPosts(MOVIE, provider)
    expect(reactions).toHaveLength(0)
  })

  it("scheduleMediaReactionPost 호출 시 topic 포함", async () => {
    const provider = makeProvider([CINEPHILE])
    await triggerMediaReactionPosts(MOVIE, provider)
    if (provider.scheduled.length > 0) {
      expect(provider.scheduled[0].topic).toContain("범죄도시4")
    }
  })

  it("reactions에 scheduledAt 타임스탬프 존재", async () => {
    const provider = makeProvider([CINEPHILE])
    const reactions = await triggerMediaReactionPosts(MOVIE, provider)
    for (const r of reactions) {
      expect(r.scheduledAt).toBeInstanceOf(Date)
    }
  })
})

// ── runDailyMediaReactions ────────────────────────────────────

describe("runDailyMediaReactions", () => {
  const ITEMS = [MOVIE, EXHIBITION, BOOK, PERFORMANCE, MUSIC]
  const PERSONAS = [CINEPHILE, ART_CURATOR]

  function makeDailyProvider(
    items: MediaItemForTrigger[],
    personas: PersonaForMediaTrigger[]
  ): DailyMediaDataProvider & { scheduled: Array<unknown> } {
    const scheduled: Array<unknown> = []
    return {
      scheduled,
      getActivePersonas: vi.fn().mockResolvedValue(personas),
      getRecentMediaItems: vi.fn().mockResolvedValue(items),
      hasReactedToMediaItem: vi.fn().mockResolvedValue(false),
      scheduleMediaReactionPost: vi.fn().mockImplementation(async (p) => {
        scheduled.push(p)
      }),
      getPersonaMediaReactionCountToday: vi.fn().mockResolvedValue(0),
    }
  }

  it("여러 아이템 처리 후 반응 예약", async () => {
    const provider = makeDailyProvider(ITEMS, PERSONAS)
    const reactions = await runDailyMediaReactions(provider)
    expect(reactions.length).toBeGreaterThan(0)
  })

  it("dailyBudget 초과하지 않음", async () => {
    const provider = makeDailyProvider(ITEMS, PERSONAS)
    const reactions = await runDailyMediaReactions(provider, { dailyBudget: 3 })
    expect(reactions.length).toBeLessThanOrEqual(3)
  })

  it("아이템 없으면 빈 배열", async () => {
    const provider = makeDailyProvider([], PERSONAS)
    expect(await runDailyMediaReactions(provider)).toEqual([])
  })

  it("페르소나 없으면 빈 배열", async () => {
    const provider = makeDailyProvider(ITEMS, [])
    expect(await runDailyMediaReactions(provider)).toEqual([])
  })

  it("CRITICAL 비용 시 즉시 중단", async () => {
    const provider = makeDailyProvider(ITEMS, PERSONAS)
    const costCheck = {
      getTodaySpending: vi.fn().mockResolvedValue(100),
      getDailyBudgetUsd: vi.fn().mockResolvedValue(1),
    }
    const reactions = await runDailyMediaReactions(provider, { costCheck })
    expect(reactions.length).toBe(0)
  })
})
