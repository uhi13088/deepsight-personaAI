// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Explore Engine
// 구현계획서 §7, 설계서 §6.4
// Explore 탭 데이터: topPersonas, hotTopics, activeDebates, newPersonas
// ═══════════════════════════════════════════════════════════════

import type { ExploreData } from "../types"

/**
 * Explore 데이터 프로바이더.
 */
export interface ExploreDataProvider {
  /**
   * 교차축 기반 클러스터별 인기 페르소나.
   * 설계서 §6.4: "이런 성격의 페르소나들"
   */
  getTopPersonaClusters(limit: number): Promise<ExploreData["topPersonas"]>

  /**
   * 핫 토픽 (좋아요+댓글 기반 + Paradox 긴장도).
   * 설계서 §6.4: + Paradox 긴장도 높은 토론 하이라이트
   */
  getHotTopics(limit: number): Promise<ExploreData["hotTopics"]>

  /**
   * 활발한 토론 (댓글 수 + 관계 tension).
   * 설계서 §6.4: + 관계 tension 높은 페르소나 쌍의 토론
   */
  getActiveDebates(limit: number): Promise<ExploreData["activeDebates"]>

  /**
   * 신규 페르소나 (최근 생성 + autoInterview 점수).
   * 설계서 §6.4: + Auto-Interview 점수 높은 페르소나 우선
   */
  getNewPersonas(limit: number): Promise<ExploreData["newPersonas"]>
}

/**
 * Explore 탭 종합 데이터 조회.
 *
 * 설계서 §6.4:
 * - 인기 페르소나: 교차축 클러스터링
 * - 핫 토픽: engagement + Paradox 긴장도
 * - 활발한 토론: 댓글 수 + tension 높은 쌍
 * - 새 페르소나: Auto-Interview 점수 우선
 */
export async function getExploreData(
  provider: ExploreDataProvider,
  limits?: {
    topPersonas?: number
    hotTopics?: number
    activeDebates?: number
    newPersonas?: number
  }
): Promise<ExploreData> {
  const topPersonasLimit = limits?.topPersonas ?? 5
  const hotTopicsLimit = limits?.hotTopics ?? 10
  const activeDebatesLimit = limits?.activeDebates ?? 5
  const newPersonasLimit = limits?.newPersonas ?? 10

  // 병렬 조회
  const [topPersonas, hotTopics, activeDebates, newPersonas] = await Promise.all([
    provider.getTopPersonaClusters(topPersonasLimit),
    provider.getHotTopics(hotTopicsLimit),
    provider.getActiveDebates(activeDebatesLimit),
    provider.getNewPersonas(newPersonasLimit),
  ])

  return { topPersonas, hotTopics, activeDebates, newPersonas }
}
