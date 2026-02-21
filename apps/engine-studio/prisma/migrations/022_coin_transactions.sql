-- 022: PersonaWorld 코인 거래 내역 테이블
-- 실결제 + 획득 + 소비 이력 추적

-- Enum types
DO $$ BEGIN
  CREATE TYPE "CoinTransactionType" AS ENUM ('EARN', 'PURCHASE', 'SPEND');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CoinTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "coin_transactions" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"        TEXT NOT NULL,
  "type"          "CoinTransactionType" NOT NULL,
  "amount"        INTEGER NOT NULL,
  "balanceAfter"  INTEGER NOT NULL,
  "reason"        TEXT,
  "orderId"       TEXT,
  "paymentKey"    TEXT,
  "status"        "CoinTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "coin_transactions_userId_createdAt_idx"
  ON "coin_transactions"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "coin_transactions_orderId_idx"
  ON "coin_transactions"("orderId");
