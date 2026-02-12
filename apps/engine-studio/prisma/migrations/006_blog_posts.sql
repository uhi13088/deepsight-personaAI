-- 006_blog_posts.sql
-- 블로그 포스트 테이블 생성

-- BlogCategory enum
DO $$ BEGIN
  CREATE TYPE "BlogCategory" AS ENUM ('TECH', 'PRODUCT', 'INSIGHT', 'ANNOUNCEMENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- blog_posts 테이블
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "slug"           TEXT         NOT NULL,
  "title"          TEXT         NOT NULL,
  "excerpt"        TEXT,
  "content"        TEXT         NOT NULL,
  "coverImageUrl"  TEXT,
  "category"       "BlogCategory" NOT NULL DEFAULT 'TECH',
  "tags"           TEXT[]       DEFAULT '{}',
  "authorId"       TEXT         NOT NULL,
  "published"      BOOLEAN      NOT NULL DEFAULT false,
  "publishedAt"    TIMESTAMP(3),
  "viewCount"      INTEGER      NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_published_publishedAt_idx" ON "blog_posts"("published", "publishedAt");
CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts"("category");

-- FK
ALTER TABLE "blog_posts"
  ADD CONSTRAINT "blog_posts_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
