-- 026: PersonaWorld 보안 감사 로그 테이블
-- SNS OAuth 토큰 접근, 데이터 분석, 소유권 거부 등 보안 이벤트 기록

CREATE TABLE IF NOT EXISTS "pw_security_logs" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "eventType"   TEXT NOT NULL,
    "details"     JSONB,
    "ipAddress"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pw_security_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pw_security_logs_userId_createdAt_idx" ON "pw_security_logs"("userId", "createdAt");
CREATE INDEX "pw_security_logs_eventType_createdAt_idx" ON "pw_security_logs"("eventType", "createdAt");
