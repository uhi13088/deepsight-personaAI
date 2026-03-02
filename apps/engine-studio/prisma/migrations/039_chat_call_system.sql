-- 039: 1:1 채팅 + 통화 시스템 (T330)
-- ChatThread, ChatMessage, CallReservation, CallSession 모델
-- Persona TTS Voice Profile 필드

-- ============================================
-- Enum 생성
-- ============================================

DO $$ BEGIN
  CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'PERSONA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CallReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Persona TTS Voice Profile 필드 추가
-- ============================================

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsProvider" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsVoiceId" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsPitch" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsSpeed" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "ttsLanguage" TEXT DEFAULT 'ko-KR';

-- ============================================
-- ChatThread 테이블
-- ============================================

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
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_sessionId_key" ON "chat_threads"("sessionId");
CREATE INDEX IF NOT EXISTS "chat_threads_userId_idx" ON "chat_threads"("userId");
CREATE INDEX IF NOT EXISTS "chat_threads_personaId_idx" ON "chat_threads"("personaId");
CREATE INDEX IF NOT EXISTS "chat_threads_userId_lastMessageAt_idx" ON "chat_threads"("userId", "lastMessageAt");

ALTER TABLE "chat_threads" DROP CONSTRAINT IF EXISTS "chat_threads_personaId_fkey";
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_personaId_fkey"
  FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_threads" DROP CONSTRAINT IF EXISTS "chat_threads_userId_fkey";
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_threads" DROP CONSTRAINT IF EXISTS "chat_threads_sessionId_fkey";
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "interaction_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- ChatMessage 테이블
-- ============================================

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

ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_threadId_fkey";
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CallReservation 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS "call_reservations" (
  "id" TEXT NOT NULL,
  "personaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" "CallReservationStatus" NOT NULL DEFAULT 'PENDING',
  "coinSpent" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "call_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "call_reservations_userId_idx" ON "call_reservations"("userId");
CREATE INDEX IF NOT EXISTS "call_reservations_personaId_idx" ON "call_reservations"("personaId");
CREATE INDEX IF NOT EXISTS "call_reservations_userId_scheduledAt_idx" ON "call_reservations"("userId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "call_reservations_status_scheduledAt_idx" ON "call_reservations"("status", "scheduledAt");

ALTER TABLE "call_reservations" DROP CONSTRAINT IF EXISTS "call_reservations_personaId_fkey";
ALTER TABLE "call_reservations" ADD CONSTRAINT "call_reservations_personaId_fkey"
  FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "call_reservations" DROP CONSTRAINT IF EXISTS "call_reservations_userId_fkey";
ALTER TABLE "call_reservations" ADD CONSTRAINT "call_reservations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CallSession 테이블
-- ============================================

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

ALTER TABLE "call_sessions" DROP CONSTRAINT IF EXISTS "call_sessions_reservationId_fkey";
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "call_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "call_sessions" DROP CONSTRAINT IF EXISTS "call_sessions_interactionSessionId_fkey";
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_interactionSessionId_fkey"
  FOREIGN KEY ("interactionSessionId") REFERENCES "interaction_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
