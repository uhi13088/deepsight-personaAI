-- 058_coupon_system.sql
-- 쿠폰/프로모션 코드 시스템 (T410)

-- CouponType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CouponType') THEN
    CREATE TYPE "CouponType" AS ENUM ('MANUAL', 'WELCOME', 'REFERRAL');
  END IF;
END$$;

-- coupons 테이블
CREATE TABLE IF NOT EXISTS "coupons" (
  "id"               TEXT NOT NULL,
  "code"             TEXT NOT NULL,
  "type"             "CouponType" NOT NULL DEFAULT 'MANUAL',
  "coin_amount"      INTEGER NOT NULL,
  "description"      TEXT,
  "max_redemptions"  INTEGER NOT NULL DEFAULT 1,
  "used_count"       INTEGER NOT NULL DEFAULT 0,
  "is_active"        BOOLEAN NOT NULL DEFAULT true,
  "expires_at"       TIMESTAMP(3),
  "created_by"       TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- coupon_redemptions 테이블
CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
  "id"               TEXT NOT NULL,
  "coupon_id"        TEXT NOT NULL,
  "user_id"          TEXT NOT NULL,
  "coin_amount"      INTEGER NOT NULL,
  "transaction_id"   TEXT,
  "redeemed_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- 유니크 제약
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_coupon_id_user_id_key" ON "coupon_redemptions"("coupon_id", "user_id");

-- 인덱스
CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON "coupons"("code");
CREATE INDEX IF NOT EXISTS "coupons_type_idx" ON "coupons"("type");
CREATE INDEX IF NOT EXISTS "coupon_redemptions_user_id_idx" ON "coupon_redemptions"("user_id");

-- FK (멱등성 보장)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'coupon_redemptions_coupon_id_fkey'
      AND table_name = 'coupon_redemptions'
  ) THEN
    ALTER TABLE "coupon_redemptions"
      ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey"
      FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;
