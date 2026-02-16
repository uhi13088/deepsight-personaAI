// ═══════════════════════════════════════════════════════════════
// Arena Persistence v4.0
// T154: ArenaSession 테이블 + 물리적 격리
//
// 아레나 세션 데이터의 영속성 계층 + 물리적 격리 경계 정의.
// 아레나 데이터는 일반 페르소나 데이터와 완전히 분리되어야 한다.
//
// 격리 원칙:
// 1. 아레나 세션은 독립 테이블에 저장 (Persona 테이블 오염 방지)
// 2. 턴 데이터는 세션에 종속 (세션 삭제 시 캐스케이드)
// 3. 판정은 세션당 1회만 (1:1 관계)
// 4. 교정 요청은 판정에 종속 (판정 없이 교정 불가)
// 5. 비용 추적은 아레나 전용 테이블 (LlmUsageLog와 분리)
//
// LLM 비용: 0 (순수 규칙 기반)
// ═══════════════════════════════════════════════════════════════

import type {
  ArenaSession,
  ArenaSessionStatus,
  ArenaTurn,
  ArenaJudgment,
  JudgmentScores,
  TurnIssue,
  ProfileLoadLevel,
} from "./arena-engine"
import type { CorrectionRequest } from "./arena-cost-control"

// ── DB 레코드 타입 (Prisma 스키마 매핑) ──────────────────

/** ArenaSession DB 레코드 */
export interface ArenaSessionRecord {
  readonly id: string
  readonly mode: string
  readonly participantA: string
  readonly participantB: string
  readonly profileLoadLevel: ProfileLoadLevel
  readonly topic: string
  readonly maxTurns: number
  readonly budgetTokens: number
  readonly usedTokens: number
  readonly status: ArenaSessionStatus
  readonly createdAt: number
  readonly startedAt: number | null
  readonly completedAt: number | null
}

/** ArenaTurn DB 레코드 */
export interface ArenaTurnRecord {
  readonly id: string
  readonly sessionId: string
  readonly turnNumber: number
  readonly speakerId: string
  readonly content: string
  readonly tokensUsed: number
  readonly timestamp: number
}

/** ArenaJudgment DB 레코드 */
export interface ArenaJudgmentRecord {
  readonly id: string
  readonly sessionId: string
  readonly scores: JudgmentScores
  readonly overallScore: number
  readonly issues: readonly TurnIssue[]
  readonly summary: string
  readonly method: "rule_based" | "llm"
  readonly judgedAt: number
}

/** ArenaCorrectionRequest DB 레코드 */
export interface ArenaCorrectionRecord {
  readonly id: string
  readonly sessionId: string
  readonly judgmentId: string
  readonly category: string
  readonly personaId: string
  readonly originalContent: string
  readonly correctedContent: string
  readonly reason: string
  readonly status: "PENDING" | "APPROVED" | "REJECTED"
  readonly createdAt: number
  readonly reviewedAt: number | null
  readonly reviewedBy: string | null
}

/** ArenaTokenUsage DB 레코드 (LlmUsageLog와 분리) */
export interface ArenaTokenUsageRecord {
  readonly id: string
  readonly sessionId: string
  readonly turnId: string | null
  readonly phase: "turn" | "judgment" | "profile_load"
  readonly inputTokens: number
  readonly outputTokens: number
  readonly estimatedCostUSD: number
  readonly timestamp: number
}

// ── 물리적 격리 경계 ────────────────────────────────────

/** 아레나 데이터 격리 정책 */
export interface ArenaIsolationPolicy {
  /** 아레나 데이터를 별도 네임스페이스에 저장 */
  readonly namespace: "arena"
  /** 세션 데이터 보관 기간 (일) */
  readonly retentionDays: number
  /** 완료된 세션 아카이브 보관 기간 (일) */
  readonly archiveRetentionDays: number
  /** 세션별 최대 턴 수 */
  readonly maxTurnsPerSession: number
  /** 교정 요청 보관 기간 (일) */
  readonly correctionRetentionDays: number
  /** 판정 결과 보관 기간 (일) */
  readonly judgmentRetentionDays: number
}

/** 기본 격리 정책 */
export const DEFAULT_ISOLATION_POLICY: ArenaIsolationPolicy = {
  namespace: "arena",
  retentionDays: 90,
  archiveRetentionDays: 365,
  maxTurnsPerSession: 20,
  correctionRetentionDays: 180,
  judgmentRetentionDays: 365,
}

/** 격리 위반 유형 */
export type IsolationViolationType =
  | "cross_namespace_write" // 아레나→페르소나 직접 쓰기
  | "direct_persona_mutation" // 아레나에서 페르소나 정의 직접 변경
  | "unscoped_query" // 세션 ID 없이 아레나 데이터 조회
  | "retention_exceeded" // 보관 기간 초과 데이터 잔존
  | "orphan_record" // 부모 세션 없는 턴/판정 데이터

/** 격리 위반 보고 */
export interface IsolationViolation {
  readonly type: IsolationViolationType
  readonly description: string
  readonly severity: "warning" | "error"
  readonly detectedAt: number
  readonly relatedId?: string
}

// ── 세션 영속성 레이어 ────────────────────────────────────

/** ArenaSession → ArenaSessionRecord 변환 */
export function sessionToRecord(session: ArenaSession): ArenaSessionRecord {
  // startedAt: 첫 턴의 timestamp (없으면 null)
  const startedAt = session.turns.length > 0 ? session.turns[0].timestamp : null

  return {
    id: session.id,
    mode: session.mode,
    participantA: session.participants[0] ?? "",
    participantB: session.participants[1] ?? "",
    profileLoadLevel: session.profileLoadLevel,
    topic: session.topic,
    maxTurns: session.maxTurns,
    budgetTokens: session.budgetTokens,
    usedTokens: session.usedTokens,
    status: session.status,
    createdAt: session.createdAt,
    startedAt,
    completedAt: session.completedAt,
  }
}

/** ArenaTurn → ArenaTurnRecord 변환 */
export function turnToRecord(sessionId: string, turn: ArenaTurn): ArenaTurnRecord {
  return {
    id: `${sessionId}_turn_${turn.turnNumber}`,
    sessionId,
    turnNumber: turn.turnNumber,
    speakerId: turn.speakerId,
    content: turn.content,
    tokensUsed: turn.tokensUsed,
    timestamp: turn.timestamp,
  }
}

/** ArenaJudgment → ArenaJudgmentRecord 변환 */
export function judgmentToRecord(
  sessionId: string,
  judgment: ArenaJudgment,
  method: "rule_based" | "llm" = "rule_based"
): ArenaJudgmentRecord {
  return {
    id: `${sessionId}_judgment`,
    sessionId,
    scores: judgment.scores,
    overallScore: judgment.overallScore,
    issues: judgment.issues,
    summary: judgment.summary,
    method,
    judgedAt: judgment.judgedAt,
  }
}

/** CorrectionRequest → ArenaCorrectionRecord 변환 */
export function correctionToRecord(
  sessionId: string,
  judgmentId: string,
  correction: CorrectionRequest
): ArenaCorrectionRecord {
  return {
    id: correction.id,
    sessionId,
    judgmentId,
    category: correction.issueCategory,
    personaId: "",
    originalContent: correction.originalContent,
    correctedContent: correction.correctedContent,
    reason: correction.reason,
    status: correction.status,
    createdAt: correction.createdAt,
    reviewedAt: correction.reviewedAt,
    reviewedBy: correction.reviewedBy,
  }
}

/** ArenaSession → 전체 레코드 세트 변환 (트랜잭션 단위) */
export function sessionToRecordSet(
  session: ArenaSession,
  judgment?: ArenaJudgment,
  corrections?: readonly CorrectionRequest[],
  judgmentMethod?: "rule_based" | "llm"
): ArenaRecordSet {
  const sessionRecord = sessionToRecord(session)
  const turnRecords = session.turns.map((t) => turnToRecord(session.id, t))

  const judgmentRecord = judgment ? judgmentToRecord(session.id, judgment, judgmentMethod) : null

  const correctionRecords = corrections
    ? corrections.map((c) => correctionToRecord(session.id, judgmentRecord?.id ?? "", c))
    : []

  return {
    session: sessionRecord,
    turns: turnRecords,
    judgment: judgmentRecord,
    corrections: correctionRecords,
  }
}

/** 트랜잭션 단위 레코드 세트 */
export interface ArenaRecordSet {
  readonly session: ArenaSessionRecord
  readonly turns: readonly ArenaTurnRecord[]
  readonly judgment: ArenaJudgmentRecord | null
  readonly corrections: readonly ArenaCorrectionRecord[]
}

// ── 데이터 라이프사이클 ────────────────────────────────────

/** 세션 라이프사이클 상태 */
export type SessionLifecycle =
  | "active" // 진행 중 (PENDING | RUNNING)
  | "completed" // 완료 (COMPLETED)
  | "cancelled" // 취소 (CANCELLED)
  | "archived" // 아카이브 (retentionDays 이후)
  | "expired" // 만료 (archiveRetentionDays 이후 → 삭제 대상)

/** 세션 라이프사이클 판정 */
export function determineSessionLifecycle(
  record: ArenaSessionRecord,
  policy: ArenaIsolationPolicy = DEFAULT_ISOLATION_POLICY
): SessionLifecycle {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  if (record.status === "PENDING" || record.status === "RUNNING") {
    return "active"
  }

  if (record.status === "CANCELLED") {
    const age = now - record.createdAt
    if (age > policy.archiveRetentionDays * dayMs) return "expired"
    if (age > policy.retentionDays * dayMs) return "archived"
    return "cancelled"
  }

  // COMPLETED
  const completedAt = record.completedAt ?? record.createdAt
  const age = now - completedAt

  if (age > policy.archiveRetentionDays * dayMs) return "expired"
  if (age > policy.retentionDays * dayMs) return "archived"
  return "completed"
}

/** 만료 세션 식별 (정리 대상) */
export function identifyExpiredSessions(
  records: readonly ArenaSessionRecord[],
  policy: ArenaIsolationPolicy = DEFAULT_ISOLATION_POLICY
): readonly ArenaSessionRecord[] {
  return records.filter((r) => determineSessionLifecycle(r, policy) === "expired")
}

/** 아카이브 대상 세션 식별 */
export function identifyArchivableSessions(
  records: readonly ArenaSessionRecord[],
  policy: ArenaIsolationPolicy = DEFAULT_ISOLATION_POLICY
): readonly ArenaSessionRecord[] {
  return records.filter((r) => determineSessionLifecycle(r, policy) === "archived")
}

// ── 격리 검증 ────────────────────────────────────────────

/** 레코드 세트 격리 검증 */
export function validateIsolation(
  recordSet: ArenaRecordSet,
  policy: ArenaIsolationPolicy = DEFAULT_ISOLATION_POLICY
): readonly IsolationViolation[] {
  const violations: IsolationViolation[] = []
  const now = Date.now()

  // 1. 세션-턴 관계 검증
  for (const turn of recordSet.turns) {
    if (turn.sessionId !== recordSet.session.id) {
      violations.push({
        type: "orphan_record",
        description: `턴 ${turn.id}의 sessionId(${turn.sessionId})가 세션 ID(${recordSet.session.id})와 불일치`,
        severity: "error",
        detectedAt: now,
        relatedId: turn.id,
      })
    }
  }

  // 2. 판정-세션 관계 검증
  if (recordSet.judgment && recordSet.judgment.sessionId !== recordSet.session.id) {
    violations.push({
      type: "orphan_record",
      description: `판정의 sessionId(${recordSet.judgment.sessionId})가 세션 ID와 불일치`,
      severity: "error",
      detectedAt: now,
      relatedId: recordSet.judgment.id,
    })
  }

  // 3. 교정-판정 관계 검증
  for (const correction of recordSet.corrections) {
    if (correction.sessionId !== recordSet.session.id) {
      violations.push({
        type: "orphan_record",
        description: `교정 ${correction.id}의 sessionId가 세션 ID와 불일치`,
        severity: "error",
        detectedAt: now,
        relatedId: correction.id,
      })
    }
  }

  // 4. 턴 수 제한 검증
  if (recordSet.turns.length > policy.maxTurnsPerSession) {
    violations.push({
      type: "retention_exceeded",
      description: `턴 수(${recordSet.turns.length})가 최대 허용치(${policy.maxTurnsPerSession})를 초과`,
      severity: "warning",
      detectedAt: now,
      relatedId: recordSet.session.id,
    })
  }

  // 5. participantA/B 검증 (빈 값 불허)
  if (!recordSet.session.participantA || !recordSet.session.participantB) {
    violations.push({
      type: "cross_namespace_write",
      description: "참가자 ID가 비어있습니다. 아레나 세션에는 반드시 2명의 참가자가 필요합니다",
      severity: "error",
      detectedAt: now,
      relatedId: recordSet.session.id,
    })
  }

  return violations
}

/** 단일 쓰기 작업 격리 검증 */
export function validateWriteOperation(
  operation: ArenaWriteOperation
): readonly IsolationViolation[] {
  const violations: IsolationViolation[] = []
  const now = Date.now()

  // 페르소나 정의 직접 변경 금지
  if (operation.targetTable === "Persona" || operation.targetTable === "PersonaVector") {
    violations.push({
      type: "direct_persona_mutation",
      description: `아레나에서 '${operation.targetTable}' 테이블 직접 변경 시도. 교정 루프(CorrectionLoop)를 통해야 합니다`,
      severity: "error",
      detectedAt: now,
    })
  }

  // 세션 ID 없는 아레나 쓰기 금지
  if (!operation.sessionId && operation.targetTable.startsWith("Arena")) {
    violations.push({
      type: "unscoped_query",
      description: `세션 ID 없이 '${operation.targetTable}'에 쓰기 시도`,
      severity: "error",
      detectedAt: now,
    })
  }

  return violations
}

/** 쓰기 작업 정보 */
export interface ArenaWriteOperation {
  readonly targetTable: string
  readonly sessionId?: string
  readonly operationType: "INSERT" | "UPDATE" | "DELETE"
  readonly description: string
}

// ── 쿼리 스코프 ────────────────────────────────────────────

/** 아레나 쿼리는 반드시 세션 ID로 스코핑 */
export interface ArenaScopedQuery {
  readonly sessionId: string
  readonly includeRelations: {
    readonly turns: boolean
    readonly judgment: boolean
    readonly corrections: boolean
    readonly tokenUsage: boolean
  }
}

/** 기본 스코프 쿼리 생성 */
export function createScopedQuery(
  sessionId: string,
  includes: Partial<ArenaScopedQuery["includeRelations"]> = {}
): ArenaScopedQuery {
  return {
    sessionId,
    includeRelations: {
      turns: includes.turns ?? true,
      judgment: includes.judgment ?? true,
      corrections: includes.corrections ?? false,
      tokenUsage: includes.tokenUsage ?? false,
    },
  }
}

/** 기간 기반 스코프 */
export interface ArenaTimeRangeQuery {
  readonly fromTimestamp: number
  readonly toTimestamp: number
  readonly statusFilter?: readonly ArenaSessionStatus[]
  readonly participantFilter?: string
  readonly limit: number
  readonly offset: number
}

/** 기본 기간 쿼리 생성 (최근 30일) */
export function createTimeRangeQuery(
  overrides: Partial<ArenaTimeRangeQuery> = {}
): ArenaTimeRangeQuery {
  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  return {
    fromTimestamp: overrides.fromTimestamp ?? now - thirtyDaysMs,
    toTimestamp: overrides.toTimestamp ?? now,
    statusFilter: overrides.statusFilter,
    participantFilter: overrides.participantFilter,
    limit: overrides.limit ?? 50,
    offset: overrides.offset ?? 0,
  }
}

// ── 토큰 사용 추적 ────────────────────────────────────────

/** 세션의 토큰 사용 내역 생성 */
export function createTokenUsageRecord(
  sessionId: string,
  phase: ArenaTokenUsageRecord["phase"],
  inputTokens: number,
  outputTokens: number,
  costUSD: number,
  turnId?: string
): ArenaTokenUsageRecord {
  return {
    id: `${sessionId}_usage_${phase}_${Date.now()}`,
    sessionId,
    turnId: turnId ?? null,
    phase,
    inputTokens,
    outputTokens,
    estimatedCostUSD: Math.round(costUSD * 1_000_000) / 1_000_000,
    timestamp: Date.now(),
  }
}

/** 세션별 토큰 사용 요약 */
export interface SessionTokenSummary {
  readonly sessionId: string
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly totalTokens: number
  readonly totalCostUSD: number
  readonly byPhase: {
    readonly turn: { tokens: number; costUSD: number }
    readonly judgment: { tokens: number; costUSD: number }
    readonly profile_load: { tokens: number; costUSD: number }
  }
}

/** 토큰 사용 레코드 → 요약 집계 */
export function summarizeTokenUsage(
  sessionId: string,
  records: readonly ArenaTokenUsageRecord[]
): SessionTokenSummary {
  const sessionRecords = records.filter((r) => r.sessionId === sessionId)

  const byPhase = {
    turn: { tokens: 0, costUSD: 0 },
    judgment: { tokens: 0, costUSD: 0 },
    profile_load: { tokens: 0, costUSD: 0 },
  }

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCostUSD = 0

  for (const r of sessionRecords) {
    const totalTokensForRecord = r.inputTokens + r.outputTokens
    totalInputTokens += r.inputTokens
    totalOutputTokens += r.outputTokens
    totalCostUSD += r.estimatedCostUSD

    byPhase[r.phase].tokens += totalTokensForRecord
    byPhase[r.phase].costUSD += r.estimatedCostUSD
  }

  return {
    sessionId,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCostUSD: Math.round(totalCostUSD * 1_000_000) / 1_000_000,
    byPhase: {
      turn: roundPhaseSummary(byPhase.turn),
      judgment: roundPhaseSummary(byPhase.judgment),
      profile_load: roundPhaseSummary(byPhase.profile_load),
    },
  }
}

function roundPhaseSummary(p: { tokens: number; costUSD: number }): {
  tokens: number
  costUSD: number
} {
  return { tokens: p.tokens, costUSD: Math.round(p.costUSD * 1_000_000) / 1_000_000 }
}

// ── 아카이브 / 정리 ────────────────────────────────────────

/** 아카이브 대상 레코드 요약 (삭제 전 확인용) */
export interface ArchiveSummary {
  readonly expiredSessionCount: number
  readonly archivableSessionCount: number
  readonly totalTurnRecords: number
  readonly totalJudgmentRecords: number
  readonly totalCorrectionRecords: number
  readonly oldestSessionDate: number | null
  readonly newestSessionDate: number | null
}

/** 레코드 세트에서 아카이브 요약 생성 */
export function computeArchiveSummary(
  sessions: readonly ArenaSessionRecord[],
  policy: ArenaIsolationPolicy = DEFAULT_ISOLATION_POLICY,
  turnCounts?: ReadonlyMap<string, number>,
  judgmentIds?: ReadonlySet<string>,
  correctionCounts?: ReadonlyMap<string, number>
): ArchiveSummary {
  const expired = identifyExpiredSessions(sessions, policy)
  const archivable = identifyArchivableSessions(sessions, policy)

  const affectedSessions = [...expired, ...archivable]
  const affectedIds = new Set(affectedSessions.map((s) => s.id))

  let totalTurnRecords = 0
  let totalJudgmentRecords = 0
  let totalCorrectionRecords = 0

  for (const id of affectedIds) {
    totalTurnRecords += turnCounts?.get(id) ?? 0
    if (judgmentIds?.has(id)) totalJudgmentRecords++
    totalCorrectionRecords += correctionCounts?.get(id) ?? 0
  }

  const dates = affectedSessions.map((s) => s.createdAt).sort((a, b) => a - b)

  return {
    expiredSessionCount: expired.length,
    archivableSessionCount: archivable.length,
    totalTurnRecords,
    totalJudgmentRecords,
    totalCorrectionRecords,
    oldestSessionDate: dates[0] ?? null,
    newestSessionDate: dates[dates.length - 1] ?? null,
  }
}

/** 정리 결과 요약 */
export function summarizeCleanup(summary: ArchiveSummary): string {
  const lines = [
    `아레나 데이터 정리 요약:`,
    `  만료 세션: ${summary.expiredSessionCount}건 (삭제 대상)`,
    `  아카이브 세션: ${summary.archivableSessionCount}건`,
    `  영향 턴: ${summary.totalTurnRecords}건`,
    `  영향 판정: ${summary.totalJudgmentRecords}건`,
    `  영향 교정: ${summary.totalCorrectionRecords}건`,
  ]

  if (summary.oldestSessionDate) {
    lines.push(
      `  가장 오래된 세션: ${new Date(summary.oldestSessionDate).toISOString().split("T")[0]}`
    )
  }

  return lines.join("\n")
}
