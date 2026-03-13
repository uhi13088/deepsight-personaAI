// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Quality Logging (Phase 6-B)
// 운영 설계서 §9.4 — PostQualityLog, CommentQualityLog, InteractionPatternLog
// ═══════════════════════════════════════════════════════════════

import type { CommentTone } from "../types"

// ── PostQualityLog ────────────────────────────────────────────

export type PostTrigger = "SCHEDULED" | "EVENT" | "PERSONA_STATE" | "PEAK_TIME" | "SOCIAL"

export interface PostQualityLog {
  postId: string
  personaId: string
  timestamp: Date

  generation: {
    postType: string
    trigger: PostTrigger
    llmModel: string
    tokenUsage: { input: number; output: number; cached: number }
    latency: number // ms
  }

  quality: {
    lengthChars: number
    voiceSpecMatch: number // 0.0~1.0
    factbookViolations: string[] // violated fact IDs
    repetitionScore: number // vs recent posts (lower=better)
    topicRelevance: number // relevance to interests
  }

  engagement?: {
    likeCount: number
    commentCount: number
    repostCount: number
    avgFeedPosition: number
  }
}

// ── CommentQualityLog ─────────────────────────────────────────

export interface CommentQualityLog {
  commentId: string
  personaId: string
  targetPostId: string
  timestamp: Date

  toneAnalysis: {
    selectedTone: CommentTone
    toneMatchScore: number // 0.0~1.0
    relationshipStage: string
    moodAtGeneration: number
  }

  conversationQuality: {
    contextRelevance: number // 0.0~1.0
    memoryReference: boolean
    naturalness: number // 0.0~1.0
  }

  /** T449: 댓글 시점의 관계 수치 */
  relationshipMetrics?: {
    warmth: number // 0.0~1.0
    attraction: number // 0.0~1.0
    rapportScore: number // 0.0~1.0
  }
}

// ── InteractionPatternLog ─────────────────────────────────────

export type PatternPeriod = "HOURLY" | "DAILY" | "WEEKLY"

export type AnomalyType = "BOT_PATTERN" | "ENERGY_MISMATCH" | "SUDDEN_BURST" | "PROLONGED_SILENCE"
export type AnomalySeverity = "INFO" | "WARNING" | "CRITICAL"

export interface InteractionAnomaly {
  type: AnomalyType
  severity: AnomalySeverity
  description: string
}

export interface InteractionPatternLog {
  personaId: string
  period: PatternPeriod
  timestamp: Date

  stats: {
    postsCreated: number
    commentsWritten: number
    likesGiven: number
    followsInitiated: number
    repostsShared: number
  }

  patterns: {
    activeHours: number[] // 활동 시간대
    avgIntervalMinutes: number
    targetDiversity: number // 0~1
    topicDiversity: number // 0~1
    energyCorrelation: number // energy ↔ activity 상관
  }

  anomalies: InteractionAnomaly[]

  /** T450: 관계 건강 지표 (WEEKLY 기간 집계 시 포함) */
  relationshipHealth?: {
    avgWarmthChange: number // 주간 평균 warmth 변화 (-1.0~1.0)
    relationshipMilestones: number // 주간 마일스톤 달성 수
    intimacyTransitions: number // 유저 친밀도 레벨 변화 수
  }
}

// ── Log 생성 함수 ──────────────────────────────────────────────

export function createPostQualityLog(params: {
  postId: string
  personaId: string
  postType: string
  trigger: PostTrigger
  llmModel: string
  tokenUsage: { input: number; output: number; cached: number }
  latency: number
  content: string
  voiceSpecMatch: number
  factbookViolations: string[]
  repetitionScore: number
  topicRelevance: number
}): PostQualityLog {
  return {
    postId: params.postId,
    personaId: params.personaId,
    timestamp: new Date(),
    generation: {
      postType: params.postType,
      trigger: params.trigger,
      llmModel: params.llmModel,
      tokenUsage: params.tokenUsage,
      latency: params.latency,
    },
    quality: {
      lengthChars: params.content.length,
      voiceSpecMatch: clamp01(params.voiceSpecMatch),
      factbookViolations: params.factbookViolations,
      repetitionScore: clamp01(params.repetitionScore),
      topicRelevance: clamp01(params.topicRelevance),
    },
  }
}

export function createCommentQualityLog(params: {
  commentId: string
  personaId: string
  targetPostId: string
  selectedTone: CommentTone
  toneMatchScore: number
  relationshipStage: string
  moodAtGeneration: number
  contextRelevance: number
  memoryReference: boolean
  naturalness: number
  /** T449: 관계 수치 (선택) */
  warmth?: number
  attraction?: number
  rapportScore?: number
}): CommentQualityLog {
  const log: CommentQualityLog = {
    commentId: params.commentId,
    personaId: params.personaId,
    targetPostId: params.targetPostId,
    timestamp: new Date(),
    toneAnalysis: {
      selectedTone: params.selectedTone,
      toneMatchScore: clamp01(params.toneMatchScore),
      relationshipStage: params.relationshipStage,
      moodAtGeneration: clamp01(params.moodAtGeneration),
    },
    conversationQuality: {
      contextRelevance: clamp01(params.contextRelevance),
      memoryReference: params.memoryReference,
      naturalness: clamp01(params.naturalness),
    },
  }

  // T449: 관계 수치가 하나라도 전달되면 기록
  if (
    params.warmth !== undefined ||
    params.attraction !== undefined ||
    params.rapportScore !== undefined
  ) {
    log.relationshipMetrics = {
      warmth: clamp01(params.warmth ?? 0),
      attraction: clamp01(params.attraction ?? 0),
      rapportScore: clamp01(params.rapportScore ?? 0),
    }
  }

  return log
}

// ── 이상 패턴 감지 ────────────────────────────────────────────

/**
 * 활동 통계에서 이상 패턴 감지.
 */
export function detectAnomalies(
  stats: InteractionPatternLog["stats"],
  patterns: InteractionPatternLog["patterns"],
  energy: number
): InteractionAnomaly[] {
  const anomalies: InteractionAnomaly[] = []

  // BOT_PATTERN: 너무 규칙적인 간격 (평균 간격 분산이 낮은 경우)
  const totalActions =
    stats.postsCreated +
    stats.commentsWritten +
    stats.likesGiven +
    stats.followsInitiated +
    stats.repostsShared

  if (totalActions > 20 && patterns.avgIntervalMinutes > 0 && patterns.avgIntervalMinutes < 3) {
    anomalies.push({
      type: "BOT_PATTERN",
      severity: "CRITICAL",
      description: `극단적으로 짧은 평균 활동 간격: ${patterns.avgIntervalMinutes}분`,
    })
  } else if (totalActions > 10 && patterns.targetDiversity < 0.1 && patterns.topicDiversity < 0.1) {
    anomalies.push({
      type: "BOT_PATTERN",
      severity: "WARNING",
      description: `극히 낮은 대상/토픽 다양성: target=${patterns.targetDiversity}, topic=${patterns.topicDiversity}`,
    })
  }

  // ENERGY_MISMATCH: 에너지와 활동량 불일치
  const activityLevel = Math.min(1, totalActions / 30) // 30 actions = full activity
  if (energy < 0.3 && activityLevel > 0.7) {
    anomalies.push({
      type: "ENERGY_MISMATCH",
      severity: "WARNING",
      description: `에너지 낮음(${energy}) but 활동량 높음(${round(activityLevel)})`,
    })
  } else if (energy > 0.8 && activityLevel < 0.1 && totalActions > 0) {
    anomalies.push({
      type: "ENERGY_MISMATCH",
      severity: "INFO",
      description: `에너지 높음(${energy}) but 활동량 매우 낮음(${round(activityLevel)})`,
    })
  }

  // SUDDEN_BURST: 짧은 시간에 대량 활동
  if (stats.postsCreated > 10 || stats.commentsWritten > 50 || stats.likesGiven > 100) {
    anomalies.push({
      type: "SUDDEN_BURST",
      severity: "WARNING",
      description: `활동 폭증: posts=${stats.postsCreated}, comments=${stats.commentsWritten}, likes=${stats.likesGiven}`,
    })
  }

  // PROLONGED_SILENCE: 활동 0인 경우 (daily 기간에서)
  if (totalActions === 0) {
    anomalies.push({
      type: "PROLONGED_SILENCE",
      severity: "INFO",
      description: "해당 기간 동안 활동 없음",
    })
  }

  return anomalies
}

/**
 * InteractionPatternLog 생성.
 */
export function createInteractionPatternLog(params: {
  personaId: string
  period: PatternPeriod
  stats: InteractionPatternLog["stats"]
  patterns: InteractionPatternLog["patterns"]
  energy: number
  /** T450: 관계 건강 지표 (WEEKLY 기간에 전달) */
  relationshipHealth?: InteractionPatternLog["relationshipHealth"]
}): InteractionPatternLog {
  const log: InteractionPatternLog = {
    personaId: params.personaId,
    period: params.period,
    timestamp: new Date(),
    stats: params.stats,
    patterns: params.patterns,
    anomalies: detectAnomalies(params.stats, params.patterns, params.energy),
  }

  if (params.relationshipHealth) {
    log.relationshipHealth = params.relationshipHealth
  }

  return log
}

// ── 로그 집계 ──────────────────────────────────────────────────

export interface QualityLogStats {
  postLogs: {
    total: number
    avgVoiceSpecMatch: number
    avgRepetitionScore: number
    totalFactbookViolations: number
  }
  commentLogs: {
    total: number
    avgToneMatchScore: number
    avgContextRelevance: number
    avgNaturalness: number
    memoryReferenceRate: number
    /** T449: 관계 수치 평균 (데이터 있는 로그만 집계) */
    avgWarmth?: number
    avgAttraction?: number
    avgRapportScore?: number
  }
}

/**
 * PostQualityLog 배열에서 집계 통계 계산.
 */
export function aggregatePostQualityLogs(logs: PostQualityLog[]): QualityLogStats["postLogs"] {
  if (logs.length === 0) {
    return { total: 0, avgVoiceSpecMatch: 0, avgRepetitionScore: 0, totalFactbookViolations: 0 }
  }

  return {
    total: logs.length,
    avgVoiceSpecMatch: round(logs.reduce((s, l) => s + l.quality.voiceSpecMatch, 0) / logs.length),
    avgRepetitionScore: round(
      logs.reduce((s, l) => s + l.quality.repetitionScore, 0) / logs.length
    ),
    totalFactbookViolations: logs.reduce((s, l) => s + l.quality.factbookViolations.length, 0),
  }
}

/**
 * CommentQualityLog 배열에서 집계 통계 계산.
 */
export function aggregateCommentQualityLogs(
  logs: CommentQualityLog[]
): QualityLogStats["commentLogs"] {
  if (logs.length === 0) {
    return {
      total: 0,
      avgToneMatchScore: 0,
      avgContextRelevance: 0,
      avgNaturalness: 0,
      memoryReferenceRate: 0,
    }
  }

  const memRefCount = logs.filter((l) => l.conversationQuality.memoryReference).length

  const result: QualityLogStats["commentLogs"] = {
    total: logs.length,
    avgToneMatchScore: round(
      logs.reduce((s, l) => s + l.toneAnalysis.toneMatchScore, 0) / logs.length
    ),
    avgContextRelevance: round(
      logs.reduce((s, l) => s + l.conversationQuality.contextRelevance, 0) / logs.length
    ),
    avgNaturalness: round(
      logs.reduce((s, l) => s + l.conversationQuality.naturalness, 0) / logs.length
    ),
    memoryReferenceRate: round(memRefCount / logs.length),
  }

  // T449: 관계 수치 평균 (데이터 있는 로그만 집계)
  const withRelMetrics = logs.filter((l) => l.relationshipMetrics)
  if (withRelMetrics.length > 0) {
    result.avgWarmth = round(
      withRelMetrics.reduce((s, l) => s + l.relationshipMetrics!.warmth, 0) / withRelMetrics.length
    )
    result.avgAttraction = round(
      withRelMetrics.reduce((s, l) => s + l.relationshipMetrics!.attraction, 0) /
        withRelMetrics.length
    )
    result.avgRapportScore = round(
      withRelMetrics.reduce((s, l) => s + l.relationshipMetrics!.rapportScore, 0) /
        withRelMetrics.length
    )
  }

  return result
}

// ── 유틸리티 ──────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
