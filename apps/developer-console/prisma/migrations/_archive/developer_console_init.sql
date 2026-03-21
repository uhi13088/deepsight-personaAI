-- Developer Console Database Migration
-- Run this in Neon SQL Editor

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER', 'BILLING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Environment" AS ENUM ('TEST', 'LIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'ROTATING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'DISABLED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('API_ALERT', 'USAGE_WARNING', 'BILLING', 'SECURITY', 'SYSTEM', 'TEAM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackType" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES (User & Organization)
-- ============================================

-- Users table (may already exist from Engine Studio)
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Accounts table
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

-- Sessions table
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

-- Verification Tokens
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- Organizations table
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");

-- Organization Members
CREATE TABLE IF NOT EXISTS "organization_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'DEVELOPER',
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_userId_organizationId_key" ON "organization_members"("userId", "organizationId");

-- ============================================
-- TABLES (API Keys)
-- ============================================

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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- ============================================
-- TABLES (API Logs)
-- ============================================

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

-- ============================================
-- TABLES (Usage & Billing)
-- ============================================

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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_stripeInvoiceId_key" ON "invoices"("stripeInvoiceId");

-- ============================================
-- TABLES (Webhooks)
-- ============================================

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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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

-- ============================================
-- TABLES (Notifications)
-- ============================================

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

-- ============================================
-- TABLES (Persona & Matching)
-- ============================================

CREATE TABLE IF NOT EXISTS "personas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "depth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scope" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purpose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "match_results" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "depthScore" DOUBLE PRECISION,
    "lensScore" DOUBLE PRECISION,
    "stanceScore" DOUBLE PRECISION,
    "scopeScore" DOUBLE PRECISION,
    "tasteScore" DOUBLE PRECISION,
    "purposeScore" DOUBLE PRECISION,
    "processingTimeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "match_results_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "match_results_contentHash_idx" ON "match_results"("contentHash");

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

-- ============================================
-- DONE
-- ============================================

SELECT 'Developer Console migration completed successfully!' as result;
