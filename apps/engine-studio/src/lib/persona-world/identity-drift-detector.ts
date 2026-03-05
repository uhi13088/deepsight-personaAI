// ═══════════════════════════════════════════════════════════════
// v5.0 Identity Drift Detector (정체성 드리프트 감지)
//
// 일일 배치: 최근 24시간 생성 출력이 ImmutableCore(캐릭터북)에서
// 얼마나 벗어났는지 감지.
//
// driftScore > 0.30 → consistencyScore 하락 + 경고
// driftScore > 0.50 → DEGRADED 상태 자동 전환 (T140 kill switch)
//
// LLM 없이 순수 키워드/패턴 기반으로 비용 0.
// ═══════════════════════════════════════════════════════════════

/** extractCoreKeywords에 필요한 최소 필드 (ImmutableFact의 구조적 서브셋) */
export interface ImmutableFactCore {
  category: string
  content: string
}

// ── 상수 ────────────────────────────────────────────────────────

/** driftScore 경고 임계값 */
export const DRIFT_WARNING_THRESHOLD = 0.3

/** driftScore DEGRADED 자동 전환 임계값 */
export const DRIFT_CRITICAL_THRESHOLD = 0.5

/** 샘플링할 최대 출력 수 */
export const MAX_SAMPLE_OUTPUTS = 20

// ── 타입 ────────────────────────────────────────────────────────

export interface GeneratedOutput {
  id: string
  type: "post" | "chat_response" | "comment"
  content: string
  createdAt: Date
}

export interface DriftDetectorProvider {
  /** 최근 N시간의 생성 출력 샘플 */
  getRecentOutputs(
    personaId: string,
    withinHours: number,
    limit: number
  ): Promise<GeneratedOutput[]>

  /** 페르소나 ImmutableFacts + 핵심 특성 */
  getImmutableCore(personaId: string): Promise<{
    immutableFacts: ImmutableFactCore[]
    coreKeywords: string[] // name, role, key traits 등에서 추출
    forbiddenPatterns: string[] // 절대 해서는 안 되는 표현 (가이드라인 위반)
  } | null>

  /** consistencyScore 업데이트 */
  updateConsistencyScore(personaId: string, score: number): Promise<void>

  /** DEGRADED 상태로 전환 (T140 kill switch 연동) */
  setDegradedState(personaId: string, reason: string): Promise<void>
}

// ── 키워드 추출 ──────────────────────────────────────────────────

/**
 * ImmutableFacts에서 핵심 키워드 집합 추출.
 * - 각 fact의 category별 중요도 가중치 적용
 * - 한국어 조사 제거, 2자 이상 단어만 추출
 */
export function extractCoreKeywords(facts: ImmutableFactCore[]): Set<string> {
  const keywords = new Set<string>()

  // category별 우선순위 (높을수록 중요)
  const categoryWeight: Record<string, number> = {
    coreIdentity: 3,
    innerConflict: 2,
    formativeExperience: 1,
    origin: 1,
  }

  for (const fact of facts) {
    const weight = categoryWeight[fact.category] ?? 1
    if (weight === 0) continue

    // 간단한 한국어 토크나이저 (공백+조사 제거)
    const tokens = fact.content.split(/[\s,./!?;:'"()[\]{}]+/).filter((t) => t.length >= 2)

    // 가중치가 높은 카테고리는 더 많이 추출
    const limit = weight >= 3 ? tokens.length : weight >= 2 ? 5 : 3
    tokens.slice(0, limit).forEach((t) => keywords.add(t))
  }

  return keywords
}

// ── 드리프트 측정 ────────────────────────────────────────────────

/**
 * 텍스트와 핵심 키워드 간 overlap 비율 계산.
 *
 * 단순하지만 효과적: ImmutableCore 키워드가 출력에 얼마나 나타나는지.
 * 높을수록 일관성 유지 중.
 */
export function computeKeywordOverlap(outputText: string, coreKeywords: Set<string>): number {
  if (coreKeywords.size === 0) return 1.0 // 키워드 없으면 drift 없음으로 간주

  const outputTokens = new Set(
    outputText
      .toLowerCase()
      .split(/[\s,./!?;:'"()[\]{}]+/)
      .filter((t) => t.length >= 2)
  )

  let overlap = 0
  for (const kw of coreKeywords) {
    if (outputTokens.has(kw.toLowerCase())) overlap++
  }

  // 최소 5개 키워드 기준, 그 이상은 포화 처리
  const normalizedSize = Math.min(coreKeywords.size, 5)
  return Math.min(1.0, overlap / normalizedSize)
}

/**
 * 금지 패턴 위반 체크.
 * forbidden pattern이 출력에 포함되면 즉시 drift += 0.2 패널티.
 */
export function checkForbiddenPatterns(outputText: string, forbiddenPatterns: string[]): number {
  let violations = 0
  const lower = outputText.toLowerCase()

  for (const pattern of forbiddenPatterns) {
    if (lower.includes(pattern.toLowerCase())) violations++
  }

  // 위반 1건 = +0.2, 최대 1.0
  return Math.min(1.0, violations * 0.2)
}

/**
 * 단일 출력에 대한 drift score 계산.
 *
 * driftScore = (1 - keywordOverlap) × 0.6 + forbiddenPenalty × 0.4
 */
export function computeOutputDrift(
  outputText: string,
  coreKeywords: Set<string>,
  forbiddenPatterns: string[]
): number {
  const overlap = computeKeywordOverlap(outputText, coreKeywords)
  const forbidden = checkForbiddenPatterns(outputText, forbiddenPatterns)

  return (1 - overlap) * 0.6 + forbidden * 0.4
}

// ── 메인 함수 ───────────────────────────────────────────────────

export interface DriftDetectionResult {
  personaId: string
  outputsSampled: number
  driftScore: number // 0.00~1.00
  previousConsistencyScore: number | null
  newConsistencyScore: number
  status: "ok" | "warning" | "critical"
  degradedTriggered: boolean
  skipped: boolean
  skipReason?: string
}

/**
 * 페르소나 1개의 정체성 드리프트 감지 + 대응.
 */
export async function detectIdentityDrift(
  provider: DriftDetectorProvider,
  personaId: string
): Promise<DriftDetectionResult> {
  const skippedBase: DriftDetectionResult = {
    personaId,
    outputsSampled: 0,
    driftScore: 0,
    previousConsistencyScore: null,
    newConsistencyScore: 1.0,
    status: "ok",
    degradedTriggered: false,
    skipped: true,
  }

  // 1. ImmutableCore 조회
  const core = await provider.getImmutableCore(personaId)
  if (!core) {
    return { ...skippedBase, skipReason: "no_immutable_core" }
  }

  // 2. 최근 24시간 출력 샘플링
  const outputs = await provider.getRecentOutputs(personaId, 24, MAX_SAMPLE_OUTPUTS)
  if (outputs.length === 0) {
    return { ...skippedBase, skipReason: "no_recent_outputs" }
  }

  // 3. 핵심 키워드 추출
  const coreKeywords = extractCoreKeywords(core.immutableFacts)
  // coreKeywords에 외부에서 전달된 키워드도 추가
  core.coreKeywords.forEach((kw) => coreKeywords.add(kw))

  // 4. 각 출력 drift 계산 → 평균
  const driftScores = outputs.map((output) =>
    computeOutputDrift(output.content, coreKeywords, core.forbiddenPatterns)
  )

  const avgDrift = driftScores.reduce((a, b) => a + b, 0) / driftScores.length

  // 5. consistencyScore 업데이트 (1.0 - driftScore)
  const newConsistencyScore = parseFloat((1.0 - avgDrift).toFixed(3))
  await provider.updateConsistencyScore(personaId, newConsistencyScore)

  // 6. 임계값 대응
  let status: "ok" | "warning" | "critical" = "ok"
  let degradedTriggered = false

  if (avgDrift >= DRIFT_CRITICAL_THRESHOLD) {
    status = "critical"
    degradedTriggered = true
    await provider.setDegradedState(
      personaId,
      `identity_drift_critical: driftScore=${avgDrift.toFixed(3)}`
    )
  } else if (avgDrift >= DRIFT_WARNING_THRESHOLD) {
    status = "warning"
  }

  return {
    personaId,
    outputsSampled: outputs.length,
    driftScore: parseFloat(avgDrift.toFixed(3)),
    previousConsistencyScore: null,
    newConsistencyScore,
    status,
    degradedTriggered,
    skipped: false,
  }
}
