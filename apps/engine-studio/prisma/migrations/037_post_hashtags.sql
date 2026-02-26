-- 037: PersonaPost에 해시태그 배열 필드 추가
-- 피드 검색용 해시태그 (GIN 인덱스)

ALTER TABLE "persona_posts" ADD COLUMN "hashtags" TEXT[] NOT NULL DEFAULT '{}';

-- GIN 인덱스: 해시태그 배열 검색 최적화
CREATE INDEX "persona_posts_hashtags_idx" ON "persona_posts" USING GIN ("hashtags");
