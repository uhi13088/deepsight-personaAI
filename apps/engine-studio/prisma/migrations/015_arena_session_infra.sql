-- T144: 아레나 세션 인프라 — 물리적 격리된 아레나 테이블
-- ArenaSession, ArenaTurn, ArenaJudgment, ArenaCorrectionRequest, ArenaTokenUsage

-- Enums
CREATE TYPE "ArenaMode" AS ENUM ('SPARRING_1V1');
CREATE TYPE "ArenaSessionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ProfileLoadLevel" AS ENUM ('FULL', 'STANDARD', 'LITE');
CREATE TYPE "ArenaJudgmentMethod" AS ENUM ('RULE_BASED', 'LLM');
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ArenaTokenPhase" AS ENUM ('TURN', 'JUDGMENT', 'PROFILE_LOAD');

-- ArenaSession
CREATE TABLE "arena_sessions" (
    "id" TEXT NOT NULL,
    "mode" "ArenaMode" NOT NULL DEFAULT 'SPARRING_1V1',
    "participantA" TEXT NOT NULL,
    "participantB" TEXT NOT NULL,
    "profileLoadLevel" "ProfileLoadLevel" NOT NULL DEFAULT 'STANDARD',
    "topic" TEXT NOT NULL,
    "maxTurns" INTEGER NOT NULL DEFAULT 6,
    "budgetTokens" INTEGER NOT NULL DEFAULT 10000,
    "usedTokens" INTEGER NOT NULL DEFAULT 0,
    "status" "ArenaSessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "arena_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "arena_sessions_status_idx" ON "arena_sessions"("status");
CREATE INDEX "arena_sessions_participantA_idx" ON "arena_sessions"("participantA");
CREATE INDEX "arena_sessions_participantB_idx" ON "arena_sessions"("participantB");
CREATE INDEX "arena_sessions_createdAt_idx" ON "arena_sessions"("createdAt");

-- ArenaTurn
CREATE TABLE "arena_turns" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "speakerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vectorSnapshot" JSONB,
    "poignancy" DECIMAL(3,2),

    CONSTRAINT "arena_turns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "arena_turns_sessionId_turnNumber_key" ON "arena_turns"("sessionId", "turnNumber");
CREATE INDEX "arena_turns_sessionId_idx" ON "arena_turns"("sessionId");
CREATE INDEX "arena_turns_speakerId_idx" ON "arena_turns"("speakerId");

ALTER TABLE "arena_turns" ADD CONSTRAINT "arena_turns_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "arena_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ArenaJudgment
CREATE TABLE "arena_judgments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "method" "ArenaJudgmentMethod" NOT NULL DEFAULT 'RULE_BASED',
    "characterConsistency" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "l2Emergence" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "paradoxEmergence" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "triggerResponse" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "overallScore" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "issues" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL DEFAULT '',
    "judgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arena_judgments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "arena_judgments_sessionId_key" ON "arena_judgments"("sessionId");
CREATE INDEX "arena_judgments_sessionId_idx" ON "arena_judgments"("sessionId");

ALTER TABLE "arena_judgments" ADD CONSTRAINT "arena_judgments_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "arena_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ArenaCorrectionRequest
CREATE TABLE "arena_correction_requests" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "judgmentId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "correctedContent" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "arena_correction_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "arena_correction_requests_sessionId_idx" ON "arena_correction_requests"("sessionId");
CREATE INDEX "arena_correction_requests_judgmentId_idx" ON "arena_correction_requests"("judgmentId");
CREATE INDEX "arena_correction_requests_status_idx" ON "arena_correction_requests"("status");

ALTER TABLE "arena_correction_requests" ADD CONSTRAINT "arena_correction_requests_judgmentId_fkey"
    FOREIGN KEY ("judgmentId") REFERENCES "arena_judgments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ArenaTokenUsage
CREATE TABLE "arena_token_usage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "turnId" TEXT,
    "phase" "ArenaTokenPhase" NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arena_token_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "arena_token_usage_sessionId_idx" ON "arena_token_usage"("sessionId");

ALTER TABLE "arena_token_usage" ADD CONSTRAINT "arena_token_usage_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "arena_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
