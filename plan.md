# 크레딧 상점 구현 계획

## 개요

PersonaWorld에 크레딧 상점(`/shop`) 페이지를 추가하여 온보딩/데일리 질문으로 획득한 코인을 사용할 수 있게 함.

## 상점 아이템

### 페르소나 카테고리

| 아이템                 | 가격       | 설명                                              | ID                         | 반복구매 |
| ---------------------- | ---------- | ------------------------------------------------- | -------------------------- | -------- |
| 팔로우 슬롯 확장 (+3)  | 150 코인   | 팔로우 가능 페르소나 수 증가 (기본 10 → +3씩)     | `follow_slot_expand`       | O        |
| 프리미엄 페르소나 해금 | 200 코인   | 특별 페르소나 1명 해금                            | `premium_persona_unlock`   | O        |
| 페르소나 1:1 대화      | 10 코인/턴 | AI 페르소나와 1:1 채팅 (턴마다 코인 차감)         | `persona_chat`             | O        |
| 페르소나 통화 예약     | 200 코인   | 페르소나와 통화 약속, 약속 시간에 페르소나가 전화 | `persona_call_reservation` | O        |

### 프로필 꾸미기 카테고리

| 아이템                  | 가격     | 설명                             | ID                    | 반복구매 |
| ----------------------- | -------- | -------------------------------- | --------------------- | -------- |
| 성향 초기화             | 100 코인 | 온보딩 벡터 리셋 → 처음부터 다시 | `profile_reset`       | O        |
| 배지: 취향 전문가       | 80 코인  | 프로필 배지                      | `badge_taste_expert`  | X        |
| 배지: 얼리어답터        | 50 코인  | 프로필 배지                      | `badge_early_adopter` | X        |
| 배지: 트렌드세터        | 80 코인  | 프로필 배지                      | `badge_trendsetter`   | X        |
| 닉네임 그라데이션       | 120 코인 | 닉네임에 PW 그라데이션 적용      | `nickname_gradient`   | X        |
| 프로필 프레임: 골드     | 100 코인 | 프로필 이미지 골드 프레임        | `frame_gold`          | X        |
| 프로필 프레임: 홀로그램 | 150 코인 | 프로필 이미지 홀로그램 프레임    | `frame_hologram`      | X        |

## 구현 단계

### Step 1: 상점 데이터 정의 + 스토어 확장

**파일:**

- `apps/persona-world/src/lib/shop.ts` (신규)
  - `ShopItem` 타입 (id, name, description, price, category, icon, repeatable)
  - `SHOP_ITEMS` 정적 배열
  - `ShopCategory` = "persona" | "profile"

- `apps/persona-world/src/lib/user-store.ts` (수정)
  - 상태 추가: `purchasedItems: string[]` (구매한 아이템 ID 목록)
  - 액션 추가: `purchaseItem(itemId: string, price: number)` — 크레딧 차감 + 아이템 추가
  - 헬퍼: `hasPurchased(itemId: string)` — 구매 여부 확인

### Step 2: 상점 페이지 UI

**파일:** `apps/persona-world/src/app/shop/page.tsx` (신규)

- 상단: 현재 코인 잔액 (큰 표시)
- 카테고리 탭 2개: 페르소나 / 프로필
- 아이템 그리드: PWCard 기반, 각 카드에 이름/설명/가격/구매버튼
- 구매 확인: 인라인 다이얼로그 ("정말 구매하시겠습니까?")
- 잔액 부족 시 버튼 disabled + "코인 부족" 표시
- 이미 구매한 아이템: "보유 중" 배지 표시 (repeatable이 아닌 경우)
- 하단 네비 포함 (기존 4탭 그대로)

### Step 3: 네비게이션 연동

- `apps/persona-world/src/app/profile/page.tsx` — 코인 잔액 옆에 "상점" 링크 추가
- `apps/persona-world/middleware.ts` — matcher에 `/shop/:path*` 추가

### Step 4: 구매 아이템 프로필 적용

- `apps/persona-world/src/app/profile/page.tsx` — 구매한 배지/프레임/그라데이션 닉네임 렌더링

## 기술 결정

- **아이템 데이터**: 정적 config (DB 불필요)
- **구매 상태**: Zustand persist (localStorage)
- **UI**: PWCard + PWButton, PW 그라데이션 디자인 시스템
