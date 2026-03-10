// ═══════════════════════════════════════════════════════════════
// PW Arena — 품질 파이프라인 브릿지 (T431)
// 유저 토론 데이터 → 엔진 내부 심판 파이프라인 비동기 전송
//
// 플로우:
//   PW 토론 완료 → filter → arena-engine.judgeSession → arena-bridge.createTrigger
//   → arena-feedback → 관리자 승인 → 페르소나 품질 업그레이드
// ═══════════════════════════════════════════════════════════════

import type { ArenaSession, ArenaTurn } from "@/lib/arena/arena-engine"
import { judgeSessionRuleBased } from "@/lib/arena/arena-engine"
import { createArenaTrigger } from "../quality/arena-bridge"
import type { ArenaTrigger } from "../quality/arena-bridge"
import type { PWArenaSessionRecord } from "./pw-arena-types"
import type { QualityEvalScope } from "./pw-arena-types"
import { evaluateQualityScope } from "./filter"
import type { PWArenaDataProvider } from "./pw-arena-service"

// ── 변환: PW 세션 → 엔진 ArenaSession ──────────────────────

/**
 * PW 아레나 세션을 엔진 내부 ArenaSession 형식으로 변환.
 * 엔진 심판(judgeSessionRuleBased)이 이해할 수 있는 형식.
 */
function toEngineArenaSession(session: PWArenaSessionRecord): ArenaSession {
  const participants = session.participantIds as string[]

  const turns: ArenaTurn[] = session.turns
    .sort((a, b) => a.roundNumber - b.roundNumber || a.createdAt.getTime() - b.createdAt.getTime())
    .map((t, i) => ({
      turnNumber: i + 1,
      speakerId: t.speakerId,
      content: t.content,
      tokensUsed: t.tokensUsed,
      timestamp: t.createdAt.getTime(),
    }))

  return {
    id: session.id,
    mode: participants.length <= 2 ? "SPARRING_1V1" : "SPARRING_1VN",
    participants,
    profileLoadLevel: "STANDARD",
    topic: session.topic,
    maxTurns: turns.length,
    budgetTokens: 0, // PW 아레나는 코인으로 관리, 토큰 예산 없음
    usedTokens: turns.reduce((sum, t) => sum + t.tokensUsed, 0),
    status: "COMPLETED",
    turns,
    createdAt: session.createdAt.getTime(),
    completedAt: session.completedAt?.getTime() ?? Date.now(),
  }
}

// ── 품질 평가 실행 ──────────────────────────────────────────

export interface QualitySyncResult {
  sessionId: string
  scope: QualityEvalScope
  triggers: ArenaTrigger[]
  skipped: boolean
  reason: string
}

/**
 * 완료된 PW 아레나 세션을 엔진 품질 파이프라인에 동기화.
 *
 * 1. 필터링 (evaluateQualityScope)
 * 2. 엔진 ArenaSession 형식으로 변환
 * 3. 룰 기반 심판 실행 (judgeSessionRuleBased)
 * 4. 이슈 발견 시 ArenaTrigger 생성
 * 5. DB에 동기화 완료 표시
 */
export async function syncSessionToQualityPipeline(
  session: PWArenaSessionRecord,
  arenaProvider: PWArenaDataProvider
): Promise<QualitySyncResult> {
  // 이미 동기화된 세션은 건너뜀
  if (session.qualitySynced) {
    return {
      sessionId: session.id,
      scope: "SKIP",
      triggers: [],
      skipped: true,
      reason: "이미 동기화됨",
    }
  }

  // 1. 필터링
  const filterResult = evaluateQualityScope(session)
  if (filterResult.scope === "SKIP") {
    await arenaProvider.markQualitySynced(session.id)
    return {
      sessionId: session.id,
      scope: "SKIP",
      triggers: [],
      skipped: true,
      reason: filterResult.reason,
    }
  }

  // 2. 엔진 형식 변환
  const engineSession = toEngineArenaSession(session)

  // 3. 룰 기반 심판 실행
  const judgment = judgeSessionRuleBased(engineSession)

  // 4. 이슈 기반 트리거 생성
  const triggers: ArenaTrigger[] = []
  const participants = session.participantIds as string[]

  for (const personaId of participants) {
    // 해당 페르소나의 이슈만 필터
    const personaIssues = judgment.issues.filter((issue) => issue.personaId === personaId)
    if (personaIssues.length === 0) continue

    // VOICE_ONLY 스코프에서는 consistency 이슈만 트리거
    if (filterResult.scope === "VOICE_ONLY") {
      const voiceIssues = personaIssues.filter(
        (i) => i.category === "consistency" || i.category === "voice"
      )
      if (voiceIssues.length > 0) {
        const trigger = createArenaTrigger(
          personaId,
          "USER_ARENA",
          `PW 토론 [${session.id}] 말투 이슈: ${voiceIssues.map((i) => i.description).join("; ")}`
        )
        triggers.push(trigger)
      }
    } else {
      // FULL 스코프: 모든 이슈 트리거
      const majorIssues = personaIssues.filter(
        (i) => i.severity === "major" || i.severity === "critical"
      )
      if (majorIssues.length > 0) {
        const trigger = createArenaTrigger(
          personaId,
          "USER_ARENA",
          `PW 토론 [${session.id}] ${majorIssues.length}개 이슈: ${majorIssues.map((i) => `${i.category}(${i.severity})`).join(", ")}`
        )
        triggers.push(trigger)
      }
    }
  }

  // 5. 동기화 완료 표시
  await arenaProvider.markQualitySynced(session.id)

  return {
    sessionId: session.id,
    scope: filterResult.scope,
    triggers,
    skipped: false,
    reason: filterResult.reason,
  }
}

/**
 * 미동기화 세션 일괄 처리 (크론/배치용).
 */
export async function syncPendingSessions(
  arenaProvider: PWArenaDataProvider,
  limit: number = 10
): Promise<QualitySyncResult[]> {
  const sessions = await arenaProvider.getCompletedUnsyncedSessions(limit)
  const results: QualitySyncResult[] = []

  for (const session of sessions) {
    const result = await syncSessionToQualityPipeline(session, arenaProvider)
    results.push(result)
  }

  return results
}
