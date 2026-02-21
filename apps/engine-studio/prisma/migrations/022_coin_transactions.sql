-- Migration: 022_coin_transactions
-- CoinTransaction 테이블 + 관련 enum 생성

DO $$ BEGIN
    CREATE TYPE "CoinTransactionType" AS ENUM ('EARN', 'PURCHASE', 'SPEND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "CoinTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "coin_transactions" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "type"         "CoinTransactionType" NOT NULL,
    "amount"       INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason"       TEXT,
    "orderId"      TEXT,
    "paymentKey"   TEXT,
    "status"       "CoinTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "coin_transactions_userId_createdAt_idx"
    ON "coin_transactions"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "coin_transactions_orderId_idx"
    ON "coin_transactions"("orderId");

ALTER TABLE "coin_transactions"
    ADD CONSTRAINT "coin_transactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
