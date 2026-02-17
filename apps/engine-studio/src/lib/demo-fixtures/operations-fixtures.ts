/**
 * 운영 관리 (장애, 백업, DR) 데모 데이터
 * ⚠️ DB 연동 전 UI 데모 전용
 */
import type { Incident, DetectionRule } from "@/lib/operations"

// ── 장애 시드 데이터 ────────────────────────────────────────

export function buildDemoIncidents(): Incident[] {
  const now = Date.now()
  return [
    {
      id: `INC-${now}-1`,
      title: "API 게이트웨이 응답 지연",
      severity: "P1",
      phase: "investigating",
      detectedAt: now - 45 * 60 * 1000,
      resolvedAt: null,
      commander: "운영 담당자 A",
      affectedServices: ["api-gateway", "matching-engine"],
      timeline: [
        {
          timestamp: now - 45 * 60 * 1000,
          phase: "detected",
          actor: "monitoring",
          description: "API 응답시간 2초 초과 탐지",
        },
        {
          timestamp: now - 40 * 60 * 1000,
          phase: "triaged",
          actor: "operator",
          description: "P1 분류, 담당자 배정",
        },
        {
          timestamp: now - 35 * 60 * 1000,
          phase: "investigating",
          actor: "operator",
          description: "DB 커넥션 풀 조사 시작",
        },
      ],
      rootCause: null,
      mitigation: null,
    },
    {
      id: `INC-${now}-2`,
      title: "페르소나 매칭 엔진 OOM",
      severity: "P0",
      phase: "mitigating",
      detectedAt: now - 90 * 60 * 1000,
      resolvedAt: null,
      commander: "운영 담당자 B",
      affectedServices: ["matching-engine", "worker"],
      timeline: [
        {
          timestamp: now - 90 * 60 * 1000,
          phase: "detected",
          actor: "system",
          description: "OOM 에러 발생",
        },
        {
          timestamp: now - 85 * 60 * 1000,
          phase: "triaged",
          actor: "operator",
          description: "P0 분류",
        },
        {
          timestamp: now - 80 * 60 * 1000,
          phase: "investigating",
          actor: "operator",
          description: "메모리 릭 조사",
        },
        {
          timestamp: now - 60 * 60 * 1000,
          phase: "mitigating",
          actor: "operator",
          description: "메모리 제한 상향 및 재배포",
        },
      ],
      rootCause: null,
      mitigation: null,
    },
    {
      id: `INC-${now}-3`,
      title: "백업 작업 실패",
      severity: "P2",
      phase: "resolved",
      detectedAt: now - 24 * 60 * 60 * 1000,
      resolvedAt: now - 23 * 60 * 60 * 1000,
      commander: "운영 담당자 C",
      affectedServices: ["backup-service"],
      timeline: [
        {
          timestamp: now - 24 * 60 * 60 * 1000,
          phase: "detected",
          actor: "cron",
          description: "일일 백업 실패 감지",
        },
        {
          timestamp: now - 23.5 * 60 * 60 * 1000,
          phase: "triaged",
          actor: "operator",
          description: "P2 분류",
        },
        {
          timestamp: now - 23.25 * 60 * 60 * 1000,
          phase: "investigating",
          actor: "operator",
          description: "디스크 용량 조사",
        },
        {
          timestamp: now - 23.1 * 60 * 60 * 1000,
          phase: "mitigating",
          actor: "operator",
          description: "임시 스토리지 확보",
        },
        {
          timestamp: now - 23 * 60 * 60 * 1000,
          phase: "resolved",
          actor: "operator",
          description: "스토리지 확장 완료",
        },
      ],
      rootCause: "디스크 용량 부족",
      mitigation: "스토리지 볼륨 2배 확장",
    },
    {
      id: `INC-${now}-4`,
      title: "로그 수집기 지연",
      severity: "P3",
      phase: "resolved",
      detectedAt: now - 3 * 24 * 60 * 60 * 1000,
      resolvedAt: now - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      commander: "운영 담당자 D",
      affectedServices: ["log-collector"],
      timeline: [
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000,
          phase: "detected",
          actor: "system",
          description: "로그 수집 지연 탐지",
        },
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
          phase: "triaged",
          actor: "operator",
          description: "P3 분류",
        },
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
          phase: "investigating",
          actor: "operator",
          description: "버퍼 크기 조사",
        },
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000,
          phase: "mitigating",
          actor: "operator",
          description: "버퍼 크기 증가",
        },
        {
          timestamp: now - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          phase: "resolved",
          actor: "operator",
          description: "정상화 확인",
        },
      ],
      rootCause: "로그 버퍼 크기 부족",
      mitigation: "버퍼 크기 4배 증가",
    },
  ]
}

export const DEMO_INCIDENTS = buildDemoIncidents()

export const DEMO_DETECTION_RULES: DetectionRule[] = [
  {
    id: "rule_llm_error_rate",
    name: "LLM 에러율 급증",
    description: "LLM 에러율이 15%를 초과하면 P1 장애 탐지",
    metricType: "llm_error_rate",
    condition: "above",
    threshold: 15,
    durationSeconds: 60,
    severity: "P1",
    enabled: true,
  },
]

// ── DR 계획 시드 데이터 ─────────────────────────────────────

export const DEMO_DR_PLAN = {
  name: "데이터베이스 장애 복구",
  scenario: "database_failure" as const,
  rtoMinutes: 30,
  rpoMinutes: 5,
  steps: [
    {
      description: "DB 페일오버 실행",
      responsible: "DBA팀",
      estimatedMinutes: 10,
      prerequisites: [] as string[],
      verificationCommand: "pg_isready",
    },
    {
      description: "트래픽 리다이렉트",
      responsible: "인프라팀",
      estimatedMinutes: 5,
      prerequisites: ["DB 페일오버 실행"],
      verificationCommand: null,
    },
    {
      description: "서비스 검증",
      responsible: "QA팀",
      estimatedMinutes: 15,
      prerequisites: ["트래픽 리다이렉트"],
      verificationCommand: "curl /health",
    },
  ],
  contacts: [
    {
      name: "DBA 담당자",
      role: "DBA Lead",
      phone: "000-0000-0000",
      email: "dba@example.com",
      isPrimary: true,
    },
    {
      name: "인프라 담당자",
      role: "Infra Lead",
      phone: "000-0000-0000",
      email: "infra@example.com",
      isPrimary: false,
    },
  ],
}
