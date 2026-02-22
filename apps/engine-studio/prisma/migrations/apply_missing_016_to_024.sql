-- ═══════════════════════════════════════════════════════════════
-- 프로덕션 DB 마이그레이션: 016 ~ 024 통합 적용
-- 001_full_schema.sql 적용 이후 누락된 모든 변경사항 포함
-- 실행: psql $DATABASE_URL -f apply_missing_016_to_024.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 016: Social Module Config 싱글톤 테이블
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "social_module_config" (
    "id"            TEXT NOT NULL DEFAULT 'singleton',
    "authority"     JSONB NOT NULL DEFAULT '{"enabled":false,"weight":0.2}',
    "connectivity"  JSONB NOT NULL DEFAULT '{"enabled":true,"weight":0.3}',
    "reputation"    JSONB NOT NULL DEFAULT '{"enabled":true,"weight":0.3}',
    "tribalism"     JSONB NOT NULL DEFAULT '{"enabled":false,"weight":0.2}',
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy"     TEXT NOT NULL DEFAULT 'system',
    CONSTRAINT "social_module_config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "social_module_config" ("id", "updatedBy")
VALUES ('singleton', 'system')
ON CONFLICT ("id") DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 017: pw_notifications + persona_reposts.userId
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "pw_notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "personaId" TEXT,
  "personaName" TEXT,
  "postId" TEXT,
  "commentId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pw_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pw_notifications_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pw_notifications_userId_read_idx"
  ON "pw_notifications"("userId", "read");
CREATE INDEX IF NOT EXISTS "pw_notifications_userId_createdAt_idx"
  ON "pw_notifications"("userId", "createdAt");

ALTER TABLE "persona_reposts" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "persona_reposts" ALTER COLUMN "personaId" DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE "persona_reposts"
    ADD CONSTRAINT "persona_reposts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "persona_reposts_originalPostId_userId_key"
  ON "persona_reposts"("originalPostId", "userId");

-- ────────────────────────────────────────────────────────────
-- 018: ActivityTrigger enum에 MANUAL 추가
-- ────────────────────────────────────────────────────────────

ALTER TYPE "ActivityTrigger" ADD VALUE IF NOT EXISTS 'MANUAL';

-- ────────────────────────────────────────────────────────────
-- 019: v4.0 Instruction Layer (personas 컬럼 추가)
-- ────────────────────────────────────────────────────────────

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "voiceSpec" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "factbook" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "triggerMap" JSONB;
ALTER TABLE "personas" ALTER COLUMN "engineVersion" SET DEFAULT '4.0';

-- ────────────────────────────────────────────────────────────
-- 020: PersonaGenerationRequest 테이블
-- ────────────────────────────────────────────────────────────

ALTER TYPE "PersonaSource" ADD VALUE IF NOT EXISTS 'USER_REQUEST';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PersonaRequestStatus') THEN
    CREATE TYPE "PersonaRequestStatus" AS ENUM (
      'PENDING', 'SCHEDULED', 'GENERATING', 'COMPLETED', 'FAILED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "persona_generation_requests" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"                TEXT NOT NULL,
  "userVector"            JSONB NOT NULL,
  "topSimilarity"         DECIMAL(5,2) NOT NULL,
  "status"                "PersonaRequestStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledDate"         TIMESTAMP(3) NOT NULL,
  "generatedPersonaId"    TEXT,
  "completedAt"           TIMESTAMP(3),
  "failReason"            TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "persona_generation_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_generation_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE,
  CONSTRAINT "persona_generation_requests_generatedPersonaId_fkey"
    FOREIGN KEY ("generatedPersonaId") REFERENCES "personas"("id")
);

CREATE INDEX IF NOT EXISTS "persona_generation_requests_userId_idx"
  ON "persona_generation_requests"("userId");
CREATE INDEX IF NOT EXISTS "persona_generation_requests_status_scheduledDate_idx"
  ON "persona_generation_requests"("status", "scheduledDate");

-- ────────────────────────────────────────────────────────────
-- 021: PWNotificationPreference 테이블
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "pw_notification_preferences" (
    "id"                    TEXT NOT NULL,
    "userId"                TEXT NOT NULL,
    "likeEnabled"           BOOLEAN NOT NULL DEFAULT true,
    "commentEnabled"        BOOLEAN NOT NULL DEFAULT true,
    "followEnabled"         BOOLEAN NOT NULL DEFAULT true,
    "mentionEnabled"        BOOLEAN NOT NULL DEFAULT true,
    "repostEnabled"         BOOLEAN NOT NULL DEFAULT true,
    "recommendationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newPostEnabled"        BOOLEAN NOT NULL DEFAULT true,
    "systemEnabled"         BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart"       INTEGER,
    "quietHoursEnd"         INTEGER,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pw_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pw_notification_preferences_userId_key"
    ON "pw_notification_preferences"("userId");

DO $$ BEGIN
  ALTER TABLE "pw_notification_preferences"
    ADD CONSTRAINT "pw_notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 022: CoinTransaction 테이블
-- ────────────────────────────────────────────────────────────

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

DO $$ BEGIN
  ALTER TABLE "coin_transactions"
    ADD CONSTRAINT "coin_transactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 023: 페르소나 인구통계 컬럼 추가 (테이블명 수정: "Persona" → "personas")
-- ────────────────────────────────────────────────────────────

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "knowledgeAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ────────────────────────────────────────────────────────────
-- 024: 인큐베이터 불합격 사유 컬럼
-- ────────────────────────────────────────────────────────────

ALTER TABLE "incubator_logs" ADD COLUMN IF NOT EXISTS "failReason" TEXT;

COMMIT;
