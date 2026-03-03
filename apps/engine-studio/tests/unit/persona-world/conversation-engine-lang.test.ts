import { describe, it, expect } from "vitest"
import { buildConversationSystemSuffix } from "@/lib/persona-world/conversation-engine"
import type { PersonaStateData } from "@/lib/persona-world/types"

// ═══════════════════════════════════════════════════════════════
// Conversation Engine: 유저 언어 적응 테스트
// ═══════════════════════════════════════════════════════════════

const baseState: PersonaStateData = {
  mood: 0.6,
  energy: 0.7,
  socialBattery: 0.5,
  paradoxTension: 0.1,
}

describe("buildConversationSystemSuffix — 언어 규칙", () => {
  it("언어 규칙 섹션이 항상 포함된다", () => {
    const suffix = buildConversationSystemSuffix(baseState, "", "chat")

    expect(suffix).toContain("## 언어 규칙")
    expect(suffix).toContain("유저가 사용하는 언어로 대화하세요")
    expect(suffix).toContain("성격, 말투 특징, 습관적 표현은 유지")
  })

  it("userLanguage가 ko일 때 감지 언어 힌트를 추가하지 않는다", () => {
    const suffix = buildConversationSystemSuffix(baseState, "", "chat", "ko")

    expect(suffix).toContain("## 언어 규칙")
    expect(suffix).not.toContain("감지된 언어:")
  })

  it("userLanguage가 en일 때 감지 언어 힌트를 추가한다", () => {
    const suffix = buildConversationSystemSuffix(baseState, "", "call", "en")

    expect(suffix).toContain("감지된 언어: en")
  })

  it("userLanguage가 ja일 때 감지 언어 힌트를 추가한다", () => {
    const suffix = buildConversationSystemSuffix(baseState, "", "chat", "ja")

    expect(suffix).toContain("감지된 언어: ja")
  })

  it("userLanguage가 미지정이면 감지 언어 힌트를 추가하지 않는다", () => {
    const suffix = buildConversationSystemSuffix(baseState, "", "chat")

    expect(suffix).toContain("## 언어 규칙")
    expect(suffix).not.toContain("감지된 언어:")
  })

  it("chat 모드에서 언어 규칙 + 대화 규칙이 모두 포함된다", () => {
    const suffix = buildConversationSystemSuffix(baseState, "", "chat", "en")

    expect(suffix).toContain("## 언어 규칙")
    expect(suffix).toContain("## 대화 규칙")
  })

  it("call 모드에서 언어 규칙 + 통화 규칙이 모두 포함된다", () => {
    const suffix = buildConversationSystemSuffix(baseState, "", "call", "en")

    expect(suffix).toContain("## 언어 규칙")
    expect(suffix).toContain("## 통화 규칙")
  })
})
