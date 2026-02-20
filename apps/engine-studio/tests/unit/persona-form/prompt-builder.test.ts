// ═══════════════════════════════════════════════════════════════
// Prompt Builder Tests
// prompt-builder.ts: buildPrompt() — v3 fallback + v4 VoiceSpec
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import { buildPrompt, buildAllPrompts } from "@/lib/prompt-builder"
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  Factbook,
  ImmutableFact,
  MutableContext,
} from "@/types"
import type { VoiceSpec } from "@/lib/qualitative/voice-spec"
import type { TriggerRuleDSL } from "@/lib/trigger/rule-dsl"

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

// v4 fixtures
const mockVoiceSpec: VoiceSpec = {
  profile: {
    speechStyle: "차분하고 분석적인 어투로 말하되, 때때로 감성적인 여운을 남긴다",
    habitualExpressions: ["그런데 말이죠", "솔직히 말해서"],
    physicalMannerisms: ["안경을 올리며"],
    unconsciousBehaviors: ["생각할 때 볼펜을 돌리는 습관"],
    activationThresholds: { excitement: 0.7, anger: 0.8 },
  },
  styleParams: {
    formality: 0.6,
    humor: 0.4,
    sentenceLength: 0.5,
    emotionExpression: 0.4,
    assertiveness: 0.6,
    vocabularyLevel: 0.7,
  },
  guardrails: {
    forbiddenPatterns: ["ㅋㅋ", "ㅎㅎ"],
    forbiddenBehaviors: ["인터넷 밈이나 유행어 무분별 사용", "근거 없는 단정적 표현"],
    toneBoundaries: { maxFormality: 0.95, minFormality: 0.1, maxAggression: 0.5 },
  },
  adaptations: [],
  consistency: { warningThreshold: 0.6, criticalThreshold: 0.4, checkWindowTokens: 500 },
  createdAt: Date.now(),
}

const mockFactbook: Factbook = {
  immutableFacts: [
    {
      id: "f1",
      category: "origin",
      content: "영화관에서 태어나 스크린 앞에서 자랐다",
      createdAt: Date.now(),
    } as ImmutableFact,
    {
      id: "f2",
      category: "innerConflict",
      content: "비평가로서의 냉철함과 영화 팬으로서의 열정 사이에서 갈등",
      createdAt: Date.now(),
    } as ImmutableFact,
  ],
  mutableContext: [
    {
      id: "c1",
      category: "selfNarrative",
      content: "최근 인디 영화에 빠져들며 주류 영화에 대한 시각이 변하고 있다",
      updatedAt: Date.now(),
      changeCount: 1,
    } as MutableContext,
  ],
  integrityHash: "abc123",
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const mockTriggerRules: TriggerRuleDSL[] = [
  {
    id: "t1",
    name: "기분 저조 시 감정 증폭",
    description: "신경성이 높은 페르소나가 기분 저조 시 감정 변동성 증가",
    when: { type: "compare", field: "state.mood", op: "<", value: 0.3 },
    then: [{ layer: "L3", dimension: "volatility", mode: "boost", magnitude: 0.2 }],
    priority: 10,
  },
  {
    id: "t2",
    name: "긴장 상태 시 분석 심화",
    description: "분석적 페르소나가 긴장 상태에서 더 깊은 분석을 수행",
    when: { type: "compare", field: "state.paradoxTension", op: ">", value: 0.5 },
    then: [{ layer: "L1", dimension: "depth", mode: "boost", magnitude: 0.1 }],
    priority: 10,
  },
]

// ═══════════════════════════════════════════════════════════════
// v3 fallback (voiceSpec 없음)
// ═══════════════════════════════════════════════════════════════
describe("buildPrompt (v3 fallback)", () => {
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

// ═══════════════════════════════════════════════════════════════
// v4 프롬프트 (voiceSpec 있음 → 자연어 기반)
// ═══════════════════════════════════════════════════════════════
describe("buildPrompt (v4 — VoiceSpec)", () => {
  it("does NOT include L1/L2/L3 technical headers", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(result).not.toContain("[성향 가이드 — L1 Social Persona]")
    expect(result).not.toContain("[내면 기질 — L2 OCEAN]")
    expect(result).not.toContain("[서사적 동기 — L3 Narrative Drive]")
  })

  it("does NOT include numeric vector values", () => {
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
      l2: {
        openness: 0.73,
        conscientiousness: 0.42,
        extraversion: 0.88,
        agreeableness: 0.15,
        neuroticism: 0.61,
      },
      l3: { lack: 0.85, moralCompass: 0.35, volatility: 0.92, growthArc: 0.67 },
      voiceSpec: mockVoiceSpec,
    })
    // L1 수치 없음
    expect(result).not.toContain("(0.77)")
    expect(result).not.toContain("(0.33)")
    expect(result).not.toContain("(0.90)")
    // L2 수치 없음
    expect(result).not.toContain("0.73")
    expect(result).not.toContain("0.42")
    expect(result).not.toContain("0.88")
    // L3 수치 없음
    expect(result).not.toContain("(0.85)")
    expect(result).not.toContain("(0.35)")
    expect(result).not.toContain("(0.92)")
  })

  it("does NOT include internal technical terms in guidelines", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(result).not.toContain("L1 벡터")
    expect(result).not.toContain("L2")
    expect(result).not.toContain("L3의 서사적 동기")
    expect(result).not.toContain("Paradox")
    expect(result).not.toContain("stance(")
  })

  it("includes v4 section headers", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(result).toContain("[역할 정의]")
    expect(result).toContain("[말투와 성격]")
    expect(result).toContain("[성격과 가치관]")
    expect(result).toContain("[내면 기질]")
    expect(result).toContain("[내면의 동기]")
    expect(result).toContain("[행동 지침]")
    expect(result).toContain("[금지 사항]")
  })

  it("includes VoiceSpec profile data", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(result).toContain("차분하고 분석적인 어투")
    expect(result).toContain("그런데 말이죠")
    expect(result).toContain("솔직히 말해서")
    expect(result).toContain("생각할 때 볼펜을 돌리는 습관")
  })

  it("includes style descriptions in natural language", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(result).toContain("문체 특성")
  })

  it("includes factbook sections when provided", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
      factbook: mockFactbook,
    })
    expect(result).toContain("[이 캐릭터의 불변의 진실")
    expect(result).toContain("영화관에서 태어나 스크린 앞에서 자랐다")
    expect(result).toContain("비평가로서의 냉철함과 영화 팬으로서의 열정")
    expect(result).toContain("[현재 맥락")
    expect(result).toContain("최근 인디 영화에 빠져들며")
  })

  it("includes trigger rules when provided", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
      triggerRules: mockTriggerRules,
    })
    expect(result).toContain("[행동 트리거")
    expect(result).toContain("기분 저조 시 감정 증폭")
    expect(result).toContain("긴장 상태 시 분석 심화")
  })

  it("includes VoiceSpec guardrail-based prohibitions", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(result).toContain("비속어 사용 금지")
    expect(result).toContain("인터넷 밈이나 유행어 무분별 사용 금지")
    expect(result).toContain("근거 없는 단정적 표현 금지")
    expect(result).toContain("ㅋㅋ")
  })

  it("uses natural language for v4 behavioral guidelines", () => {
    const result = buildPrompt({
      name: "영화광",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(result).toContain("위에 정의된 말투와 성격에 따라 톤과 깊이를 자연스럽게 조절")
    expect(result).toContain('"영화광"만의 입체적 매력')
    expect(result).toContain("내면의 동기가 때때로 균열처럼")
  })

  it("omits factbook section when null", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
      factbook: null,
    })
    expect(result).not.toContain("[이 캐릭터의 불변의 진실")
    expect(result).not.toContain("[현재 맥락")
  })

  it("omits trigger section when empty", () => {
    const result = buildPrompt({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
      triggerRules: [],
    })
    expect(result).not.toContain("[행동 트리거")
  })
})

// ═══════════════════════════════════════════════════════════════
// v4 buildAllPrompts — 5종 프롬프트 세트
// ═══════════════════════════════════════════════════════════════
describe("buildAllPrompts (v4)", () => {
  it("generates all 5 prompt types without L1/L2/L3 headers", () => {
    const prompts = buildAllPrompts({
      name: "테스트",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
      factbook: mockFactbook,
      triggerRules: mockTriggerRules,
    })

    for (const type of ["base", "review", "post", "comment", "interaction"] as const) {
      const prompt = prompts[type]
      expect(prompt).not.toContain("[성향 가이드 — L1 Social Persona]")
      expect(prompt).not.toContain("[내면 기질 — L2 OCEAN]")
      expect(prompt).not.toContain("[서사적 동기 — L3 Narrative Drive]")
      expect(prompt).toContain("[말투와 성격]")
      expect(prompt).toContain("[성격과 가치관]")
      expect(prompt).toContain("[금지 사항]")
    }
  })

  it("review prompt includes review-specific guide", () => {
    const prompts = buildAllPrompts({
      name: "테스트",
      role: "REVIEWER",
      expertise: ["영화"],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(prompts.review).toContain("[리뷰 작성 가이드]")
    expect(prompts.review).toContain("[리뷰 구조]")
  })

  it("post prompt includes post-specific guide", () => {
    const prompts = buildAllPrompts({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(prompts.post).toContain("[포스트 작성 가이드]")
  })

  it("comment prompt includes comment-specific guide", () => {
    const prompts = buildAllPrompts({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(prompts.comment).toContain("[댓글 작성 가이드]")
  })

  it("interaction prompt uses natural language for stance", () => {
    const prompts = buildAllPrompts({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
    })
    expect(prompts.interaction).toContain("[대화 스타일 가이드]")
    expect(prompts.interaction).toContain("[대화 규칙]")
    // v3에서는 stance(0.50)이 있었지만 v4에서는 자연어
    expect(prompts.interaction).not.toContain("stance(")
    expect(prompts.interaction).toContain('"테스트"의 평소 태도')
  })

  it("all v4 prompts include factbook when provided", () => {
    const prompts = buildAllPrompts({
      name: "테스트",
      role: "REVIEWER",
      expertise: [],
      l1: defaultL1,
      l2: defaultL2,
      l3: defaultL3,
      voiceSpec: mockVoiceSpec,
      factbook: mockFactbook,
    })

    for (const type of ["base", "review", "post", "comment", "interaction"] as const) {
      expect(prompts[type]).toContain("영화관에서 태어나 스크린 앞에서 자랐다")
    }
  })
})
