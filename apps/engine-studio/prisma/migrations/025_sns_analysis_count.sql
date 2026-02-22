-- 025: SNS LLM 분석 횟수 추적 (최초 1회 무료, 이후 크레딧 차감)
ALTER TABLE "persona_world_users" ADD COLUMN "sns_analysis_count" INTEGER NOT NULL DEFAULT 0;
