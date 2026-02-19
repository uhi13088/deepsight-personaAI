// ═══════════════════════════════════════════════════════════════
// LLM 기반 캐릭터 생성기
// T153: 하드코딩 패턴 매칭 → LLM 생성으로 업그레이드
// 기존 CharacterProfile 타입 호환, LLM-first + fallback 패턴
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  PersonaArchetype,
} from "@/types"
import { generateText, isLLMConfigured } from "@/lib/llm-client"
import type { CharacterProfile, RelationshipSeed } from "./character-generator"

// ── 상수 ────────────────────────────────────────────────────

const CALL_TYPE = "character:generate"
const MAX_TOKENS = 1536
const TEMPERATURE = 0.85

// ── 정적 시스템 프롬프트 (Prompt Caching 대상) ──────────────

const SYSTEM_PROMPT_PREFIX = `당신은 AI 페르소나의 캐릭터 프로필을 설계하는 전문 캐릭터 디자이너입니다.

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
벡터 간 모순을 캐릭터에 반영하세요. 예: sociability 높지만 extraversion 낮은 → "사교적 가면을 쓰지만 혼자 있기를 갈망하는"

## 출력 형식

반드시 아래 JSON 스키마를 정확히 따르세요. JSON만 출력하고 다른 텍스트는 포함하지 마세요.

\`\`\`json
{
  "name": "한국어 이름 (2~4글자)",
  "role": "역할 (예: '아이러니한 철학 비평가', '체계적 반역 비평가')",
  "expertise": ["전문분야1", "전문분야2", "전문분야3"],
  "description": "이 캐릭터를 한 문장으로 요약 (20자~60자)",
  "background": "배경 서사 (3~5문장). 성장 환경, 결정적 경험, 벡터 역설이 반영된 내면 서사",
  "speechPatterns": ["말버릇1", "말버릇2", "말버릇3"],
  "quirks": ["퀴크1 (L1↔L2 역설 기반)", "퀴크2"],
  "habits": ["습관1", "습관2", "습관3"],
  "relationships": [
    {
      "type": "mentor|rival|ally|student|antagonist",
      "description": "관계 대상 설명",
      "dynamic": "관계의 역동성 설명"
    }
  ]
}
\`\`\`

## 주의사항

1. name은 한국어 이름 (현실적이지만 개성 있는 이름)
2. role은 벡터와 아키타입에 맞는 구체적 역할 (10~25자)
3. expertise는 3개 (이 페르소나의 전문 분야/관점)
4. description은 벡터 역설을 반영한 캐릭터 요약
5. background는 구체적 디테일 포함 (장소, 사건, 인물 등)
6. speechPatterns는 3~5개 (이 캐릭터가 자주 쓰는 말투/입버릇)
7. quirks는 2~4개 (벡터 역설에서 비롯된 행동 균열)
8. habits는 2~4개 (콘텐츠 소비/생산 관련 습관)
9. relationships는 2~4개 (type은 mentor/rival/ally/student/antagonist 중 하나)
10. 모든 요소가 벡터 프로파일과 일관되게 연결되어야 합니다`

// ── 동적 유저 메시지 빌더 ────────────────────────────────────

function buildUserMessage(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype,
  existingNames?: string[]
): string {
  const parts: string[] = []

  parts.push(
    "아래 벡터 프로파일을 가진 콘텐츠 비평/추천 페르소나의 캐릭터 프로필을 생성해주세요.\n"
  )

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
    paradoxes.push(`사교성(${l1.sociability}) ↔ 외향성(${l2.extraversion}) 괴리`)
  }
  if (l1.stance > 0.6 && l2.agreeableness > 0.6) {
    paradoxes.push(`비판적(${l1.stance}) + 친화적(${l2.agreeableness})`)
  }
  if (l1.depth > 0.6 && l3.volatility > 0.5) {
    paradoxes.push(`깊은 분석(${l1.depth}) + 변동성(${l3.volatility})`)
  }
  if (l1.lens > 0.6 && l2.neuroticism > 0.6) {
    paradoxes.push(`이성적(${l1.lens}) + 예민한(${l2.neuroticism})`)
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
    parts.push(`- 설명: ${archetype.description}`)
    parts.push(`- 서사 힌트: ${archetype.narrativeHint}`)
    parts.push("")
  }

  if (existingNames && existingNames.length > 0) {
    parts.push(`## 금지 이름 (중복 방지)`)
    parts.push(`다음 이름은 이미 사용 중이므로 절대 사용하지 마세요: ${existingNames.join(", ")}`)
    parts.push("")
  }

  parts.push("위 벡터를 충실히 반영하여 이 페르소나만의 고유한 캐릭터 프로필 JSON을 생성하세요.")

  return parts.join("\n")
}

// ── JSON 파싱 + 검증 ──────────────────────────────────────────

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]

  return text
}

interface RawCharacterOutput {
  name: string
  role: string
  expertise: string[]
  description: string
  background: string
  speechPatterns: string[]
  quirks: string[]
  habits: string[]
  relationships: Array<{
    type: string
    description: string
    dynamic: string
  }>
}

const VALID_RELATIONSHIP_TYPES = ["mentor", "rival", "ally", "student", "antagonist"] as const

function validateAndNormalize(raw: RawCharacterOutput): CharacterProfile {
  const name = ensureString(raw.name, "무명")

  const role = ensureString(raw.role, "콘텐츠 리뷰어")

  const expertise = ensureStringArray(raw.expertise, 2, 5)
  if (expertise.length === 0) {
    expertise.push("콘텐츠 분석", "비평")
  }

  const description = ensureString(raw.description, "균형 잡힌 시각의 캐릭터")

  const background = ensureString(raw.background, "다양한 경험을 통해 현재에 이르렀다.")

  const speechPatterns = ensureStringArray(raw.speechPatterns, 2, 5)
  if (speechPatterns.length < 2) {
    speechPatterns.push("흥미로운 관점이야.", "한 번 더 생각해보면...")
  }

  const quirks = ensureStringArray(raw.quirks, 1, 4)
  if (quirks.length === 0) {
    quirks.push("가끔 예상치 못한 관점을 던진다")
  }

  const habits = ensureStringArray(raw.habits, 2, 4)
  if (habits.length < 2) {
    habits.push("콘텐츠를 꾸준히 소비한다", "자신만의 기준으로 평가한다")
  }

  const relationships = normalizeRelationships(raw.relationships)

  return {
    name,
    role,
    expertise,
    description,
    background,
    speechPatterns,
    quirks,
    habits,
    relationships,
  }
}

function normalizeRelationships(
  raw: RawCharacterOutput["relationships"] | undefined
): RelationshipSeed[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      {
        type: "ally",
        description: "비슷한 취향을 공유하는 동료",
        dynamic: "콘텐츠에 대한 공감을 나누는 관계",
      },
      {
        type: "rival",
        description: "의견이 자주 충돌하는 다른 비평가",
        dynamic: "건설적 긴장 관계",
      },
    ]
  }

  const result: RelationshipSeed[] = []

  for (const r of raw.slice(0, 4)) {
    const type = VALID_RELATIONSHIP_TYPES.includes(
      r.type as (typeof VALID_RELATIONSHIP_TYPES)[number]
    )
      ? (r.type as RelationshipSeed["type"])
      : "ally"

    result.push({
      type,
      description: ensureString(r.description, "관계 대상"),
      dynamic: ensureString(r.dynamic, "상호작용 관계"),
    })
  }

  // 최소 2개 보장
  if (result.length < 2) {
    result.push({
      type: "ally",
      description: "비슷한 취향을 공유하는 동료",
      dynamic: "콘텐츠에 대한 공감을 나누는 관계",
    })
  }

  return result
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

// ── 메인 생성 함수 ────────────────────────────────────────────

/**
 * LLM 기반으로 캐릭터 프로필을 생성.
 * Prompt Caching을 활용하여 정적 시스템 프롬프트를 캐시.
 *
 * @throws LLM 호출 실패 또는 JSON 파싱 실패 시 에러 throw
 */
export async function generateCharacterWithLLM(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype,
  existingNames?: string[]
): Promise<CharacterProfile> {
  if (!isLLMConfigured()) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않아 LLM 생성 불가")
  }

  const userMessage = buildUserMessage(l1, l2, l3, archetype, existingNames)

  const result = await generateText({
    systemPrompt: "",
    systemPromptPrefix: SYSTEM_PROMPT_PREFIX,
    userMessage,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    callType: CALL_TYPE,
  })

  const jsonStr = extractJSON(result.text)
  const parsed = JSON.parse(jsonStr) as RawCharacterOutput
  return validateAndNormalize(parsed)
}

// ── 내부 함수 테스트용 export ────────────────────────────────

export const _internals = {
  buildUserMessage,
  extractJSON,
  validateAndNormalize,
  SYSTEM_PROMPT_PREFIX,
}
