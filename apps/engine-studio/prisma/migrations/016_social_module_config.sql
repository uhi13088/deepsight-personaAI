-- ============================================
-- T147: Social Module Config 테이블
-- 글로벌 싱글톤: 4개 소셜 모듈 ON/OFF + 가중치
-- ============================================

CREATE TABLE IF NOT EXISTS "social_module_config" (
    "id"            TEXT NOT NULL DEFAULT 'singleton',
    "authority"     JSONB NOT NULL DEFAULT '{"enabled":false,"weight":0.2}',
    "connectivity"  JSONB NOT NULL DEFAULT '{"enabled":true,"weight":0.3}',
    "reputation"    JSONB NOT NULL DEFAULT '{"enabled":true,"weight":0.3}',
    "tribalism"     JSONB NOT NULL DEFAULT '{"enabled":false,"weight":0.2}',
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy"     TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "social_module_config_pkey" PRIMARY KEY ("id")
);

-- 기본 싱글톤 row 삽입 (이미 있으면 무시)
INSERT INTO "social_module_config" ("id", "updatedBy")
VALUES ('singleton', 'system')
ON CONFLICT ("id") DO NOTHING;
