-- ============================================================
-- Migration 045: v5.0 Semantic Memory Layer (T408)
-- 페르소나의 압축된 자아관 테이블 추가
-- ============================================================

-- SemanticMemoryCategory enum
CREATE TYPE "SemanticMemoryCategory" AS ENUM (
  'BELIEF',
  'RELATIONSHIP_MODEL',
  'LEARNED_PATTERN',
  'SELF_NARRATIVE'
);

-- semantic_memories 테이블
CREATE TABLE "semantic_memories" (
  "id"               TEXT NOT NULL,
  "personaId"        TEXT NOT NULL,
  "category"         "SemanticMemoryCategory" NOT NULL,
  "subject"          TEXT NOT NULL,
  "belief"           TEXT NOT NULL,
  "confidence"       DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  "evidenceCount"    INTEGER NOT NULL DEFAULT 1,
  "sourceEpisodeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "l3Influence"      JSONB,
  "consolidatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "semantic_memories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "semantic_memories_personaId_fkey"
    FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX "semantic_memories_personaId_category_idx"
  ON "semantic_memories"("personaId", "category");

CREATE INDEX "semantic_memories_personaId_confidence_idx"
  ON "semantic_memories"("personaId", "confidence");

CREATE INDEX "semantic_memories_personaId_consolidatedAt_idx"
  ON "semantic_memories"("personaId", "consolidatedAt");
