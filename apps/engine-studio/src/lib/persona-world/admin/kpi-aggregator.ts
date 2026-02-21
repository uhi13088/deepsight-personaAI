// ═══════════════════════════════════════════════════════════════
// PersonaWorld — KPI Aggregator (Phase 7-B)
// DB 데이터를 수집하여 ServiceKPIInput / UXKPIInput 으로 변환
// ═══════════════════════════════════════════════════════════════

import type { ServiceKPIInput, UXKPIInput } from "./kpi-tracker"

// ── DI Provider ──────────────────────────────────────────────

export interface KPIDataProvider {
  // Persona
  countActivePersonas(): Promise<number>
  countTotalPersonas(): Promise<number>
  getAveragePIS(): Promise<number>

  // Content
  countTotalPosts(): Promise<number>
  countTotalComments(): Promise<number>
  countTotalLikes(): Promise<number>
  countTotalFollows(): Promise<number>

  // Security
  countFactbookViolations(): Promise<number>
  countQuarantinedContent(): Promise<number>
  countTotalContent(): Promise<number>
  getAvgReportResolutionMinutes(): Promise<number>
  countKillSwitchActivations(): Promise<number>

  // LLM
  countCacheHits(): Promise<number>
  countTotalLLMCalls(): Promise<number>

  // UX (유저 행동 — 아직 측정 인프라 미구축)
  getAvgSessionDurationMinutes(): Promise<number>
  getAvgFeedScrollCount(): Promise<number>
  countProfileVisits(): Promise<number>
  countUserFollows(): Promise<number>
  countFeedImpressions(): Promise<number>
  countUserComments(): Promise<number>
  countOnboardingStarted(): Promise<number>
  countOnboardingCompleted(): Promise<number>
  countModeratedContent(): Promise<number>
}

// ── 집계 함수 ────────────────────────────────────────────────

/**
 * 서비스 건전성 KPI 입력 데이터 수집.
 */
export async function aggregateServiceKPIInput(
  provider: KPIDataProvider
): Promise<ServiceKPIInput> {
  const [
    activePersonas,
    totalPersonas,
    averagePIS,
    totalLikes,
    totalComments,
    totalPosts,
    factbookViolations,
    quarantinedContent,
    totalContent,
    avgReportResolutionMinutes,
    killSwitchActivations,
    cacheHits,
    totalLLMCalls,
  ] = await Promise.all([
    provider.countActivePersonas(),
    provider.countTotalPersonas(),
    provider.getAveragePIS(),
    provider.countTotalLikes(),
    provider.countTotalComments(),
    provider.countTotalPosts(),
    provider.countFactbookViolations(),
    provider.countQuarantinedContent(),
    provider.countTotalContent(),
    provider.getAvgReportResolutionMinutes(),
    provider.countKillSwitchActivations(),
    provider.countCacheHits(),
    provider.countTotalLLMCalls(),
  ])

  return {
    activePersonas,
    totalPersonas,
    averagePIS,
    totalLikes,
    totalComments,
    totalPosts,
    factbookViolations,
    quarantinedContent,
    totalContent,
    avgReportResolutionMinutes,
    killSwitchActivations,
    cacheHits,
    totalLLMCalls,
  }
}

/**
 * UX KPI 입력 데이터 수집.
 */
export async function aggregateUXKPIInput(provider: KPIDataProvider): Promise<UXKPIInput> {
  const [
    avgSessionDurationMinutes,
    avgFeedScrollCount,
    profileVisits,
    follows,
    feedImpressions,
    commentsWritten,
    onboardingStarted,
    onboardingCompleted,
    totalContent,
    moderatedContent,
  ] = await Promise.all([
    provider.getAvgSessionDurationMinutes(),
    provider.getAvgFeedScrollCount(),
    provider.countProfileVisits(),
    provider.countUserFollows(),
    provider.countFeedImpressions(),
    provider.countUserComments(),
    provider.countOnboardingStarted(),
    provider.countOnboardingCompleted(),
    provider.countTotalContent(),
    provider.countModeratedContent(),
  ])

  return {
    avgSessionDurationMinutes,
    avgFeedScrollCount,
    profileVisits,
    follows,
    feedImpressions,
    commentsWritten,
    onboardingStarted,
    onboardingCompleted,
    totalContent,
    moderatedContent,
  }
}

/**
 * 서비스 + UX 전체 KPI 입력 데이터를 한번에 수집.
 */
export async function aggregateAllKPIInputs(
  provider: KPIDataProvider
): Promise<{ serviceInput: ServiceKPIInput; uxInput: UXKPIInput }> {
  const [serviceInput, uxInput] = await Promise.all([
    aggregateServiceKPIInput(provider),
    aggregateUXKPIInput(provider),
  ])

  return { serviceInput, uxInput }
}
