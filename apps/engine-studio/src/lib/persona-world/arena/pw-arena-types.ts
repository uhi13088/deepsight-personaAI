// ═══════════════════════════════════════════════════════════════
// PW Arena — 타입 + 설정 상수 (T428)
// 유저 토론 시스템 엔진 서비스 전용 타입
// ═══════════════════════════════════════════════════════════════

import type {
  ArenaRoomType,
  PWArenaSessionStatus,
  PWArenaCostBreakdown,
} from "@deepsight/shared-types"

// ── 세션 생성 내부 타입 ─────────────────────────────────────

/** PW 아레나 세션 생성 파라미터 (서비스 내부용) */
export interface PWArenaCreateParams {
  userId: string
  roomType: ArenaRoomType
  topic: string
  participantIds: string[]
  maxRounds: number
  saveReplay: boolean
  costBreakdown: PWArenaCostBreakdown
}

/** PW 아레나 세션 DB 레코드 (Prisma 쿼리 결과 매핑용) */
export interface PWArenaSessionRecord {
  id: string
  userId: string
  roomType: string
  topic: string
  participantIds: string[]
  currentRound: number
  maxRounds: number
  status: PWArenaSessionStatus
  replaySaved: boolean
  totalCoinsSpent: number
  qualitySynced: boolean
  createdAt: Date
  completedAt: Date | null
  turns: PWArenaTurnRecord[]
  votes: PWArenaVoteRecord[]
}

export interface PWArenaTurnRecord {
  id: string
  sessionId: string
  roundNumber: number
  speakerId: string
  content: string
  tokensUsed: number
  createdAt: Date
}

export interface PWArenaVoteRecord {
  id: string
  sessionId: string
  userId: string
  personaId: string
  roundNumber: number | null
  createdAt: Date
}

// ── LLM 턴 생성 ────────────────────────────────────────────

/** LLM 턴 생성 요청 */
export interface PWArenaTurnRequest {
  sessionId: string
  roundNumber: number
  speakerId: string
  topic: string
  /** 이전 턴들 (컨텍스트) */
  previousTurns: Array<{
    speakerId: string
    content: string
    roundNumber: number
  }>
  /** 페르소나 프로필 정보 */
  personaProfile: {
    name: string
    role: string
    description: string
    speechStyle: string
    habitualExpressions: string[]
  }
}

/** LLM 턴 생성 결과 */
export interface PWArenaTurnResult {
  content: string
  tokensUsed: number
}

// ── 품질 평가 연동 ──────────────────────────────────────────

/** 품질 평가 적합성 등급 */
export type QualityEvalScope = "FULL" | "VOICE_ONLY" | "SKIP"

/** 품질 평가 필터 결과 */
export interface QualityFilterResult {
  scope: QualityEvalScope
  reason: string
}

// ── 설정 상수 ───────────────────────────────────────────────

/** 턴당 최대 출력 토큰 */
export const PW_ARENA_MAX_OUTPUT_TOKENS = 600

/** 최소 라운드 수 (필터 통과 기준) */
export const PW_ARENA_MIN_ROUNDS_FOR_EVAL = 3

/** 품질 평가 최소 평균 토큰 */
export const PW_ARENA_MIN_AVG_TOKENS_FOR_FULL_EVAL = 100

/** 세션당 최대 라운드 제한 */
export const PW_ARENA_MAX_ROUNDS = 20

/** 유저당 일일 최대 세션 수 */
export const PW_ARENA_DAILY_SESSION_LIMIT = 10

/** 품질 동기화 대기 시간 (ms) — 토론 완료 후 비동기 전송 딜레이 */
export const PW_ARENA_QUALITY_SYNC_DELAY_MS = 5_000
