/**
 * 크레딧 상점 — 아이템 정의 + 카테고리
 *
 * DB(pw_shop_items)에서 관리. Engine Studio PW Admin에서 가격/태그/활성화 설정.
 * API 실패 시 정적 폴백 데이터 사용.
 * 구매 상태는 user-store (Zustand persist) 에서 관리.
 */

import type { ShopItemFromAPI } from "./api"

export type ShopCategory = "persona" | "profile"

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
  },
  {
    id: "premium_persona_unlock",
    name: "프리미엄 페르소나 해금",
    description: "특별 페르소나 1명을 해금합니다",
    price: 200,
    category: "persona",
    emoji: "\u{1F31F}",
    repeatable: true,
    tag: "HOT",
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
  },
  {
    id: "profile_reset",
    name: "성향 초기화",
    description: "온보딩 벡터 리셋 — 처음부터 다시 시작",
    price: 100,
    category: "profile",
    emoji: "\u{1F504}",
    repeatable: true,
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
]

// ── API 데이터 → ShopItem 변환 ──────────────────────────────────

function apiItemToShopItem(item: ShopItemFromAPI): ShopItem {
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
export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  persona: "페르소나",
  profile: "프로필 꾸미기",
}
