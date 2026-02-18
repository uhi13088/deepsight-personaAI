import { describe, it, expect } from "vitest"
import {
  extractMentionHandles,
  parseTextWithMentions,
  type MentionInfo,
  type TextSegment,
} from "@/lib/persona-world/mention-service"

// ═══ extractMentionHandles ═══

describe("extractMentionHandles", () => {
  it("단일 멘션 추출", () => {
    const handles = extractMentionHandles("안녕 @yuna_feels 반가워!")
    expect(handles).toEqual(["yuna_feels"])
  })

  it("복수 멘션 추출", () => {
    const handles = extractMentionHandles("@persona1 @persona2 두 분 다 좋아요")
    expect(handles).toEqual(["persona1", "persona2"])
  })

  it("중복 핸들 제거", () => {
    const handles = extractMentionHandles("@yuna @yuna 두 번 멘션")
    expect(handles).toEqual(["yuna"])
  })

  it("한글 핸들 지원", () => {
    const handles = extractMentionHandles("@유나 님 안녕하세요")
    expect(handles).toEqual(["유나"])
  })

  it("밑줄 포함 핸들", () => {
    const handles = extractMentionHandles("@cool_reviewer_123 멋져요")
    expect(handles).toEqual(["cool_reviewer_123"])
  })

  it("멘션 없는 텍스트", () => {
    const handles = extractMentionHandles("멘션 없는 일반 텍스트입니다")
    expect(handles).toEqual([])
  })

  it("이메일 주소 형태는 무시", () => {
    // @는 공백이나 문장 시작 뒤에만 인식
    const handles = extractMentionHandles("user@example.com은 이메일입니다")
    expect(handles).toEqual([])
  })

  it("문장 시작 멘션", () => {
    const handles = extractMentionHandles("@starter 첫 번째 단어")
    expect(handles).toEqual(["starter"])
  })

  it("30자까지 핸들 매칭", () => {
    const handle30 = "a".repeat(30)
    const handles = extractMentionHandles(`@${handle30} 정확히 30자`)
    expect(handles).toEqual([handle30])
  })
})

// ═══ parseTextWithMentions ═══

describe("parseTextWithMentions", () => {
  it("멘션 없으면 단일 text 세그먼트", () => {
    const segments = parseTextWithMentions("일반 텍스트", [])
    expect(segments).toEqual([{ type: "text", content: "일반 텍스트" }])
  })

  it("단일 멘션 → 3 세그먼트", () => {
    const mentions: MentionInfo[] = [
      {
        handle: "yuna",
        personaId: "p1",
        personaName: "유나",
        startIndex: 3,
        endIndex: 8, // "@yuna"
      },
    ]
    const segments = parseTextWithMentions("안녕 @yuna 반가워!", mentions)

    expect(segments).toHaveLength(3)
    expect(segments[0]).toEqual({ type: "text", content: "안녕 " })
    expect(segments[1]).toEqual({
      type: "mention",
      content: "@yuna",
      personaId: "p1",
      handle: "yuna",
    })
    expect(segments[2]).toEqual({ type: "text", content: " 반가워!" })
  })

  it("복수 멘션 세그먼트 분리", () => {
    const mentions: MentionInfo[] = [
      {
        handle: "a",
        personaId: "p1",
        personaName: "A",
        startIndex: 0,
        endIndex: 2,
      },
      {
        handle: "b",
        personaId: "p2",
        personaName: "B",
        startIndex: 3,
        endIndex: 5,
      },
    ]
    const segments = parseTextWithMentions("@a @b 둘 다", mentions)

    // @a(mention) + " "(text) + @b(mention) + " 둘 다"(text)
    expect(segments).toHaveLength(4)
    expect(segments[0].type).toBe("mention")
    expect(segments[1].type).toBe("text")
    expect(segments[2].type).toBe("mention")
    expect(segments[3].type).toBe("text")
  })

  it("텍스트 끝의 멘션 처리", () => {
    const mentions: MentionInfo[] = [
      {
        handle: "end",
        personaId: "p1",
        personaName: "End",
        startIndex: 5,
        endIndex: 9,
      },
    ]
    const segments = parseTextWithMentions("hello@end", mentions)

    expect(segments).toHaveLength(2)
    expect(segments[0]).toEqual({ type: "text", content: "hello" })
    expect(segments[1].type).toBe("mention")
  })

  it("멘션만 있는 텍스트 → 단일 mention 세그먼트", () => {
    const mentions: MentionInfo[] = [
      {
        handle: "solo",
        personaId: "p1",
        personaName: "Solo",
        startIndex: 0,
        endIndex: 5,
      },
    ]
    const segments = parseTextWithMentions("@solo", mentions)

    expect(segments).toHaveLength(1)
    expect(segments[0]).toEqual({
      type: "mention",
      content: "@solo",
      personaId: "p1",
      handle: "solo",
    })
  })

  it("정렬되지 않은 멘션도 위치순으로 처리", () => {
    const mentions: MentionInfo[] = [
      {
        handle: "second",
        personaId: "p2",
        personaName: "Second",
        startIndex: 8,
        endIndex: 15,
      },
      {
        handle: "first",
        personaId: "p1",
        personaName: "First",
        startIndex: 0,
        endIndex: 6,
      },
    ]
    const segments = parseTextWithMentions("@first @second 테스트", mentions)

    expect(segments[0].type).toBe("mention")
    expect(segments[0].handle).toBe("first")
    expect(segments[2].type).toBe("mention")
    expect(segments[2].handle).toBe("second")
  })

  it("TextSegment 타입 구조 검증", () => {
    const textSeg: TextSegment = { type: "text", content: "hello" }
    const mentionSeg: TextSegment = {
      type: "mention",
      content: "@yuna",
      personaId: "p1",
      handle: "yuna",
    }

    expect(textSeg.type).toBe("text")
    expect(textSeg.personaId).toBeUndefined()
    expect(mentionSeg.type).toBe("mention")
    expect(mentionSeg.personaId).toBe("p1")
    expect(mentionSeg.handle).toBe("yuna")
  })
})

// ═══ extractMentionHandles — 추가 엣지 케이스 ═══

describe("extractMentionHandles — edge cases", () => {
  it("빈 문자열", () => {
    expect(extractMentionHandles("")).toEqual([])
  })

  it("멘션 사이 줄바꿈", () => {
    const handles = extractMentionHandles("@first\n@second 텍스트")
    expect(handles).toEqual(["first", "second"])
  })

  it("연속 호출 시 regex 상태 초기화 (lastIndex)", () => {
    // 같은 텍스트 2번 호출해도 결과 동일해야 함
    const text = "@persona1 @persona2"
    const first = extractMentionHandles(text)
    const second = extractMentionHandles(text)
    expect(first).toEqual(second)
  })

  it("멘션 5개 이상 추출", () => {
    const text = "@a @b @c @d @e @f 많은 멘션"
    const handles = extractMentionHandles(text)
    expect(handles).toEqual(["a", "b", "c", "d", "e", "f"])
    expect(handles).toHaveLength(6)
  })

  it("특수문자 뒤 멘션은 감지하지 않음 (마침표 뒤)", () => {
    // 마침표 뒤에는 공백 없으면 감지 안 됨
    const handles = extractMentionHandles("end.@test")
    expect(handles).toEqual([])
  })

  it("탭 문자 뒤 멘션 감지", () => {
    const handles = extractMentionHandles("탭\t@tabuser 테스트")
    expect(handles).toEqual(["tabuser"])
  })

  it("숫자만으로 된 핸들", () => {
    const handles = extractMentionHandles("@12345 숫자 핸들")
    expect(handles).toEqual(["12345"])
  })

  it("한글+영문 혼합 핸들", () => {
    const handles = extractMentionHandles("@유나yuna123 혼합 핸들")
    expect(handles).toEqual(["유나yuna123"])
  })
})

// ═══ MentionInfo 구조 검증 ═══

describe("MentionInfo 구조", () => {
  it("MentionInfo가 올바른 필드를 포함한다", () => {
    const info: MentionInfo = {
      handle: "test_handle",
      personaId: "persona-123",
      personaName: "테스트 페르소나",
      startIndex: 0,
      endIndex: 12,
    }

    expect(info.handle).toBe("test_handle")
    expect(info.personaId).toBe("persona-123")
    expect(info.personaName).toBe("테스트 페르소나")
    expect(info.startIndex).toBe(0)
    expect(info.endIndex).toBe(12)
    expect(info.endIndex).toBeGreaterThan(info.startIndex)
  })
})
