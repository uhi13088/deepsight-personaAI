-- T429: 친밀도 시스템 — ChatThread에 친밀도 필드 추가
-- 유저↔페르소나 1:1 대화의 관계 깊이 추적

ALTER TABLE "chat_threads"
  ADD COLUMN IF NOT EXISTS "intimacyScore" DECIMAL(5, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "intimacyLevel" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lastIntimacyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sharedMilestones" JSONB;
