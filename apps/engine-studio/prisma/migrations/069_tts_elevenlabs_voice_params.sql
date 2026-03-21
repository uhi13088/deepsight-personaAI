-- 069: ElevenLabs TTS 음성 파라미터 컬럼 추가
-- 기존 페르소나는 NULL → voice-pipeline에서 기본값 fallback

ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "ttsStability" DECIMAL(3,2);
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "ttsSimilarityBoost" DECIMAL(3,2);
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "ttsStyle" DECIMAL(3,2);
