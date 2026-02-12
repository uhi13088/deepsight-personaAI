-- PersonaWorld v3: 동적 상태 + 관계 + 소비 기록
-- 구현계획서 §2 데이터 모델 확장

-- ============================================
-- 1. New Enums
-- ============================================

CREATE TYPE "ConsumptionContentType" AS ENUM ('MOVIE', 'DRAMA', 'MUSIC', 'BOOK', 'ARTICLE', 'GAME', 'OTHER');
CREATE TYPE "ConsumptionSource" AS ENUM ('AUTONOMOUS', 'FEED', 'RECOMMENDATION', 'ONBOARDING');

-- ============================================
-- 2. PersonaState (신규 모델)
-- ============================================

CREATE TABLE "persona_states" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "mood" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "energy" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "socialBattery" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "paradoxTension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "persona_states_personaId_key" ON "persona_states"("personaId");

ALTER TABLE "persona_states"
    ADD CONSTRAINT "persona_states_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 3. PersonaRelationship (신규 모델)
-- ============================================

CREATE TABLE "persona_relationships" (
    "id" TEXT NOT NULL,
    "personaAId" TEXT NOT NULL,
    "personaBId" TEXT NOT NULL,
    "warmth" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "tension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "frequency" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "depth" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "lastInteractionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_relationships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "persona_relationships_personaAId_personaBId_key"
    ON "persona_relationships"("personaAId", "personaBId");
CREATE INDEX "persona_relationships_personaAId_idx" ON "persona_relationships"("personaAId");
CREATE INDEX "persona_relationships_personaBId_idx" ON "persona_relationships"("personaBId");

ALTER TABLE "persona_relationships"
    ADD CONSTRAINT "persona_relationships_personaAId_fkey"
    FOREIGN KEY ("personaAId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "persona_relationships"
    ADD CONSTRAINT "persona_relationships_personaBId_fkey"
    FOREIGN KEY ("personaBId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 4. ConsumptionLog (신규 모델)
-- ============================================

CREATE TABLE "consumption_logs" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "contentType" "ConsumptionContentType" NOT NULL,
    "contentId" TEXT,
    "title" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "rating" DECIMAL(3,2),
    "emotionalImpact" DECIMAL(3,2) NOT NULL,
    "tags" TEXT[],
    "source" "ConsumptionSource" NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumption_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consumption_logs_personaId_consumedAt_idx"
    ON "consumption_logs"("personaId", "consumedAt");
CREATE INDEX "consumption_logs_personaId_tags_idx"
    ON "consumption_logs"("personaId", "tags");

ALTER TABLE "consumption_logs"
    ADD CONSTRAINT "consumption_logs_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 5. PersonaWorldUser 확장 (L2 OCEAN + profileLevel)
-- ============================================

ALTER TABLE "persona_world_users" ADD COLUMN "openness" DECIMAL(3,2);
ALTER TABLE "persona_world_users" ADD COLUMN "conscientiousness" DECIMAL(3,2);
ALTER TABLE "persona_world_users" ADD COLUMN "extraversion" DECIMAL(3,2);
ALTER TABLE "persona_world_users" ADD COLUMN "agreeableness" DECIMAL(3,2);
ALTER TABLE "persona_world_users" ADD COLUMN "neuroticism" DECIMAL(3,2);
ALTER TABLE "persona_world_users" ADD COLUMN "hasOceanProfile" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "persona_world_users" ADD COLUMN "profile_level" TEXT NOT NULL DEFAULT 'BASIC';

-- ============================================
-- 6. PersonaActivityLog 확장 (v3 필드)
-- ============================================

ALTER TABLE "persona_activity_logs" ADD COLUMN "postTypeReason" JSONB;
ALTER TABLE "persona_activity_logs" ADD COLUMN "stateSnapshot" JSONB;
ALTER TABLE "persona_activity_logs" ADD COLUMN "matching_score" DECIMAL(4,3);
