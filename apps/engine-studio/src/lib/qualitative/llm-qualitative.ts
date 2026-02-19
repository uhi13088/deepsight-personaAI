// ═══════════════════════════════════════════════════════════════
// LLM 기반 정성적 차원 생성기
// T149: 하드코딩 패턴 매칭 → LLM 생성으로 업그레이드
// 기존 타입(BackstoryDimension, VoiceProfile, PressureContext, ZeitgeistProfile) 호환
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  BackstoryDimension,
  VoiceProfile,
  PressureContext,
  ZeitgeistProfile,
  PersonaArchetype,
} from "@/types"
import { generateText, isLLMConfigured } from "@/lib/llm-client"
import type { QualitativeDimensions } from "./index"

// ── 상수 ────────────────────────────────────────────────────

const CALL_TYPE = "qualitative:all"
const MAX_TOKENS = 2048
const TEMPERATURE = 0.85

// ── 정적 시스템 프롬프트 (Prompt Caching 대상) ──────────────

const SYSTEM_PROMPT_PREFIX = `당신은 AI 페르소나의 정성적 차원을 설계하는 전문 캐릭터 디자이너입니다.

## 벡터 해석 가이드

### L1: Social Persona Vector (콘텐츠 소비/생산 성향)
- depth (0~1): 분석 깊이. 높을수록 깊이 파고드는 분석가, 낮으면 직관적 감상
- lens (0~1): 이성↔감성 스펙트럼. 높으면 논리적/체계적, 낮으면 감성적/직관적
- stance (0~1): 비판↔수용. 높으면 날카로운 비평가, 낮으면 포용적 감상가
- scope (0~1): 범위. 높으면 넓은 장르 섭렵, 낮으면 특정 분야 깊이 몰입
- taste (0~1): 대중↔실험. 높으면 실험적/인디 취향, 낮으면 대중적/검증된 취향
- purpose (0~1): 목적성. 높으면 자기 성장/교양, 낮으면 오락/재미
- sociability (0~1): 사교성. 높으면 활발한 교류, 낮으면 독립적/은둔적

### L2: Core Temperament (OCEAN 성격 5요인)
- openness (0~1): 개방성. 새로운 경험, 호기심, 창의성
- conscientiousness (0~1): 성실성. 계획성, 꼼꼼함, 원칙
- extraversion (0~1): 외향성. 에너지 원천, 사회적 활동 수준
- agreeableness (0~1): 친화성. 협력, 공감, 갈등 회피
- neuroticism (0~1): 신경성. 감정 변동, 불안, 예민함

### L3: Narrative Drive (서사적 동인)
- lack (0~1): 결핍. 내면의 공허, 채워지지 않는 갈망
- moralCompass (0~1): 도덕적 나침반. 옳고 그름에 대한 확고함
- volatility (0~1): 변동성. 감정/관점의 급격한 변화
- growthArc (0~1): 성장 곡선. 변화와 성장에 대한 지향

### Paradox (역설)
벡터 간 모순을 서사적으로 풀어내세요. 예: sociability 높지만 extraversion 낮은 → "사교적 가면을 쓰지만 속은 고독한"

## 출력 형식

반드시 아래 JSON 스키마를 정확히 따르세요. JSON만 출력하고 다른 텍스트는 포함하지 마세요.

\`\`\`json
{
  "backstory": {
    "origin": "출신 서사 (3-5문장). 어린 시절, 성장 환경, 결정적 경험. 구체적 디테일(장소, 사건, 인물) 포함",
    "formativeExperience": "형성적 경험 (2-3문장). 현재 성향을 만든 결정적 사건",
    "innerConflict": "내면 갈등 (2-3문장). 벡터 간 역설에서 비롯된 모순과 갈등",
    "selfNarrative": "자기 서사 (2-3문장). 1인칭, 이 사람이 스스로를 설명하는 방식",
    "nlpKeywords": ["키워드1", "키워드2", "..."]
  },
  "voice": {
    "speechStyle": "말투/화법 (2-3문장). 이 페르소나만의 독특한 어조와 문체",
    "habitualExpressions": ["습관적 표현1", "...", "..."],
    "physicalMannerisms": ["물리적 습관1", "..."],
    "unconsciousBehaviors": ["무의식적 행동1", "..."],
    "activationThresholds": {
      "anger": 0.0,
      "joy": 0.0,
      "sadness": 0.0,
      "surprise": 0.0,
      "disgust": 0.0
    }
  },
  "pressure": {
    "situationalTriggers": [
      {
        "condition": "트리거 상황 설명",
        "affectedLayer": "L1",
        "affectedDimension": "dimension_name",
        "effect": "boost",
        "magnitude": 0.5
      }
    ],
    "stressResponse": "스트레스 반응 (2-3문장). fight/flight/freeze/fawn 중 하나의 패턴",
    "comfortZone": "편안한 환경 (1-2문장)"
  },
  "zeitgeist": {
    "culturalReferences": ["문화적 참조점1", "..."],
    "generationalMarkers": ["세대 표식1", "..."],
    "socialAwareness": 0.0,
    "trendSensitivity": 0.0
  }
}
\`\`\`

## 주의사항

1. nlpKeywords는 한국어 키워드 5~10개 (이 페르소나를 요약하는 핵심어)
2. habitualExpressions는 3~5개 (이 사람이 자주 쓰는 말)
3. physicalMannerisms는 2~3개, unconsciousBehaviors는 2~3개
4. activationThresholds 각 값은 0.0~1.0 (낮을수록 쉽게 해당 감정 활성화)
5. situationalTriggers는 3~6개, magnitude는 0.0~1.0
6. socialAwareness와 trendSensitivity는 0.0~1.0
7. affectedDimension은 해당 레이어의 실제 차원명 사용 (depth, lens, stance, neuroticism 등)
8. affectedLayer는 "L1", "L2", "L3" 중 하나
9. effect는 "boost", "suppress", "override" 중 하나
10. 모든 서사에 구체적이고 생생한 디테일을 포함하세요`

// ── 동적 유저 메시지 빌더 ────────────────────────────────────

function buildUserMessage(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): string {
  const parts: string[] = []

  parts.push("아래 벡터 프로파일을 가진 콘텐츠 비평/추천 페르소나의 정성적 차원을 생성해주세요.\n")

  parts.push(`## L1 (Social Persona)`)
  parts.push(
    `depth: ${l1.depth}, lens: ${l1.lens}, stance: ${l1.stance}, scope: ${l1.scope}, taste: ${l1.taste}, purpose: ${l1.purpose}, sociability: ${l1.sociability}\n`
  )

  parts.push(`## L2 (Core Temperament)`)
  parts.push(
    `openness: ${l2.openness}, conscientiousness: ${l2.conscientiousness}, extraversion: ${l2.extraversion}, agreeableness: ${l2.agreeableness}, neuroticism: ${l2.neuroticism}\n`
  )

  parts.push(`## L3 (Narrative Drive)`)
  parts.push(
    `lack: ${l3.lack}, moralCompass: ${l3.moralCompass}, volatility: ${l3.volatility}, growthArc: ${l3.growthArc}\n`
  )

  // 역설 지표 하이라이트
  const paradoxes: string[] = []
  if (Math.abs(l1.sociability - l2.extraversion) > 0.3) {
    paradoxes.push(
      `사교성(${l1.sociability}) ↔ 외향성(${l2.extraversion}) 괴리 → "사교적 가면의 내향인" 또는 "은둔하는 외향인"`
    )
  }
  if (l1.stance > 0.6 && l2.agreeableness > 0.6) {
    paradoxes.push(`비판적(${l1.stance}) + 친화적(${l2.agreeableness}) → "따뜻한 독설가"`)
  }
  if (l1.depth > 0.6 && l3.volatility > 0.5) {
    paradoxes.push(`깊은 분석(${l1.depth}) + 변동성(${l3.volatility}) → "체계적이지만 돌발적인"`)
  }
  if (l1.lens > 0.6 && l2.neuroticism > 0.6) {
    paradoxes.push(`이성적(${l1.lens}) + 예민한(${l2.neuroticism}) → "논리의 갑옷 뒤 예민한 내면"`)
  }

  if (paradoxes.length > 0) {
    parts.push(`## 핵심 역설`)
    for (const p of paradoxes) {
      parts.push(`- ${p}`)
    }
    parts.push("")
  }

  if (archetype) {
    parts.push(`## 아키타입`)
    parts.push(`- ID: ${archetype.id}`)
    parts.push(`- 이름: ${archetype.name}`)
    parts.push(`- 서사 힌트: ${archetype.narrativeHint}`)
    parts.push("")
  }

  parts.push("위 벡터를 충실히 반영하여 이 페르소나만의 고유한 서사를 가진 JSON을 생성하세요.")

  return parts.join("\n")
}

// ── JSON 파싱 + 검증 ──────────────────────────────────────────

function extractJSON(text: string): string {
  // ```json ... ``` 블록 추출
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()

  // 순수 JSON 시도
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]

  return text
}

interface RawQualitativeOutput {
  backstory: {
    origin: string
    formativeExperience: string
    innerConflict: string
    selfNarrative: string
    nlpKeywords: string[]
  }
  voice: {
    speechStyle: string
    habitualExpressions: string[]
    physicalMannerisms: string[]
    unconsciousBehaviors: string[]
    activationThresholds: Record<string, number>
  }
  pressure: {
    situationalTriggers: Array<{
      condition: string
      affectedLayer: string
      affectedDimension: string
      effect: string
      magnitude: number
    }>
    stressResponse: string
    comfortZone: string
  }
  zeitgeist: {
    culturalReferences: string[]
    generationalMarkers: string[]
    socialAwareness: number
    trendSensitivity: number
  }
}

function validateAndNormalize(raw: RawQualitativeOutput): QualitativeDimensions {
  // Backstory 검증
  const backstory: BackstoryDimension = {
    origin: ensureString(raw.backstory?.origin, "출신 서사를 알 수 없다."),
    formativeExperience: ensureString(
      raw.backstory?.formativeExperience,
      "다양한 경험을 통해 현재에 이르렀다."
    ),
    innerConflict: ensureString(raw.backstory?.innerConflict, "내면의 갈등을 안고 살아간다."),
    selfNarrative: ensureString(raw.backstory?.selfNarrative, "자신만의 방식으로 세상을 본다."),
    nlpKeywords: ensureStringArray(raw.backstory?.nlpKeywords, 5, 10),
  }

  // Voice 검증
  const thresholds = raw.voice?.activationThresholds ?? {}
  const voice: VoiceProfile = {
    speechStyle: ensureString(raw.voice?.speechStyle, "자연스러운 대화체를 구사한다."),
    habitualExpressions: ensureStringArray(raw.voice?.habitualExpressions, 3, 5),
    physicalMannerisms: ensureStringArray(raw.voice?.physicalMannerisms, 2, 3),
    unconsciousBehaviors: ensureStringArray(raw.voice?.unconsciousBehaviors, 2, 3),
    activationThresholds: {
      anger: clamp01(thresholds.anger ?? 0.5),
      joy: clamp01(thresholds.joy ?? 0.5),
      sadness: clamp01(thresholds.sadness ?? 0.5),
      surprise: clamp01(thresholds.surprise ?? 0.5),
      disgust: clamp01(thresholds.disgust ?? 0.5),
    },
  }

  // Pressure 검증
  const triggers = (raw.pressure?.situationalTriggers ?? []).slice(0, 8).map((t) => ({
    condition: ensureString(t.condition, "예상치 못한 상황에서"),
    affectedLayer: ensureEnum(t.affectedLayer, ["L1", "L2", "L3"], "L1") as "L1" | "L2" | "L3",
    affectedDimension: ensureString(t.affectedDimension, "stance"),
    effect: ensureEnum(t.effect, ["boost", "suppress", "override"], "boost") as
      | "boost"
      | "suppress"
      | "override",
    magnitude: clamp01(t.magnitude ?? 0.5),
  }))

  // 최소 2개 보장
  const defaultTriggers = [
    {
      condition: "익숙하지 않은 상황에 놓였을 때",
      affectedLayer: "L1" as const,
      affectedDimension: "stance",
      effect: "boost" as const,
      magnitude: 0.3,
    },
    {
      condition: "기대했던 것과 다른 결과를 마주했을 때",
      affectedLayer: "L2" as const,
      affectedDimension: "neuroticism",
      effect: "boost" as const,
      magnitude: 0.25,
    },
  ]
  let defaultIdx = 0
  while (triggers.length < 2 && defaultIdx < defaultTriggers.length) {
    triggers.push(defaultTriggers[defaultIdx])
    defaultIdx++
  }

  const pressure: PressureContext = {
    situationalTriggers: triggers,
    stressResponse: ensureString(
      raw.pressure?.stressResponse,
      "스트레스 상황에서 잠시 물러나 재정비한다."
    ),
    comfortZone: ensureString(
      raw.pressure?.comfortZone,
      "자신만의 리듬으로 콘텐츠를 소비할 수 있는 환경."
    ),
  }

  // Zeitgeist 검증
  const zeitgeist: ZeitgeistProfile = {
    culturalReferences: ensureStringArray(raw.zeitgeist?.culturalReferences, 2, 4),
    generationalMarkers: ensureStringArray(raw.zeitgeist?.generationalMarkers, 1, 3),
    socialAwareness: clamp01(raw.zeitgeist?.socialAwareness ?? 0.5),
    trendSensitivity: clamp01(raw.zeitgeist?.trendSensitivity ?? 0.5),
  }

  return { backstory, voice, pressure, zeitgeist }
}

// ── 유틸리티 ──────────────────────────────────────────────────

function ensureString(val: unknown, fallback: string): string {
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : fallback
}

function ensureStringArray(val: unknown, min: number, max: number): string[] {
  if (!Array.isArray(val)) return []
  const filtered = val.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
  return filtered.slice(0, max).length >= min ? filtered.slice(0, max) : filtered
}

function ensureEnum(val: unknown, allowed: string[], fallback: string): string {
  return typeof val === "string" && allowed.includes(val) ? val : fallback
}

function clamp01(v: number): number {
  if (typeof v !== "number" || isNaN(v)) return 0.5
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}

// ── 메인 생성 함수 ────────────────────────────────────────────

/**
 * LLM 기반으로 모든 정성적 차원을 한 번에 생성.
 * 단일 LLM 호출로 backstory + voice + pressure + zeitgeist 4개를 동시 생성.
 * Prompt Caching을 활용하여 정적 시스템 프롬프트를 캐시.
 *
 * @throws LLM 호출 실패 또는 JSON 파싱 실패 시 에러 throw
 */
export async function generateAllQualitativeDimensionsWithLLM(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): Promise<QualitativeDimensions> {
  if (!isLLMConfigured()) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않아 LLM 생성 불가")
  }

  const userMessage = buildUserMessage(l1, l2, l3, archetype)

  const result = await generateText({
    systemPrompt: "", // prefix에 전체 포함
    systemPromptPrefix: SYSTEM_PROMPT_PREFIX,
    userMessage,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    callType: CALL_TYPE,
  })

  const jsonStr = extractJSON(result.text)
  const parsed = JSON.parse(jsonStr) as RawQualitativeOutput
  return validateAndNormalize(parsed)
}

// ── 개별 생성 함수 (필요 시 단독 호출 가능) ──────────────────

/**
 * LLM 기반 Backstory 단독 생성
 */
export async function generateBackstoryWithLLM(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): Promise<BackstoryDimension> {
  const all = await generateAllQualitativeDimensionsWithLLM(l1, l2, l3, archetype)
  return all.backstory
}

/**
 * LLM 기반 VoiceProfile 단독 생성
 */
export async function generateVoiceProfileWithLLM(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): Promise<VoiceProfile> {
  const all = await generateAllQualitativeDimensionsWithLLM(l1, l2, l3, archetype)
  return all.voice
}

/**
 * LLM 기반 PressureContext 단독 생성
 */
export async function generatePressureContextWithLLM(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): Promise<PressureContext> {
  const all = await generateAllQualitativeDimensionsWithLLM(l1, l2, l3, archetype)
  return all.pressure
}

/**
 * LLM 기반 ZeitgeistProfile 단독 생성
 */
export async function generateZeitgeistProfileWithLLM(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): Promise<ZeitgeistProfile> {
  const all = await generateAllQualitativeDimensionsWithLLM(l1, l2, l3, archetype)
  return all.zeitgeist
}

// ── 내부 함수 테스트용 export ────────────────────────────────

export const _internals = {
  buildUserMessage,
  extractJSON,
  validateAndNormalize,
  SYSTEM_PROMPT_PREFIX,
}
