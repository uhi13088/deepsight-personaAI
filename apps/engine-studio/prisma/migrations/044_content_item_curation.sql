-- Migration 044: ContentItem + PersonaCuratedContent + UserContentFeedback
-- T392 — B2B 콘텐츠 인제스트 파이프라인 기반 스키마
-- 2026-03-04

-- ── Enum Types ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "ContentItemType" AS ENUM (
    'MOVIE', 'DRAMA', 'MUSIC', 'BOOK',
    'ARTICLE', 'PRODUCT', 'VIDEO', 'PODCAST'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CurationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContentFeedbackAction" AS ENUM ('LIKE', 'SKIP', 'SAVE', 'CONSUME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ContentItem ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "content_items" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"        TEXT        NOT NULL,
  "contentType"     "ContentItemType" NOT NULL,
  "title"           TEXT        NOT NULL,
  "description"     TEXT,
  "sourceUrl"       TEXT,
  "externalId"      TEXT,

  "genres"          TEXT[]      NOT NULL DEFAULT '{}',
  "tags"            TEXT[]      NOT NULL DEFAULT '{}',

  "contentVector"   JSONB,
  "narrativeTheme"  JSONB,
  "vectorizedAt"    TIMESTAMP(3),

  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "content_items_tenantId_externalId_key"
  ON "content_items"("tenantId", "externalId")
  WHERE "externalId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "content_items_tenantId_idx"
  ON "content_items"("tenantId");

CREATE INDEX IF NOT EXISTS "content_items_contentType_idx"
  ON "content_items"("contentType");

-- ── PersonaCuratedContent ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "persona_curated_contents" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "personaId"       TEXT        NOT NULL,
  "contentItemId"   TEXT        NOT NULL,

  "curationScore"   DECIMAL(4,3) NOT NULL,
  "curationReason"  TEXT,
  "highlights"      TEXT[]      NOT NULL DEFAULT '{}',
  "status"          "CurationStatus" NOT NULL DEFAULT 'PENDING',

  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_curated_contents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_curated_contents_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE,
  CONSTRAINT "persona_curated_contents_contentItemId_fkey"
    FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_curated_contents_personaId_contentItemId_key"
  ON "persona_curated_contents"("personaId", "contentItemId");

CREATE INDEX IF NOT EXISTS "persona_curated_contents_personaId_status_idx"
  ON "persona_curated_contents"("personaId", "status");

CREATE INDEX IF NOT EXISTS "persona_curated_contents_contentItemId_idx"
  ON "persona_curated_contents"("contentItemId");

-- ── UserContentFeedback ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user_content_feedbacks" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"          TEXT        NOT NULL,
  "contentItemId"   TEXT        NOT NULL,
  "action"          "ContentFeedbackAction" NOT NULL,
  "viaPersonaId"    TEXT,

  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_content_feedbacks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_content_feedbacks_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_content_feedbacks_contentItemId_fkey"
    FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_content_feedbacks_userId_contentItemId_key"
  ON "user_content_feedbacks"("userId", "contentItemId");

CREATE INDEX IF NOT EXISTS "user_content_feedbacks_userId_idx"
  ON "user_content_feedbacks"("userId");

CREATE INDEX IF NOT EXISTS "user_content_feedbacks_contentItemId_idx"
  ON "user_content_feedbacks"("contentItemId");
