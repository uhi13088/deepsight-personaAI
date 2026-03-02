// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.1 — Scale Trigger (T331)
// 페르소나 수 기반 최적화 단계 자동 활성화/비활성화
// 스케줄러 tick마다 자동 실행, 수동 개입 없음
// ═══════════════════════════════════════════════════════════════

import {
  getActiveOptimizations,
  getOptimizationStatus,
  OPTIMIZATION_THRESHOLDS,
} from "@/lib/global-config/optimization-config"
import type {
  OptimizationFeature,
  OptimizationStatus,
} from "@/lib/global-config/optimization-config"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ScaleTriggerResult {
  previousStatus: OptimizationStatus
  currentStatus: OptimizationStatus
  changes: OptimizationChange[]
  hasChanges: boolean
  checkedAt: number
}

export interface OptimizationChange {
  feature: OptimizationFeature
  action: "activated" | "deactivated"
  threshold: number
  personaCount: number
}

/** 이전 상태를 캐시하기 위한 인터페이스 */
export interface ScaleTriggerState {
  lastPersonaCount: number
  activeFeatures: OptimizationFeature[]
  lastCheckedAt: number
}

// ── 스케일 트리거 체크 ────────────────────────────────────────

/**
 * 페르소나 수 변경에 따른 최적화 상태 변경 감지.
 * 이전 상태와 현재 상태를 비교하여 변경 사항만 반환.
 */
export function checkScaleTrigger(
  currentPersonaCount: number,
  previousState: ScaleTriggerState | null
): ScaleTriggerResult {
  const now = Date.now()
  const currentStatus = getOptimizationStatus(currentPersonaCount)

  // 이전 상태가 없으면 모든 활성 기능을 "activated"로 반환
  const previousFeatures = previousState?.activeFeatures ?? []
  const previousCount = previousState?.lastPersonaCount ?? 0
  const previousStatus = getOptimizationStatus(previousCount)

  const changes: OptimizationChange[] = []

  // 새로 활성화된 기능
  for (const feature of currentStatus.activeFeatures) {
    if (!previousFeatures.includes(feature)) {
      const threshold = OPTIMIZATION_THRESHOLDS.find((t) => t.feature === feature)
      changes.push({
        feature,
        action: "activated",
        threshold: threshold?.minPersonaCount ?? 0,
        personaCount: currentPersonaCount,
      })
    }
  }

  // 비활성화된 기능 (페르소나 수 감소 시)
  for (const feature of previousFeatures) {
    if (!currentStatus.activeFeatures.includes(feature)) {
      const threshold = OPTIMIZATION_THRESHOLDS.find((t) => t.feature === feature)
      changes.push({
        feature,
        action: "deactivated",
        threshold: threshold?.minPersonaCount ?? 0,
        personaCount: currentPersonaCount,
      })
    }
  }

  return {
    previousStatus,
    currentStatus,
    changes,
    hasChanges: changes.length > 0,
    checkedAt: now,
  }
}

/**
 * ScaleTriggerResult에서 새로운 캐시 상태 생성.
 */
export function buildScaleTriggerState(
  personaCount: number,
  activeFeatures: OptimizationFeature[]
): ScaleTriggerState {
  return {
    lastPersonaCount: personaCount,
    activeFeatures: [...activeFeatures],
    lastCheckedAt: Date.now(),
  }
}

// ── 변경 이벤트 포맷 ─────────────────────────────────────────

/**
 * 최적화 변경 이벤트를 ActivityEntry 호환 형식으로 변환.
 * 대시보드 최근 활동 로그에 자동 기록.
 */
export function formatChangeForActivity(change: OptimizationChange): {
  title: string
  description: string
  metadata: Record<string, string | number | boolean>
} {
  const featureNames: Record<OptimizationFeature, string> = {
    batch_comment: "댓글 배치 생성",
    haiku_routing: "Haiku 자동 라우팅",
    vector_cache: "매칭 벡터 캐시",
    arena_auto_schedule: "아레나 자동 스케줄링",
    memory_index: "벡터DB RAG 검색",
  }

  const name = featureNames[change.feature] ?? change.feature
  const actionLabel = change.action === "activated" ? "활성화" : "비활성화"

  return {
    title: `최적화 ${actionLabel}: ${name}`,
    description: `페르소나 ${change.personaCount}개 도달 → ${name} ${actionLabel} (임계값: ${change.threshold}개)`,
    metadata: {
      feature: change.feature,
      action: change.action,
      threshold: change.threshold,
      personaCount: change.personaCount,
      autoTriggered: true,
    },
  }
}

/**
 * 스케일 트리거 체크 주기 결정.
 * 페르소나 수가 임계값 근처이면 더 자주 체크.
 */
export function getCheckIntervalMs(currentPersonaCount: number): number {
  const active = getActiveOptimizations(currentPersonaCount)
  const allFeatureCount = OPTIMIZATION_THRESHOLDS.length

  if (active.length === allFeatureCount) {
    // 모든 최적화 활성화 → 느린 체크 (10분)
    return 10 * 60 * 1000
  }

  // 다음 임계값까지 남은 수 계산
  const nextThreshold = OPTIMIZATION_THRESHOLDS.find((t) => currentPersonaCount < t.minPersonaCount)

  if (nextThreshold) {
    const remaining = nextThreshold.minPersonaCount - currentPersonaCount
    if (remaining <= 5) {
      // 임계값 직전 → 빠른 체크 (1분)
      return 60 * 1000
    }
    if (remaining <= 20) {
      // 임계값 근처 → 중간 체크 (3분)
      return 3 * 60 * 1000
    }
  }

  // 기본 (5분)
  return 5 * 60 * 1000
}
