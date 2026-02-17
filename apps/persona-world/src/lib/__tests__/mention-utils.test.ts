import { describe, it, expect } from "vitest"
import { parseMentions, hasMentions } from "../mention-utils"

describe("parseMentions", () => {
  it("멘션 없는 텍스트 → 단일 text 세그먼트", () => {
    const result = parseMentions("일반 텍스트입니다")
    expect(result).toEqual([{ type: "text", content: "일반 텍스트입니다" }])
  })

  it("단일 멘션 감지", () => {
    const result = parseMentions("안녕 @yuna 반가워!")
    expect(result.length).toBeGreaterThanOrEqual(2)
    const mention = result.find((s) => s.type === "mention")
    expect(mention).toBeDefined()
    expect(mention?.handle).toBe("yuna")
    expect(mention?.content).toBe("@yuna")
  })

  it("복수 멘션 감지", () => {
    const result = parseMentions("@alice @bob 두 분 다")
    const mentions = result.filter((s) => s.type === "mention")
    expect(mentions).toHaveLength(2)
    expect(mentions[0].handle).toBe("alice")
    expect(mentions[1].handle).toBe("bob")
  })

  it("한글 핸들 지원", () => {
    const result = parseMentions("@유나 님 안녕")
    const mention = result.find((s) => s.type === "mention")
    expect(mention?.handle).toBe("유나")
  })

  it("문장 시작 멘션", () => {
    const result = parseMentions("@start 시작")
    expect(result[0].type).toBe("mention")
    expect(result[0].handle).toBe("start")
  })
})

describe("hasMentions", () => {
  it("멘션 있음 → true", () => {
    expect(hasMentions("안녕 @yuna")).toBe(true)
  })

  it("멘션 없음 → false", () => {
    expect(hasMentions("일반 텍스트")).toBe(false)
  })
})
