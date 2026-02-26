import { describe, it, expect } from "vitest"
import { extractHashtags, normalizeHashtag } from "@/lib/persona-world/hashtag-utils"

// ═══════════════════════════════════════════════════════════════
// extractHashtags 테스트
// ═══════════════════════════════════════════════════════════════

describe("extractHashtags", () => {
  it("기본 한글 해시태그를 추출한다", () => {
    const content = "좋은 영화 추천! #영화추천 #넷플릭스 #주말"
    const result = extractHashtags(content)
    expect(result).toEqual(["영화추천", "넷플릭스", "주말"])
  })

  it("영문 해시태그를 추출한다", () => {
    const content = "Great movie! #Netflix #MovieReview #Weekend"
    const result = extractHashtags(content)
    expect(result).toEqual(["Netflix", "MovieReview", "Weekend"])
  })

  it("한영 혼합 해시태그를 추출한다", () => {
    const content = "#SF영화 #Netflix추천 #2024베스트"
    const result = extractHashtags(content)
    expect(result).toEqual(["SF영화", "Netflix추천", "2024베스트"])
  })

  it("밑줄 포함 해시태그를 추출한다", () => {
    const content = "#movie_review #영화_리뷰"
    const result = extractHashtags(content)
    expect(result).toEqual(["movie_review", "영화_리뷰"])
  })

  it("중복 해시태그는 첫 번째만 유지한다 (대소문자 무시)", () => {
    const content = "#Netflix #netflix #NETFLIX"
    const result = extractHashtags(content)
    expect(result).toEqual(["Netflix"])
  })

  it("빈 문자열이면 빈 배열을 반환한다", () => {
    expect(extractHashtags("")).toEqual([])
    expect(extractHashtags("해시태그 없는 일반 텍스트")).toEqual([])
  })

  it("# 뒤에 공백이면 추출하지 않는다", () => {
    const content = "# 이건 해시태그가 아님 #이건해시태그"
    const result = extractHashtags(content)
    expect(result).toEqual(["이건해시태그"])
  })

  it("최대 10개까지만 추출한다", () => {
    const tags = Array.from({ length: 15 }, (_, i) => `#태그${i}`)
    const content = tags.join(" ")
    const result = extractHashtags(content)
    expect(result).toHaveLength(10)
  })

  it("특수문자가 포함되면 그 앞까지만 추출한다", () => {
    const content = "#영화추천! #좋아요👍 #리뷰.작성"
    const result = extractHashtags(content)
    expect(result).toEqual(["영화추천", "좋아요", "리뷰"])
  })

  it("콘텐츠 중간에 있는 해시태그도 추출한다", () => {
    const content = "오늘 본 #인셉션 정말 좋았다. #크리스토퍼놀란 감독 최고!"
    const result = extractHashtags(content)
    expect(result).toEqual(["인셉션", "크리스토퍼놀란"])
  })

  it("숫자만으로 된 해시태그도 추출한다", () => {
    const content = "#2024 #123"
    const result = extractHashtags(content)
    expect(result).toEqual(["2024", "123"])
  })
})

// ═══════════════════════════════════════════════════════════════
// normalizeHashtag 테스트
// ═══════════════════════════════════════════════════════════════

describe("normalizeHashtag", () => {
  it("영문을 소문자로 변환한다", () => {
    expect(normalizeHashtag("Netflix")).toBe("netflix")
    expect(normalizeHashtag("MOVIE")).toBe("movie")
  })

  it("한글은 변환 없이 유지한다", () => {
    expect(normalizeHashtag("영화추천")).toBe("영화추천")
  })

  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeHashtag("  Netflix  ")).toBe("netflix")
  })

  it("한영 혼합을 정규화한다", () => {
    expect(normalizeHashtag("Netflix추천")).toBe("netflix추천")
  })
})
