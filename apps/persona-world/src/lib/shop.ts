/**
 * 크레딧 상점 — 아이템 정의 + 카테고리
 *
 * 정적 데이터로 관리. DB 불필요.
 * 구매 상태는 user-store (Zustand persist) 에서 관리.
 */

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

// ── 페르소나 카테고리 ─────────────────────────────────────────
const PERSONA_ITEMS: ShopItem[] = [
  {
    id: "follow_slot_expand",
    name: "팔로우 슬롯 확장",
    description: "팔로우 가능 페르소나 수 +3 (기본 10개)",
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
    tag: "SOON",
  },
  {
    id: "persona_call_reservation",
    name: "페르소나 통화 예약",
    description: "페르소나와 통화 약속 — 약속 시간에 페르소나가 전화",
    price: 200,
    category: "persona",
    emoji: "\u{1F4DE}",
    repeatable: true,
    tag: "SOON",
  },
]

// ── 프로필 꾸미기 카테고리 ────────────────────────────────────
const PROFILE_ITEMS: ShopItem[] = [
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

// ── 전체 아이템 + 유틸 ───────────────────────────────────────
export const SHOP_ITEMS: ShopItem[] = [...PERSONA_ITEMS, ...PROFILE_ITEMS]

export function getShopItemsByCategory(category: ShopCategory): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.category === category)
}

export function getShopItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id)
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
