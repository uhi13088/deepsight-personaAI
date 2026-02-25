-- 005_sync_schema.sql
-- Prisma 스키마와 DB 동기화 — 누락된 enum, 컬럼, 테이블 추가
-- Supabase SQL Editor에서 실행

-- ============================================
-- 1. 누락 enum 타입 생성
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PersonaVisibility') THEN
    CREATE TYPE "PersonaVisibility" AS ENUM ('GLOBAL', 'PRIVATE', 'SHARED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpertiseLevel') THEN
    CREATE TYPE "ExpertiseLevel" AS ENUM ('CASUAL', 'ENTHUSIAST', 'EXPERT', 'CRITIC');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostFrequency') THEN
    CREATE TYPE "PostFrequency" AS ENUM ('RARE', 'OCCASIONAL', 'MODERATE', 'ACTIVE', 'HYPERACTIVE');
  END IF;
END $$;

-- ============================================
-- 2. personas 테이블 누락 컬럼 추가
-- ============================================

-- Layer 2: 캐릭터 속성
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "visibility" "PersonaVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "sharedWithOrgs" TEXT[] DEFAULT '{}';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "handle" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'KR';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT '{}';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "knowledgeAreas" TEXT[] DEFAULT '{}';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "warmth" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "expertiseLevel" "ExpertiseLevel" NOT NULL DEFAULT 'ENTHUSIAST';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "speechPatterns" TEXT[] DEFAULT '{}';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "quirks" TEXT[] DEFAULT '{}';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "background" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "favoriteGenres" TEXT[] DEFAULT '{}';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "dislikedGenres" TEXT[] DEFAULT '{}';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "viewingHabits" TEXT;

-- 활동성 속성
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "sociability" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "initiative" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "expressiveness" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "interactivity" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "postFrequency" "PostFrequency" NOT NULL DEFAULT 'MODERATE';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "activeHours" INTEGER[] DEFAULT '{}';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "peakHours" INTEGER[] DEFAULT '{}';

-- 콘텐츠/관계 설정
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "contentSettings" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "relationshipSettings" JSONB;

-- 프롬프트 템플릿
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "promptVersion" TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "basePrompt" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "reviewPrompt" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "postPrompt" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "commentPrompt" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "interactionPrompt" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "specialPrompts" JSONB;

-- 품질/검증
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "consistencyScore" DECIMAL(3,2);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "validationVersion" INTEGER;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "lastValidationDate" TIMESTAMP(3);

-- 생성 소스
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "generationConfig" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "parentPersonaId" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "sampleContents" JSONB;

-- v3.0 Paradox & Dynamics
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "paradoxConfig" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "dynamicsConfig" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "backstory" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "pressureContext" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "voiceProfile" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "zeitgeist" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "interactionRules" JSONB;

-- v4.0 Instruction Layer
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "voiceSpec" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "factbook" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "triggerMap" JSONB;

-- v3.0 Archetype & Scores
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "archetypeId" TEXT;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "paradoxScore" DECIMAL(4,3);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "dimensionalityScore" DECIMAL(4,3);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "engineVersion" TEXT DEFAULT '4.0';

-- 타임스탬프
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- ============================================
-- 3. persona_layer_vectors 테이블 (IF NOT EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_layer_vectors" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "personaId" TEXT NOT NULL,
  "layerType" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "dim1" DECIMAL(6,4), "dim2" DECIMAL(6,4), "dim3" DECIMAL(6,4), "dim4" DECIMAL(6,4),
  "dim5" DECIMAL(6,4), "dim6" DECIMAL(6,4), "dim7" DECIMAL(6,4), "dim8" DECIMAL(6,4),
  "dim9" DECIMAL(6,4), "dim10" DECIMAL(6,4), "dim11" DECIMAL(6,4), "dim12" DECIMAL(6,4),
  "dim13" DECIMAL(6,4), "dim14" DECIMAL(6,4), "dim15" DECIMAL(6,4), "dim16" DECIMAL(6,4),
  "dim17" DECIMAL(6,4), "dim18" DECIMAL(6,4), "dim19" DECIMAL(6,4), "dim20" DECIMAL(6,4),
  "dim21" DECIMAL(6,4), "dim22" DECIMAL(6,4), "dim23" DECIMAL(6,4), "dim24" DECIMAL(6,4),
  "dim25" DECIMAL(6,4), "dim26" DECIMAL(6,4), "dim27" DECIMAL(6,4), "dim28" DECIMAL(6,4),
  "dim29" DECIMAL(6,4), "dim30" DECIMAL(6,4), "dim31" DECIMAL(6,4), "dim32" DECIMAL(6,4),
  "dim33" DECIMAL(6,4), "dim34" DECIMAL(6,4), "dim35" DECIMAL(6,4), "dim36" DECIMAL(6,4),
  "dim37" DECIMAL(6,4), "dim38" DECIMAL(6,4), "dim39" DECIMAL(6,4), "dim40" DECIMAL(6,4),
  "dim41" DECIMAL(6,4), "dim42" DECIMAL(6,4), "dim43" DECIMAL(6,4), "dim44" DECIMAL(6,4),
  "dim45" DECIMAL(6,4), "dim46" DECIMAL(6,4), "dim47" DECIMAL(6,4), "dim48" DECIMAL(6,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_layer_vectors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_layer_vectors_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "persona_layer_vectors_personaId_idx" ON "persona_layer_vectors"("personaId");
CREATE INDEX IF NOT EXISTS "persona_layer_vectors_layerType_idx" ON "persona_layer_vectors"("layerType");

-- ============================================
-- 4. persona_states 테이블 (IF NOT EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_states" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "personaId" TEXT NOT NULL,
  "mood" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "energy" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  "socialBattery" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  "paradoxTension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "narrativeTension" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_states_personaId_key" UNIQUE ("personaId"),
  CONSTRAINT "persona_states_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 5. persona_relationships 테이블 (IF NOT EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_relationships" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "personaAId" TEXT NOT NULL,
  "personaBId" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL DEFAULT 'NEUTRAL',
  "strength" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "sentiment" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "interactionCount" INTEGER NOT NULL DEFAULT 0,
  "lastInteractionAt" TIMESTAMP(3),
  "context" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "persona_relationships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persona_relationships_personaAId_fkey"
    FOREIGN KEY ("personaAId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "persona_relationships_personaBId_fkey"
    FOREIGN KEY ("personaBId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "persona_relationships_pair_idx" ON "persona_relationships"("personaAId", "personaBId");
CREATE INDEX IF NOT EXISTS "persona_relationships_personaBId_idx" ON "persona_relationships"("personaBId");

-- ============================================
-- Done
-- ============================================
SELECT 'Schema sync complete!' AS result;
