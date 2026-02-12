// ═══════════════════════════════════════════════════════════════
// 6-Category 일관성 검증기
// T52-AC6: 구조/L1↔L2/L2↔L3/정성↔정량/교차축/동적 검증
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ParadoxProfile,
  CrossAxisProfile,
  PersonaArchetype,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@/types"
import { VALIDATION_THRESHOLDS } from "@/constants/v3"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"

// ── 타입 정의 ─────────────────────────────────────────────────

export type ValidationCategory =
  | "STRUCTURE"
  | "L1_L2"
  | "L2_L3"
  | "QUAL_QUANT"
  | "CROSS_AXIS"
  | "DYNAMIC"

export type ValidationSeverity = "error" | "warning" | "info"

export interface ValidationIssue {
  category: ValidationCategory
  severity: ValidationSeverity
  code: string
  message: string
  suggestedFix?: string
  details?: Record<string, unknown>
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  categoryScores: Record<ValidationCategory, number> // 0.0~1.0
  overallScore: number // 가중 평균
  paradoxProfile: ParadoxProfile
  crossAxisProfile: CrossAxisProfile
}

// ── 카테고리별 가중치 ─────────────────────────────────────────

const CATEGORY_WEIGHTS: Record<ValidationCategory, number> = {
  STRUCTURE: 0.25,
  L1_L2: 0.2,
  L2_L3: 0.15,
  QUAL_QUANT: 0.1,
  CROSS_AXIS: 0.15,
  DYNAMIC: 0.15,
}

// ── 메인 검증 함수 ────────────────────────────────────────────

export function validateConsistency(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype,
  qualitativeData?: {
    backstory?: string
    voiceProfile?: string[]
    speechPatterns?: string[]
  }
): ValidationResult {
  const issues: ValidationIssue[] = []

  // Pre-compute profiles
  const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
  const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3, crossAxisProfile)

  // Category A: STRUCTURE
  const structureIssues = validateStructure(l1, l2, l3)
  issues.push(...structureIssues)

  // Category B: L1↔L2 CONSISTENCY
  const l1l2Issues = validateL1L2(l1, l2, paradoxProfile, archetype)
  issues.push(...l1l2Issues)

  // Category C: L2↔L3 CONSISTENCY
  const l2l3Issues = validateL2L3(l2, l3, paradoxProfile)
  issues.push(...l2l3Issues)

  // Category D: QUALITATIVE↔QUANTITATIVE
  const qualQuantIssues = validateQualQuant(l1, l2, l3, qualitativeData)
  issues.push(...qualQuantIssues)

  // Category E: CROSS-AXIS
  const crossAxisIssues = validateCrossAxis(crossAxisProfile, paradoxProfile)
  issues.push(...crossAxisIssues)

  // Category F: DYNAMIC
  const dynamicIssues = validateDynamic(l1, l2, l3, archetype)
  issues.push(...dynamicIssues)

  // Score per category
  const categoryScores = calculateCategoryScores(issues)

  // Overall score (weighted average)
  let overallScore = 0
  for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    overallScore += categoryScores[cat as ValidationCategory] * weight
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    categoryScores,
    overallScore: Math.round(overallScore * 100) / 100,
    paradoxProfile,
    crossAxisProfile,
  }
}

// ═══════════════════════════════════════════════════════════════
// Category A: STRUCTURE — 기본 벡터 구조 유효성
// ═══════════════════════════════════════════════════════════════

function validateStructure(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // A1: 값 범위 검사 [0.0, 1.0]
  const l1Keys: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  const l2Keys: TemperamentDimension[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ]
  const l3Keys: NarrativeDimension[] = ["lack", "moralCompass", "volatility", "growthArc"]

  for (const key of l1Keys) {
    const v = l1[key]
    if (v < 0 || v > 1 || isNaN(v)) {
      issues.push({
        category: "STRUCTURE",
        severity: "error",
        code: "S_RANGE_L1",
        message: `L1.${key} 값이 범위를 벗어남: ${v}`,
        suggestedFix: `L1.${key}를 0.0~1.0 범위로 조정하세요.`,
        details: { dimension: key, value: v, layer: "L1" },
      })
    }
  }

  for (const key of l2Keys) {
    const v = l2[key]
    if (v < 0 || v > 1 || isNaN(v)) {
      issues.push({
        category: "STRUCTURE",
        severity: "error",
        code: "S_RANGE_L2",
        message: `L2.${key} 값이 범위를 벗어남: ${v}`,
        suggestedFix: `L2.${key}를 0.0~1.0 범위로 조정하세요.`,
        details: { dimension: key, value: v, layer: "L2" },
      })
    }
  }

  for (const key of l3Keys) {
    const v = l3[key]
    if (v < 0 || v > 1 || isNaN(v)) {
      issues.push({
        category: "STRUCTURE",
        severity: "error",
        code: "S_RANGE_L3",
        message: `L3.${key} 값이 범위를 벗어남: ${v}`,
        suggestedFix: `L3.${key}를 0.0~1.0 범위로 조정하세요.`,
        details: { dimension: key, value: v, layer: "L3" },
      })
    }
  }

  // A2: 모든 차원이 같은 값이면 경고 (단조로운 캐릭터)
  const l1Values = l1Keys.map((k) => l1[k])
  const l1Variance = variance(l1Values)
  if (l1Variance < 0.01) {
    issues.push({
      category: "STRUCTURE",
      severity: "warning",
      code: "S_FLAT_L1",
      message: "L1 벡터가 모두 비슷한 값입니다. 캐릭터가 단조로울 수 있습니다.",
      suggestedFix: "최소 2~3개 차원에 0.2 이상의 차이를 두세요.",
      details: { variance: l1Variance },
    })
  }

  return issues
}

// ═══════════════════════════════════════════════════════════════
// Category B: L1↔L2 CONSISTENCY — 가면 vs 본성
// ═══════════════════════════════════════════════════════════════

function validateL1L2(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  paradoxProfile: ParadoxProfile,
  archetype?: PersonaArchetype
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // B1: 아키타입 기대 역설 범위 확인
  if (archetype) {
    const [expectedMin, expectedMax] = archetype.expectedParadoxRange
    if (paradoxProfile.overall < expectedMin || paradoxProfile.overall > expectedMax) {
      issues.push({
        category: "L1_L2",
        severity: "warning",
        code: "L1L2_PARADOX_RANGE",
        message: `Paradox Score(${paradoxProfile.overall.toFixed(2)})가 아키타입 기대 범위(${expectedMin}~${expectedMax})를 벗어남`,
        suggestedFix: "L1↔L2 차이를 조정하여 아키타입에 맞는 역설 수준을 확보하세요.",
        details: {
          actual: paradoxProfile.overall,
          expected: [expectedMin, expectedMax],
        },
      })
    }
  }

  // B2: 극도의 역설 (> 0.7) 경고
  if (paradoxProfile.l1l2 > 0.7) {
    issues.push({
      category: "L1_L2",
      severity: "info",
      code: "L1L2_EXTREME",
      message: `L1↔L2 역설이 매우 높습니다(${paradoxProfile.l1l2.toFixed(2)}). 캐릭터 일관성 유지에 주의가 필요합니다.`,
    })
  }

  // B3: 사교성↔외향성 불일치 (aligned mapping이므로 차이가 크면 역설)
  const socExtDiff = Math.abs(l1.sociability - l2.extraversion)
  if (socExtDiff > 0.5) {
    issues.push({
      category: "L1_L2",
      severity: "info",
      code: "L1L2_SOC_EXT",
      message: `사교성(${l1.sociability.toFixed(2)})과 외향성(${l2.extraversion.toFixed(2)})의 차이가 큽니다 — "사교적 내향인" 패턴`,
    })
  }

  return issues
}

// ═══════════════════════════════════════════════════════════════
// Category C: L2↔L3 CONSISTENCY — 본성 vs 욕망
// ═══════════════════════════════════════════════════════════════

function validateL2L3(
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  paradoxProfile: ParadoxProfile
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // C1: volatility ~ neuroticism 관계 검사
  const vnGap = Math.abs(l3.volatility - l2.neuroticism)
  if (vnGap > VALIDATION_THRESHOLDS.volatilityNeuroticismGap) {
    issues.push({
      category: "L2_L3",
      severity: "warning",
      code: "L2L3_VOL_NEURO",
      message: `변동성(${l3.volatility.toFixed(2)})과 신경성(${l2.neuroticism.toFixed(2)})의 차이가 큽니다(${vnGap.toFixed(2)} > ${VALIDATION_THRESHOLDS.volatilityNeuroticismGap})`,
      suggestedFix: "변동성과 신경성은 보통 연관됩니다. 차이가 의도적인지 확인하세요.",
      details: { volatility: l3.volatility, neuroticism: l2.neuroticism, gap: vnGap },
    })
  }

  // C2: moralCompass ↔ agreeableness 극단 검사
  if (
    l3.moralCompass >= VALIDATION_THRESHOLDS.moralAgreeExtreme.moralMin &&
    l2.agreeableness <= VALIDATION_THRESHOLDS.moralAgreeExtreme.agreeMax
  ) {
    issues.push({
      category: "L2_L3",
      severity: "warning",
      code: "L2L3_MORAL_AGREE",
      message: `도덕적 엄격함(${l3.moralCompass.toFixed(2)})이 높지만 친화성(${l2.agreeableness.toFixed(2)})이 매우 낮습니다`,
      suggestedFix: "엄격한 도덕 기준 + 낮은 친화성은 '독선적' 캐릭터가 될 수 있습니다.",
    })
  }

  // C3: lack ↔ paradoxScore 갭 검사
  if (
    l3.lack >= VALIDATION_THRESHOLDS.lackParadoxGap.lackMin &&
    paradoxProfile.overall <= VALIDATION_THRESHOLDS.lackParadoxGap.paradoxMax
  ) {
    issues.push({
      category: "L2_L3",
      severity: "warning",
      code: "L2L3_LACK_PARADOX",
      message: `결핍(${l3.lack.toFixed(2)})이 높지만 역설(${paradoxProfile.overall.toFixed(2)})이 낮습니다`,
      suggestedFix:
        "높은 결핍감은 보통 내적 갈등(역설)을 수반합니다. 역설을 높이거나 결핍을 낮추세요.",
    })
  }

  // C4: conscientiousness ↔ growthArc 방향성 검사
  if (l2.conscientiousness > 0.7 && l3.growthArc < 0.3) {
    issues.push({
      category: "L2_L3",
      severity: "info",
      code: "L2L3_CONS_GROWTH",
      message: "높은 성실성에도 성장 곡선이 낮습니다 — 정체된 체계주의자 패턴",
    })
  }

  return issues
}

// ═══════════════════════════════════════════════════════════════
// Category D: QUALITATIVE↔QUANTITATIVE — 정성↔정량 일관성
// ═══════════════════════════════════════════════════════════════

function validateQualQuant(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  qualData?: {
    backstory?: string
    voiceProfile?: string[]
    speechPatterns?: string[]
  }
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!qualData) {
    // 정성적 데이터 없으면 검사 스킵 (warning만)
    issues.push({
      category: "QUAL_QUANT",
      severity: "info",
      code: "QQ_NO_DATA",
      message: "정성적 데이터(배경, 말버릇 등)가 없어 정성↔정량 일관성 검사를 건너뜁니다.",
    })
    return issues
  }

  // D1: 배경 서사 존재 여부
  if (qualData.backstory && qualData.backstory.length < 20) {
    issues.push({
      category: "QUAL_QUANT",
      severity: "warning",
      code: "QQ_SHORT_BACKSTORY",
      message: "배경 서사가 너무 짧습니다 (20자 미만). 캐릭터의 깊이를 더해주세요.",
    })
  }

  // D2: 말버릇과 벡터 일관성 (기본 체크)
  if (qualData.speechPatterns && qualData.speechPatterns.length > 0) {
    const hasEmotionalWords = qualData.speechPatterns.some(
      (p) => p.includes("느낌") || p.includes("감정") || p.includes("마음")
    )
    if (hasEmotionalWords && l1.lens > 0.8) {
      issues.push({
        category: "QUAL_QUANT",
        severity: "info",
        code: "QQ_SPEECH_LENS",
        message:
          "감성적 말버릇이 있지만 논리적 렌즈(L1.lens)가 높습니다 — 역설적 표현일 수 있습니다.",
      })
    }
  }

  return issues
}

// ═══════════════════════════════════════════════════════════════
// Category E: CROSS-AXIS — 83축 교차 일관성
// ═══════════════════════════════════════════════════════════════

function validateCrossAxis(
  crossAxisProfile: CrossAxisProfile,
  paradoxProfile: ParadoxProfile
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // E1: Cross-axis score 범위 검증
  for (const axis of crossAxisProfile.axes) {
    if (
      axis.score < VALIDATION_THRESHOLDS.crossAxisScoreRange.min ||
      axis.score > VALIDATION_THRESHOLDS.crossAxisScoreRange.max
    ) {
      issues.push({
        category: "CROSS_AXIS",
        severity: "error",
        code: "CA_SCORE_RANGE",
        message: `교차축 ${axis.axisId}의 스코어가 범위를 벗어남: ${axis.score}`,
        details: { axisId: axis.axisId, score: axis.score },
      })
    }
  }

  // E2: Paradox 관계인데 두 값이 비슷한 경우 (의심)
  for (const axis of crossAxisProfile.axes) {
    if (axis.relationship === "paradox") {
      const diff = Math.abs(axis.dimA.value - axis.dimB.value)
      if (diff < VALIDATION_THRESHOLDS.paradoxSimilarityThreshold) {
        issues.push({
          category: "CROSS_AXIS",
          severity: "info",
          code: "CA_PARADOX_SIMILAR",
          message: `역설 관계 축(${axis.axisId})의 두 값이 거의 같습니다 (차이: ${diff.toFixed(2)})`,
        })
      }
    }

    if (axis.relationship === "reinforcing") {
      const diff = Math.abs(axis.dimA.value - axis.dimB.value)
      if (diff > VALIDATION_THRESHOLDS.reinforcingDivergenceThreshold) {
        issues.push({
          category: "CROSS_AXIS",
          severity: "info",
          code: "CA_REINFORCING_DIVERGE",
          message: `강화 관계 축(${axis.axisId})의 두 값 차이가 큽니다 (차이: ${diff.toFixed(2)})`,
        })
      }
    }
  }

  // E3: 레이어간 역설 밸런스 확인
  const scores = [paradoxProfile.l1l2, paradoxProfile.l1l3, paradoxProfile.l2l3]
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)
  if (maxScore - minScore > VALIDATION_THRESHOLDS.layerParadoxBalanceGap) {
    issues.push({
      category: "CROSS_AXIS",
      severity: "info",
      code: "CA_LAYER_IMBALANCE",
      message: `레이어간 역설 점수 차이가 큽니다 (max: ${maxScore.toFixed(2)}, min: ${minScore.toFixed(2)})`,
      suggestedFix: "하나의 레이어 관계에만 역설이 집중되어 있습니다.",
    })
  }

  return issues
}

// ═══════════════════════════════════════════════════════════════
// Category F: DYNAMIC — 동적 일관성
// ═══════════════════════════════════════════════════════════════

function validateDynamic(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  archetype?: PersonaArchetype
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // F1: alpha/beta ↔ conscientiousness 일관성
  if (archetype) {
    const { alpha, beta } = archetype.dynamicsDefaults
    // alpha가 높으면 L2(본성)이 강하게 작용 → conscientiousness와 상관
    if (alpha > 0.65 && l2.conscientiousness < 0.3) {
      issues.push({
        category: "DYNAMIC",
        severity: "info",
        code: "DYN_ALPHA_CONS",
        message: `alpha(${alpha})가 높지만 성실성(${l2.conscientiousness.toFixed(2)})이 낮아 L2 영향이 예상과 다를 수 있습니다.`,
      })
    }

    // alpha + beta = 1.0 검증
    if (Math.abs(alpha + beta - 1.0) > 0.01) {
      issues.push({
        category: "DYNAMIC",
        severity: "error",
        code: "DYN_ALPHA_BETA_SUM",
        message: `alpha(${alpha}) + beta(${beta}) = ${alpha + beta} (1.0이어야 합니다)`,
        suggestedFix: "alpha + beta = 1.0이 되도록 조정하세요.",
      })
    }
  }

  // F2: growthArc 방향성 ↔ L3 전체 일관성
  if (l3.growthArc > 0.7 && l3.volatility < 0.2 && l3.lack < 0.2) {
    issues.push({
      category: "DYNAMIC",
      severity: "info",
      code: "DYN_GROWTH_MOTIVE",
      message: "성장 곡선이 높지만 결핍과 변동성이 낮습니다 — 성장의 동기가 불분명할 수 있습니다.",
    })
  }

  // F3: 극단적 pressure 반응 가능성
  if (l2.neuroticism > 0.8 && l3.volatility > 0.8) {
    issues.push({
      category: "DYNAMIC",
      severity: "warning",
      code: "DYN_EXTREME_PRESSURE",
      message: "신경성과 변동성이 모두 극도로 높아 pressure 상황에서 극단적 반응이 예상됩니다.",
      suggestedFix: "의도적인 디자인이 아니라면 둘 중 하나를 0.7 이하로 조정하세요.",
    })
  }

  return issues
}

// ═══════════════════════════════════════════════════════════════
// 카테고리별 점수 계산
// ═══════════════════════════════════════════════════════════════

function calculateCategoryScores(issues: ValidationIssue[]): Record<ValidationCategory, number> {
  const categories: ValidationCategory[] = [
    "STRUCTURE",
    "L1_L2",
    "L2_L3",
    "QUAL_QUANT",
    "CROSS_AXIS",
    "DYNAMIC",
  ]

  const scores = {} as Record<ValidationCategory, number>

  for (const cat of categories) {
    const catIssues = issues.filter((i) => i.category === cat)
    const errors = catIssues.filter((i) => i.severity === "error").length
    const warnings = catIssues.filter((i) => i.severity === "warning").length
    const infos = catIssues.filter((i) => i.severity === "info").length

    // 점수 계산: error = -0.3, warning = -0.15, info = -0.05
    const penalty = errors * 0.3 + warnings * 0.15 + infos * 0.05
    scores[cat] = Math.max(0, Math.round((1.0 - penalty) * 100) / 100)
  }

  return scores
}

// ── 유틸리티 ──────────────────────────────────────────────────

function variance(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
}
