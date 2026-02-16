// ═══════════════════════════════════════════════════════════════
// Arena Engine v4.0
// T145: 1:1 스파링 + AI 심판관
// 아레나 세션 관리, 턴 실행, 판정
// ═══════════════════════════════════════════════════════════════

// ── 타입 ────────────────────────────────────────────────────

/** 아레나 세션 모드 */
export type ArenaMode = "SPARRING_1V1"

/** 프로필 로드 수준 */
export type ProfileLoadLevel = "FULL" | "STANDARD" | "LITE"

/** 세션 상태 */
export type ArenaSessionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "CANCELLED"

/** 아레나 세션 */
export interface ArenaSession {
  id: string
  mode: ArenaMode
  participants: [string, string] // [personaA, personaB]
  profileLoadLevel: ProfileLoadLevel
  topic: string
  maxTurns: number
  budgetTokens: number
  usedTokens: number
  status: ArenaSessionStatus
  turns: ArenaTurn[]
  createdAt: number
  completedAt: number | null
}

/** 턴 데이터 */
export interface ArenaTurn {
  turnNumber: number
  speakerId: string
  content: string
  tokensUsed: number
  timestamp: number
}

/** 심판 평가 차원 */
export interface JudgmentScores {
  /** 캐릭터 일관성 (0~1) */
  characterConsistency: number
  /** L2 기질 발현 (0~1) */
  l2Emergence: number
  /** 역설 발현 (0~1) */
  paradoxEmergence: number
  /** 트리거 반응 적절성 (0~1) */
  triggerResponse: number
}

/** 턴별 이슈 */
export interface TurnIssue {
  turnNumber: number
  personaId: string
  category: "consistency" | "l2" | "paradox" | "trigger" | "voice"
  severity: "minor" | "major" | "critical"
  description: string
  suggestion: string
}

/** 심판 판정 */
export interface ArenaJudgment {
  sessionId: string
  scores: JudgmentScores
  overallScore: number // 가중 평균
  issues: TurnIssue[]
  summary: string
  judgedAt: number
}

/** 세션 생성 파라미터 */
export interface CreateSessionParams {
  id: string
  participants: [string, string]
  topic: string
  maxTurns?: number
  budgetTokens?: number
  profileLoadLevel?: ProfileLoadLevel
}

/** 턴 생성 요청 */
export interface GenerateTurnParams {
  speakerId: string
  context: string // 프롬프트용 컨텍스트
}

/** 턴 생성 결과 */
export interface GenerateTurnResult {
  content: string
  tokensUsed: number
}

/** LLM 프로바이더 (DI) */
export interface ArenaLLMProvider {
  generateTurn(prompt: string, maxTokens: number): Promise<GenerateTurnResult>
  generateJudgment(prompt: string): Promise<{ content: string; tokensUsed: number }>
}

// ── 상수 ────────────────────────────────────────────────────

export const DEFAULT_MAX_TURNS = 6
export const DEFAULT_BUDGET_TOKENS = 10000
export const MIN_TURNS = 2
export const MAX_TURNS_LIMIT = 20

/** 프로필 수준별 예상 토큰 */
export const PROFILE_TOKEN_ESTIMATES: Record<ProfileLoadLevel, number> = {
  FULL: 3200,
  STANDARD: 1800,
  LITE: 600,
}

/** 판정 가중치 */
export const JUDGMENT_WEIGHTS: Record<keyof JudgmentScores, number> = {
  characterConsistency: 0.35,
  l2Emergence: 0.25,
  paradoxEmergence: 0.2,
  triggerResponse: 0.2,
}

// ══════════════════════════════════════════════════════════════
// 세션 관리
// ══════════════════════════════════════════════════════════════

/** 아레나 세션 생성 */
export function createArenaSession(params: CreateSessionParams): ArenaSession {
  const maxTurns = Math.min(
    Math.max(params.maxTurns ?? DEFAULT_MAX_TURNS, MIN_TURNS),
    MAX_TURNS_LIMIT
  )

  return {
    id: params.id,
    mode: "SPARRING_1V1",
    participants: params.participants,
    profileLoadLevel: params.profileLoadLevel ?? "STANDARD",
    topic: params.topic,
    maxTurns,
    budgetTokens: params.budgetTokens ?? DEFAULT_BUDGET_TOKENS,
    usedTokens: 0,
    status: "PENDING",
    turns: [],
    createdAt: Date.now(),
    completedAt: null,
  }
}

/** 세션 시작 */
export function startSession(session: ArenaSession): ArenaSession {
  if (session.status !== "PENDING") {
    return session
  }
  return { ...session, status: "RUNNING" }
}

/** 턴 추가 */
export function addTurn(
  session: ArenaSession,
  speakerId: string,
  content: string,
  tokensUsed: number
): ArenaSession {
  if (session.status !== "RUNNING") return session
  if (!session.participants.includes(speakerId)) return session

  const turn: ArenaTurn = {
    turnNumber: session.turns.length + 1,
    speakerId,
    content,
    tokensUsed,
    timestamp: Date.now(),
  }

  const updatedTokens = session.usedTokens + tokensUsed
  const turns = [...session.turns, turn]

  // 자동 종료 조건 체크
  const shouldEnd = turns.length >= session.maxTurns || updatedTokens >= session.budgetTokens

  return {
    ...session,
    turns,
    usedTokens: updatedTokens,
    status: shouldEnd ? "COMPLETED" : "RUNNING",
    completedAt: shouldEnd ? Date.now() : null,
  }
}

/** 세션 취소 */
export function cancelSession(session: ArenaSession): ArenaSession {
  if (session.status === "COMPLETED") return session
  return { ...session, status: "CANCELLED", completedAt: Date.now() }
}

/** 다음 발화자 결정 */
export function getNextSpeaker(session: ArenaSession): string | null {
  if (session.status !== "RUNNING") return null
  if (session.turns.length >= session.maxTurns) return null
  if (session.usedTokens >= session.budgetTokens) return null

  // 교대로 발화 (첫 번째 참가자 먼저)
  const idx = session.turns.length % 2
  return session.participants[idx]
}

/** 남은 예산 확인 */
export function getRemainingBudget(session: ArenaSession): {
  remainingTokens: number
  remainingTurns: number
  usagePercent: number
} {
  return {
    remainingTokens: Math.max(0, session.budgetTokens - session.usedTokens),
    remainingTurns: Math.max(0, session.maxTurns - session.turns.length),
    usagePercent:
      session.budgetTokens > 0
        ? Math.round((session.usedTokens / session.budgetTokens) * 100)
        : 100,
  }
}

// ══════════════════════════════════════════════════════════════
// 세션 실행기
// ══════════════════════════════════════════════════════════════

/** 세션 실행 결과 */
export interface SessionRunResult {
  session: ArenaSession
  totalTurns: number
  totalTokens: number
  stoppedReason: "max_turns" | "budget_exhausted" | "cancelled" | "error"
}

/** 세션 전체 실행 (턴 자동 반복) */
export async function runSession(
  session: ArenaSession,
  llm: ArenaLLMProvider,
  buildPrompt: (session: ArenaSession, speakerId: string) => string,
  maxTokensPerTurn: number = 500
): Promise<SessionRunResult> {
  let current = startSession(session)

  while (current.status === "RUNNING") {
    const speaker = getNextSpeaker(current)
    if (!speaker) break

    const prompt = buildPrompt(current, speaker)

    try {
      const result = await llm.generateTurn(prompt, maxTokensPerTurn)
      current = addTurn(current, speaker, result.content, result.tokensUsed)
    } catch {
      current = { ...current, status: "COMPLETED", completedAt: Date.now() }
      return {
        session: current,
        totalTurns: current.turns.length,
        totalTokens: current.usedTokens,
        stoppedReason: "error",
      }
    }
  }

  const stoppedReason =
    current.turns.length >= current.maxTurns
      ? "max_turns"
      : current.usedTokens >= current.budgetTokens
        ? "budget_exhausted"
        : "cancelled"

  return {
    session: current,
    totalTurns: current.turns.length,
    totalTokens: current.usedTokens,
    stoppedReason,
  }
}

// ══════════════════════════════════════════════════════════════
// AI 심판
// ══════════════════════════════════════════════════════════════

/** 룰 기반 판정 (LLM 없이 기본 평가) */
export function judgeSessionRuleBased(session: ArenaSession): ArenaJudgment {
  const issues: TurnIssue[] = []

  // 턴 수 기반 기본 점수
  const turnRatio = session.turns.length / session.maxTurns
  const baseConsistency = turnRatio >= 0.5 ? 0.7 : 0.5

  // 턴별 길이 분석
  const turnLengths = session.turns.map((t) => t.content.length)
  const avgLength =
    turnLengths.length > 0 ? turnLengths.reduce((a, b) => a + b, 0) / turnLengths.length : 0

  // 극단적으로 짧은 턴 → consistency 이슈
  for (const turn of session.turns) {
    if (turn.content.length < 20) {
      issues.push({
        turnNumber: turn.turnNumber,
        personaId: turn.speakerId,
        category: "consistency",
        severity: "minor",
        description: `턴 ${turn.turnNumber}: 지나치게 짧은 응답 (${turn.content.length}자)`,
        suggestion: "페르소나의 표현 성향에 맞는 적절한 길이의 응답 생성",
      })
    }

    // 동일 발화자가 연속으로 같은 내용 → repetition 이슈
    if (turn.turnNumber > 1) {
      const prevTurn = session.turns[turn.turnNumber - 2]
      if (prevTurn && prevTurn.speakerId === turn.speakerId) {
        if (turn.content === prevTurn.content) {
          issues.push({
            turnNumber: turn.turnNumber,
            personaId: turn.speakerId,
            category: "consistency",
            severity: "critical",
            description: `턴 ${turn.turnNumber}: 이전 턴과 완전히 동일한 응답`,
            suggestion: "대화 컨텍스트에 기반한 새로운 응답 생성",
          })
        }
      }
    }
  }

  // 길이 변동성으로 voice 일관성 추정
  const lengthStdDev = computeStdDev(turnLengths)
  const lengthVariation = avgLength > 0 ? lengthStdDev / avgLength : 0
  const voiceConsistency = lengthVariation < 0.5 ? 0.8 : lengthVariation < 1.0 ? 0.6 : 0.4

  const scores: JudgmentScores = {
    characterConsistency: Math.min(1, baseConsistency + (issues.length === 0 ? 0.2 : 0)),
    l2Emergence: 0.5, // 룰 기반으로는 평가 어려움 → 기본값
    paradoxEmergence: 0.5, // 룰 기반으로는 평가 어려움 → 기본값
    triggerResponse: voiceConsistency,
  }

  const overallScore = computeOverallScore(scores)

  return {
    sessionId: session.id,
    scores,
    overallScore,
    issues,
    summary: generateJudgmentSummary(scores, issues, session),
    judgedAt: Date.now(),
  }
}

/** LLM 판정 프롬프트 생성 */
export function buildJudgmentPrompt(session: ArenaSession): string {
  const turnLog = session.turns
    .map((t) => `[턴 ${t.turnNumber}] ${t.speakerId}:\n${t.content}`)
    .join("\n\n")

  return [
    "당신은 AI 페르소나 품질 심판관입니다.",
    `주제: ${session.topic}`,
    `참가자: ${session.participants.join(", ")}`,
    "",
    "대화 기록:",
    turnLog,
    "",
    "다음 4가지 차원을 0.0~1.0으로 평가하세요:",
    "1. characterConsistency: 캐릭터 일관성",
    "2. l2Emergence: L2 기질 발현도",
    "3. paradoxEmergence: 역설/모순 발현도",
    "4. triggerResponse: 트리거 반응 적절성",
    "",
    "각 턴별 이슈가 있다면 지적하고 개선 제안을 포함하세요.",
    "JSON 형식으로 응답: { scores: {...}, issues: [...] }",
  ].join("\n")
}

/** 가중 평균 계산 */
export function computeOverallScore(scores: JudgmentScores): number {
  let total = 0
  let weightSum = 0

  for (const [key, weight] of Object.entries(JUDGMENT_WEIGHTS)) {
    const k = key as keyof JudgmentScores
    total += scores[k] * weight
    weightSum += weight
  }

  return weightSum > 0 ? Math.round((total / weightSum) * 100) / 100 : 0
}

/** 판정 요약 생성 */
function generateJudgmentSummary(
  scores: JudgmentScores,
  issues: TurnIssue[],
  session: ArenaSession
): string {
  const parts: string[] = []

  parts.push(`세션 ${session.id}: ${session.turns.length}턴 완료`)

  const overall = computeOverallScore(scores)
  if (overall >= 0.8) {
    parts.push("전반적으로 우수한 캐릭터 표현")
  } else if (overall >= 0.6) {
    parts.push("적정 수준의 캐릭터 표현, 일부 개선 필요")
  } else {
    parts.push("캐릭터 표현에 상당한 개선 필요")
  }

  const criticalIssues = issues.filter((i) => i.severity === "critical")
  if (criticalIssues.length > 0) {
    parts.push(`심각한 이슈 ${criticalIssues.length}건 발견`)
  }

  return parts.join(". ")
}

// ── 유틸 ────────────────────────────────────────────────────

function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}
