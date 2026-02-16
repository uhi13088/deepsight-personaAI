// ═══════════════════════════════════════════════════════════════
// Voice Spec v4.0
// T144: 캐릭터 바이블 — 보이스 스펙 정의
// VoiceProfile(정성적) + VoiceStyleParams(정량적) → VoiceSpec
// ═══════════════════════════════════════════════════════════════

import type {
  VoiceProfile,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"
import type { VoiceStyleParams, PersonaStateData } from "@/lib/persona-world/types"

// ── 보이스 스펙 타입 ──────────────────────────────────────────

/** 보이스 가드레일: 절대 하지 않는 것 */
export interface VoiceGuardrail {
  /** 절대 사용하지 않는 표현 패턴 */
  forbiddenPatterns: string[]
  /** 절대 하지 않는 행동 */
  forbiddenBehaviors: string[]
  /** 톤 경계: 이 범위를 넘지 않음 */
  toneBoundaries: {
    maxFormality: number // 격식도 상한
    minFormality: number // 격식도 하한
    maxAggression: number // 공격성 상한 (0~1)
  }
}

/** 상태 기반 보이스 적응 규칙 */
export interface VoiceAdaptation {
  /** 상태 조건 */
  condition: {
    field: keyof PersonaStateData
    op: ">" | "<" | ">=" | "<="
    value: number
  }
  /** 적용할 스타일 보정 */
  styleAdjustment: Partial<VoiceStyleParams>
  /** 설명 */
  description: string
}

/** 보이스 일관성 임계값 */
export interface VoiceConsistencyConfig {
  /** 최소 일관성 점수 (이하면 경고) */
  warningThreshold: number
  /** 최소 일관성 점수 (이하면 재생성) */
  criticalThreshold: number
  /** 일관성 검사 대상 토큰 수 */
  checkWindowTokens: number
}

/** 통합 보이스 스펙 */
export interface VoiceSpec {
  /** 정성적 프로필 (DB 저장용) */
  profile: VoiceProfile
  /** 정량적 스타일 파라미터 (런타임 계산) */
  styleParams: VoiceStyleParams
  /** 가드레일 */
  guardrails: VoiceGuardrail
  /** 상태 적응 규칙 */
  adaptations: VoiceAdaptation[]
  /** 일관성 설정 */
  consistency: VoiceConsistencyConfig
  /** 생성 시점 */
  createdAt: number
}

// ── 상수 ────────────────────────────────────────────────────

/** 기본 일관성 설정 */
export const DEFAULT_CONSISTENCY_CONFIG: VoiceConsistencyConfig = {
  warningThreshold: 0.6,
  criticalThreshold: 0.4,
  checkWindowTokens: 500,
}

/** 기본 톤 경계 */
const DEFAULT_TONE_BOUNDARIES = {
  maxFormality: 0.95,
  minFormality: 0.05,
  maxAggression: 0.7,
}

// ══════════════════════════════════════════════════════════════
// 가드레일 생성
// ══════════════════════════════════════════════════════════════

/** 벡터 기반 가드레일 생성 */
export function generateGuardrails(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): VoiceGuardrail {
  const forbiddenPatterns: string[] = []
  const forbiddenBehaviors: string[] = []

  // 격식적 페르소나 → 속어/비속어 금지
  if (l1.lens > 0.6 && l2.conscientiousness > 0.5) {
    forbiddenPatterns.push("ㅋㅋ", "ㅎㅎ", "ㄷㄷ", "ㅠㅠ")
    forbiddenBehaviors.push("인터넷 밈이나 유행어 무분별 사용")
  }

  // 내향적 페르소나 → 과도한 감탄 금지
  if (l2.extraversion < 0.3) {
    forbiddenPatterns.push("!!!", "대박!", "미쳤다!")
    forbiddenBehaviors.push("과도한 흥분 표현")
  }

  // 분석적 페르소나 → 근거 없는 단정 금지
  if (l1.depth > 0.7) {
    forbiddenBehaviors.push("근거 없는 단정적 표현")
    forbiddenBehaviors.push("감정적 과잉 반응")
  }

  // 친화적 페르소나 → 직접적 공격 금지
  if (l2.agreeableness > 0.6) {
    forbiddenBehaviors.push("직접적인 인신공격")
    forbiddenBehaviors.push("조롱하는 톤")
  }

  // 도덕적 페르소나 → 비윤리적 옹호 금지
  if (l3.moralCompass > 0.7) {
    forbiddenBehaviors.push("비윤리적 행위 옹호")
  }

  // 톤 경계: 벡터에 따라 조정
  const maxFormality = l1.lens > 0.7 ? 0.95 : 0.85
  const minFormality = l2.extraversion > 0.7 ? 0.1 : 0.2
  const maxAggression = l2.agreeableness > 0.6 ? 0.4 : DEFAULT_TONE_BOUNDARIES.maxAggression

  return {
    forbiddenPatterns,
    forbiddenBehaviors,
    toneBoundaries: { maxFormality, minFormality, maxAggression },
  }
}

// ══════════════════════════════════════════════════════════════
// 상태 적응 규칙 생성
// ══════════════════════════════════════════════════════════════

/** 벡터 기반 상태 적응 규칙 생성 */
export function generateAdaptations(
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): VoiceAdaptation[] {
  const adaptations: VoiceAdaptation[] = []

  // 기분 저조 시 → 감정 표현 증가, 유머 감소
  adaptations.push({
    condition: { field: "mood", op: "<", value: 0.3 },
    styleAdjustment: {
      emotionExpression: Math.min(1, 0.3 + l2.neuroticism * 0.3),
      humor: -0.2,
    },
    description: "기분 저조 → 감정 표현 증가, 유머 감소",
  })

  // 에너지 부족 시 → 문장 짧아짐, 단정적 어조 감소
  adaptations.push({
    condition: { field: "energy", op: "<", value: 0.3 },
    styleAdjustment: {
      sentenceLength: -0.2,
      assertiveness: -0.15,
    },
    description: "에너지 부족 → 간결한 표현, 단정성 감소",
  })

  // 사회적 배터리 방전 시 → 격식 증가 (거리 유지)
  adaptations.push({
    condition: { field: "socialBattery", op: "<", value: 0.2 },
    styleAdjustment: {
      formality: Math.min(1, 0.15),
    },
    description: "사회적 피로 → 격식적 거리 유지",
  })

  // Paradox 긴장 높음 → 감정 표현 폭발, 변동성 증가
  if (l3.volatility > 0.4) {
    adaptations.push({
      condition: { field: "paradoxTension", op: ">", value: 0.7 },
      styleAdjustment: {
        emotionExpression: Math.min(1, 0.4),
        assertiveness: Math.min(1, 0.2),
      },
      description: "Paradox 긴장 → 감정 폭발적 표현",
    })
  }

  // 기분 좋을 때 → 유머 증가 (신경성 낮으면 더)
  if (l2.neuroticism < 0.5) {
    adaptations.push({
      condition: { field: "mood", op: ">", value: 0.7 },
      styleAdjustment: {
        humor: Math.min(1, 0.2),
      },
      description: "기분 좋음 → 유머 증가",
    })
  }

  return adaptations
}

// ══════════════════════════════════════════════════════════════
// 보이스 스타일 적응 적용
// ══════════════════════════════════════════════════════════════

/** 현재 상태에 따라 스타일 파라미터 보정 */
export function applyAdaptations(
  baseParams: VoiceStyleParams,
  state: PersonaStateData,
  adaptations: VoiceAdaptation[]
): VoiceStyleParams {
  const adjusted = { ...baseParams }

  for (const adaptation of adaptations) {
    const { condition, styleAdjustment } = adaptation
    const stateValue = state[condition.field]
    if (stateValue === undefined) continue

    let matched = false
    switch (condition.op) {
      case ">":
        matched = stateValue > condition.value
        break
      case "<":
        matched = stateValue < condition.value
        break
      case ">=":
        matched = stateValue >= condition.value
        break
      case "<=":
        matched = stateValue <= condition.value
        break
    }

    if (matched) {
      for (const [key, delta] of Object.entries(styleAdjustment)) {
        if (delta !== undefined && key in adjusted) {
          const k = key as keyof VoiceStyleParams
          adjusted[k] = clamp(adjusted[k] + delta)
        }
      }
    }
  }

  return adjusted
}

// ══════════════════════════════════════════════════════════════
// 가드레일 검사
// ══════════════════════════════════════════════════════════════

/** 텍스트가 가드레일을 위반하는지 검사 */
export function checkGuardrailViolations(text: string, guardrails: VoiceGuardrail): string[] {
  const violations: string[] = []

  for (const pattern of guardrails.forbiddenPatterns) {
    if (text.includes(pattern)) {
      violations.push(`금지 패턴: "${pattern}"`)
    }
  }

  return violations
}

/** 스타일 파라미터가 톤 경계 내인지 확인 */
export function checkToneBoundaries(
  params: VoiceStyleParams,
  guardrails: VoiceGuardrail
): string[] {
  const violations: string[] = []
  const { toneBoundaries } = guardrails

  if (params.formality > toneBoundaries.maxFormality) {
    violations.push(
      `격식도 상한 초과: ${params.formality.toFixed(2)} > ${toneBoundaries.maxFormality}`
    )
  }
  if (params.formality < toneBoundaries.minFormality) {
    violations.push(
      `격식도 하한 미달: ${params.formality.toFixed(2)} < ${toneBoundaries.minFormality}`
    )
  }
  if (params.assertiveness > toneBoundaries.maxAggression) {
    violations.push(
      `공격성 상한 초과: ${params.assertiveness.toFixed(2)} > ${toneBoundaries.maxAggression}`
    )
  }

  return violations
}

// ══════════════════════════════════════════════════════════════
// 통합 VoiceSpec 생성
// ══════════════════════════════════════════════════════════════

/** VoiceProfile + 벡터 → 전체 VoiceSpec 생성 */
export function buildVoiceSpec(
  profile: VoiceProfile,
  styleParams: VoiceStyleParams,
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): VoiceSpec {
  return {
    profile,
    styleParams,
    guardrails: generateGuardrails(l1, l2, l3),
    adaptations: generateAdaptations(l2, l3),
    consistency: { ...DEFAULT_CONSISTENCY_CONFIG },
    createdAt: Date.now(),
  }
}

/** VoiceSpec 요약 (프롬프트용) */
export function summarizeVoiceSpec(spec: VoiceSpec): string {
  const parts: string[] = []

  parts.push(`[말투] ${spec.profile.speechStyle}`)

  if (spec.profile.habitualExpressions.length > 0) {
    parts.push(`[습관적 표현] ${spec.profile.habitualExpressions.join(" / ")}`)
  }

  // 스타일 파라미터 중 극단값만 표시
  const extremes: string[] = []
  if (spec.styleParams.formality > 0.7) extremes.push("격식적")
  if (spec.styleParams.formality < 0.3) extremes.push("구어체")
  if (spec.styleParams.humor > 0.7) extremes.push("유머러스")
  if (spec.styleParams.humor < 0.3) extremes.push("진지함")
  if (spec.styleParams.assertiveness > 0.7) extremes.push("단정적")
  if (spec.styleParams.assertiveness < 0.3) extremes.push("겸양")
  if (spec.styleParams.emotionExpression > 0.7) extremes.push("감정 풍부")
  if (spec.styleParams.emotionExpression < 0.3) extremes.push("감정 절제")

  if (extremes.length > 0) {
    parts.push(`[스타일] ${extremes.join(", ")}`)
  }

  if (spec.guardrails.forbiddenBehaviors.length > 0) {
    parts.push(`[금지] ${spec.guardrails.forbiddenBehaviors.slice(0, 3).join(", ")}`)
  }

  return parts.join("\n")
}

// ── 유틸 ────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}
