-- v4.0 Security: SystemSafetyConfig table (Kill Switch)
-- T141: 긴급 동결 + 기능별 토글 + 자동 트리거

CREATE TABLE "system_safety_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "emergencyFreeze" BOOLEAN NOT NULL DEFAULT false,
    "freezeReason" TEXT,
    "freezeAt" TIMESTAMP(3),
    "featureToggles" JSONB NOT NULL,
    "autoTriggers" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "system_safety_config_pkey" PRIMARY KEY ("id")
);
