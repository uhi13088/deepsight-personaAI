-- T143: 프롬프트 캐싱 — LlmUsageLog 캐시 추적 필드
ALTER TABLE "llm_usage_logs" ADD COLUMN "cacheCreationInputTokens" INTEGER;
ALTER TABLE "llm_usage_logs" ADD COLUMN "cacheReadInputTokens" INTEGER;
ALTER TABLE "llm_usage_logs" ADD COLUMN "cacheSavingsUsd" DECIMAL(10, 6);
