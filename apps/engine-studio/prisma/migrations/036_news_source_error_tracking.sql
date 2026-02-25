-- T256: NewsSource 오류 추적 필드 추가
-- 3회 연속 수집 실패 시 자동 비활성화를 위한 필드

ALTER TABLE "news_sources" ADD COLUMN IF NOT EXISTS "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "news_sources" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
