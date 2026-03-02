// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Vector Provenance Tracking (T311)
// 구현계획서 §8.3 — 유저 벡터 출처 추적
// 각 벡터 차원 값의 출처(cold-start/micro/sns/activity) 기록
// ═══════════════════════════════════════════════════════════════

/**
 * 벡터 값 출처 유형.
 */
export type VectorSource =
  | "COLD_START" // 온보딩 질문
  | "MICRO_QUESTION" // 일일 마이크로 질문
  | "SNS_ANALYSIS" // SNS 분석
  | "ACTIVITY_LEARNING" // 활동 패턴 학습
  | "MANUAL" // 수동 조정 (관리자)

/**
 * 단일 벡터 차원 출처 기록.
 */
export interface VectorProvenanceEntry {
  dimension: string
  source: VectorSource
  previousValue: number | null
  newValue: number
  delta: number
  timestamp: string // ISO 8601
}

/**
 * 유저의 전체 벡터 출처 기록 (PersonaWorldUser.dataSources JSON에 저장).
 */
export interface VectorProvenanceLog {
  vectorHistory: VectorProvenanceEntry[]
  lastUpdated: string
  summary: Record<VectorSource, number> // source별 업데이트 횟수
}

/**
 * 기존 dataSources에서 provenance 로그 추출.
 */
export function extractProvenanceLog(
  dataSources: Record<string, unknown> | null
): VectorProvenanceLog {
  if (!dataSources || !dataSources.vectorProvenance) {
    return {
      vectorHistory: [],
      lastUpdated: new Date().toISOString(),
      summary: {
        COLD_START: 0,
        MICRO_QUESTION: 0,
        SNS_ANALYSIS: 0,
        ACTIVITY_LEARNING: 0,
        MANUAL: 0,
      },
    }
  }

  return dataSources.vectorProvenance as VectorProvenanceLog
}

/**
 * 벡터 변경 기록 추가.
 *
 * 최대 100개 히스토리 유지 (오래된 것 삭제).
 */
export function appendProvenanceEntry(
  log: VectorProvenanceLog,
  entry: Omit<VectorProvenanceEntry, "timestamp">
): VectorProvenanceLog {
  const newEntry: VectorProvenanceEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  const history = [...log.vectorHistory, newEntry]
  // 최대 100개 유지
  const trimmed = history.length > 100 ? history.slice(-100) : history

  const summary = { ...log.summary }
  summary[entry.source] = (summary[entry.source] ?? 0) + 1

  return {
    vectorHistory: trimmed,
    lastUpdated: newEntry.timestamp,
    summary,
  }
}

/**
 * dataSources JSON에 provenance 로그 병합.
 */
export function mergeProvenanceToDataSources(
  dataSources: Record<string, unknown> | null,
  provenanceLog: VectorProvenanceLog
): Record<string, unknown> {
  return {
    ...(dataSources ?? {}),
    vectorProvenance: provenanceLog,
  }
}

/**
 * 차원별 가장 최근 출처 조회.
 */
export function getLatestSourceByDimension(
  log: VectorProvenanceLog
): Record<string, { source: VectorSource; timestamp: string }> {
  const result: Record<string, { source: VectorSource; timestamp: string }> = {}

  for (const entry of log.vectorHistory) {
    result[entry.dimension] = { source: entry.source, timestamp: entry.timestamp }
  }

  return result
}
