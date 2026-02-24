// ═══════════════════════════════════════════════════════════════
// Incident Management — 장애 탐지, 대응, Post-Mortem
// ═══════════════════════════════════════════════════════════════

import { type MetricType, roundMetric } from "./types"
import type { MetricDataPoint } from "./monitoring"

// ═══════════════════════════════════════════════════════════════
// AC2: 장애 대응 (등급 정의, 탐지, 워크플로우, 대시보드, Post-mortem)
// ═══════════════════════════════════════════════════════════════

// ── 장애 등급 정의 ──────────────────────────────────────────

export type IncidentSeverity = "P0" | "P1" | "P2" | "P3"

export interface IncidentSeverityDefinition {
  level: IncidentSeverity
  label: string
  description: string
  responseTimeMinutes: number
  escalationTimeMinutes: number
  notifyChannels: string[]
}

export const INCIDENT_SEVERITY_DEFINITIONS: IncidentSeverityDefinition[] = [
  {
    level: "P0",
    label: "Critical",
    description: "서비스 전면 장애, 전체 사용자 영향",
    responseTimeMinutes: 5,
    escalationTimeMinutes: 15,
    notifyChannels: ["pager", "slack", "email", "sms"],
  },
  {
    level: "P1",
    label: "High",
    description: "주요 기능 장애, 다수 사용자 영향",
    responseTimeMinutes: 15,
    escalationTimeMinutes: 30,
    notifyChannels: ["slack", "email", "sms"],
  },
  {
    level: "P2",
    label: "Medium",
    description: "부분 기능 저하, 일부 사용자 영향",
    responseTimeMinutes: 60,
    escalationTimeMinutes: 120,
    notifyChannels: ["slack", "email"],
  },
  {
    level: "P3",
    label: "Low",
    description: "경미한 이슈, 사용자 영향 최소",
    responseTimeMinutes: 240,
    escalationTimeMinutes: 480,
    notifyChannels: ["slack"],
  },
]

// ── 장애 탐지 ───────────────────────────────────────────────

export interface DetectionRule {
  id: string
  name: string
  description: string
  metricType: MetricType
  condition: "above" | "below"
  threshold: number
  durationSeconds: number
  severity: IncidentSeverity
  enabled: boolean
}

export interface DetectionResult {
  ruleId: string
  triggered: boolean
  severity: IncidentSeverity
  metricValue: number
  threshold: number
  message: string
  detectedAt: number
}

// ── 장애 워크플로우 ─────────────────────────────────────────

export type IncidentPhase =
  | "detected"
  | "triaged"
  | "investigating"
  | "mitigating"
  | "resolved"
  | "postmortem"

export interface IncidentTimelineEntry {
  timestamp: number
  phase: IncidentPhase
  actor: string
  description: string
}

export interface Incident {
  id: string
  title: string
  severity: IncidentSeverity
  phase: IncidentPhase
  detectedAt: number
  resolvedAt: number | null
  commander: string | null
  affectedServices: string[]
  timeline: IncidentTimelineEntry[]
  rootCause: string | null
  mitigation: string | null
}

export interface PostMortem {
  incidentId: string
  title: string
  summary: string
  timeline: IncidentTimelineEntry[]
  rootCause: string
  impact: {
    affectedUsers: number
    affectedServices: string[]
    downtimeMinutes: number
    dataLoss: boolean
  }
  actionItems: PostMortemAction[]
  lessonsLearned: string[]
  createdAt: number
}

export interface PostMortemAction {
  id: string
  description: string
  assignee: string
  dueDate: number
  priority: "low" | "medium" | "high"
  completed: boolean
}

export interface IncidentDashboardData {
  activeIncidents: Incident[]
  recentResolved: Incident[]
  detectionRules: DetectionRule[]
  stats: {
    totalIncidents: number
    mttrMinutes: number // Mean Time To Resolve
    incidentsBySeverity: Record<IncidentSeverity, number>
  }
}

// ── 장애 대응 함수 ──────────────────────────────────────────

export function evaluateDetectionRules(
  dataPoints: MetricDataPoint[],
  rules: DetectionRule[]
): DetectionResult[] {
  const results: DetectionResult[] = []
  const enabledRules = rules.filter((r) => r.enabled)

  for (const rule of enabledRules) {
    const relevantPoints = dataPoints.filter((p) => p.metricType === rule.metricType)
    if (relevantPoints.length === 0) continue

    const now = Date.now()
    const windowStart = now - rule.durationSeconds * 1000
    const recentPoints = relevantPoints.filter((p) => p.timestamp >= windowStart)
    if (recentPoints.length === 0) continue

    const avgValue = recentPoints.reduce((s, p) => s + p.value, 0) / recentPoints.length

    const triggered =
      rule.condition === "above" ? avgValue >= rule.threshold : avgValue <= rule.threshold

    results.push({
      ruleId: rule.id,
      triggered,
      severity: rule.severity,
      metricValue: roundMetric(avgValue),
      threshold: rule.threshold,
      message: triggered
        ? `탐지 규칙 "${rule.name}" 발동: ${rule.metricType} 평균 ${roundMetric(avgValue)} (임계값: ${rule.threshold})`
        : `탐지 규칙 "${rule.name}" 정상: ${rule.metricType} 평균 ${roundMetric(avgValue)}`,
      detectedAt: now,
    })
  }

  return results
}

export function createIncident(
  title: string,
  severity: IncidentSeverity,
  affectedServices: string[],
  detectedBy: string
): Incident {
  const now = Date.now()
  return {
    id: `INC-${now}`,
    title,
    severity,
    phase: "detected",
    detectedAt: now,
    resolvedAt: null,
    commander: null,
    affectedServices,
    timeline: [
      {
        timestamp: now,
        phase: "detected",
        actor: detectedBy,
        description: `장애 탐지: ${title}`,
      },
    ],
    rootCause: null,
    mitigation: null,
  }
}

export function triageIncident(
  incident: Incident,
  commander: string,
  severity: IncidentSeverity
): Incident {
  const now = Date.now()
  return {
    ...incident,
    severity,
    phase: "triaged",
    commander,
    timeline: [
      ...incident.timeline,
      {
        timestamp: now,
        phase: "triaged",
        actor: commander,
        description: `장애 분류 완료 — 등급: ${severity}, 담당: ${commander}`,
      },
    ],
  }
}

export function advanceIncidentPhase(
  incident: Incident,
  nextPhase: IncidentPhase,
  actor: string,
  description: string
): Incident {
  const PHASE_ORDER: IncidentPhase[] = [
    "detected",
    "triaged",
    "investigating",
    "mitigating",
    "resolved",
    "postmortem",
  ]

  const currentIdx = PHASE_ORDER.indexOf(incident.phase)
  const nextIdx = PHASE_ORDER.indexOf(nextPhase)
  if (nextIdx <= currentIdx) {
    throw new Error(
      `잘못된 단계 전환: ${incident.phase} → ${nextPhase}. 이전 단계로 돌아갈 수 없습니다.`
    )
  }

  const now = Date.now()
  return {
    ...incident,
    phase: nextPhase,
    resolvedAt: nextPhase === "resolved" || nextPhase === "postmortem" ? now : incident.resolvedAt,
    timeline: [...incident.timeline, { timestamp: now, phase: nextPhase, actor, description }],
  }
}

export function resolveIncident(
  incident: Incident,
  actor: string,
  rootCause: string,
  mitigation: string
): Incident {
  const now = Date.now()
  return {
    ...incident,
    phase: "resolved",
    resolvedAt: now,
    rootCause,
    mitigation,
    timeline: [
      ...incident.timeline,
      {
        timestamp: now,
        phase: "resolved",
        actor,
        description: `장애 해결 — 원인: ${rootCause}`,
      },
    ],
  }
}

export function createPostMortem(
  incident: Incident,
  rootCause: string,
  affectedUsers: number,
  downtimeMinutes: number,
  dataLoss: boolean,
  actionItems: Omit<PostMortemAction, "id" | "completed">[],
  lessonsLearned: string[]
): PostMortem {
  return {
    incidentId: incident.id,
    title: `Post-Mortem: ${incident.title}`,
    summary: `${incident.severity} 등급 장애 — ${incident.affectedServices.join(", ")}`,
    timeline: incident.timeline,
    rootCause,
    impact: {
      affectedUsers,
      affectedServices: incident.affectedServices,
      downtimeMinutes,
      dataLoss,
    },
    actionItems: actionItems.map((item, idx) => ({
      ...item,
      id: `action_${incident.id}_${idx}`,
      completed: false,
    })),
    lessonsLearned,
    createdAt: Date.now(),
  }
}

export function calculateMTTR(incidents: Incident[]): number {
  const resolved = incidents.filter((i) => i.resolvedAt !== null)
  if (resolved.length === 0) return 0

  const totalMinutes = resolved.reduce((sum, i) => {
    const duration = (i.resolvedAt! - i.detectedAt) / (1000 * 60)
    return sum + duration
  }, 0)

  return roundMetric(totalMinutes / resolved.length)
}

export function buildIncidentDashboard(
  incidents: Incident[],
  rules: DetectionRule[]
): IncidentDashboardData {
  const activeIncidents = incidents.filter(
    (i) => i.phase !== "resolved" && i.phase !== "postmortem"
  )
  const recentResolved = incidents
    .filter((i) => i.phase === "resolved" || i.phase === "postmortem")
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
    .slice(0, 20)

  const incidentsBySeverity: Record<IncidentSeverity, number> = {
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
  }
  for (const inc of incidents) {
    incidentsBySeverity[inc.severity]++
  }

  return {
    activeIncidents,
    recentResolved,
    detectionRules: rules,
    stats: {
      totalIncidents: incidents.length,
      mttrMinutes: calculateMTTR(incidents),
      incidentsBySeverity,
    },
  }
}
