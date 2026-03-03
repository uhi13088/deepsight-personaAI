-- ═══════════════════════════════════════════════════════════════════════
-- 프로덕션 DB Catchup 마이그레이션 — Step 3 (038~040 + LlmUsageLog 누락 필드)
-- 생성일: 2026-03-03  /  수정: 2026-03-03 (v2 — 에러 처리 강화)
--
-- 실행 전제: apply_production_catchup_all.sql (018~037)이 이미 적용됨
--
-- 포함 항목:
--   PART A: LlmUsageLog 라우팅 추적 필드 (routingReason, batchGroupId, isRegenerated)
--   PART B: Migration 038 — v4.0 Operations Models (T263~T275)
--   PART C: Migration 039 — Chat & Call System + Persona TTS fields
--   PART D: Migration 040 — Persona TTS seed data + ShopItem 테이블
--
-- 안전성:
--   - 모든 구문에 IF NOT EXISTS 가드 → 재실행 가능
--   - FK 제약조건: DROP IF EXISTS + ADD (EXCEPTION WHEN OTHERS 보호)
--   - 각 PART 진행 상황을 RAISE NOTICE로 출력
--
-- 실행:
--   Neon 콘솔 → SQL Editor → 파일 내용 붙여넣기 → Run
--   또는: psql $DATABASE_URL -f 041_production_catchup_038_040.sql
--
-- 부분 실행: 에러 발생 시 PART 단위로 분리하여 개별 실행 가능
-- ═══════════════════════════════════════════════════════════════════════


-- =====================================================================
-- PART A: LlmUsageLog 라우팅 추적 필드 (T328~T329)
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART A: LlmUsageLog 라우팅 추적 필드 시작 ==='; END $$;

ALTER TABLE "llm_usage_logs" ADD COLUMN IF NOT EXISTS "routingReason" TEXT;
ALTER TABLE "llm_usage_logs" ADD COLUMN IF NOT EXISTS "batchGroupId" TEXT;
ALTER TABLE "llm_usage_logs" ADD COLUMN IF NOT EXISTS "isRegenerated" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "llm_usage_logs_routingReason_idx" ON "llm_usage_logs"("routingReason");

DO $$ BEGIN RAISE NOTICE '=== PART A 완료 ==='; END $$;


-- =====================================================================
-- PART B: Migration 038 — v4.0 Operations Models (T263~T275)
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART B: 038 Operations Models 시작 ==='; END $$;

-- T263: PersonaRelationship v4.0 fields
ALTER TABLE "persona_relationships"
  ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'STRANGER',
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'NEUTRAL',
  ADD COLUMN IF NOT EXISTS "positiveComments" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "negativeComments" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalInteractions" INTEGER NOT NULL DEFAULT 0;

-- T264: PersonaState activity counters
ALTER TABLE "persona_states"
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "postsThisWeek" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "commentsThisWeek" INTEGER NOT NULL DEFAULT 0;

-- T265: ConsumptionLog v4.0 fields
ALTER TABLE "consumption_logs"
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "interactionType" TEXT,
  ADD COLUMN IF NOT EXISTS "poignancyScore" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "retentionScore" DECIMAL(3,2);

CREATE INDEX IF NOT EXISTS "consumption_logs_sourceType_idx" ON "consumption_logs"("sourceType");

-- T266: PersonaActivityLog security/provenance fields
ALTER TABLE "persona_activity_logs"
  ADD COLUMN IF NOT EXISTS "securityCheck" JSONB,
  ADD COLUMN IF NOT EXISTS "provenanceData" JSONB;

-- T267: UserTrustScore
CREATE TABLE IF NOT EXISTS "user_trust_scores" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" DECIMAL(3,2) NOT NULL DEFAULT 0.80,
  "inspectionLevel" TEXT NOT NULL DEFAULT 'HIGH',
  "blockCount" INTEGER NOT NULL DEFAULT 0,
  "warnCount" INTEGER NOT NULL DEFAULT 0,
  "reportCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_trust_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_trust_scores_userId_key" ON "user_trust_scores"("userId");

DO $$ BEGIN
  ALTER TABLE "user_trust_scores" DROP CONSTRAINT IF EXISTS "user_trust_scores_userId_fkey";
  ALTER TABLE "user_trust_scores"
    ADD CONSTRAINT "user_trust_scores_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  RAISE NOTICE '  FK user_trust_scores_userId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK user_trust_scores_userId_fkey skipped: %', SQLERRM;
END $$;

-- T268: PWQuarantineEntry
CREATE TABLE IF NOT EXISTS "pw_quarantine_entries" (
  "id" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pw_quarantine_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pw_quarantine_entries_status_idx" ON "pw_quarantine_entries"("status");
CREATE INDEX IF NOT EXISTS "pw_quarantine_entries_personaId_idx" ON "pw_quarantine_entries"("personaId");
CREATE INDEX IF NOT EXISTS "pw_quarantine_entries_expiresAt_idx" ON "pw_quarantine_entries"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "pw_quarantine_entries" DROP CONSTRAINT IF EXISTS "pw_quarantine_entries_personaId_fkey";
  ALTER TABLE "pw_quarantine_entries"
    ADD CONSTRAINT "pw_quarantine_entries_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  RAISE NOTICE '  FK pw_quarantine_entries_personaId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK pw_quarantine_entries_personaId_fkey skipped: %', SQLERRM;
END $$;

-- T269: ModerationLog
CREATE TABLE IF NOT EXISTS "moderation_logs" (
  "id" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "personaId" TEXT,
  "stage" TEXT NOT NULL,
  "verdict" TEXT NOT NULL,
  "violations" JSONB,
  "actions" JSONB,
  "processingTimeMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moderation_logs_personaId_idx" ON "moderation_logs"("personaId");
CREATE INDEX IF NOT EXISTS "moderation_logs_contentId_idx" ON "moderation_logs"("contentId");
CREATE INDEX IF NOT EXISTS "moderation_logs_createdAt_idx" ON "moderation_logs"("createdAt");

-- T270: PostQualityLog + CommentQualityLog
CREATE TABLE IF NOT EXISTS "post_quality_logs" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "voiceSpecMatch" DECIMAL(3,2) NOT NULL,
  "factbookViolations" INTEGER NOT NULL DEFAULT 0,
  "repetitionScore" DECIMAL(3,2) NOT NULL,
  "topicRelevance" DECIMAL(3,2) NOT NULL,
  "overallScore" DECIMAL(3,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_quality_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "post_quality_logs_personaId_createdAt_idx" ON "post_quality_logs"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "post_quality_logs_postId_idx" ON "post_quality_logs"("postId");

CREATE TABLE IF NOT EXISTS "comment_quality_logs" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "toneMatch" DECIMAL(3,2) NOT NULL,
  "contextRelevance" DECIMAL(3,2) NOT NULL,
  "memoryReference" BOOLEAN NOT NULL DEFAULT false,
  "naturalness" DECIMAL(3,2) NOT NULL,
  "overallScore" DECIMAL(3,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comment_quality_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "comment_quality_logs_personaId_createdAt_idx" ON "comment_quality_logs"("personaId", "createdAt");
CREATE INDEX IF NOT EXISTS "comment_quality_logs_commentId_idx" ON "comment_quality_logs"("commentId");

-- T271: InterviewLog
CREATE TABLE IF NOT EXISTS "interview_logs" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "questionCount" INTEGER NOT NULL,
  "passCount" INTEGER NOT NULL,
  "warnCount" INTEGER NOT NULL,
  "failCount" INTEGER NOT NULL,
  "overallScore" DECIMAL(3,2) NOT NULL,
  "goldenSampleScore" DECIMAL(3,2),
  "contextualScore" DECIMAL(3,2),
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interview_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interview_logs_personaId_createdAt_idx" ON "interview_logs"("personaId", "createdAt");

-- T272: KPISnapshot
CREATE TABLE IF NOT EXISTS "kpi_snapshots" (
  "id" TEXT NOT NULL,
  "snapshotType" TEXT NOT NULL,
  "metrics" JSONB NOT NULL,
  "period" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kpi_snapshots_snapshotType_createdAt_idx" ON "kpi_snapshots"("snapshotType", "createdAt");

-- T273: DailyCostReport
CREATE TABLE IF NOT EXISTS "daily_cost_reports" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "totalCost" DECIMAL(10,4) NOT NULL,
  "postingCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "commentCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "interviewCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "arenaCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "otherCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "llmCalls" INTEGER NOT NULL DEFAULT 0,
  "cacheHitRate" DECIMAL(3,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_cost_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_cost_reports_date_key" ON "daily_cost_reports"("date");

-- T274: ContentReport
CREATE TABLE IF NOT EXISTS "content_reports" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "content_reports_status_idx" ON "content_reports"("status");
CREATE INDEX IF NOT EXISTS "content_reports_targetId_idx" ON "content_reports"("targetId");
CREATE INDEX IF NOT EXISTS "content_reports_reporterId_idx" ON "content_reports"("reporterId");

-- T275: BudgetConfig
CREATE TABLE IF NOT EXISTS "budget_configs" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "dailyBudget" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  "monthlyBudget" DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  "costMode" TEXT NOT NULL DEFAULT 'BALANCE',
  "alertThresholds" JSONB,
  "autoActions" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT,
  CONSTRAINT "budget_configs_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN RAISE NOTICE '=== PART B 완료 ==='; END $$;


-- =====================================================================
-- PART C: Migration 039 — Chat & Call System + Persona TTS Voice Profile
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART C: 039 Chat/Call/TTS 시작 ==='; END $$;

-- Enum 생성
DO $$ BEGIN
  CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'PERSONA');
  RAISE NOTICE '  ChatMessageRole enum created';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '  ChatMessageRole enum already exists';
END $$;

DO $$ BEGIN
  CREATE TYPE "CallReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');
  RAISE NOTICE '  CallReservationStatus enum created';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE '  CallReservationStatus enum already exists';
END $$;

-- Persona TTS Voice Profile 필드 추가
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsProvider" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsVoiceId" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsPitch" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsSpeed" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsLanguage" TEXT DEFAULT 'ko-KR';

-- ChatThread 테이블
CREATE TABLE IF NOT EXISTS "chat_threads" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT,
  "title" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "totalMessages" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_sessionId_key" ON "chat_threads"("sessionId");
CREATE INDEX IF NOT EXISTS "chat_threads_userId_idx" ON "chat_threads"("userId");
CREATE INDEX IF NOT EXISTS "chat_threads_personaId_idx" ON "chat_threads"("personaId");
CREATE INDEX IF NOT EXISTS "chat_threads_userId_lastMessageAt_idx" ON "chat_threads"("userId", "lastMessageAt");

DO $$ BEGIN
  ALTER TABLE "chat_threads" DROP CONSTRAINT IF EXISTS "chat_threads_personaId_fkey";
  ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  RAISE NOTICE '  FK chat_threads_personaId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK chat_threads_personaId_fkey skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE "chat_threads" DROP CONSTRAINT IF EXISTS "chat_threads_userId_fkey";
  ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  RAISE NOTICE '  FK chat_threads_userId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK chat_threads_userId_fkey skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE "chat_threads" DROP CONSTRAINT IF EXISTS "chat_threads_sessionId_fkey";
  ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "interaction_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  RAISE NOTICE '  FK chat_threads_sessionId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK chat_threads_sessionId_fkey skipped: %', SQLERRM;
END $$;

-- ChatMessage 테이블
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "role" "ChatMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "imageUrl" TEXT,
  "tokenCount" INTEGER,
  "poignancyScore" DECIMAL(4,3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_messages_threadId_createdAt_idx" ON "chat_messages"("threadId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_threadId_fkey";
  ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  RAISE NOTICE '  FK chat_messages_threadId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK chat_messages_threadId_fkey skipped: %', SQLERRM;
END $$;

-- CallReservation 테이블
CREATE TABLE IF NOT EXISTS "call_reservations" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" "CallReservationStatus" NOT NULL DEFAULT 'PENDING',
  "coinSpent" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "call_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "call_reservations_userId_idx" ON "call_reservations"("userId");
CREATE INDEX IF NOT EXISTS "call_reservations_personaId_idx" ON "call_reservations"("personaId");
CREATE INDEX IF NOT EXISTS "call_reservations_userId_scheduledAt_idx" ON "call_reservations"("userId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "call_reservations_status_scheduledAt_idx" ON "call_reservations"("status", "scheduledAt");

DO $$ BEGIN
  ALTER TABLE "call_reservations" DROP CONSTRAINT IF EXISTS "call_reservations_personaId_fkey";
  ALTER TABLE "call_reservations" ADD CONSTRAINT "call_reservations_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  RAISE NOTICE '  FK call_reservations_personaId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK call_reservations_personaId_fkey skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE "call_reservations" DROP CONSTRAINT IF EXISTS "call_reservations_userId_fkey";
  ALTER TABLE "call_reservations" ADD CONSTRAINT "call_reservations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  RAISE NOTICE '  FK call_reservations_userId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK call_reservations_userId_fkey skipped: %', SQLERRM;
END $$;

-- CallSession 테이블
CREATE TABLE IF NOT EXISTS "call_sessions" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "interactionSessionId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "totalTurns" INTEGER NOT NULL DEFAULT 0,
  "totalDurationSec" INTEGER,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "call_sessions_reservationId_key" ON "call_sessions"("reservationId");
CREATE UNIQUE INDEX IF NOT EXISTS "call_sessions_interactionSessionId_key" ON "call_sessions"("interactionSessionId");
CREATE INDEX IF NOT EXISTS "call_sessions_reservationId_idx" ON "call_sessions"("reservationId");

DO $$ BEGIN
  ALTER TABLE "call_sessions" DROP CONSTRAINT IF EXISTS "call_sessions_reservationId_fkey";
  ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "call_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  RAISE NOTICE '  FK call_sessions_reservationId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK call_sessions_reservationId_fkey skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE "call_sessions" DROP CONSTRAINT IF EXISTS "call_sessions_interactionSessionId_fkey";
  ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_interactionSessionId_fkey"
    FOREIGN KEY ("interactionSessionId") REFERENCES "interaction_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  RAISE NOTICE '  FK call_sessions_interactionSessionId_fkey created';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '  FK call_sessions_interactionSessionId_fkey skipped: %', SQLERRM;
END $$;

DO $$ BEGIN RAISE NOTICE '=== PART C 완료 ==='; END $$;


-- =====================================================================
-- PART D: Migration 040 — Persona TTS Seed Data + ShopItem 테이블
-- =====================================================================
DO $$ BEGIN RAISE NOTICE '=== PART D: 040 TTS Seed + ShopItem 시작 ==='; END $$;

-- 페르소나별 TTS 음성 시드 데이터
UPDATE "personas" SET
  "ttsProvider" = 'openai', "ttsVoiceId" = 'onyx', "ttsPitch" = 0.0, "ttsSpeed" = 0.92, "ttsLanguage" = 'ko-KR'
WHERE id = 'seed-논리적-평론가' AND "ttsProvider" IS NULL;

UPDATE "personas" SET
  "ttsProvider" = 'openai', "ttsVoiceId" = 'nova', "ttsPitch" = 0.0, "ttsSpeed" = 1.00, "ttsLanguage" = 'ko-KR'
WHERE id = 'seed-감성-에세이스트' AND "ttsProvider" IS NULL;

UPDATE "personas" SET
  "ttsProvider" = 'openai', "ttsVoiceId" = 'shimmer', "ttsPitch" = 0.0, "ttsSpeed" = 1.15, "ttsLanguage" = 'ko-KR'
WHERE id = 'seed-트렌드-헌터' AND "ttsProvider" IS NULL;

UPDATE "personas" SET
  "ttsProvider" = 'openai', "ttsVoiceId" = 'alloy', "ttsPitch" = 0.0, "ttsSpeed" = 1.05, "ttsLanguage" = 'ko-KR'
WHERE id = 'seed-균형-잡힌-가이드' AND "ttsProvider" IS NULL;

UPDATE "personas" SET
  "ttsProvider" = 'openai', "ttsVoiceId" = 'echo', "ttsPitch" = 0.0, "ttsSpeed" = 0.88, "ttsLanguage" = 'ko-KR'
WHERE id = 'seed-시네필-평론가' AND "ttsProvider" IS NULL;

-- ShopItem 관리 테이블
CREATE TABLE IF NOT EXISTS "pw_shop_items" (
  "id"           TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "item_key"     TEXT        NOT NULL UNIQUE,
  "name"         TEXT        NOT NULL,
  "description"  TEXT        NOT NULL,
  "price"        INTEGER     NOT NULL DEFAULT 0,
  "price_label"  TEXT,
  "category"     TEXT        NOT NULL DEFAULT 'persona',
  "emoji"        TEXT        NOT NULL DEFAULT '🎁',
  "repeatable"   BOOLEAN     NOT NULL DEFAULT false,
  "tag"          TEXT,
  "is_active"    BOOLEAN     NOT NULL DEFAULT true,
  "sort_order"   INTEGER     NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기본 상점 아이템 시드
INSERT INTO "pw_shop_items" ("item_key", "name", "description", "price", "price_label", "category", "emoji", "repeatable", "tag", "sort_order")
VALUES
  ('follow_slot_expand',      '팔로우 슬롯 확장',       '팔로우 가능 페르소나 수 +3 (기본 30개)',                150, NULL,          'persona',  '👥', true,  NULL,  1),
  ('premium_persona_unlock',  '프리미엄 페르소나 해금',   '특별 페르소나 1명을 해금합니다',                        200, NULL,          'persona',  '🌟', true,  'HOT', 2),
  ('persona_chat',            '페르소나 1:1 대화',       'AI 페르소나와 1:1 채팅 (턴마다 코인 차감)',              10,  '10 코인/턴',  'persona',  '💬', true,  'NEW', 3),
  ('persona_call_reservation','페르소나 통화 예약',       '페르소나와 통화 약속 — 약속 시간에 페르소나가 전화',       200, NULL,          'persona',  '📞', true,  'NEW', 4),
  ('profile_reset',           '성향 초기화',             '온보딩 벡터 리셋 — 처음부터 다시 시작',                 100, NULL,          'profile',  '🔄', true,  NULL,  5),
  ('badge_taste_expert',      '배지: 취향 전문가',       '프로필에 ''취향 전문가'' 배지가 표시됩니다',              80,  NULL,          'profile',  '🎯', false, NULL,  6),
  ('badge_early_adopter',     '배지: 얼리어답터',        '프로필에 ''얼리어답터'' 배지가 표시됩니다',               50,  NULL,          'profile',  '🚀', false, 'NEW', 7),
  ('badge_trendsetter',       '배지: 트렌드세터',        '프로필에 ''트렌드세터'' 배지가 표시됩니다',               80,  NULL,          'profile',  '🔥', false, NULL,  8),
  ('nickname_gradient',       '닉네임 그라데이션',       '닉네임에 PW 시그니처 그라데이션을 적용합니다',            120, NULL,          'profile',  '🌈', false, 'HOT', 9),
  ('frame_gold',              '프로필 프레임: 골드',      '프로필 이미지에 골드 프레임을 적용합니다',                100, NULL,          'profile',  '👑', false, NULL,  10),
  ('frame_hologram',          '프로필 프레임: 홀로그램',   '프로필 이미지에 홀로그램 프레임을 적용합니다',            150, NULL,          'profile',  '💎', false, NULL,  11)
ON CONFLICT ("item_key") DO NOTHING;

DO $$ BEGIN RAISE NOTICE '=== PART D 완료 ==='; END $$;


-- ═══════════════════════════════════════════════════════════════════════
-- 전체 완료! 검증 쿼리:
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'llm_usage_logs' AND column_name IN ('routingReason', 'batchGroupId', 'isRegenerated');
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'personas' AND column_name IN ('ttsProvider', 'ttsVoiceId', 'ttsPitch', 'ttsSpeed', 'ttsLanguage');
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'persona_states' AND column_name IN ('lastActivityAt', 'postsThisWeek', 'commentsThisWeek');
--
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--   AND tablename IN ('user_trust_scores', 'pw_quarantine_entries', 'moderation_logs',
--     'post_quality_logs', 'comment_quality_logs', 'interview_logs', 'kpi_snapshots',
--     'daily_cost_reports', 'content_reports', 'budget_configs', 'chat_threads',
--     'chat_messages', 'call_reservations', 'call_sessions', 'pw_shop_items')
--   ORDER BY tablename;
-- ═══════════════════════════════════════════════════════════════════════
