// ═══════════════════════════════════════════════════════════════
// LLM 호출 어댑터
// T61-AC2: 프롬프트 템플릿, 모델 라우팅, 구조화된 출력
// ═══════════════════════════════════════════════════════════════

// ── LLM 어댑터 인터페이스 ──────────────────────────────────────

export interface LLMGenerateParams {
  model: "sonnet" | "haiku"
  systemPrompt: string
  userPrompt: string
  temperature?: number // default 0.7
  maxTokens?: number // default 4096
}

export interface LLMAdapter {
  generate(params: LLMGenerateParams): Promise<Record<string, unknown>>
}

// ── 프롬프트 템플릿 ─────────────────────────────────────────────

export const PROMPTS = {
  CHARACTER_GEN: {
    system: `당신은 AI 페르소나의 캐릭터 프로필을 생성하는 전문가입니다.
주어진 벡터 데이터와 기본 정보를 기반으로 일관된 캐릭터를 설계합니다.
결과는 반드시 JSON 형태로 반환하세요.`,
    user: (vfinal: string, basicInfo: string, archetype: string) =>
      `## 벡터 데이터
${vfinal}

## 기본 정보
${basicInfo}

## 아키타입
${archetype || "없음"}

## 요청
위 정보를 기반으로 캐릭터 프로필을 JSON으로 생성하세요.
필수 필드: name, role, background, speechPatterns, quirks, habits, expertise`,
  },

  BACKSTORY_GEN: {
    system: `당신은 AI 페르소나의 배경 서사를 생성하는 전문가입니다.
벡터 레이어 간 긴장(Paradox)을 반영한 깊이 있는 서사를 만듭니다.
결과는 반드시 JSON 형태로 반환하세요.`,
    user: (l1: string, l2: string, l3: string, paradox: string) =>
      `## L1 소셜 벡터
${l1}

## L2 기질 벡터
${l2}

## L3 내러티브 벡터
${l3}

## 패러독스 분석
${paradox}

## 요청
위 벡터 간 긴장 관계를 반영한 배경 서사를 JSON으로 생성하세요.
필수 필드: origin, formativeExperience, innerConflict, selfNarrative, nlpKeywords`,
  },

  VOICE_GEN: {
    system: `당신은 AI 페르소나의 말투와 표현 방식을 설계하는 전문가입니다.
L1 소셜 벡터와 캐릭터 특성을 반영한 독특한 보이스를 만듭니다.
결과는 반드시 JSON 형태로 반환하세요.`,
    user: (l1: string, character: string) =>
      `## L1 소셜 벡터
${l1}

## 캐릭터 정보
${character}

## 요청
위 정보를 기반으로 보이스 프로필을 JSON으로 생성하세요.
필수 필드: speechStyle, habitualExpressions, physicalMannerisms, unconsciousBehaviors, activationThresholds`,
  },

  CONTENT_GEN: {
    system: `당신은 AI 페르소나의 콘텐츠 선호도와 스타일을 설계하는 전문가입니다.
V_Final 벡터와 캐릭터를 기반으로 콘텐츠 설정을 만듭니다.
결과는 반드시 JSON 형태로 반환하세요.`,
    user: (vfinal: string, character: string) =>
      `## V_Final 벡터
${vfinal}

## 캐릭터 정보
${character}

## 요청
위 정보를 기반으로 콘텐츠 설정을 JSON으로 생성하세요.
필수 필드: preferredGenres, preferredFormats, tonePreferences, thematicInterests`,
  },

  PRESSURE_GEN: {
    system: `당신은 AI 페르소나의 상황 압력 반응을 설계하는 전문가입니다.
L3 내러티브 드라이브와 패러독스를 기반으로 압력 컨텍스트를 만듭니다.
결과는 반드시 JSON 형태로 반환하세요.`,
    user: (l3: string, paradox: string) =>
      `## L3 내러티브 벡터
${l3}

## 패러독스 분석
${paradox}

## 요청
위 정보를 기반으로 압력 컨텍스트를 JSON으로 생성하세요.
필수 필드: situationalTriggers, stressResponse, comfortZone`,
  },

  ZEITGEIST_GEN: {
    system: `당신은 AI 페르소나의 시대상과 문화적 맥락을 설계하는 전문가입니다.
기본 정보(나이, 직업 등)를 기반으로 문화적 프로필을 만듭니다.
결과는 반드시 JSON 형태로 반환하세요.`,
    user: (basicInfo: string) =>
      `## 기본 정보
${basicInfo}

## 요청
위 정보를 기반으로 시대상 프로필을 JSON으로 생성하세요.
필수 필드: culturalReferences, generationalMarkers, socialAwareness, trendSensitivity`,
  },

  TEST_SIM: {
    system: `당신은 AI 페르소나 테스트 전문가입니다.
주어진 시스템 프롬프트에 따라 페르소나로서 응답하고, 스스로 평가합니다.
결과는 반드시 JSON 형태로 반환하세요.`,
    user: (promptSet: string, character: string, scenario: string) =>
      `## 시스템 프롬프트
${promptSet}

## 캐릭터 정보
${character}

## 테스트 시나리오
${scenario}

## 요청
1. 위 페르소나로서 시나리오에 응답하세요
2. 응답의 품질을 0.0~1.0으로 자가 평가하세요
필수 필드: response, voiceConsistency, characterFidelity, traitExpression, overallScore`,
  },
} as const

// ── 모델 라우팅 ─────────────────────────────────────────────────

export type NodeLLMConfig = {
  model: "sonnet" | "haiku"
  temperature: number
  maxTokens: number
}

const DEFAULT_LLM_CONFIG: NodeLLMConfig = {
  model: "sonnet",
  temperature: 0.7,
  maxTokens: 4096,
}

export const NODE_LLM_CONFIGS: Record<string, NodeLLMConfig> = {
  "character-gen": { ...DEFAULT_LLM_CONFIG, temperature: 0.8 },
  "backstory-gen": { ...DEFAULT_LLM_CONFIG, temperature: 0.8 },
  "voice-gen": { ...DEFAULT_LLM_CONFIG },
  "content-gen": { ...DEFAULT_LLM_CONFIG },
  "pressure-gen": { ...DEFAULT_LLM_CONFIG },
  "zeitgeist-gen": { ...DEFAULT_LLM_CONFIG },
  "test-sim": { ...DEFAULT_LLM_CONFIG, temperature: 0.6 },
}

export function getLLMConfig(nodeType: string): NodeLLMConfig {
  return NODE_LLM_CONFIGS[nodeType] ?? DEFAULT_LLM_CONFIG
}

// ── 유틸: 객체를 프롬프트 문자열로 변환 ──────────────────────────

export function toPromptString(data: unknown): string {
  if (data === null || data === undefined) return "없음"
  if (typeof data === "string") return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}
