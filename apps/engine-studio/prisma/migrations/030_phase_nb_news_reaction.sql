-- Phase NB: News-Based Persona Reaction System
-- NewsSource, NewsArticle 테이블 + PersonaPostType.NEWS_REACTION + PersonaPost.newsArticleId FK

-- 1. PersonaPostType enum에 NEWS_REACTION 추가
ALTER TYPE "PersonaPostType" ADD VALUE IF NOT EXISTS 'NEWS_REACTION';

-- 2. news_sources 테이블
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

-- 3. news_articles 테이블
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

-- 4. PersonaPost에 newsArticleId FK 추가
ALTER TABLE "persona_posts"
    ADD COLUMN IF NOT EXISTS "newsArticleId" TEXT,
    ADD CONSTRAINT "persona_posts_newsArticleId_fkey"
        FOREIGN KEY ("newsArticleId") REFERENCES "news_articles"("id") ON DELETE SET NULL;
