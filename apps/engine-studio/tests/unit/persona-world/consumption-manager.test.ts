import { describe, it, expect, vi } from "vitest"
import { autoTag, generateImpression } from "@/lib/persona-world/consumption-manager"
import type { ConsumptionContentType } from "@/lib/persona-world/types"

// ═══ autoTag ═══

describe("autoTag", () => {
  it("contentType을 첫 태그로 포함", () => {
    const tags = autoTag("MOVIE", "인터스텔라")
    expect(tags[0]).toBe("movie")
  })

  it("제목에서 키워드 추출 (2자 이상)", () => {
    const tags = autoTag("BOOK", "사피엔스 유발 하라리")
    expect(tags).toContain("사피엔스")
    expect(tags).toContain("유발")
    expect(tags).toContain("하라리")
  })

  it("최대 3개 키워드 + contentType = 최대 4개", () => {
    const tags = autoTag("DRAMA", "기묘한 이야기 시즌 3 넷플릭스 한정판")
    // contentType(1) + 키워드(최대 3) = 최대 4
    expect(tags.length).toBeLessThanOrEqual(4)
    expect(tags[0]).toBe("drama")
  })

  it("1자 단어는 제외", () => {
    const tags = autoTag("MUSIC", "A B 로드 투 노웨어")
    expect(tags).not.toContain("a")
    expect(tags).not.toContain("b")
    expect(tags).toContain("로드")
  })

  it("특수문자 제거", () => {
    const tags = autoTag("ARTICLE", "AI의 미래: 2026년 전망")
    // 특수문자(', :) 제거 후 키워드
    expect(tags.some((t) => t.includes(":"))).toBe(false)
  })

  it("빈 제목 → contentType만 반환", () => {
    const tags = autoTag("GAME", "")
    expect(tags).toEqual(["game"])
  })

  it("OTHER 타입도 정상 동작", () => {
    const tags = autoTag("OTHER", "전시회 관람")
    expect(tags[0]).toBe("other")
    expect(tags).toContain("전시회")
  })
})

// ═══ generateImpression ═══

describe("generateImpression", () => {
  it("LLM provider 없으면 기본 템플릿 사용 — MOVIE", async () => {
    const impression = await generateImpression("MOVIE", "인터스텔라")
    expect(impression).toContain("인터스텔라")
    expect(impression).toContain("봤다")
  })

  it("LLM provider 없으면 기본 템플릿 사용 — DRAMA", async () => {
    const impression = await generateImpression("DRAMA", "기묘한 이야기")
    expect(impression).toContain("기묘한 이야기")
    expect(impression).toContain("정주행")
  })

  it("LLM provider 없으면 기본 템플릿 사용 — MUSIC", async () => {
    const impression = await generateImpression("MUSIC", "Bohemian Rhapsody")
    expect(impression).toContain("Bohemian Rhapsody")
    expect(impression).toContain("듣게 된다")
  })

  it("LLM provider 없으면 기본 템플릿 사용 — BOOK", async () => {
    const impression = await generateImpression("BOOK", "사피엔스")
    expect(impression).toContain("사피엔스")
    expect(impression).toContain("읽었다")
  })

  it("LLM provider 없으면 기본 템플릿 사용 — GAME", async () => {
    const impression = await generateImpression("GAME", "엘든 링")
    expect(impression).toContain("엘든 링")
    expect(impression).toContain("플레이")
  })

  it("LLM provider 있으면 LLM 결과 반환", async () => {
    const mockProvider = {
      generateImpression: vi.fn().mockResolvedValue("놀란 감독의 역작, 시공간을 초월한 감동"),
    }

    const impression = await generateImpression(
      "MOVIE",
      "인터스텔라",
      mockProvider,
      "논리적이고 분석적인 성격"
    )
    expect(impression).toBe("놀란 감독의 역작, 시공간을 초월한 감동")
    expect(mockProvider.generateImpression).toHaveBeenCalledWith({
      contentType: "MOVIE",
      title: "인터스텔라",
      personaContext: "논리적이고 분석적인 성격",
    })
  })

  it("LLM provider 있지만 personaContext 없으면 기본 템플릿", async () => {
    const mockProvider = {
      generateImpression: vi.fn(),
    }

    const impression = await generateImpression("MOVIE", "인터스텔라", mockProvider)
    expect(impression).toContain("인터스텔라")
    expect(mockProvider.generateImpression).not.toHaveBeenCalled()
  })

  it("모든 contentType에 기본 템플릿 존재", async () => {
    const types: ConsumptionContentType[] = [
      "MOVIE",
      "DRAMA",
      "MUSIC",
      "BOOK",
      "ARTICLE",
      "GAME",
      "OTHER",
    ]

    for (const type of types) {
      const impression = await generateImpression(type, "테스트 콘텐츠")
      expect(impression).toBeTruthy()
      expect(impression).toContain("테스트 콘텐츠")
    }
  })
})
