# 쿠폰/프로모션 코드 시스템 구현 계획

날짜: 2026-03-10
관련 티켓: T410~T414
예상 소요: 5개 태스크

## 목표

관리자가 Engine Studio에서 프로모션 쿠폰(무료 코인 지급)을 생성·관리하고, 사용자가 Persona World 샵 페이지에서 쿠폰 코드를 입력하여 코인을 받는 시스템을 구축한다.

## 아키텍처 결정

- **방식 A (Coupon 단일 모델)** 채택 — Simplicity First
- `Coupon` + `CouponRedemption` 2개 모델로 전체 시나리오 커버
- 기존 `credit-service.ts`의 `addCredits()` 재활용
- 확장성: `type` 필드(MANUAL/WELCOME/REFERRAL)로 마케팅 시나리오 분기

## 영향 범위

### 변경/생성 파일

**DB Layer (Engine Studio)**

- `apps/engine-studio/prisma/schema.prisma` — Coupon, CouponRedemption 모델 추가
- `apps/engine-studio/prisma/migrations/058_coupon_system.sql` — 마이그레이션

**Service Layer (Engine Studio)**

- `apps/engine-studio/src/lib/persona-world/coupon-service.ts` — 쿠폰 비즈니스 로직 (NEW)

**API Layer (Engine Studio)**

- `apps/engine-studio/src/app/api/internal/persona-world-admin/coupons/route.ts` — 관리자 CRUD (NEW)
- `apps/engine-studio/src/app/api/persona-world/coupons/redeem/route.ts` — 사용자 쿠폰 적용 (NEW)

**Admin UI (Engine Studio)**

- `apps/engine-studio/src/app/(dashboard)/persona-world-admin/coupons/page.tsx` — 관리 페이지 (NEW)
- `apps/engine-studio/src/components/layout/lnb.tsx` — 사이드바에 "쿠폰 관리" 메뉴 추가

**User UI (Persona World)**

- `apps/persona-world/src/app/shop/page.tsx` — 쿠폰 코드 입력 섹션 추가
- `apps/persona-world/src/lib/api.ts` — redeemCoupon API 함수 추가

**API 문서**

- `docs/api/internal.md` — 관리자 쿠폰 API 문서 추가
- `docs/api/internal.openapi.yaml` — OpenAPI 스펙 추가
- `docs/api/public.md` — 사용자 쿠폰 적용 API 문서 추가
- `docs/api/public.openapi.yaml` — OpenAPI 스펙 추가

**테스트**

- `apps/engine-studio/src/lib/persona-world/__tests__/coupon-service.test.ts` — 서비스 단위 테스트 (NEW)

### 공유 패키지 활용

- `@deepsight/shared-types` — CouponType enum을 추가할지 검토 (현 단계에서는 Engine Studio 로컬 타입으로 충분)
- `@deepsight/ui` — Engine Studio 관리 UI에서 기존 shadcn 컴포넌트 재활용
- `@deepsight/auth` — requireAuth() 가드 재활용

### 사이드이펙트 위험

- `CoinTransaction`에 `couponId` 필드 추가 시 기존 findMany() 영향 없음 (nullable 추가라 안전)
- 마이그레이션 SQL 반드시 동시 작성 (lessons.md ⭐ 교훈)

## DB 모델 설계

### Coupon

```prisma
model Coupon {
  id              String           @id @default(cuid())
  code            String           @unique           // 대소문자 무관, 유니크
  type            CouponType       @default(MANUAL)  // MANUAL | WELCOME | REFERRAL
  coinAmount      Int                                // 지급 코인 수
  description     String?                            // 관리자 메모
  maxRedemptions  Int              @default(1)       // 총 사용 가능 횟수
  usedCount       Int              @default(0)       // 현재 사용 횟수
  isActive        Boolean          @default(true)    // 활성/비활성
  expiresAt       DateTime?                          // 만료일 (null = 무기한)
  createdBy       String?                            // 생성 관리자 ID
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  redemptions     CouponRedemption[]

  @@index([code])
  @@index([type])
  @@map("coupons")
}

enum CouponType {
  MANUAL    // 관리자가 수동 생성
  WELCOME   // 신규가입 자동 발급
  REFERRAL  // 추천인 보상
}
```

### CouponRedemption

```prisma
model CouponRedemption {
  id              String           @id @default(cuid())
  couponId        String
  coupon          Coupon           @relation(fields: [couponId], references: [id])
  userId          String           // PersonaWorldUser ID
  coinAmount      Int              // 실제 지급된 코인 수
  transactionId   String?          // CoinTransaction 참조
  redeemedAt      DateTime         @default(now())

  @@unique([couponId, userId])     // 1인 1회 사용 제한
  @@index([userId])
  @@map("coupon_redemptions")
}
```

## 실행 태스크 (2-5분 단위)

### Task 1: DB 모델 + 마이그레이션 + 서비스 코어 (T410)

- **작업**:
  1. `schema.prisma`에 Coupon, CouponRedemption, CouponType 추가
  2. `058_coupon_system.sql` 마이그레이션 작성
  3. `coupon-service.ts` 작성 — DI 패턴(credit-service와 동일)
     - `createCoupon(provider, data)` — 쿠폰 생성
     - `validateCoupon(provider, code, userId)` — 코드 유효성 + 사용 가능 여부 검증
     - `redeemCoupon(provider, code, userId)` — 쿠폰 적용 (검증 + addCredits + redemption 기록 + usedCount 증가)
     - `getCoupons(provider, options)` — 관리자 목록 조회
     - `getCouponByCode(provider, code)` — 단건 조회
     - `updateCoupon(provider, id, data)` — 수정
     - `deactivateCoupon(provider, id)` — 비활성화
  4. `coupon-service.test.ts` 작성 — 핵심 로직 테스트
- **파일**: schema.prisma, 058_coupon_system.sql, coupon-service.ts, coupon-service.test.ts
- **검증**: `pnpm test -- coupon-service` PASS

### Task 2: 관리자 API 엔드포인트 (T411)

- **작업**:
  1. `GET /api/internal/persona-world-admin/coupons` — 목록 조회 (필터: type, isActive, 검색)
  2. `POST /api/internal/persona-world-admin/coupons` — 쿠폰 생성
  3. `PUT /api/internal/persona-world-admin/coupons` — 수정
  4. `DELETE /api/internal/persona-world-admin/coupons?id=xxx` — 비활성화 (soft delete)
  5. requireAuth() 가드 적용
- **파일**: `api/internal/persona-world-admin/coupons/route.ts`
- **검증**: API 응답 형식 `{ success, data/error }` 준수

### Task 3: 사용자 쿠폰 적용 API (T412)

- **작업**:
  1. `POST /api/persona-world/coupons/redeem` — 쿠폰 코드 적용
     - Request: `{ userId, code }`
     - Response: `{ coinAmount, newBalance }`
     - 검증: 코드 유효성, 만료, 사용 한도, 중복 사용
  2. Internal token 인증
  3. 기존 `addCredits()` 호출하여 EARN 트랜잭션 생성
- **파일**: `api/persona-world/coupons/redeem/route.ts`
- **검증**: 정상 적용 + 에러 케이스 (만료, 중복, 무효 코드) 응답 확인

### Task 4: Engine Studio 관리 UI (T413)

- **작업**:
  1. 쿠폰 관리 페이지 작성 (기존 shop/page.tsx 패턴 참고)
     - 쿠폰 목록 테이블 (코드, 타입, 코인, 사용/한도, 만료일, 상태)
     - 쿠폰 생성 폼 (코드 수동입력 or 자동생성, 코인 수, 만료일, 한도)
     - 인라인 편집 (isActive 토글, 만료일 변경)
  2. LNB에 "쿠폰 관리" 메뉴 추가 (Shop Management 아래)
- **파일**: `persona-world-admin/coupons/page.tsx`, `lnb.tsx`
- **검증**: 쿠폰 CRUD 동작 확인

### Task 5: Persona World 쿠폰 입력 UI + API 문서 (T414)

- **작업**:
  1. 샵 페이지에 쿠폰 코드 입력 섹션 추가 (코인 충전 섹션 하단)
     - 입력 필드 + "적용" 버튼
     - 성공/실패 토스트 알림
     - 적용 후 잔액 갱신
  2. `api.ts`에 `redeemCoupon(userId, code)` 함수 추가
  3. API 문서 업데이트 (internal.md, public.md + openapi.yaml)
- **파일**: `shop/page.tsx`, `api.ts`, `docs/api/*`
- **검증**: 쿠폰 입력 → 코인 지급 → 잔액 반영 E2E 동작

## 완료 기준

- [ ] 모든 태스크 완료 (T410~T414)
- [ ] `pnpm validate` PASS
- [ ] 쿠폰 생성/조회/수정/비활성화 (Engine Studio)
- [ ] 쿠폰 코드 적용 → 코인 지급 (Persona World)
- [ ] 중복 사용 방지 (unique constraint)
- [ ] 만료/한도 초과 시 에러 반환
- [ ] API 문서 최신화
- [ ] 마이그레이션 SQL 작성 완료
