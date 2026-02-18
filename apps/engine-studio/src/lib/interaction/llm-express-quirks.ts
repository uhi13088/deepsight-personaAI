// ═══════════════════════════════════════════════════════════════
// LLM 기반 Express 퀴크 동적 생성기
// T154: 페르소나별 고유 퀴크를 LLM으로 생성
// 기존 QuirkDefinition 스키마 준수
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  VoiceProfile,
  PersonaArchetype,
} from "@/types"
import { generateText, isLLMConfigured } from "@/lib/llm-client"
import type { QuirkDefinition, DerivedStates } from "./express-algorithm"

// ── 상수 ────────────────────────────────────────────────────

const CALL_TYPE = "express:quirks"
const MAX_TOKENS = 1536
const TEMPERATURE = 0.8

// ── 정적 시스템 프롬프트 (Prompt Caching 대상) ──────────────

const SYSTEM_PROMPT_PREFIX = `당신은 AI 페르소나의 행동 퀴크(quirk)를 설계하는 전문가입니다.
퀴크란 특정 감정/상태 조건이 충족될 때 발동되는 페르소나 고유의 행동 패턴입니다.

## 벡터 해석

### L1: Social Persona (콘텐츠 성향 7D)
depth/lens/stance/scope/taste/purpose/sociability (각 0~1)

### L2: OCEAN 성격 5요인
openness/conscientiousness/extraversion/agreeableness/neuroticism (각 0~1)

### L3: Narrative Drive (서사적 동인 4D)
lack/moralCompass/volatility/growthArc (각 0~1)

## 파생 상태값 (Derived States) — 퀴크 트리거 조건

퀴크는 아래 5가지 파생 상태값이 특정 임계값을 넘을 때 발동됩니다:
- irritability (과민성): 비판적/압박 상황에서 상승
- enthusiasm (열정): 좋은 콘텐츠/사교적 상황에서 상승
- vulnerability (취약성): 비판 받거나 결핍 자극 시 상승
- assertiveness (자기주장): 확신/깊은 분석 시 상승
- introspection (내성): 혼자/깊이 생각할 때 상승

## QuirkDefinition 스키마

각 퀴크는 반드시 아래 구조를 따라야 합니다:

\`\`\`json
{
  "id": "unique_snake_case_id",
  "name": "퀴크 이름 (4~10자)",
  "description": "이 퀴크가 발동되는 이유와 맥락 (15~30자)",
  "condition": {
    "dimension": "derived",
    "derivedState": "irritability|enthusiasm|vulnerability|assertiveness|introspection",
    "operator": "gt",
    "value": 0.5
  },
  "baseProbability": 0.3,
  "cooldownTurns": 3,
  "expression": "퀴크 발동 시 구체적 행동 묘사 (20~50자)"
}
\`\`\`

## 출력 형식

JSON 배열만 출력하세요. 다른 텍스트는 포함하지 마세요.

\`\`\`json
[
  { QuirkDefinition1 },
  { QuirkDefinition2 },
  ...
]
\`\`\`

## 주의사항

1. 퀴크 5~8개 생성 (이 페르소나만의 고유한 행동)
2. condition.derivedState는 반드시 위 5종 중 하나
3. condition.operator는 "gt" (초과) 또는 "lt" (미만) 또는 "between" (사이)
4. condition.value는 0.0~1.0 (operator가 "between"이면 [min, max] 배열)
5. baseProbability는 0.2~0.7 (너무 높으면 남발, 너무 낮으면 안 나옴)
6. cooldownTurns는 2~6 (발동 후 재발동까지 대기 턴 수)
7. expression은 구체적이고 생생한 행동 묘사 (이 캐릭터다운 표현)
8. 벡터 역설(L1↔L2 충돌)을 반영한 퀴크를 최소 2개 포함
9. id는 영어 snake_case, 중복 없이`

// ── 동적 유저 메시지 빌더 ────────────────────────────────────

function buildUserMessage(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype,
  voiceProfile?: VoiceProfile
): string {
  const parts: string[] = []

  parts.push("아래 페르소나의 고유 퀴크 5~8개를 생성해주세요.\n")

  parts.push(`## L1: ${JSON.stringify(l1)}`)
  parts.push(`## L2: ${JSON.stringify(l2)}`)
  parts.push(`## L3: ${JSON.stringify(l3)}\n`)

  // 역설 감지
  const paradoxes: string[] = []
  if (Math.abs(l1.sociability - l2.extraversion) > 0.3) {
    paradoxes.push(`사교성↔외향성 괴리 (soc:${l1.sociability}, ext:${l2.extraversion})`)
  }
  if (l1.stance > 0.6 && l2.agreeableness > 0.6) {
    paradoxes.push(`비판적+친화적 (stance:${l1.stance}, agree:${l2.agreeableness})`)
  }
  if (l1.depth < 0.4 && l2.openness > 0.6) {
    paradoxes.push(`직관적+개방적 (depth:${l1.depth}, open:${l2.openness})`)
  }
  if (l1.purpose > 0.6 && l2.neuroticism > 0.6) {
    paradoxes.push(`의미추구+불안 (purpose:${l1.purpose}, neuro:${l2.neuroticism})`)
  }

  if (paradoxes.length > 0) {
    parts.push(`## 핵심 역설 (반드시 퀴크에 반영)`)
    for (const p of paradoxes) parts.push(`- ${p}`)
    parts.push("")
  }

  if (archetype) {
    parts.push(`## 아키타입: ${archetype.name} (${archetype.id})`)
    parts.push(`서사 힌트: ${archetype.narrativeHint}\n`)
  }

  if (voiceProfile) {
    parts.push(`## 말투 참고: ${voiceProfile.speechStyle}`)
    if (voiceProfile.habitualExpressions.length > 0) {
      parts.push(`습관적 표현: ${voiceProfile.habitualExpressions.join(", ")}\n`)
    }
  }

  parts.push("이 페르소나만의 고유한 퀴크 JSON 배열을 생성하세요.")

  return parts.join("\n")
}

// ── JSON 파싱 + 검증 ──────────────────────────────────────────

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) return jsonMatch[0]

  return text
}

interface RawQuirkOutput {
  id: string
  name: string
  description: string
  condition: {
    dimension: string
    derivedState?: string
    operator: string
    value: number | [number, number]
  }
  baseProbability: number
  cooldownTurns: number
  expression: string
}

const VALID_DERIVED_STATES: Array<keyof DerivedStates> = [
  "irritability",
  "enthusiasm",
  "vulnerability",
  "assertiveness",
  "introspection",
]
const VALID_OPERATORS = ["gt", "lt", "between"] as const

function validateAndNormalize(raw: RawQuirkOutput[]): QuirkDefinition[] {
  if (!Array.isArray(raw)) return []

  const quirks: QuirkDefinition[] = []
  const usedIds = new Set<string>()

  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== "object") continue

    const id = ensureString(item.id, `custom_quirk_${quirks.length}`)
    if (usedIds.has(id)) continue
    usedIds.add(id)

    const derivedState = VALID_DERIVED_STATES.includes(
      item.condition?.derivedState as keyof DerivedStates
    )
      ? (item.condition.derivedState as keyof DerivedStates)
      : VALID_DERIVED_STATES[quirks.length % VALID_DERIVED_STATES.length]

    const operator = (VALID_OPERATORS as readonly string[]).includes(item.condition?.operator)
      ? (item.condition.operator as "gt" | "lt" | "between")
      : "gt"

    let value: number | [number, number]
    if (operator === "between" && Array.isArray(item.condition?.value)) {
      value = [clamp01(item.condition.value[0] ?? 0.3), clamp01(item.condition.value[1] ?? 0.7)]
    } else {
      value = clamp01(typeof item.condition?.value === "number" ? item.condition.value : 0.6)
    }

    quirks.push({
      id,
      name: ensureString(item.name, `퀴크 ${quirks.length + 1}`),
      description: ensureString(item.description, "페르소나 고유 행동 패턴"),
      condition: {
        dimension: "derived",
        derivedState,
        operator,
        value,
      },
      baseProbability: clampRange(item.baseProbability, 0.2, 0.7, 0.4),
      cooldownTurns: clampRange(item.cooldownTurns, 2, 6, 3),
      expression: ensureString(item.expression, "예상치 못한 반응을 보인다"),
    })
  }

  return quirks
}

// ── 유틸리티 ──────────────────────────────────────────────────

function ensureString(val: unknown, fallback: string): string {
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : fallback
}

function clamp01(v: number): number {
  if (typeof v !== "number" || isNaN(v)) return 0.5
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}

function clampRange(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== "number" || isNaN(v)) return fallback
  return Math.round(Math.max(min, Math.min(max, v)) * 100) / 100
}

// ── 메인 생성 함수 ────────────────────────────────────────────

/**
 * LLM 기반으로 페르소나 전용 퀴크 5~8개를 생성.
 * QuirkDefinition 스키마 준수, Prompt Caching 적용.
 *
 * @throws LLM 호출 실패 또는 JSON 파싱 실패 시 에러 throw
 */
export async function generateExpressQuirksWithLLM(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype,
  voiceProfile?: VoiceProfile
): Promise<QuirkDefinition[]> {
  if (!isLLMConfigured()) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않아 LLM 생성 불가")
  }

  const userMessage = buildUserMessage(l1, l2, l3, archetype, voiceProfile)

  const result = await generateText({
    systemPrompt: "",
    systemPromptPrefix: SYSTEM_PROMPT_PREFIX,
    userMessage,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    callType: CALL_TYPE,
  })

  const jsonStr = extractJSON(result.text)
  const parsed = JSON.parse(jsonStr) as RawQuirkOutput[]
  return validateAndNormalize(parsed)
}

// ── 내부 함수 테스트용 export ────────────────────────────────

export const _internals = {
  buildUserMessage,
  extractJSON,
  validateAndNormalize,
  SYSTEM_PROMPT_PREFIX,
}
