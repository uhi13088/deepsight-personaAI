import { describe, it, expect } from "vitest"
import { buildVoiceAnchorFromProfile, parseVoiceProfile } from "@/lib/persona-world/voice-anchor"
import type { VoiceProfile } from "@/types/persona-v3"

// ═══════════════════════════════════════════════════════════════
// T134: Voice Anchor Builder Tests
// ═══════════════════════════════════════════════════════════════

describe("buildVoiceAnchorFromProfile", () => {
  const fullProfile: VoiceProfile = {
    speechStyle: "정제된 학술적 어투로 논리를 전개하며, 근거를 명확히 제시한다",
    habitualExpressions: ["구조적으로 보면...", "핵심은 이거야.", "결론부터 말하면..."],
    physicalMannerisms: ["글을 쓸 때 손가락으로 테이블을 두드린다"],
    unconsciousBehaviors: [
      "감상 후 며칠이 지나서야 진짜 의견이 형성된다",
      "다른 사람의 리뷰를 읽기 전에 자신의 생각을 먼저 정리한다",
    ],
    activationThresholds: {
      anger: 0.3,
      joy: 0.75,
      sadness: 0.35,
      surprise: 0.5,
      disgust: 0.6,
    },
  }

  it("전체 프로필로 voiceAnchor 텍스트 생성", () => {
    const anchor = buildVoiceAnchorFromProfile(fullProfile)

    expect(anchor).toContain("[말투 스타일]")
    expect(anchor).toContain("학술적 어투")
    expect(anchor).toContain("[자주 쓰는 표현]")
    expect(anchor).toContain("구조적으로 보면...")
    expect(anchor).toContain("[성격 특성]")
    expect(anchor).toContain("며칠이 지나서야")
  })

  it("낮은 anger 임계값 → '쉽게 분노를 표현함' 포함", () => {
    const anchor = buildVoiceAnchorFromProfile(fullProfile)
    expect(anchor).toContain("쉽게 분노를 표현함")
  })

  it("높은 joy 임계값 → '기쁨 표현에 신중함' 포함", () => {
    const anchor = buildVoiceAnchorFromProfile(fullProfile)
    expect(anchor).toContain("기쁨 표현에 신중함")
  })

  it("habitualExpressions 빈 배열 → 해당 섹션 미포함", () => {
    const profile: VoiceProfile = {
      ...fullProfile,
      habitualExpressions: [],
    }
    const anchor = buildVoiceAnchorFromProfile(profile)
    expect(anchor).not.toContain("[자주 쓰는 표현]")
  })

  it("unconsciousBehaviors 빈 배열 → 성격 특성 섹션 미포함", () => {
    const profile: VoiceProfile = {
      ...fullProfile,
      unconsciousBehaviors: [],
    }
    const anchor = buildVoiceAnchorFromProfile(profile)
    expect(anchor).not.toContain("[성격 특성]")
  })

  it("speechStyle이 빈 문자열이면 말투 스타일 섹션 미포함", () => {
    const profile: VoiceProfile = {
      ...fullProfile,
      speechStyle: "",
    }
    const anchor = buildVoiceAnchorFromProfile(profile)
    expect(anchor).not.toContain("[말투 스타일]")
  })

  it("감정 활성화 임계값이 모두 중간 → 감정 표현 섹션 미포함", () => {
    const profile: VoiceProfile = {
      ...fullProfile,
      activationThresholds: {
        anger: 0.5,
        joy: 0.5,
        sadness: 0.5,
      },
    }
    const anchor = buildVoiceAnchorFromProfile(profile)
    expect(anchor).not.toContain("[감정 표현]")
  })

  it("결과는 비어있지 않은 문자열", () => {
    const anchor = buildVoiceAnchorFromProfile(fullProfile)
    expect(anchor.length).toBeGreaterThan(0)
    expect(typeof anchor).toBe("string")
  })
})

describe("parseVoiceProfile", () => {
  it("유효한 VoiceProfile JSON을 파싱", () => {
    const raw = {
      speechStyle: "casual_emotional",
      habitualExpressions: ["마음이 움직인 건..."],
      physicalMannerisms: ["크게 반응한다"],
      unconsciousBehaviors: ["첫 감상과 재감상의 평가가 달라진다"],
      activationThresholds: { anger: 0.5, joy: 0.6 },
    }
    const result = parseVoiceProfile(raw)
    expect(result).not.toBeNull()
    expect(result!.speechStyle).toBe("casual_emotional")
    expect(result!.habitualExpressions).toHaveLength(1)
  })

  it("null 입력 → null 반환", () => {
    expect(parseVoiceProfile(null)).toBeNull()
  })

  it("undefined 입력 → null 반환", () => {
    expect(parseVoiceProfile(undefined)).toBeNull()
  })

  it("빈 객체 → null 반환 (speechStyle 누락)", () => {
    expect(parseVoiceProfile({})).toBeNull()
  })

  it("speechStyle이 문자열이 아닌 경우 → null 반환", () => {
    expect(parseVoiceProfile({ speechStyle: 123, habitualExpressions: [] })).toBeNull()
  })

  it("habitualExpressions가 배열이 아닌 경우 → null 반환", () => {
    expect(parseVoiceProfile({ speechStyle: "ok", habitualExpressions: "not-array" })).toBeNull()
  })

  it("선택적 필드 누락 시 빈 배열/객체로 채움", () => {
    const raw = {
      speechStyle: "test",
      habitualExpressions: ["expr1"],
    }
    const result = parseVoiceProfile(raw)
    expect(result).not.toBeNull()
    expect(result!.physicalMannerisms).toEqual([])
    expect(result!.unconsciousBehaviors).toEqual([])
    expect(result!.activationThresholds).toEqual({})
  })

  it("문자열 입력 → null 반환", () => {
    expect(parseVoiceProfile("not an object")).toBeNull()
  })

  it("숫자 입력 → null 반환", () => {
    expect(parseVoiceProfile(42)).toBeNull()
  })
})
