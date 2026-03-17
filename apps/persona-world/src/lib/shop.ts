/**
 * 크레딧 상점 — 아이템 정의 + 카테고리
 *
 * DB(pw_shop_items)에서 관리. Engine Studio PW Admin에서 가격/태그/활성화 설정.
 * API 실패 시 정적 폴백 데이터 사용.
 * 구매 상태는 user-store (Zustand persist) 에서 관리.
 */

import type { ShopItemFromAPI } from "./api"

export type ShopCategory = "persona" | "profile" | "arena"

export interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  /** "10 코인/턴" 같은 커스텀 가격 라벨. 없으면 `${price} 코인` 사용 */
  priceLabel?: string
  category: ShopCategory
  emoji: string
  /** true면 여러 번 구매 가능 (슬롯 확장 등) */
  repeatable: boolean
  /** 아이템 태그 (UI 뱃지) */
  tag?: "NEW" | "HOT" | "SOON"
  /** "purchase"(기본): 코인 차감 구매, "navigate": 기능 페이지로 이동 */
  actionType?: "purchase" | "navigate"
  /** navigate 타입일 때 이동 경로 */
  navigateTo?: string
}

// ── 정적 폴백 데이터 (API 실패 시) ──────────────────────────────

const FALLBACK_ITEMS: ShopItem[] = [
  {
    id: "follow_slot_expand",
    name: "팔로우 슬롯 확장",
    description: "팔로우 가능 페르소나 수 +3 (기본 30개)",
    price: 150,
    category: "persona",
    emoji: "\u{1F465}",
    repeatable: true,
    tag: "SOON",
  },
  {
    id: "premium_persona_unlock",
    name: "프리미엄 페르소나 해금",
    description: "특별 페르소나 1명을 해금합니다",
    price: 200,
    category: "persona",
    emoji: "\u{1F31F}",
    repeatable: true,
    tag: "SOON",
  },
  {
    id: "persona_chat",
    name: "페르소나 1:1 대화",
    description: "AI 페르소나와 1:1 채팅 (턴마다 코인 차감)",
    price: 10,
    priceLabel: "10 코인/턴",
    category: "persona",
    emoji: "\u{1F4AC}",
    repeatable: true,
    tag: "NEW",
    actionType: "navigate",
    navigateTo: "/chat",
  },
  {
    id: "persona_call_reservation",
    name: "페르소나 통화 예약",
    description: "페르소나와 통화 약속 — 약속 시간에 페르소나가 전화",
    price: 200,
    category: "persona",
    emoji: "\u{1F4DE}",
    repeatable: true,
    tag: "NEW",
    actionType: "navigate",
    navigateTo: "/calls",
  },
  {
    id: "profile_reset",
    name: "성향 초기화",
    description: "취향 분석 초기화 — 처음부터 다시 시작",
    price: 100,
    category: "profile",
    emoji: "\u{1F504}",
    repeatable: true,
    tag: "SOON",
  },
  {
    id: "badge_taste_expert",
    name: "배지: 취향 전문가",
    description: "프로필에 '취향 전문가' 배지가 표시됩니다",
    price: 80,
    category: "profile",
    emoji: "\u{1F3AF}",
    repeatable: false,
  },
  {
    id: "badge_early_adopter",
    name: "배지: 얼리어답터",
    description: "프로필에 '얼리어답터' 배지가 표시됩니다",
    price: 50,
    category: "profile",
    emoji: "\u{1F680}",
    repeatable: false,
    tag: "NEW",
  },
  {
    id: "badge_trendsetter",
    name: "배지: 트렌드세터",
    description: "프로필에 '트렌드세터' 배지가 표시됩니다",
    price: 80,
    category: "profile",
    emoji: "\u{1F525}",
    repeatable: false,
  },
  {
    id: "nickname_gradient",
    name: "닉네임 그라데이션",
    description: "닉네임에 PW 시그니처 그라데이션을 적용합니다",
    price: 120,
    category: "profile",
    emoji: "\u{1F308}",
    repeatable: false,
    tag: "HOT",
  },
  {
    id: "frame_gold",
    name: "프로필 프레임: 골드",
    description: "프로필 이미지에 골드 프레임을 적용합니다",
    price: 100,
    category: "profile",
    emoji: "\u{1F451}",
    repeatable: false,
  },
  {
    id: "frame_hologram",
    name: "프로필 프레임: 홀로그램",
    description: "프로필 이미지에 홀로그램 프레임을 적용합니다",
    price: 150,
    category: "profile",
    emoji: "\u{1F48E}",
    repeatable: false,
  },
  // ── 아레나 ─────────────────────────────────────
  {
    id: "arena_room_1v1",
    name: "1:1 토론방",
    description: "페르소나 2명이 토론하는 방 (기본 5라운드)",
    price: 50,
    category: "arena",
    emoji: "\u{1F3DF}\uFE0F",
    repeatable: true,
    tag: "NEW",
  },
  {
    id: "arena_room_panel",
    name: "패널 토론방",
    description: "페르소나 3~5명이 토론하는 방 (기본 5라운드)",
    price: 120,
    category: "arena",
    emoji: "\u{1F3DF}\uFE0F",
    repeatable: true,
    tag: "NEW",
  },
  {
    id: "arena_room_large",
    name: "대형 토론방",
    description: "페르소나 6~8명이 토론하는 방 (기본 5라운드)",
    price: 280,
    category: "arena",
    emoji: "\u{1F3DF}\uFE0F",
    repeatable: true,
  },
  {
    id: "arena_invite_normal",
    name: "일반 초대권",
    description: "페르소나 1명을 토론방에 초대합니다",
    price: 15,
    category: "arena",
    emoji: "\u{1F3AB}",
    repeatable: true,
  },
  {
    id: "arena_invite_premium",
    name: "프리미엄 초대권",
    description: "인기 페르소나를 토론방에 초대합니다",
    price: 40,
    category: "arena",
    emoji: "\u{1F3AB}",
    repeatable: true,
    tag: "HOT",
  },
  {
    id: "arena_round_addon",
    name: "라운드 추가 +3",
    description: "토론 라운드를 3회 추가합니다 (인원 비례 과금)",
    price: 25,
    priceLabel: "25~80 코인",
    category: "arena",
    emoji: "\u{2699}\uFE0F",
    repeatable: true,
  },
  {
    id: "arena_replay_save",
    name: "토론 리플레이 저장",
    description: "토론 내용을 저장하여 나중에 다시 볼 수 있습니다",
    price: 15,
    category: "arena",
    emoji: "\u{1F4BE}",
    repeatable: true,
  },
]

// ── API 데이터 → ShopItem 변환 ──────────────────────────────────

/** 기능 페이지로 이동하는 아이템 매핑 (서버에서 관리하지 않는 클라이언트 라우팅) */
const NAVIGATE_ITEMS: Record<string, string> = {
  persona_chat: "/chat",
  persona_call_reservation: "/calls",
}

function apiItemToShopItem(item: ShopItemFromAPI): ShopItem {
  const navigateTo = NAVIGATE_ITEMS[item.itemKey]
  return {
    id: item.itemKey,
    name: item.name,
    description: item.description,
    price: item.price,
    priceLabel: item.priceLabel ?? undefined,
    category: item.category as ShopCategory,
    emoji: item.emoji,
    repeatable: item.repeatable,
    tag: (item.tag as ShopItem["tag"]) ?? undefined,
    ...(navigateTo ? { actionType: "navigate" as const, navigateTo } : {}),
  }
}

// ── 캐싱된 아이템 (API에서 불러온 데이터) ────────────────────────

let cachedItems: ShopItem[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

/**
 * 상점 아이템 목록을 API에서 가져오기.
 * API 실패 시 정적 폴백 데이터 반환.
 */
export async function fetchShopItems(): Promise<ShopItem[]> {
  const now = Date.now()
  if (cachedItems && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedItems
  }

  try {
    const { clientApi } = await import("./api")
    const apiItems = await clientApi.getShopItems()
    if (apiItems && apiItems.length > 0) {
      cachedItems = apiItems.map(apiItemToShopItem)
      cacheTimestamp = now
      return cachedItems
    }
  } catch {
    // API 실패 → 폴백
  }

  return FALLBACK_ITEMS
}

// ── 정적 유틸 (동기적 접근용) ───────────────────────────────────
// 기존 코드와의 호환성 유지

export const SHOP_ITEMS: ShopItem[] = FALLBACK_ITEMS

export function getShopItemsByCategory(category: ShopCategory): ShopItem[] {
  const items = cachedItems ?? FALLBACK_ITEMS
  return items.filter((item) => item.category === category)
}

export function getShopItemById(id: string): ShopItem | undefined {
  const items = cachedItems ?? FALLBACK_ITEMS
  return items.find((item) => item.id === id)
}

/** 뱃지 아이템 ID인지 확인 */
export function isBadgeItem(itemId: string): boolean {
  return itemId.startsWith("badge_")
}

/** 프레임 아이템 ID인지 확인 */
export function isFrameItem(itemId: string): boolean {
  return itemId.startsWith("frame_")
}

/** 카테고리 라벨 */
/** 아레나 아이템 ID인지 확인 */
export function isArenaItem(itemId: string): boolean {
  return itemId.startsWith("arena_")
}

/** 카테고리 라벨 */
export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  persona: "페르소나",
  profile: "프로필 꾸미기",
  arena: "아레나",
}
