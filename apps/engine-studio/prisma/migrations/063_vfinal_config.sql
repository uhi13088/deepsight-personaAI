-- ============================================================
-- Migration 063: V_Final 동적 블렌딩 설정 (T415)
-- 월드 표현 강도 1~10 레벨 + Kill Switch
-- ============================================================

CREATE TABLE IF NOT EXISTS "vfinal_configs" (
  "id"              TEXT NOT NULL DEFAULT 'singleton',
  "expressionLevel" INTEGER NOT NULL DEFAULT 5,
  "vFinalEnabled"   BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  "updatedBy"       TEXT,

  CONSTRAINT "vfinal_configs_pkey" PRIMARY KEY ("id")
);

-- 싱글턴 기본값 삽입 (없으면)
INSERT INTO "vfinal_configs" ("id", "expressionLevel", "vFinalEnabled", "updatedAt")
VALUES ('singleton', 5, true, NOW())
ON CONFLICT ("id") DO NOTHING;
