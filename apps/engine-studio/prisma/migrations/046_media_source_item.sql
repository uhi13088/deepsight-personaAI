-- ============================================================
-- Migration 046: Phase CON-EXT — MediaSource + MediaItem (T351)
-- 엔터테인먼트 콘텐츠 외부 소스 수집 파이프라인 기반 테이블
-- ============================================================

-- MediaSourceType enum
CREATE TYPE "MediaSourceType" AS ENUM (
  'TMDB_MOVIE',
  'TMDB_TV',
  'KOPIS_PERFORMANCE',
  'KOPIS_EXHIBITION',
  'ALADIN_BOOK',
  'LASTFM_MUSIC'
);

-- MediaItemType enum
CREATE TYPE "MediaItemType" AS ENUM (
  'MOVIE',
  'TV',
  'PERFORMANCE',
  'EXHIBITION',
  'BOOK',
  'MUSIC'
);

-- media_sources 테이블
CREATE TABLE "media_sources" (
  "id"                  TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "sourceType"          "MediaSourceType" NOT NULL,
  "apiEndpoint"         TEXT,
  "region"              TEXT NOT NULL DEFAULT 'KR',
  "isActive"            BOOLEAN NOT NULL DEFAULT true,
  "lastFetchAt"         TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "lastError"           TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "media_sources_pkey" PRIMARY KEY ("id")
);

-- media_items 테이블
CREATE TABLE "media_items" (
  "id"              TEXT NOT NULL,
  "sourceId"        TEXT NOT NULL,
  "mediaType"       "MediaItemType" NOT NULL,
  "title"           TEXT NOT NULL,
  "originalId"      TEXT NOT NULL,
  "description"     TEXT,
  "releaseDate"     TIMESTAMP(3),
  "venue"           TEXT,
  "creator"         TEXT,
  "genres"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "region"          TEXT NOT NULL DEFAULT 'KR',
  "importanceScore" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "rawData"         JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "media_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_items_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "media_sources"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- PersonaPost에 mediaItemId 컬럼 추가
ALTER TABLE "persona_posts"
  ADD COLUMN IF NOT EXISTS "mediaItemId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'persona_posts_mediaItemId_fkey'
      AND table_name = 'persona_posts'
  ) THEN
    ALTER TABLE "persona_posts"
      ADD CONSTRAINT "persona_posts_mediaItemId_fkey"
      FOREIGN KEY ("mediaItemId") REFERENCES "media_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- 인덱스
CREATE UNIQUE INDEX "media_items_sourceId_originalId_key"
  ON "media_items"("sourceId", "originalId");

CREATE INDEX "media_items_mediaType_createdAt_idx"
  ON "media_items"("mediaType", "createdAt");

CREATE INDEX "media_items_region_idx"
  ON "media_items"("region");

CREATE INDEX "persona_posts_mediaItemId_idx"
  ON "persona_posts"("mediaItemId");
