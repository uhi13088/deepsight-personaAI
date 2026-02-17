-- ============================================================
-- DeepSight Developer Console — Consolidated Schema Migration
-- Generated: 2026-02-17
-- Source: schema.prisma (B2B API Console)
--
-- 기존 developer_console_init.sql + 002 를 하나로 통합
-- 멱등성(Idempotent): 중복 실행해도 안전합니다.
-- ============================================================

-- ── ENUMS ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PRO', 'MAX', 'ENTERPRISE', 'ENT_STARTER', 'ENT_GROWTH', 'ENT_SCALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER', 'BILLING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Environment" AS ENUM ('TEST', 'LIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'ROTATING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'DISABLED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('API_ALERT', 'USAGE_WARNING', 'BILLING', 'SECURITY', 'SYSTEM', 'TEAM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackType" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'LIKE', 'DISLIKE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MatchingTier" AS ENUM ('BASIC', 'ADVANCED', 'EXPLORATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OnboardingLevel" AS ENUM ('QUICK', 'STANDARD', 'DEEP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ConsentType" AS ENUM ('DATA_COLLECTION', 'SNS_ANALYSIS', 'THIRD_PARTY_SHARING', 'MARKETING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProfileQuality" AS ENUM ('BASIC', 'STANDARD', 'ADVANCED', 'PREMIUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PersonaRole" AS ENUM ('REVIEWER', 'CURATOR', 'EDUCATOR', 'COMPANION', 'ANALYST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PersonaStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'STANDARD', 'LEGACY', 'DEPRECATED', 'PAUSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PersonaSource" AS ENUM ('MANUAL', 'INCUBATOR', 'MUTATION', 'AUTO_GENERATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExpertiseLevel" AS ENUM ('CASUAL', 'ENTHUSIAST', 'EXPERT', 'CRITIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PostFrequency" AS ENUM ('RARE', 'OCCASIONAL', 'MODERATE', 'ACTIVE', 'HYPERACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PlanType 신규 값 추가 (기존 DB에 4값만 있을 경우)
DO $$ BEGIN ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'MAX'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'ENT_STARTER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'ENT_GROWTH'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'ENT_SCALE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FeedbackType 신규 값 추가
DO $$ BEGIN ALTER TYPE "FeedbackType" ADD VALUE IF NOT EXISTS 'LIKE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "FeedbackType" ADD VALUE IF NOT EXISTS 'DISLIKE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 인증 & 사용자 ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "name" TEXT,
  "password" TEXT,
  "image" TEXT,
  "phone" TEXT,
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorSecret" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- ── 조직 ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logo" TEXT,
  "plan" "PlanType" NOT NULL DEFAULT 'FREE',
  "planExpiresAt" TIMESTAMP(3),
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");

CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'DEVELOPER',
  "invitedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_userId_organizationId_key" ON "organization_members"("userId", "organizationId");

-- ── API 키 ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "lastFour" TEXT NOT NULL,
  "environment" "Environment" NOT NULL DEFAULT 'TEST',
  "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
  "permissions" TEXT[],
  "rateLimit" INTEGER NOT NULL DEFAULT 100,
  "expiresAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- ── API 로그 ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "api_logs" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "requestBody" JSONB,
  "responseBody" JSONB,
  "requestHeaders" JSONB,
  "responseHeaders" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "apiKeyId" TEXT,
  "userId" TEXT,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "api_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "api_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "api_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "api_logs_requestId_key" ON "api_logs"("requestId");
CREATE INDEX IF NOT EXISTS "api_logs_organizationId_createdAt_idx" ON "api_logs"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "api_logs_apiKeyId_createdAt_idx" ON "api_logs"("apiKeyId", "createdAt");

-- ── 사용량 & 빌링 ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "usage_records" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "endpoint" TEXT NOT NULL,
  "totalCalls" INTEGER NOT NULL DEFAULT 0,
  "successCalls" INTEGER NOT NULL DEFAULT 0,
  "failedCalls" INTEGER NOT NULL DEFAULT 0,
  "totalLatencyMs" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "usage_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_organizationId_date_endpoint_key" ON "usage_records"("organizationId", "date", "endpoint");

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "stripeInvoiceId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "description" TEXT,
  "invoiceUrl" TEXT,
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_stripeInvoiceId_key" ON "invoices"("stripeInvoiceId");

-- ── 웹훅 ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "webhooks" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "secret" TEXT NOT NULL,
  "events" TEXT[],
  "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastDeliveryAt" TIMESTAMP(3),
  "lastDeliveryStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "statusCode" INTEGER,
  "responseBody" TEXT,
  "latencyMs" INTEGER,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhookId_createdAt_idx" ON "webhook_deliveries"("webhookId", "createdAt");

-- ── 알림 ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "actionUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");

-- ── 페르소나 (v3 3-Layer 106D+) ───────────────────────────

CREATE TABLE IF NOT EXISTS "personas" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "role" "PersonaRole" NOT NULL DEFAULT 'REVIEWER',
  "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "profileImageUrl" TEXT,
  -- Layer 1: Social Persona (7D)
  "depth" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "lens" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "stance" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "scope" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "taste" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "purpose" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "sociability" DECIMAL(4,3) NOT NULL DEFAULT 0,
  -- Layer 2: OCEAN (5D)
  "openness" DECIMAL(4,3),
  "conscientiousness" DECIMAL(4,3),
  "extraversion" DECIMAL(4,3),
  "agreeableness" DECIMAL(4,3),
  "neuroticism" DECIMAL(4,3),
  -- Layer 3: Narrative Drive (4D)
  "lack" DECIMAL(4,3),
  "moralCompass" DECIMAL(4,3),
  "volatility" DECIMAL(4,3),
  "growthArc" DECIMAL(4,3),
  -- Paradox & Archetype
  "archetypeId" TEXT,
  "extendedParadoxScore" DECIMAL(4,3),
  "l1l2Score" DECIMAL(4,3),
  "l1l3Score" DECIMAL(4,3),
  "l2l3Score" DECIMAL(4,3),
  -- 캐릭터 속성
  "handle" TEXT,
  "tagline" TEXT,
  "birthDate" TIMESTAMP(3),
  "country" TEXT DEFAULT 'KR',
  "region" TEXT,
  "warmth" DECIMAL(3,2),
  "expertiseLevel" "ExpertiseLevel" NOT NULL DEFAULT 'ENTHUSIAST',
  "speechPatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "quirks" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "background" TEXT,
  "favoriteGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "dislikedGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "viewingHabits" TEXT,
  -- 활동성
  "initiative" DECIMAL(3,2),
  "expressiveness" DECIMAL(3,2),
  "interactivity" DECIMAL(3,2),
  "postFrequency" "PostFrequency" NOT NULL DEFAULT 'MODERATE',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
  "activeHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "peakHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  -- 콘텐츠/관계 설정
  "contentSettings" JSONB,
  "relationshipSettings" JSONB,
  -- 프롬프트
  "promptTemplate" TEXT,
  "basePrompt" TEXT,
  "reviewPrompt" TEXT,
  "postPrompt" TEXT,
  "commentPrompt" TEXT,
  "interactionPrompt" TEXT,
  "specialPrompts" JSONB,
  -- 품질 & 상태
  "status" "PersonaStatus" NOT NULL DEFAULT 'ACTIVE',
  "qualityScore" DECIMAL(5,2),
  "consistencyScore" DECIMAL(3,2),
  "source" "PersonaSource" NOT NULL DEFAULT 'MANUAL',
  "generationConfig" JSONB,
  "sampleContents" JSONB,
  "metadata" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- ── 매칭 결과 (v3) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "match_results" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  -- v1 fields (backward compat)
  "content" TEXT,
  "contentHash" TEXT,
  "score" DOUBLE PRECISION,
  "depthScore" DOUBLE PRECISION,
  "lensScore" DOUBLE PRECISION,
  "stanceScore" DOUBLE PRECISION,
  "scopeScore" DOUBLE PRECISION,
  "tasteScore" DOUBLE PRECISION,
  "purposeScore" DOUBLE PRECISION,
  -- v3 fields
  "userId" TEXT,
  "personaId" TEXT NOT NULL,
  "matchingTier" "MatchingTier" NOT NULL DEFAULT 'BASIC',
  "overallScore" DOUBLE PRECISION,
  "similarityScore" DOUBLE PRECISION,
  "paradoxCompatibility" DOUBLE PRECISION,
  "contextRelevance" DOUBLE PRECISION,
  "context" JSONB,
  "processingTimeMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_results_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "match_results_contentHash_idx" ON "match_results"("contentHash");
CREATE INDEX IF NOT EXISTS "match_results_userId_idx" ON "match_results"("userId");
CREATE INDEX IF NOT EXISTS "match_results_personaId_idx" ON "match_results"("personaId");

CREATE TABLE IF NOT EXISTS "match_feedback" (
  "id" TEXT NOT NULL,
  "matchResultId" TEXT NOT NULL,
  "feedback" "FeedbackType" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_feedback_matchResultId_fkey" FOREIGN KEY ("matchResultId") REFERENCES "match_results"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "match_feedback_matchResultId_key" ON "match_feedback"("matchResultId");

-- ── 유저 벡터 & 동의 (v3) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS "user_vectors" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "onboardingLevel" "OnboardingLevel" NOT NULL DEFAULT 'QUICK',
  -- Layer 1 (7D)
  "depth" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "lens" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "stance" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "scope" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "taste" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "purpose" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "sociability" DECIMAL(4,3) NOT NULL DEFAULT 0,
  -- Layer 2 OCEAN (optional)
  "openness" DECIMAL(4,3),
  "conscientiousness" DECIMAL(4,3),
  "extraversion" DECIMAL(4,3),
  "agreeableness" DECIMAL(4,3),
  "neuroticism" DECIMAL(4,3),
  "hasOceanProfile" BOOLEAN NOT NULL DEFAULT false,
  -- 교차축 & 프로필
  "crossAxes" JSONB,
  "archetype" TEXT,
  "confidenceScores" JSONB,
  "profileQuality" "ProfileQuality" NOT NULL DEFAULT 'BASIC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_vectors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_vectors_userId_key" ON "user_vectors"("userId");
CREATE INDEX IF NOT EXISTS "user_vectors_organizationId_idx" ON "user_vectors"("organizationId");

CREATE TABLE IF NOT EXISTS "user_consents" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "consentType" "ConsentType" NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT false,
  "grantedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "version" TEXT NOT NULL DEFAULT '1.0',
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_consents_userId_organizationId_consentType_key"
  ON "user_consents"("userId", "organizationId", "consentType");
CREATE INDEX IF NOT EXISTS "user_consents_organizationId_idx" ON "user_consents"("organizationId");
