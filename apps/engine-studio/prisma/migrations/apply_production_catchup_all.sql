-- ═══════════════════════════════════════════════════════════════════════
-- 프로덕션 DB 전체 Catchup 마이그레이션
-- 생성일: 2026-02-26
--
-- 목적: 프로덕션 DB에 누락된 모든 테이블/컬럼/인덱스를 한번에 적용
--   - 001_full_schema.sql 의 PersonaWorld 관련 테이블 (38~55+)
--   - 016~024 마이그레이션 (apply_missing_016_to_024.sql)
--   - 025~037 마이그레이션
--
-- 안전성: 모든 구문에 IF NOT EXISTS / IF EXISTS 가드 포함 → 재실행 가능
-- 주의: ALTER TYPE ADD VALUE는 트랜잭션 안에서 실행 불가 → BEGIN/COMMIT 미사용
--
-- 실행:
--   Neon 콘솔 → SQL Editor → 파일 내용 붙여넣기 → Run
--   또는: psql $DATABASE_URL -f apply_production_catchup_all.sql
-- ═══════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  Part 0: 누락 가능성 있는 ENUM 타입                                ║
-- ╚═══════════════════════════════════════════════════════════════════╝

DO $$ BEGIN CREATE TYPE "ProfileQuality" AS ENUM ('BASIC', 'STANDARD', 'ADVANCED', 'PREMIUM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SNSPlatform" AS ENUM ('NETFLIX', 'YOUTUBE', 'INSTAGRAM', 'SPOTIFY', 'LETTERBOXD', 'TWITTER', 'TIKTOK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'MISINFORMATION', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PersonaActivityType" AS ENUM (
  'POST_CREATED', 'POST_LIKED', 'POST_COMMENTED', 'POST_REPOSTED',
  'PERSONA_FOLLOWED', 'PERSONA_UNFOLLOWED',
  'DEBATE_STARTED', 'COLLAB_STARTED', 'SYSTEM'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ConsumptionContentType" AS ENUM ('MOVIE', 'DRAMA', 'MUSIC', 'BOOK', 'ARTICLE', 'GAME', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ConsumptionSource" AS ENUM ('AUTONOMOUS', 'FEED', 'RECOMMENDATION', 'ONBOARDING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OnboardingLevel" AS ENUM ('QUICK', 'STANDARD', 'DEEP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PersonaSource" AS ENUM ('MANUAL', 'INCUBATOR', 'MUTATION', 'AUTO_GENERATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PersonaRequestStatus" AS ENUM ('PENDING', 'SCHEDULED', 'GENERATING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CoinTransactionType" AS ENUM ('EARN', 'PURCHASE', 'SPEND'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CoinTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  Part 1: 001_full_schema — PersonaWorld 기본 테이블 (38~55)        ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────────────
-- 38. persona_world_users
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_world_users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "profileImageUrl" TEXT,

  -- 6D 벡터
  "depth" DECIMAL(3,2),
  "lens" DECIMAL(3,2),
  "stance" DECIMAL(3,2),
  "scope" DECIMAL(3,2),
  "taste" DECIMAL(3,2),
  "purpose" DECIMAL(3,2),

  -- L2 OCEAN
  "openness" DECIMAL(3,2),
  "conscientiousness" DECIMAL(3,2),
  "extraversion" DECIMAL(3,2),
  "agreeableness" DECIMAL(3,2),
  "neuroticism" DECIMAL(3,2),
  "hasOceanProfile" BOOLEAN NOT NULL DEFAULT false,

  -- 프로필 레벨
  "profile_level" TEXT NOT NULL DEFAULT 'BASIC',

  -- 프로필 품질
  "profileQuality" "ProfileQuality" NOT NULL DEFAULT 'BASIC',
  "confidenceScore" DECIMAL(3,2),

  -- 데이터 소스
  "dataSources" JSONB,
  "snsExtendedData" JSONB,
  "preferences" JSONB,

  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_world_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_world_users_email_key" ON "persona_world_users"("email");

-- ────────────────────────────────────────────────────────────
-- 39. persona_posts (이미 존재할 가능성 높음, IF NOT EXISTS)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_posts" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "type" "PersonaPostType" NOT NULL,
  "content" TEXT NOT NULL,
  "contentId" TEXT,
  "metadata" JSONB,
  "parentId" TEXT,
  "trigger" "ActivityTrigger" NOT NULL DEFAULT 'SCHEDULED',
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  "repostCount" INTEGER NOT NULL DEFAULT 0,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "hiddenAt" TIMESTAMP(3),
  "hiddenBy" TEXT,
  "poignancyScore" DECIMAL(4,3),
  "postSource" "PostSource" DEFAULT 'AUTONOMOUS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_posts_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_posts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persona_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "persona_posts_personaId_createdAt_idx" ON "persona_posts"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "persona_posts_type_createdAt_idx" ON "persona_posts"("type", "createdAt");

-- ────────────────────────────────────────────────────────────
-- 40. persona_post_likes
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_post_likes" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "personaId" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_post_likes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_post_likes_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chk_like_author" CHECK (
    ("personaId" IS NOT NULL AND "userId" IS NULL) OR
    ("personaId" IS NULL AND "userId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_post_likes_postId_personaId_key" ON "persona_post_likes"("postId", "personaId");
CREATE UNIQUE INDEX IF NOT EXISTS "persona_post_likes_postId_userId_key" ON "persona_post_likes"("postId", "userId");

-- ────────────────────────────────────────────────────────────
-- 41. persona_comments
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_comments" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "personaId" TEXT,
  "userId" TEXT,
  "content" TEXT NOT NULL,
  "parentId" TEXT,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "hiddenAt" TIMESTAMP(3),
  "hiddenBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_comments_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "persona_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "chk_comment_author" CHECK (
    ("personaId" IS NOT NULL AND "userId" IS NULL) OR
    ("personaId" IS NULL AND "userId" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "persona_comments_postId_createdAt_idx" ON "persona_comments"("postId", "createdAt");

-- ────────────────────────────────────────────────────────────
-- 42. persona_reposts
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_reposts" (
  "id" TEXT NOT NULL,
  "originalPostId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_reposts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_reposts_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "persona_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_reposts_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_reposts_originalPostId_personaId_key" ON "persona_reposts"("originalPostId", "personaId");

-- ────────────────────────────────────────────────────────────
-- 43. persona_follows
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_follows" (
  "id" TEXT NOT NULL,
  "followerPersonaId" TEXT,
  "followerUserId" TEXT,
  "followingPersonaId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_follows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_follows_followerPersonaId_fkey" FOREIGN KEY ("followerPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_follows_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_follows_followingPersonaId_fkey" FOREIGN KEY ("followingPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chk_follower" CHECK (
    ("followerPersonaId" IS NOT NULL AND "followerUserId" IS NULL) OR
    ("followerPersonaId" IS NULL AND "followerUserId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_follows_followerPersonaId_followingPersonaId_key" ON "persona_follows"("followerPersonaId", "followingPersonaId");
CREATE UNIQUE INDEX IF NOT EXISTS "persona_follows_followerUserId_followingPersonaId_key" ON "persona_follows"("followerUserId", "followingPersonaId");

-- ────────────────────────────────────────────────────────────
-- 44. persona_post_bookmarks
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_post_bookmarks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_post_bookmarks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_post_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_post_bookmarks_userId_postId_key" ON "persona_post_bookmarks"("userId", "postId");

-- ────────────────────────────────────────────────────────────
-- 45. pw_user_survey_responses
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "pw_user_survey_responses" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "surveyLevel" "OnboardingLevel" NOT NULL,
  "answers" JSONB NOT NULL,
  "computedVector" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pw_user_survey_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pw_user_survey_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "pw_user_survey_responses_userId_surveyLevel_key" ON "pw_user_survey_responses"("userId", "surveyLevel");

-- ────────────────────────────────────────────────────────────
-- 46. sns_connections
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "sns_connections" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" "SNSPlatform" NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "profileData" JSONB,
  "extractedData" JSONB,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sns_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sns_connections_userId_platform_key" ON "sns_connections"("userId", "platform");

-- ────────────────────────────────────────────────────────────
-- 47. persona_world_reports
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_world_reports" (
  "id" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "description" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_world_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "persona_world_reports_status_createdAt_idx" ON "persona_world_reports"("status", "createdAt");

-- ────────────────────────────────────────────────────────────
-- 48. persona_activity_logs
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_activity_logs" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "activityType" "PersonaActivityType" NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "trigger" "ActivityTrigger" NOT NULL,
  "postTypeReason" JSONB,
  "stateSnapshot" JSONB,
  "matching_score" DECIMAL(4,3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "persona_activity_logs_personaId_createdAt_idx" ON "persona_activity_logs"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "persona_activity_logs_activityType_createdAt_idx" ON "persona_activity_logs"("activityType", "createdAt");

-- ────────────────────────────────────────────────────────────
-- 49. persona_states
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_states" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "mood" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "energy" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  "socialBattery" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  "paradoxTension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "narrativeTension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_states_personaId_key" ON "persona_states"("personaId");

DO $$ BEGIN
  ALTER TABLE "persona_states"
    ADD CONSTRAINT "persona_states_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 50. persona_relationships
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_relationships" (
  "id" TEXT NOT NULL,
  "personaAId" TEXT NOT NULL,
  "personaBId" TEXT NOT NULL,
  "warmth" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "tension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "frequency" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "depth" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "lastInteractionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_relationships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_relationships_personaAId_personaBId_key"
  ON "persona_relationships"("personaAId", "personaBId");
CREATE INDEX IF NOT EXISTS "persona_relationships_personaAId_idx"
  ON "persona_relationships"("personaAId");
CREATE INDEX IF NOT EXISTS "persona_relationships_personaBId_idx"
  ON "persona_relationships"("personaBId");

DO $$ BEGIN
  ALTER TABLE "persona_relationships"
    ADD CONSTRAINT "persona_relationships_personaAId_fkey"
    FOREIGN KEY ("personaAId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "persona_relationships"
    ADD CONSTRAINT "persona_relationships_personaBId_fkey"
    FOREIGN KEY ("personaBId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 51. consumption_logs
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "consumption_logs" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "contentType" "ConsumptionContentType" NOT NULL,
  "contentId" TEXT,
  "title" TEXT NOT NULL,
  "impression" TEXT NOT NULL,
  "rating" DECIMAL(3,2),
  "emotionalImpact" DECIMAL(3,2) NOT NULL,
  "tags" TEXT[],
  "source" "ConsumptionSource" NOT NULL,
  "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "consumption_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consumption_logs_personaId_consumedAt_idx"
  ON "consumption_logs"("personaId", "consumedAt");
CREATE INDEX IF NOT EXISTS "consumption_logs_personaId_tags_idx"
  ON "consumption_logs"("personaId", "tags");

DO $$ BEGIN
  ALTER TABLE "consumption_logs"
    ADD CONSTRAINT "consumption_logs_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  Part 2: 016~024 마이그레이션 (apply_missing_016_to_024.sql)       ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ── 016: Social Module Config ──

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

INSERT INTO "social_module_config" ("id", "updatedAt", "updatedBy")
VALUES ('singleton', CURRENT_TIMESTAMP, 'system')
ON CONFLICT ("id") DO NOTHING;

-- ── 017: pw_notifications + persona_reposts.userId ──

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

DO $$ BEGIN
  ALTER TABLE "persona_reposts" ALTER COLUMN "personaId" DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "persona_reposts"
    ADD CONSTRAINT "persona_reposts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "persona_reposts_originalPostId_userId_key"
  ON "persona_reposts"("originalPostId", "userId");

-- ── 018: ActivityTrigger MANUAL ──

ALTER TYPE "ActivityTrigger" ADD VALUE IF NOT EXISTS 'MANUAL';

-- ── 019: v4.0 Instruction Layer ──

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "voiceSpec" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "factbook" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "triggerMap" JSONB;
ALTER TABLE "personas" ALTER COLUMN "engineVersion" SET DEFAULT '4.0';

-- ── 020: PersonaGenerationRequest ──

ALTER TYPE "PersonaSource" ADD VALUE IF NOT EXISTS 'USER_REQUEST';

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

-- ── 021: PWNotificationPreference ──

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

-- ── 022: CoinTransaction ──

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

-- ── 023: 페르소나 인구통계 ──

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "knowledgeAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ── 024: 인큐베이터 failReason ──

ALTER TABLE "incubator_logs" ADD COLUMN IF NOT EXISTS "failReason" TEXT;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║  Part 3: 025~037 마이그레이션                                      ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ── 025: SNS 분석 횟수 ──

ALTER TABLE "persona_world_users"
  ADD COLUMN IF NOT EXISTS "sns_analysis_count" INTEGER NOT NULL DEFAULT 0;

-- ── 026: PW 보안 로그 ──

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

-- ── 028: Persona height + Post locationTag ──

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "persona_posts" ADD COLUMN IF NOT EXISTS "locationTag" TEXT;

-- ── 029: COMMENT_SUPPRESSED 활동 유형 ──

ALTER TYPE "PersonaActivityType" ADD VALUE IF NOT EXISTS 'COMMENT_SUPPRESSED';

-- ── 030: News-Based Persona Reaction (NewsSource, NewsArticle) ──

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

-- ── 031: 뉴스 region ──

ALTER TABLE "news_sources"  ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'GLOBAL';

-- ── 032: 뉴스 importanceScore ──

ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "importance_score" FLOAT NOT NULL DEFAULT 0.5;

-- ── 033/035: OnboardingLevel enum 통일 (LIGHT→QUICK, MEDIUM→STANDARD) ──

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

-- ── 034: PW User sociability (L1 7D) ──

ALTER TABLE "persona_world_users" ADD COLUMN IF NOT EXISTS "sociability" DECIMAL(3,2);

-- ── 036: NewsSource 오류 추적 ──

ALTER TABLE "news_sources" ADD COLUMN IF NOT EXISTS "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "news_sources" ADD COLUMN IF NOT EXISTS "lastError" TEXT;

-- ── 037: PersonaPost 해시태그 ──

ALTER TABLE "persona_posts" ADD COLUMN IF NOT EXISTS "hashtags" TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "persona_posts_hashtags_idx" ON "persona_posts" USING GIN ("hashtags");


-- ═══════════════════════════════════════════════════════════════════════
-- 완료! 프로덕션 DB가 최신 스키마와 동기화되었습니다.
-- 검증: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ═══════════════════════════════════════════════════════════════════════
