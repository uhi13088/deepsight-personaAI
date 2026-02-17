-- ============================================================
-- 017: 스키마 누락 테이블/컬럼/열거형 보정
-- PersonaWorld 누락 열거형 + interaction/llm 테이블 생성
-- user_vectors v3 컬럼, persona_states narrativeTension 추가
-- api_endpoints 컬럼명 보정
-- ============================================================

-- ── 1. PersonaWorld 누락 열거형 생성 ──────────────────────────
-- 004_persona_world_system.sql이 참조하는 열거형들이
-- 20260208 Prisma 마이그레이션에만 존재하여 프로덕션에 누락됨

DO $$ BEGIN
  CREATE TYPE "PersonaPostType" AS ENUM (
    'REVIEW', 'THOUGHT', 'RECOMMENDATION', 'REACTION', 'QUESTION',
    'LIST', 'THREAD', 'VS_BATTLE', 'QNA', 'CURATION',
    'DEBATE', 'MEME', 'COLLAB', 'TRIVIA', 'PREDICTION',
    'ANNIVERSARY', 'BEHIND_STORY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ActivityTrigger" AS ENUM (
    'SCHEDULED', 'CONTENT_RELEASE', 'SOCIAL_EVENT',
    'USER_INTERACTION', 'TRENDING', 'AUTONOMOUS'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProfileQuality" AS ENUM ('BASIC', 'STANDARD', 'ADVANCED', 'PREMIUM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SNSPlatform" AS ENUM (
    'NETFLIX', 'YOUTUBE', 'INSTAGRAM', 'SPOTIFY',
    'LETTERBOXD', 'TWITTER', 'TIKTOK'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportReason" AS ENUM (
    'SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'MISINFORMATION', 'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PersonaActivityType" AS ENUM (
    'POST_CREATED', 'POST_LIKED', 'POST_COMMENTED', 'POST_REPOSTED',
    'PERSONA_FOLLOWED', 'PERSONA_UNFOLLOWED',
    'DEBATE_STARTED', 'COLLAB_STARTED', 'SYSTEM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- PersonaActivityType가 이미 존재하면 SYSTEM 값만 추가
DO $$ BEGIN
  ALTER TYPE "PersonaActivityType" ADD VALUE IF NOT EXISTS 'SYSTEM';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- PersonaSource에 AUTO_GENERATED 값 추가 (001에서 3개만 생성됨)
DO $$ BEGIN
  ALTER TYPE "PersonaSource" ADD VALUE IF NOT EXISTS 'AUTO_GENERATED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Interaction/LLM 열거형 생성 ───────────────────────────

DO $$ BEGIN
  CREATE TYPE "ParticipantType" AS ENUM ('PERSONA', 'USER', 'CONTENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InteractionType" AS ENUM (
    'CONVERSATION', 'COMMENT', 'REPLY', 'REACTION', 'POST', 'MENTION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LlmCallStatus" AS ENUM ('SUCCESS', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InteractionSource" AS ENUM (
    'DIRECT', 'PERSONA_RELAY', 'EXTERNAL_FEED', 'SYSTEM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. interaction_sessions 테이블 ───────────────────────────

CREATE TABLE IF NOT EXISTS "interaction_sessions" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "totalTurns" INTEGER NOT NULL DEFAULT 0,
  "avgPressure" DECIMAL(3,2),
  "peakPressure" DECIMAL(3,2),
  "dominantTopic" TEXT,
  "integrityScore" DECIMAL(4,3),
  "edgeWeight" DECIMAL(5,3),
  "semanticSimilarity" DECIMAL(4,3),
  "sentimentValence" DECIMAL(3,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interaction_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interaction_sessions_personaId_idx"
  ON "interaction_sessions" ("personaId");

CREATE INDEX IF NOT EXISTS "interaction_sessions_userId_idx"
  ON "interaction_sessions" ("userId");

CREATE INDEX IF NOT EXISTS "interaction_sessions_personaId_userId_idx"
  ON "interaction_sessions" ("personaId", "userId");

DO $$ BEGIN
  ALTER TABLE "interaction_sessions"
    ADD CONSTRAINT "interaction_sessions_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. interaction_logs 테이블 ───────────────────────────────

CREATE TABLE IF NOT EXISTS "interaction_logs" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "turnNumber" INTEGER NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "initiatorType" "ParticipantType" NOT NULL,
  "initiatorId" TEXT NOT NULL,
  "receiverType" "ParticipantType" NOT NULL,
  "receiverId" TEXT NOT NULL,
  "interactionType" "InteractionType" NOT NULL,
  "userMessage" TEXT,
  "personaResponse" TEXT,
  "responseLengthTokens" INTEGER,
  "pressure" DECIMAL(3,2),
  "activeLayer" TEXT,
  "vFinalDrift" DECIMAL(4,3),
  "paradoxActivation" DECIMAL(4,3),
  "behaviorTags" JSONB,
  "contextRecall" DECIMAL(4,3),
  "settingConsistency" DECIMAL(4,3),
  "voiceDrift" DECIMAL(4,3),
  "poignancyScore" DECIMAL(4,3),
  "source" "InteractionSource" DEFAULT 'DIRECT',
  "trustLevel" DECIMAL(3,2),
  "propagationDepth" INTEGER DEFAULT 0,
  "originPersonaId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interaction_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interaction_logs_sessionId_idx"
  ON "interaction_logs" ("sessionId");

CREATE INDEX IF NOT EXISTS "interaction_logs_initiatorId_initiatorType_idx"
  ON "interaction_logs" ("initiatorId", "initiatorType");

CREATE INDEX IF NOT EXISTS "interaction_logs_receiverId_receiverType_idx"
  ON "interaction_logs" ("receiverId", "receiverType");

CREATE INDEX IF NOT EXISTS "interaction_logs_interactionType_idx"
  ON "interaction_logs" ("interactionType");

CREATE INDEX IF NOT EXISTS "interaction_logs_timestamp_idx"
  ON "interaction_logs" ("timestamp");

DO $$ BEGIN
  ALTER TABLE "interaction_logs"
    ADD CONSTRAINT "interaction_logs_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "interaction_sessions" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. llm_usage_logs 테이블 ─────────────────────────────────

CREATE TABLE IF NOT EXISTS "llm_usage_logs" (
  "id" TEXT NOT NULL,
  "personaId" TEXT,
  "callType" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  "estimatedCostUsd" DECIMAL(10,6) NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "status" "LlmCallStatus" NOT NULL DEFAULT 'SUCCESS',
  "errorMessage" TEXT,
  "cacheCreationInputTokens" INTEGER,
  "cacheReadInputTokens" INTEGER,
  "cacheSavingsUsd" DECIMAL(10,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "llm_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "llm_usage_logs_createdAt_idx"
  ON "llm_usage_logs" ("createdAt");

CREATE INDEX IF NOT EXISTS "llm_usage_logs_callType_idx"
  ON "llm_usage_logs" ("callType");

CREATE INDEX IF NOT EXISTS "llm_usage_logs_personaId_idx"
  ON "llm_usage_logs" ("personaId");

-- ── 6. user_vectors: v3 컬럼 추가 ────────────────────────────

ALTER TABLE "user_vectors"
  ADD COLUMN IF NOT EXISTS "sociability" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "openness" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "conscientiousness" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "extraversion" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "agreeableness" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "neuroticism" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "hasOceanProfile" BOOLEAN NOT NULL DEFAULT false;

-- ── 7. persona_states: narrativeTension 추가 ─────────────────

ALTER TABLE "persona_states"
  ADD COLUMN IF NOT EXISTS "narrativeTension" DECIMAL(3,2) NOT NULL DEFAULT 0.00;

-- ── 8. api_endpoints: 컬럼명 보정 (snake_case → camelCase) ───
-- Prisma 스키마에 @map 없으므로 camelCase 컬럼명이 필요

DO $$ BEGIN
  -- rate_limit_config → rateLimitConfig
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_endpoints' AND column_name = 'rate_limit_config'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_endpoints' AND column_name = 'rateLimitConfig'
  ) THEN
    ALTER TABLE "api_endpoints" RENAME COLUMN "rate_limit_config" TO "rateLimitConfig";
  END IF;

  -- health_check_config → healthCheckConfig
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_endpoints' AND column_name = 'health_check_config'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_endpoints' AND column_name = 'healthCheckConfig'
  ) THEN
    ALTER TABLE "api_endpoints" RENAME COLUMN "health_check_config" TO "healthCheckConfig";
  END IF;
END $$;
