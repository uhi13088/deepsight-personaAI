// ═══════════════════════════════════════════════════════════════
// Alert Rules — 알림 트리거 규칙 정의 (v4.1.1-C: T386)
// ═══════════════════════════════════════════════════════════════

import type { AlertSeverity, AlertCategory, AlertChannel } from "./notification-service"

// ── Types ────────────────────────────────────────────────────

export interface AlertRule {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  channel: AlertChannel
  title: string
  /** 체크 함수 — true 반환 시 알림 발송 */
  check: (metrics: AlertMetrics) => boolean
  /** 알림 본문 생성 */
  buildBody: (metrics: AlertMetrics) => string
}

/** 알림 체크에 필요한 메트릭 데이터 */
export interface AlertMetrics {
  // 보안
  minTrustScore?: number
  dailyQuarantineCount?: number

  // 비용
  dailyCost?: number
  dailyCostThreshold?: number
  cacheHitRate?: number

  // 품질
  avgInterviewScore?: number
  maxVoiceDrift?: number

  // 시스템
  apiErrorRate?: number
  p95ResponseTimeMs?: number
}

// ── Rules ────────────────────────────────────────────────────

export const ALERT_RULES: AlertRule[] = [
  // ── 보안 ──
  {
    id: "security-trust-score-low",
    category: "security",
    severity: "critical",
    channel: "all",
    title: "Trust Score 위험 수준",
    check: (m) => m.minTrustScore !== undefined && m.minTrustScore < 30,
    buildBody: (m) =>
      `최저 Trust Score가 ${m.minTrustScore}으로 임계값(30) 미만입니다. 즉시 확인이 필요합니다.`,
  },
  {
    id: "security-quarantine-surge",
    category: "security",
    severity: "warning",
    channel: "slack",
    title: "격리 건수 급증",
    check: (m) => m.dailyQuarantineCount !== undefined && m.dailyQuarantineCount > 10,
    buildBody: (m) =>
      `오늘 격리 건수: ${m.dailyQuarantineCount}건 (임계값: 10건). 콘텐츠 보안 상태를 점검하세요.`,
  },

  // ── 비용 ──
  {
    id: "cost-daily-exceeded",
    category: "cost",
    severity: "warning",
    channel: "all",
    title: "일일 비용 임계값 초과",
    check: (m) =>
      m.dailyCost !== undefined &&
      m.dailyCostThreshold !== undefined &&
      m.dailyCost > m.dailyCostThreshold,
    buildBody: (m) =>
      `일일 비용 $${m.dailyCost?.toFixed(2)}이 임계값 $${m.dailyCostThreshold?.toFixed(2)}을 초과했습니다.`,
  },
  {
    id: "cost-cache-hit-low",
    category: "cost",
    severity: "warning",
    channel: "slack",
    title: "캐시 히트율 저하",
    check: (m) => m.cacheHitRate !== undefined && m.cacheHitRate < 0.5,
    buildBody: (m) =>
      `캐시 히트율 ${((m.cacheHitRate ?? 0) * 100).toFixed(1)}%로 50% 미만. Redis 연결 또는 TTL 설정을 확인하세요.`,
  },

  // ── 품질 ──
  {
    id: "quality-interview-low",
    category: "quality",
    severity: "warning",
    channel: "slack",
    title: "인터뷰 평균 점수 하락",
    check: (m) => m.avgInterviewScore !== undefined && m.avgInterviewScore < 70,
    buildBody: (m) =>
      `인터뷰 평균 점수 ${m.avgInterviewScore}점으로 70점 미만. 페르소나 품질 점검이 필요합니다.`,
  },
  {
    id: "quality-voice-drift",
    category: "quality",
    severity: "warning",
    channel: "slack",
    title: "Voice Drift 감지",
    check: (m) => m.maxVoiceDrift !== undefined && m.maxVoiceDrift > 0.3,
    buildBody: (m) =>
      `최대 Voice Drift ${m.maxVoiceDrift?.toFixed(2)}로 임계값(0.3) 초과. 페르소나 음성 일관성을 확인하세요.`,
  },

  // ── 시스템 ──
  {
    id: "system-error-rate-high",
    category: "system",
    severity: "critical",
    channel: "all",
    title: "API 에러율 급증",
    check: (m) => m.apiErrorRate !== undefined && m.apiErrorRate > 0.05,
    buildBody: (m) =>
      `API 에러율 ${((m.apiErrorRate ?? 0) * 100).toFixed(1)}%로 5% 초과. 시스템 장애 가능성을 확인하세요.`,
  },
  {
    id: "system-response-slow",
    category: "system",
    severity: "warning",
    channel: "slack",
    title: "응답 시간 P95 지연",
    check: (m) => m.p95ResponseTimeMs !== undefined && m.p95ResponseTimeMs > 3000,
    buildBody: (m) => `P95 응답시간 ${m.p95ResponseTimeMs}ms로 3초 초과. 성능 병목을 확인하세요.`,
  },
]

/**
 * 메트릭을 기반으로 트리거된 규칙 목록 반환.
 */
export function evaluateAlertRules(metrics: AlertMetrics): AlertRule[] {
  return ALERT_RULES.filter((rule) => rule.check(metrics))
}
