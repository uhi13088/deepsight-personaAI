// ═══════════════════════════════════════════════════════════════
// v4.1 최적화 설정 — T327
// 품질 보호 3원칙: (1) 0.9 미만 자동 재생성 (2) Haiku 화이트리스트만 (3) A/B 품질 자동 비교
// 모든 최적화는 수동 개입 없이 자동 실행
// ═══════════════════════════════════════════════════════════════

// ── Haiku 화이트리스트 ──────────────────────────────────────────
// 화이트리스트 방식: 이 목록에 있는 callType만 Haiku 라우팅 가능
// 목록에 없으면 → 무조건 Sonnet (안전 보장)

export const HAIKU_WHITELIST = [
  "pw:news_analysis", // 뉴스 기사 분석 (이미 Haiku 사용 중)
  "pw:impression", // 한줄 감상 (50자 이내, 단순 출력)
  "cold_start_summary", // 콜드스타트 요약
  "metadata_extraction", // 메타데이터 추출 (장르, 태그 분류)
  "tag_classification", // 태그 분류
  "sentiment_label", // 감정 분류 (positive/negative/neutral)
] as const

export type HaikuWhitelistCallType = (typeof HAIKU_WHITELIST)[number]

/**
 * callType이 Haiku 화이트리스트에 포함되는지 확인.
 * 명시적 화이트리스트 방식 — 목록에 없으면 false.
 */
export function isHaikuWhitelisted(callType: string): boolean {
  return (HAIKU_WHITELIST as readonly string[]).includes(callType)
}

// ── 스케일 기반 최적화 임계값 ──────────────────────────────────
// 활성 페르소나 수에 따라 최적화 단계를 자동 활성화

export interface OptimizationThreshold {
  feature: OptimizationFeature
  minPersonaCount: number
  description: string
}

export type OptimizationFeature =
  | "batch_comment"
  | "haiku_routing"
  | "vector_cache"
  | "arena_auto_schedule"
  | "memory_index"

export const OPTIMIZATION_THRESHOLDS: OptimizationThreshold[] = [
  {
    feature: "batch_comment",
    minPersonaCount: 10,
    description: "댓글 배치 생성 (N개를 1 LLM 호출로)",
  },
  {
    feature: "haiku_routing",
    minPersonaCount: 50,
    description: "비창의 작업 Haiku 자동 라우팅",
  },
  {
    feature: "vector_cache",
    minPersonaCount: 100,
    description: "매칭 벡터 사전 계산 캐시",
  },
  {
    feature: "arena_auto_schedule",
    minPersonaCount: 200,
    description: "아레나 자동 스케줄링",
  },
  {
    feature: "memory_index",
    minPersonaCount: 500,
    description: "벡터DB RAG 검색 전환",
  },
] as const

/**
 * 페르소나 수 기반으로 활성화해야 할 최적화 기능 목록 반환.
 */
export function getActiveOptimizations(activePersonaCount: number): OptimizationFeature[] {
  return OPTIMIZATION_THRESHOLDS.filter((t) => activePersonaCount >= t.minPersonaCount).map(
    (t) => t.feature
  )
}

/**
 * 특정 최적화 기능이 현재 활성화 상태인지 확인.
 */
export function isOptimizationActive(
  feature: OptimizationFeature,
  activePersonaCount: number
): boolean {
  const threshold = OPTIMIZATION_THRESHOLDS.find((t) => t.feature === feature)
  if (!threshold) return false
  return activePersonaCount >= threshold.minPersonaCount
}

/**
 * 다음으로 활성화될 최적화 기능과 필요한 페르소나 수 반환.
 * 모든 기능이 활성화되었으면 null.
 */
export function getNextOptimizationTarget(
  activePersonaCount: number
): { feature: OptimizationFeature; minPersonaCount: number; remaining: number } | null {
  const next = OPTIMIZATION_THRESHOLDS.find((t) => activePersonaCount < t.minPersonaCount)
  if (!next) return null
  return {
    feature: next.feature,
    minPersonaCount: next.minPersonaCount,
    remaining: next.minPersonaCount - activePersonaCount,
  }
}

// ── 배치 댓글 생성 설정 ──────────────────────────────────────────

export interface BatchCommentConfig {
  /** 한 번의 LLM 호출로 생성할 최대 댓글 수 */
  maxBatchSize: number
  /** 품질 합격 임계값 (이 점수 미만 시 자동 재생성) */
  qualityThreshold: number
  /** 자동 재생성 최대 횟수 (초과 시 원본 유지 + 로그) */
  maxRegenerationAttempts: number
  /** 재생성 시 사용할 모델 (항상 Sonnet — 품질 보장) */
  regenerationModel: string
}

export const DEFAULT_BATCH_COMMENT_CONFIG: BatchCommentConfig = {
  maxBatchSize: 3,
  qualityThreshold: 0.9,
  maxRegenerationAttempts: 2,
  regenerationModel: "claude-sonnet-4-5-20250929",
}

// ── A/B 모니터링 설정 ────────────────────────────────────────────

export interface ABMonitorConfig {
  /** A/B 비교 기간 (일) */
  comparisonWindowDays: number
  /** 유의미한 비교를 위한 최소 샘플 수 */
  minSampleSize: number
  /** 품질 하락 경고 기준 (이 값 이상 차이 시 경고) */
  qualityDropThreshold: number
  /** 비용 절감 보고 기준 (이 비율 이상 절감 시 보고) */
  savingsReportThreshold: number
}

export const DEFAULT_AB_MONITOR_CONFIG: ABMonitorConfig = {
  comparisonWindowDays: 7,
  minSampleSize: 30,
  qualityDropThreshold: 0.05,
  savingsReportThreshold: 0.1,
}

// ── LLM 라우팅 이유 ─────────────────────────────────────────────

export type RoutingReason =
  | "explicit_param" // params.model로 명시적 지정
  | "haiku_whitelist" // HAIKU_WHITELIST 자동 라우팅
  | "config_override" // DB callTypeOverrides 설정
  | "default_model" // 기본 모델 폴백

// ── 최적화 로그 엔트리 ──────────────────────────────────────────

export interface OptimizationLogEntry {
  timestamp: number
  feature: OptimizationFeature | "haiku_routing" | "batch_comment" | "quality_gate"
  action: "activated" | "deactivated" | "executed" | "quality_warning"
  details: Record<string, string | number | boolean>
}

// ── 최적화 상태 요약 ────────────────────────────────────────────

export interface OptimizationStatus {
  activePersonaCount: number
  activeFeatures: OptimizationFeature[]
  nextTarget: ReturnType<typeof getNextOptimizationTarget>
  haikuRoutingEnabled: boolean
  batchCommentEnabled: boolean
}

/**
 * 현재 최적화 상태 요약 생성.
 */
export function getOptimizationStatus(activePersonaCount: number): OptimizationStatus {
  const activeFeatures = getActiveOptimizations(activePersonaCount)
  return {
    activePersonaCount,
    activeFeatures,
    nextTarget: getNextOptimizationTarget(activePersonaCount),
    haikuRoutingEnabled: activeFeatures.includes("haiku_routing"),
    batchCommentEnabled: activeFeatures.includes("batch_comment"),
  }
}
