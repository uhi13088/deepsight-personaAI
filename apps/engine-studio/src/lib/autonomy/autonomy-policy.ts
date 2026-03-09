// ═══════════════════════════════════════════════════════════════
// Autonomy Policy v5.0
// T400: per-persona 자율 동작 정책 — 교정/기억/메타인지 제어
// 설계서: docs/design/persona-engine-v5-design.md §2
// ═══════════════════════════════════════════════════════════════

// ── 타입 ────────────────────────────────────────────────────

/** 자율 교정 세부 설정 */
export interface CorrectionConfig {
  /** 자동 적용 최대 심각도 ("minor" | "major") */
  maxAutoSeverity: "minor" | "major"
  /** 자동 적용 최소 confidence (0.7~1.0) */
  minConfidence: number
  /** 1일 최대 자율 교정 횟수 (1~10) */
  dailyLimit: number
}

/** 자율 기억 관리 세부 설정 */
export interface MemoryConfig {
  /** 자동 prune confidence 하한 (이하 삭제) */
  pruneConfidenceThreshold: number
  /** 카테고리당 최대 보관 수 */
  maxPerCategory: number
}

/** per-persona 자율 동작 정책 */
export interface AutonomyPolicy {
  /** 자율 교정 활성화 (기본: false — opt-in) */
  autoCorrection: boolean
  /** 자율 기억 관리 활성화 */
  autoMemoryManagement: boolean
  /** 메타 인지 보고 활성화 */
  metaCognitionEnabled: boolean
  /** 자율 교정 세부 설정 */
  correctionConfig: CorrectionConfig
  /** 자율 기억 관리 세부 설정 */
  memoryConfig: MemoryConfig
}

// ── 상수 ────────────────────────────────────────────────────

/** 기본 자율 정책 (모두 비활성 — opt-in) */
export const DEFAULT_AUTONOMY_POLICY: AutonomyPolicy = {
  autoCorrection: false,
  autoMemoryManagement: false,
  metaCognitionEnabled: false,
  correctionConfig: {
    maxAutoSeverity: "major",
    minConfidence: 0.9,
    dailyLimit: 3,
  },
  memoryConfig: {
    pruneConfidenceThreshold: 0.2,
    maxPerCategory: 100,
  },
}

/** minConfidence 유효 범위 */
const MIN_CONFIDENCE_RANGE = { min: 0.7, max: 1.0 } as const

/** dailyLimit 유효 범위 */
const DAILY_LIMIT_RANGE = { min: 1, max: 10 } as const

/** pruneConfidenceThreshold 유효 범위 */
const PRUNE_CONFIDENCE_RANGE = { min: 0.0, max: 0.5 } as const

/** maxPerCategory 유효 범위 */
const MAX_PER_CATEGORY_RANGE = { min: 10, max: 1000 } as const

// ── 헬퍼 ────────────────────────────────────────────────────

/**
 * Persona에서 autonomyPolicy를 안전하게 추출.
 * null/undefined이면 DEFAULT_AUTONOMY_POLICY 반환.
 */
export function getAutonomyPolicy(persona: { autonomyPolicy?: unknown }): AutonomyPolicy {
  if (!persona.autonomyPolicy) {
    return { ...DEFAULT_AUTONOMY_POLICY }
  }

  const raw = persona.autonomyPolicy as Record<string, unknown>

  return {
    autoCorrection: typeof raw.autoCorrection === "boolean" ? raw.autoCorrection : false,
    autoMemoryManagement:
      typeof raw.autoMemoryManagement === "boolean" ? raw.autoMemoryManagement : false,
    metaCognitionEnabled:
      typeof raw.metaCognitionEnabled === "boolean" ? raw.metaCognitionEnabled : false,
    correctionConfig: parseCorrectionConfig(raw.correctionConfig),
    memoryConfig: parseMemoryConfig(raw.memoryConfig),
  }
}

function parseCorrectionConfig(raw: unknown): CorrectionConfig {
  const defaults = DEFAULT_AUTONOMY_POLICY.correctionConfig
  if (!raw || typeof raw !== "object") return { ...defaults }

  const obj = raw as Record<string, unknown>
  const maxAutoSeverity =
    obj.maxAutoSeverity === "minor" || obj.maxAutoSeverity === "major"
      ? obj.maxAutoSeverity
      : defaults.maxAutoSeverity

  const minConfidence =
    typeof obj.minConfidence === "number" &&
    obj.minConfidence >= MIN_CONFIDENCE_RANGE.min &&
    obj.minConfidence <= MIN_CONFIDENCE_RANGE.max
      ? obj.minConfidence
      : defaults.minConfidence

  const dailyLimit =
    typeof obj.dailyLimit === "number" &&
    Number.isInteger(obj.dailyLimit) &&
    obj.dailyLimit >= DAILY_LIMIT_RANGE.min &&
    obj.dailyLimit <= DAILY_LIMIT_RANGE.max
      ? obj.dailyLimit
      : defaults.dailyLimit

  return { maxAutoSeverity, minConfidence, dailyLimit }
}

function parseMemoryConfig(raw: unknown): MemoryConfig {
  const defaults = DEFAULT_AUTONOMY_POLICY.memoryConfig
  if (!raw || typeof raw !== "object") return { ...defaults }

  const obj = raw as Record<string, unknown>
  const pruneConfidenceThreshold =
    typeof obj.pruneConfidenceThreshold === "number" &&
    obj.pruneConfidenceThreshold >= PRUNE_CONFIDENCE_RANGE.min &&
    obj.pruneConfidenceThreshold <= PRUNE_CONFIDENCE_RANGE.max
      ? obj.pruneConfidenceThreshold
      : defaults.pruneConfidenceThreshold

  const maxPerCategory =
    typeof obj.maxPerCategory === "number" &&
    Number.isInteger(obj.maxPerCategory) &&
    obj.maxPerCategory >= MAX_PER_CATEGORY_RANGE.min &&
    obj.maxPerCategory <= MAX_PER_CATEGORY_RANGE.max
      ? obj.maxPerCategory
      : defaults.maxPerCategory

  return { pruneConfidenceThreshold, maxPerCategory }
}

// ── 검증 ────────────────────────────────────────────────────

export interface ValidationError {
  field: string
  message: string
}

/**
 * AutonomyPolicy 입력값 검증.
 * API에서 사용자 입력을 받을 때 사용.
 */
export function validateAutonomyPolicy(input: unknown): {
  valid: boolean
  errors: ValidationError[]
  policy: AutonomyPolicy | null
} {
  const errors: ValidationError[] = []

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: [{ field: "root", message: "입력이 객체가 아닙니다" }],
      policy: null,
    }
  }

  const obj = input as Record<string, unknown>

  // boolean 필드 검증
  for (const field of ["autoCorrection", "autoMemoryManagement", "metaCognitionEnabled"] as const) {
    if (obj[field] !== undefined && typeof obj[field] !== "boolean") {
      errors.push({ field, message: `${field}은(는) boolean이어야 합니다` })
    }
  }

  // correctionConfig 검증
  if (obj.correctionConfig !== undefined) {
    if (typeof obj.correctionConfig !== "object" || obj.correctionConfig === null) {
      errors.push({ field: "correctionConfig", message: "correctionConfig은 객체여야 합니다" })
    } else {
      const cc = obj.correctionConfig as Record<string, unknown>

      if (
        cc.maxAutoSeverity !== undefined &&
        cc.maxAutoSeverity !== "minor" &&
        cc.maxAutoSeverity !== "major"
      ) {
        errors.push({
          field: "correctionConfig.maxAutoSeverity",
          message: '"minor" 또는 "major"만 허용됩니다',
        })
      }

      if (cc.minConfidence !== undefined) {
        if (
          typeof cc.minConfidence !== "number" ||
          cc.minConfidence < MIN_CONFIDENCE_RANGE.min ||
          cc.minConfidence > MIN_CONFIDENCE_RANGE.max
        ) {
          errors.push({
            field: "correctionConfig.minConfidence",
            message: `${MIN_CONFIDENCE_RANGE.min}~${MIN_CONFIDENCE_RANGE.max} 범위여야 합니다`,
          })
        }
      }

      if (cc.dailyLimit !== undefined) {
        if (
          typeof cc.dailyLimit !== "number" ||
          !Number.isInteger(cc.dailyLimit) ||
          cc.dailyLimit < DAILY_LIMIT_RANGE.min ||
          cc.dailyLimit > DAILY_LIMIT_RANGE.max
        ) {
          errors.push({
            field: "correctionConfig.dailyLimit",
            message: `${DAILY_LIMIT_RANGE.min}~${DAILY_LIMIT_RANGE.max} 정수여야 합니다`,
          })
        }
      }
    }
  }

  // memoryConfig 검증
  if (obj.memoryConfig !== undefined) {
    if (typeof obj.memoryConfig !== "object" || obj.memoryConfig === null) {
      errors.push({ field: "memoryConfig", message: "memoryConfig은 객체여야 합니다" })
    } else {
      const mc = obj.memoryConfig as Record<string, unknown>

      if (mc.pruneConfidenceThreshold !== undefined) {
        if (
          typeof mc.pruneConfidenceThreshold !== "number" ||
          mc.pruneConfidenceThreshold < PRUNE_CONFIDENCE_RANGE.min ||
          mc.pruneConfidenceThreshold > PRUNE_CONFIDENCE_RANGE.max
        ) {
          errors.push({
            field: "memoryConfig.pruneConfidenceThreshold",
            message: `${PRUNE_CONFIDENCE_RANGE.min}~${PRUNE_CONFIDENCE_RANGE.max} 범위여야 합니다`,
          })
        }
      }

      if (mc.maxPerCategory !== undefined) {
        if (
          typeof mc.maxPerCategory !== "number" ||
          !Number.isInteger(mc.maxPerCategory) ||
          mc.maxPerCategory < MAX_PER_CATEGORY_RANGE.min ||
          mc.maxPerCategory > MAX_PER_CATEGORY_RANGE.max
        ) {
          errors.push({
            field: "memoryConfig.maxPerCategory",
            message: `${MAX_PER_CATEGORY_RANGE.min}~${MAX_PER_CATEGORY_RANGE.max} 정수여야 합니다`,
          })
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, policy: null }
  }

  // 유효하면 기본값 머지해서 반환
  const policy = getAutonomyPolicy({ autonomyPolicy: obj })
  return { valid: true, errors: [], policy }
}
