-- 008: Persona Engine v3 컬럼 + persona_layer_vectors 테이블
-- Prisma 스키마에 정의된 v3 필드 중 실제 DB에 누락된 항목 추가
-- 멱등성(Idempotent): 중복 실행해도 안전합니다

-- ============================================
-- 1. 누락된 Enum 타입 생성
-- ============================================

-- LayerType (persona_layer_vectors에서 사용)
DO $$ BEGIN CREATE TYPE "LayerType" AS ENUM ('SOCIAL', 'TEMPERAMENT', 'NARRATIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ExpertiseLevel (personas.expertiseLevel — 현재 TEXT, 추후 enum 전환 대비)
DO $$ BEGIN CREATE TYPE "ExpertiseLevel" AS ENUM ('CASUAL', 'ENTHUSIAST', 'EXPERT', 'CRITIC'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- PostFrequency (personas.postFrequency — 현재 TEXT, 추후 enum 전환 대비)
DO $$ BEGIN CREATE TYPE "PostFrequency" AS ENUM ('RARE', 'OCCASIONAL', 'MODERATE', 'ACTIVE', 'HYPERACTIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- 2. personas 테이블 — v3 컬럼 추가
-- ============================================

-- v3.0 NEW: Archetype & Scores
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "archetypeId" TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "paradoxScore" DECIMAL(4,3);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "dimensionalityScore" DECIMAL(4,3);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "engineVersion" TEXT DEFAULT '3.0';

-- v3.0 NEW: 3-Layer Paradox & Dynamics (JSON)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "paradoxConfig" JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "dynamicsConfig" JSONB;

-- v3.0 NEW: Qualitative Dimensions (JSON)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "backstory" JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "pressureContext" JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "voiceProfile" JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "zeitgeist" JSONB;

-- v3.0 NEW: Interaction Rules (JSON)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "interactionRules" JSONB;

-- ============================================
-- 3. persona_layer_vectors 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS "persona_layer_vectors" (
    "id" TEXT NOT NULL DEFAULT generate_cuid(),
    "personaId" TEXT NOT NULL,
    "layerType" "LayerType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    -- Decimal(4,3) = 0.000~1.000 range
    -- SOCIAL(L1): dim1~dim7, TEMPERAMENT(L2): dim1~dim5, NARRATIVE(L3): dim1~dim4
    "dim1" DECIMAL(4,3),
    "dim2" DECIMAL(4,3),
    "dim3" DECIMAL(4,3),
    "dim4" DECIMAL(4,3),
    "dim5" DECIMAL(4,3),
    "dim6" DECIMAL(4,3),
    "dim7" DECIMAL(4,3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_layer_vectors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "persona_layer_vectors_personaId_fkey"
        FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique constraint: 하나의 페르소나에 layerType+version 조합은 유일
CREATE UNIQUE INDEX IF NOT EXISTS "persona_layer_vectors_personaId_layerType_version_key"
    ON "persona_layer_vectors"("personaId", "layerType", "version");

CREATE INDEX IF NOT EXISTS "persona_layer_vectors_personaId_idx"
    ON "persona_layer_vectors"("personaId");

CREATE INDEX IF NOT EXISTS "persona_layer_vectors_layerType_idx"
    ON "persona_layer_vectors"("layerType");

-- ============================================
-- 4. expertiseLevel / postFrequency TEXT → Enum 전환
--    (기존 데이터 호환성 유지: USING 캐스팅)
-- ============================================

-- expertiseLevel: TEXT → "ExpertiseLevel" enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'personas' AND column_name = 'expertiseLevel' AND data_type = 'text'
    ) THEN
        ALTER TABLE personas
            ALTER COLUMN "expertiseLevel" TYPE "ExpertiseLevel"
            USING "expertiseLevel"::"ExpertiseLevel";
        ALTER TABLE personas
            ALTER COLUMN "expertiseLevel" SET DEFAULT 'ENTHUSIAST'::"ExpertiseLevel";
    END IF;
END $$;

-- postFrequency: TEXT → "PostFrequency" enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'personas' AND column_name = 'postFrequency' AND data_type = 'text'
    ) THEN
        ALTER TABLE personas
            ALTER COLUMN "postFrequency" TYPE "PostFrequency"
            USING "postFrequency"::"PostFrequency";
        ALTER TABLE personas
            ALTER COLUMN "postFrequency" SET DEFAULT 'MODERATE'::"PostFrequency";
    END IF;
END $$;

-- ============================================
-- 검증 쿼리
-- ============================================

-- v3 컬럼 존재 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'personas'
  AND column_name IN ('archetypeId', 'paradoxScore', 'dimensionalityScore', 'engineVersion',
                       'paradoxConfig', 'dynamicsConfig', 'backstory', 'pressureContext',
                       'voiceProfile', 'zeitgeist', 'interactionRules')
ORDER BY column_name;

-- persona_layer_vectors 테이블 존재 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'persona_layer_vectors'
ORDER BY ordinal_position;
