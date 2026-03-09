-- 055: AutonomyPolicy 필드 추가 (T400)
-- per-persona 자율 동작 정책 (교정/기억/메타인지)
-- JSON 타입: AutonomyPolicy interface

ALTER TABLE "personas"
ADD COLUMN IF NOT EXISTS "autonomyPolicy" JSONB;

COMMENT ON COLUMN "personas"."autonomyPolicy" IS 'v5.0 AutonomyPolicy — autoCorrection, autoMemoryManagement, metaCognitionEnabled + correctionConfig + memoryConfig';
