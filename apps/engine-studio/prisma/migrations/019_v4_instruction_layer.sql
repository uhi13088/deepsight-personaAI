-- ═══════════════════════════════════════════════════════════════
-- 019: v4.0 Instruction Layer — VoiceSpec + Factbook + TriggerMap
-- T158: 페르소나 생성 파이프라인 v4 통합
-- ═══════════════════════════════════════════════════════════════

-- v4.0 Instruction Layer 필드 추가
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "voiceSpec" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "factbook" JSONB;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "triggerMap" JSONB;

-- engineVersion 기본값 4.0으로 변경 (신규 생성 페르소나)
ALTER TABLE "personas" ALTER COLUMN "engineVersion" SET DEFAULT '4.0';
