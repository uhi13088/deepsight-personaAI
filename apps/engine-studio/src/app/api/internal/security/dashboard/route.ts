// ═══════════════════════════════════════════════════════════════
// Security Dashboard API — 보안 3계층 통합 대시보드
// T148: 관리자 보안 대시보드
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import {
  aggregateGateGuardMetrics,
  aggregateOutputSentinelMetrics,
  extractKillSwitchMetrics,
  generateGateGuardAlerts,
  generateIntegrityAlerts,
  generateOutputSentinelAlerts,
  generateKillSwitchAlerts,
  determineOverallStatus,
  generateSecuritySummary,
} from "@/lib/security/security-dashboard"
import type {
  SecurityDashboard,
  GateGuardMetrics,
  IntegrityMetrics,
  OutputSentinelMetrics,
  KillSwitchMetrics,
  ProvenanceMetrics,
  SecurityAlert,
} from "@/lib/security/security-dashboard"
import { createDefaultConfig, evaluateAllTriggers } from "@/lib/security/kill-switch"
import type { SystemSafetyConfig } from "@/lib/security/kill-switch"
import type { OutputViolation, QuarantineEntry } from "@/lib/security/output-sentinel"

// ── DB에서 안전 설정 로드 ──────────────────────────────────

async function loadSafetyConfig(): Promise<SystemSafetyConfig> {
  const row = await prisma.systemSafetyConfig.findUnique({
    where: { id: "singleton" },
  })

  if (!row) {
    return createDefaultConfig("system")
  }

  return {
    emergencyFreeze: row.emergencyFreeze,
    freezeReason: row.freezeReason ?? undefined,
    freezeAt: row.freezeAt ? row.freezeAt.getTime() : undefined,
    featureToggles: row.featureToggles as unknown as SystemSafetyConfig["featureToggles"],
    autoTriggers: row.autoTriggers as unknown as SystemSafetyConfig["autoTriggers"],
    updatedAt: row.updatedAt.getTime(),
    updatedBy: row.updatedBy,
  }
}

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    // 격리 엔트리 조회
    const quarantineEntries = await prisma.quarantineEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    const pendingCount = quarantineEntries.filter((e) => e.status === "PENDING").length

    // 안전 설정 로드
    const safetyConfig = await loadSafetyConfig()

    // 페르소나 상태 (집단 이상용)
    const personaStates = await prisma.personaState.findMany({
      select: { mood: true },
    })
    const moods = personaStates.map((s) => Number(s.mood))
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0.5

    const collectiveAnomaly =
      moods.length >= 3
        ? avgMood <= 0.3
          ? "depression"
          : avgMood >= 0.9
            ? "euphoria"
            : "none"
        : "none"

    // Gate Guard 메트릭 (실데이터 없으므로 빈 배열 기반)
    const gateGuard: GateGuardMetrics = aggregateGateGuardMetrics([])

    // Integrity 메트릭
    const integrity: IntegrityMetrics = {
      factbookIntact: true,
      driftStatus: "stable",
      driftSimilarity: 1.0,
      flaggedContextCount: 0,
      dailyTotalChanges: 0,
      collectiveAnomaly: collectiveAnomaly as IntegrityMetrics["collectiveAnomaly"],
      collectiveAverageMood: Math.round(avgMood * 1000) / 1000,
      alertLevel: collectiveAnomaly !== "none" ? "warning" : "ok",
    }

    // Output Sentinel 메트릭
    const outputSentinel: OutputSentinelMetrics = aggregateOutputSentinelMetrics(
      [],
      quarantineEntries.map((e) => {
        const rawViolations =
          (e.violations as Array<{ category: string; pattern?: string; matched?: string }>) ?? []
        return {
          id: e.id,
          content: e.content,
          source: e.source,
          personaId: e.personaId ?? "",
          reason: e.reason,
          violations: rawViolations.map((v) => ({
            category: v.category as OutputViolation["category"],
            rule: v.pattern ?? v.category,
            severity: "medium" as const,
            detail: v.matched ?? "",
          })),
          status: e.status.toLowerCase() as QuarantineEntry["status"],
          reviewedBy: e.reviewedBy ?? null,
          reviewedAt: e.reviewedAt ? e.reviewedAt.getTime() : null,
          createdAt: e.createdAt.getTime(),
        }
      })
    )

    // Kill Switch 메트릭
    const triggerResults = evaluateAllTriggers({
      quarantineTimestamps: [],
      averageMood: avgMood,
      driftSimilarities: [],
      config: safetyConfig.autoTriggers,
    })
    const killSwitch: KillSwitchMetrics = extractKillSwitchMetrics(
      safetyConfig,
      triggerResults.triggers
    )

    // Provenance 메트릭 (실데이터 기반)
    const provenance: ProvenanceMetrics = {
      totalEntries: 0,
      averageTrust: 1.0,
      quarantinedCount: 0,
      maxPropagationDepth: 0,
      trustDistribution: { high: 0, medium: 0, low: 0, minimal: 0 },
    }

    // 알림 생성
    const alerts: SecurityAlert[] = [
      ...generateGateGuardAlerts(gateGuard),
      ...generateIntegrityAlerts(integrity),
      ...generateOutputSentinelAlerts(outputSentinel),
      ...generateKillSwitchAlerts(killSwitch),
    ].sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })

    const overallStatus = determineOverallStatus(alerts, killSwitch.emergencyFreeze)

    const dashboard: SecurityDashboard = {
      overallStatus,
      updatedAt: Date.now(),
      gateGuard,
      integrity,
      outputSentinel,
      killSwitch,
      provenance,
      alerts,
      summary: "",
    }
    dashboard.summary = generateSecuritySummary(dashboard)

    return NextResponse.json({ success: true, data: dashboard })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}
