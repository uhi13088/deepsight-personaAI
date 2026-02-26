-- ═══════════════════════════════════════════════════════════════════════
-- 프로덕션 DB Catchup 마이그레이션 — Step 2 (018~037)
-- 생성일: 2026-02-26
--
-- ⚠️  실행 순서 (반드시 지킬 것):
--   Step 1: 먼저 001_full_schema.sql 실행 (모든 기본 테이블 + ENUM 생성)
--   Step 2: 그 다음 이 파일 실행 (018~037 추가 변경사항)
--
-- 001_full_schema.sql은 ENUM 전체 + 테이블 1~55 + 016~017 변경을 포함합니다.
-- 이 파일은 그 이후 추가된 변경사항(018~037)만 적용합니다.
--
-- 안전성: 모든 구문에 IF NOT EXISTS / IF EXISTS 가드 포함 → 재실행 가능
-- 주의: ALTER TYPE ADD VALUE는 트랜잭션 안에서 실행 불가 → BEGIN/COMMIT 미사용
--
-- 실행:
--   Neon 콘솔 → SQL Editor → 파일 내용 붙여넣기 → Run
--   또는: psql $DATABASE_URL -f apply_production_catchup_all.sql
-- ═══════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  018: ActivityTrigger MANUAL enum 값 추가                          ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TYPE "ActivityTrigger" ADD VALUE IF NOT EXISTS 'MANUAL';


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  019: v4.0 Instruction Layer (personas 컬럼 추가)                  ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "voiceSpec" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "factbook" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "triggerMap" JSONB;
ALTER TABLE "personas" ALTER COLUMN "engineVersion" SET DEFAULT '4.0';


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  020: PersonaGenerationRequest 테이블                              ║
-- ╚═══════════════════════════════════════════════════════════════════╝

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


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  021: PWNotificationPreference 테이블                              ║
-- ╚═══════════════════════════════════════════════════════════════════╝

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
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  022: CoinTransaction 테이블                                      ║
-- ╚═══════════════════════════════════════════════════════════════════╝

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


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  023: 페르소나 인구통계 컬럼 추가                                    ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "knowledgeAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  024: 인큐베이터 failReason 컬럼                                    ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "incubator_logs" ADD COLUMN IF NOT EXISTS "failReason" TEXT;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  025: PersonaWorldUser SNS 분석 횟수                               ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "persona_world_users"
  ADD COLUMN IF NOT EXISTS "sns_analysis_count" INTEGER NOT NULL DEFAULT 0;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  026: PW 보안 감사 로그 테이블                                      ║
-- ╚═══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "pw_security_logs" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "eventType"   TEXT NOT NULL,
    "details"     JSONB,
    "ipAddress"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pw_security_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pw_security_logs_userId_createdAt_idx"
  ON "pw_security_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "pw_security_logs_eventType_createdAt_idx"
  ON "pw_security_logs"("eventType", "createdAt");


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  028: Persona height + PersonaPost locationTag                    ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "persona_posts" ADD COLUMN IF NOT EXISTS "locationTag" TEXT;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  029: COMMENT_SUPPRESSED 활동 유형 추가                            ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TYPE "PersonaActivityType" ADD VALUE IF NOT EXISTS 'COMMENT_SUPPRESSED';


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  030: News-Based Persona Reaction (NewsSource, NewsArticle)       ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TYPE "PersonaPostType" ADD VALUE IF NOT EXISTS 'NEWS_REACTION';

CREATE TABLE IF NOT EXISTS "news_sources" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "rssUrl"      TEXT NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "lastFetchAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "news_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "news_sources_rssUrl_key" ON "news_sources"("rssUrl");

CREATE TABLE IF NOT EXISTS "news_articles" (
    "id"          TEXT NOT NULL,
    "sourceId"    TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "url"         TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "rawContent"  TEXT,
    "summary"     TEXT NOT NULL,
    "topicTags"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "news_articles_sourceId_fkey" FOREIGN KEY ("sourceId")
        REFERENCES "news_sources"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "news_articles_url_key" ON "news_articles"("url");
CREATE INDEX IF NOT EXISTS "news_articles_publishedAt_idx" ON "news_articles"("publishedAt");

DO $$ BEGIN
  ALTER TABLE "persona_posts"
    ADD COLUMN IF NOT EXISTS "newsArticleId" TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "persona_posts"
    ADD CONSTRAINT "persona_posts_newsArticleId_fkey"
    FOREIGN KEY ("newsArticleId") REFERENCES "news_articles"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  031: 뉴스 region 컬럼                                            ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "news_sources"  ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'GLOBAL';


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  032: 뉴스 importanceScore 컬럼                                    ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "importance_score" FLOAT NOT NULL DEFAULT 0.5;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  033/035: OnboardingLevel enum 통일 + updatedAt DEFAULT            ║
-- ╚═══════════════════════════════════════════════════════════════════╝

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LIGHT' AND enumtypid = '"OnboardingLevel"'::regtype) THEN
    ALTER TYPE "OnboardingLevel" RENAME VALUE 'LIGHT' TO 'QUICK';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEDIUM' AND enumtypid = '"OnboardingLevel"'::regtype) THEN
    ALTER TYPE "OnboardingLevel" RENAME VALUE 'MEDIUM' TO 'STANDARD';
  END IF;
END $$;

ALTER TABLE "psych_profile_templates" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "user_vectors" ALTER COLUMN "onboardingLevel" SET DEFAULT 'QUICK'::"OnboardingLevel";


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  034: PersonaWorldUser sociability (L1 7D 완성)                   ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "persona_world_users" ADD COLUMN IF NOT EXISTS "sociability" DECIMAL(3,2);


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  036: NewsSource 오류 추적 필드                                    ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "news_sources" ADD COLUMN IF NOT EXISTS "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "news_sources" ADD COLUMN IF NOT EXISTS "lastError" TEXT;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  037: PersonaPost 해시태그 배열 + GIN 인덱스                       ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "persona_posts" ADD COLUMN IF NOT EXISTS "hashtags" TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "persona_posts_hashtags_idx" ON "persona_posts" USING GIN ("hashtags");


-- ═══════════════════════════════════════════════════════════════════════
-- 완료! 프로덕션 DB가 최신 스키마와 동기화되었습니다.
-- 검증: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ═══════════════════════════════════════════════════════════════════════
