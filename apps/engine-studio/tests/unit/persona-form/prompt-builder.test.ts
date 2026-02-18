// ═══════════════════════════════════════════════════════════════
// Prompt Builder Tests
// prompt-builder.ts: buildPrompt()
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import { buildPrompt } from "@/lib/prompt-builder"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── Test Fixtures ───────────────────────────────────────────
const defaultL1: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

const defaultL2: CoreTemperamentVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
}

const defaultL3: NarrativeDriveVector = {
  lack: 0.5,
  moralCompass: 0.5,
  volatility: 0.5,
  growthArc: 0.5,
}

// ═══════════════════════════════════════════════════════════════
// buildPrompt
// ═══════════════════════════════════════════════════════════════
describe("buildPrompt", () => {
  it("includes persona name in role definition", () => {
    const result = buildPrompt({
      name: "아이로닉한 철학자",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("아이로닉한 철학자")
    expect(result).toContain("[역할 정의]")
  })

  it("includes role in output", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "CURATOR",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("CURATOR")
  })

  it("joins expertise fields", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: ["영화", "음악", "도서"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("영화, 음악, 도서")
  })

  it("uses fallback when expertise is empty", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("전반적인 콘텐츠")
  })

  it("contains all 4 main sections", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("[역할 정의]")
    expect(result).toContain("[성향 가이드 — L1 Social Persona]")
    expect(result).toContain("[내면 기질 — L2 OCEAN]")
    expect(result).toContain("[서사적 동기 — L3 Narrative Drive]")
    expect(result).toContain("[행동 지침]")
    expect(result).toContain("[금지 사항]")
  })

  it("describes low L1 values correctly", () => {
    const lowL1: SocialPersonaVector = {
      depth: 0.1,
      lens: 0.1,
      stance: 0.1,
      scope: 0.1,
      taste: 0.1,
      purpose: 0.1,
      sociability: 0.1,
    }
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: lowL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("매우 직관적이고 즉흥적인")
    expect(result).toContain("순수하게 감성적인")
    expect(result).toContain("매우 수용적이고 포용적인")
    expect(result).toContain("극히 핵심만 추리는")
    expect(result).toContain("매우 보수적이고 대중적인")
    expect(result).toContain("순수하게 기분 전환과 오락만 추구하는")
    expect(result).toContain("극도로 독립적이고 은둔적인")
  })

  it("describes high L1 values correctly", () => {
    const highL1: SocialPersonaVector = {
      depth: 0.9,
      lens: 0.9,
      stance: 0.9,
      scope: 0.9,
      taste: 0.9,
      purpose: 0.9,
      sociability: 0.9,
    }
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: highL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("극도로 깊이 있고 학술적인")
    expect(result).toContain("극도로 논리적이고 데이터 중심의")
    expect(result).toContain("극도로 비판적이고 도전적인")
    expect(result).toContain("극도로 포괄적이고 세밀한")
    expect(result).toContain("극도로 전위적이고 언더그라운드 지향의")
    expect(result).toContain("존재론적 의미와 예술적 가치에 몰두하는")
    expect(result).toContain("극도로 사교적이고 소통 중심적인")
  })

  it("includes L2 OCEAN dimension labels", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("개방성")
    expect(result).toContain("성실성")
    expect(result).toContain("외향성")
    expect(result).toContain("친화성")
    expect(result).toContain("신경성")
  })

  it("includes L2 numeric values", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: {
        openness: 0.73,
        conscientiousness: 0.42,
        extraversion: 0.88,
        agreeableness: 0.15,
        neuroticism: 0.61,
      },
      l3: defaultL3,
    })
    expect(result).toContain("0.73")
    expect(result).toContain("0.42")
    expect(result).toContain("0.88")
    expect(result).toContain("0.15")
    expect(result).toContain("0.61")
  })

  it("includes L3 narrative dimensions", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("결핍")
    expect(result).toContain("도덕 나침반")
    expect(result).toContain("변동성")
    expect(result).toContain("성장 아크")
  })

  it("describes high L3 values correctly", () => {
    const highL3: NarrativeDriveVector = {
      lack: 0.9,
      moralCompass: 0.9,
      volatility: 0.9,
      growthArc: 0.9,
    }
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: highL3,
    })
    expect(result).toContain("극도로 깊은 결핍에 시달리는")
    expect(result).toContain("극도로 엄격한 도덕관")
    expect(result).toContain("극도로 변덕스럽고 폭발적인")
    expect(result).toContain("끊임없이 자기 변혁을 추구하는")
  })

  it("includes behavioral guidelines", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("L1 벡터에 따라 톤과 깊이를 자연스럽게 조절")
    expect(result).toContain("Paradox")
    expect(result).toContain("L3의 서사적 동기")
  })

  it("includes prohibitions", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("비속어 사용 금지")
    expect(result).toContain("정치적/종교적 편향 금지")
    expect(result).toContain("허위 정보 생성 금지")
    expect(result).toContain("캐릭터를 깨는 행동 금지")
  })

  it("generates non-empty prompt for any valid input", () => {
    const result = buildPrompt({
      name: "A",
      role: "ANALYST",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result.length).toBeGreaterThan(100)
  })

  it("includes vector numeric values in L1 section", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: {
        depth: 0.77,
        lens: 0.33,
        stance: 0.5,
        scope: 0.9,
        taste: 0.1,
        purpose: 0.65,
        sociability: 0.45,
      },
      l2: defaultL2,
      l3: defaultL3,
    })
    expect(result).toContain("0.77")
    expect(result).toContain("0.33")
    expect(result).toContain("0.90")
    expect(result).toContain("0.10")
  })
})
