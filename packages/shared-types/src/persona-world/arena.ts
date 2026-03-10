/**
 * PersonaWorld 아레나 타입 정의
 * PW 유저 토론 시스템 — 엔진 내부 심판 파이프라인 연동
 */

// ── 토론방 유형 ────────────────────────────────────────

/** 토론방 유형 */
export type ArenaRoomType = "ROOM_1V1" | "ROOM_PANEL" | "ROOM_LARGE"

/** 토론방 설정 */
export interface ArenaRoomConfig {
  type: ArenaRoomType
  /** 방 표시명 */
  label: string
  /** 최소/최대 참여 인원 */
  minParticipants: number
  maxParticipants: number
  /** 기본 라운드 수 */
  defaultRounds: number
  /** 방 임대 코인 */
  roomPrice: number
}

/** 방 유형별 설정 상수 */
export const ARENA_ROOM_CONFIGS: Record<ArenaRoomType, ArenaRoomConfig> = {
  ROOM_1V1: {
    type: "ROOM_1V1",
    label: "1:1 토론방",
    minParticipants: 2,
    maxParticipants: 2,
    defaultRounds: 5,
    roomPrice: 50,
  },
  ROOM_PANEL: {
    type: "ROOM_PANEL",
    label: "패널 토론방",
    minParticipants: 3,
    maxParticipants: 5,
    defaultRounds: 5,
    roomPrice: 120,
  },
  ROOM_LARGE: {
    type: "ROOM_LARGE",
    label: "대형 토론방",
    minParticipants: 6,
    maxParticipants: 8,
    defaultRounds: 5,
    roomPrice: 280,
  },
}

// ── 초대권 ──────────────────────────────────────────────

/** 초대권 유형 */
export type InviteTicketType = "NORMAL" | "PREMIUM"

/** 초대권 가격 */
export const INVITE_TICKET_PRICES: Record<InviteTicketType, number> = {
  NORMAL: 15,
  PREMIUM: 40,
}

// ── 라운드 추가 ─────────────────────────────────────────

/** 인원 비례 라운드 추가 가격 (+3 라운드) */
export const ROUND_ADDON_PRICES: Record<ArenaRoomType, number> = {
  ROOM_1V1: 25,
  ROOM_PANEL: 50,
  ROOM_LARGE: 80,
}

/** 라운드 추가 단위 */
export const ROUND_ADDON_AMOUNT = 3

/** 리플레이 저장 가격 */
export const REPLAY_SAVE_PRICE = 15

// ── 세션 상태 ───────────────────────────────────────────

/** PW 아레나 세션 상태 */
export type PWArenaSessionStatus =
  | "WAITING" // 생성됨, 토론 시작 대기
  | "IN_PROGRESS" // 토론 진행 중
  | "COMPLETED" // 토론 완료
  | "CANCELLED" // 취소됨

// ── 세션 ────────────────────────────────────────────────

/** PW 아레나 세션 */
export interface PWArenaSession {
  id: string
  /** 세션 소유자 (PW 유저) */
  userId: string
  /** 토론방 유형 */
  roomType: ArenaRoomType
  /** 토론 주제 */
  topic: string
  /** 참여 페르소나 ID 목록 */
  participantIds: string[]
  /** 현재 라운드 */
  currentRound: number
  /** 최대 라운드 */
  maxRounds: number
  /** 세션 상태 */
  status: PWArenaSessionStatus
  /** 리플레이 저장 여부 */
  replaySaved: boolean
  /** 소비된 총 코인 */
  totalCoinsSpent: number
  /** 턴 목록 */
  turns: PWArenaTurn[]
  /** 투표 목록 */
  votes: PWArenaVote[]
  createdAt: string
  completedAt: string | null
}

/** PW 아레나 세션 생성 요청 */
export interface PWArenaCreateRequest {
  roomType: ArenaRoomType
  topic: string
  /** 초대할 페르소나 ID 목록 */
  participantIds: string[]
  /** 초대권 유형별 사용 수 */
  inviteTickets: {
    normal: number
    premium: number
  }
  /** 추가 라운드 (+3 단위, 0이면 기본) */
  extraRoundSets: number
  /** 리플레이 저장 여부 */
  saveReplay: boolean
}

/** PW 아레나 세션 생성 응답 — 비용 내역 포함 */
export interface PWArenaCostBreakdown {
  roomPrice: number
  inviteNormalPrice: number
  invitePremiumPrice: number
  roundAddonPrice: number
  replayPrice: number
  totalPrice: number
}

// ── 턴 ──────────────────────────────────────────────────

/** PW 아레나 토론 턴 */
export interface PWArenaTurn {
  id: string
  sessionId: string
  /** 라운드 번호 (1-based) */
  roundNumber: number
  /** 발언 페르소나 ID */
  speakerId: string
  /** 발언 내용 */
  content: string
  /** 사용 토큰 */
  tokensUsed: number
  createdAt: string
}

// ── 투표 ────────────────────────────────────────────────

/** PW 아레나 유저 투표 */
export interface PWArenaVote {
  id: string
  sessionId: string
  /** 투표한 유저 ID */
  userId: string
  /** 투표 대상 페르소나 ID */
  personaId: string
  /** 투표 라운드 (전체 투표면 null) */
  roundNumber: number | null
  createdAt: string
}

// ── 비용 계산 유틸 ──────────────────────────────────────

/**
 * PW 아레나 세션 생성 비용 계산
 */
export function calculateArenaCost(request: PWArenaCreateRequest): PWArenaCostBreakdown {
  const roomConfig = ARENA_ROOM_CONFIGS[request.roomType]
  const roomPrice = roomConfig.roomPrice
  const inviteNormalPrice = request.inviteTickets.normal * INVITE_TICKET_PRICES.NORMAL
  const invitePremiumPrice = request.inviteTickets.premium * INVITE_TICKET_PRICES.PREMIUM
  const roundAddonPrice = request.extraRoundSets * ROUND_ADDON_PRICES[request.roomType]
  const replayPrice = request.saveReplay ? REPLAY_SAVE_PRICE : 0

  return {
    roomPrice,
    inviteNormalPrice,
    invitePremiumPrice,
    roundAddonPrice,
    replayPrice,
    totalPrice: roomPrice + inviteNormalPrice + invitePremiumPrice + roundAddonPrice + replayPrice,
  }
}
