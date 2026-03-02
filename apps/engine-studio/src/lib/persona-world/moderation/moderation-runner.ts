// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Moderation Runner (T295)
// 구현계획서 §11.1 — Stage 3 비동기 배치 분석
// 전일 생성 콘텐츠 배치 분석 (engagement anomaly, repetition, tone deviation)
// ═══════════════════════════════════════════════════════════════

import { runStage3, type ModerationDetection } from "./auto-moderator"

// ── 비동기 분석 프로바이더 ───────────────────────────────────

export interface AsyncAnalysisProvider {
  /** 전일 생성 콘텐츠 목록 (포스트 + 댓글) */
  getRecentContents(hours: number): Promise<
    Array<{
      id: string
      type: "POST" | "COMMENT"
      personaId: string
      content: string
      createdAt: Date
    }>
  >

  /** 페르소나별 최근 engagement 통계 */
  getEngagementRates(personaId: string): Promise<number[]>

  /** 페르소나별 톤 이력 */
  getToneHistory(personaId: string): Promise<string[]>

  /** 평균 engagement */
  getAvgEngagement(personaId: string): Promise<number>

  /** ModerationLog 저장 */
  saveModerationLog(params: {
    contentType: string
    contentId: string
    personaId?: string
    stage: string
    verdict: string
    violations?: unknown
  }): Promise<void>
}

// ── 비동기 분석 결과 ────────────────────────────────────────

export interface AsyncAnalysisResult {
  contentId: string
  contentType: "POST" | "COMMENT"
  personaId: string
  detections: ModerationDetection[]
  flagged: boolean
}

// ── T295: Stage 3 비동기 배치 분석 ──────────────────────────

/**
 * 전일 생성 콘텐츠 비동기 분석.
 *
 * cron job으로 일일 실행.
 * - Engagement anomaly: 비정상적 engagement 패턴
 * - Repetition: 반복 콘텐츠
 * - Tone deviation: 톤 일탈
 */
export async function runAsyncAnalysis(
  provider: AsyncAnalysisProvider,
  hours: number = 24
): Promise<AsyncAnalysisResult[]> {
  const contents = await provider.getRecentContents(hours)
  const results: AsyncAnalysisResult[] = []

  // 페르소나별로 그룹핑
  const byPersona = new Map<string, typeof contents>()
  for (const content of contents) {
    const existing = byPersona.get(content.personaId) ?? []
    existing.push(content)
    byPersona.set(content.personaId, existing)
  }

  for (const [personaId, personaContents] of byPersona) {
    try {
      const [engagementRates, toneHistory, avgEngagement] = await Promise.all([
        provider.getEngagementRates(personaId),
        provider.getToneHistory(personaId),
        provider.getAvgEngagement(personaId),
      ])

      const recentTexts = personaContents.map((c) => c.content)

      const detections = runStage3({
        personaId,
        recentContents: recentTexts,
        engagementRates,
        toneHistory,
        avgEngagement,
      })

      // 각 콘텐츠에 대해 결과 매핑
      for (const content of personaContents) {
        const flagged = detections.length > 0
        results.push({
          contentId: content.id,
          contentType: content.type,
          personaId,
          detections,
          flagged,
        })

        // ModerationLog 기록
        if (flagged) {
          await provider.saveModerationLog({
            contentType: content.type,
            contentId: content.id,
            personaId,
            stage: "ASYNC_STAGE_3",
            verdict: "ASYNC_FLAG",
            violations: detections,
          })
        }
      }

      if (detections.length > 0) {
        console.warn(
          `[ModerationRunner] ${personaId}: ${detections.length} async detections`,
          detections.map((d) => `${d.type}(${d.severity})`)
        )
      }
    } catch (err) {
      console.error(`[ModerationRunner] Async analysis failed for ${personaId}:`, err)
    }
  }

  return results
}
