-- 059: PersonaGenerationRequest에 creditSpent 컬럼 추가
-- 70% 이상 유사도 유저의 크레딧 기반 페르소나 요청 지원

ALTER TABLE "persona_generation_requests"
  ADD COLUMN IF NOT EXISTS "creditSpent" INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN "persona_generation_requests"."creditSpent"
  IS '크레딧 사용량 (0=무료 요청, 300=유료 요청)';
