-- Migration: 047_persona_few_shot_enabled
-- Few-shot 예시 주입 활성화 플래그 (품질 실험용)
ALTER TABLE "personas"
  ADD COLUMN IF NOT EXISTS "fewShotEnabled" BOOLEAN NOT NULL DEFAULT FALSE;
