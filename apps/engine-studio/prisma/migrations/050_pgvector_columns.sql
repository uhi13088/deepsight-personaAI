-- T381: pgvector 확장 활성화 + PersonaLayerVector 벡터 컬럼 추가
-- L1(SOCIAL) 7D, L2(TEMPERAMENT) 5D, L3(NARRATIVE) 4D → pgvector 컬럼으로 전환
-- 기존 dim1~dim7 Decimal 컬럼은 유지 (하위 호환), 벡터 컬럼은 병렬 추가

-- Step 1: pgvector 확장 활성화 (Neon PostgreSQL 지원)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: 벡터 컬럼 추가
ALTER TABLE "persona_layer_vectors"
  ADD COLUMN IF NOT EXISTS "l1Vec" vector(7),
  ADD COLUMN IF NOT EXISTS "l2Vec" vector(5),
  ADD COLUMN IF NOT EXISTS "l3Vec" vector(4);

-- Step 3: 기존 dim1~dim7 데이터를 벡터 컬럼으로 복사
-- L1(SOCIAL): dim1~dim7 → l1Vec
UPDATE "persona_layer_vectors"
SET "l1Vec" = CASE
  WHEN "layerType" = 'SOCIAL' AND "dim1" IS NOT NULL
  THEN CAST(
    '[' ||
    COALESCE(CAST("dim1" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim2" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim3" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim4" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim5" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim6" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim7" AS TEXT), '0') ||
    ']' AS vector(7))
  ELSE NULL
END
WHERE "layerType" = 'SOCIAL';

-- L2(TEMPERAMENT): dim1~dim5 → l2Vec
UPDATE "persona_layer_vectors"
SET "l2Vec" = CASE
  WHEN "layerType" = 'TEMPERAMENT' AND "dim1" IS NOT NULL
  THEN CAST(
    '[' ||
    COALESCE(CAST("dim1" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim2" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim3" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim4" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim5" AS TEXT), '0') ||
    ']' AS vector(5))
  ELSE NULL
END
WHERE "layerType" = 'TEMPERAMENT';

-- L3(NARRATIVE): dim1~dim4 → l3Vec
UPDATE "persona_layer_vectors"
SET "l3Vec" = CASE
  WHEN "layerType" = 'NARRATIVE' AND "dim1" IS NOT NULL
  THEN CAST(
    '[' ||
    COALESCE(CAST("dim1" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim2" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim3" AS TEXT), '0') || ',' ||
    COALESCE(CAST("dim4" AS TEXT), '0') ||
    ']' AS vector(4))
  ELSE NULL
END
WHERE "layerType" = 'NARRATIVE';
