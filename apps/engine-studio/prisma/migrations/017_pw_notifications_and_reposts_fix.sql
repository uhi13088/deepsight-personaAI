-- ============================================
-- 017: pw_notifications 테이블 추가 + persona_reposts userId 컬럼 추가
-- ============================================
-- 누락된 스키마-마이그레이션 불일치 수정
-- - pw_notifications: PWNotification 모델에 대응하는 테이블 생성
-- - persona_reposts.userId: PersonaWorldUser 연결 컬럼 추가

-- ============================================
-- 1. pw_notifications 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS "pw_notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "personaId" TEXT,
  "personaName" TEXT,
  "postId" TEXT,
  "commentId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pw_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pw_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pw_notifications_userId_read_idx" ON "pw_notifications"("userId", "read");
CREATE INDEX IF NOT EXISTS "pw_notifications_userId_createdAt_idx" ON "pw_notifications"("userId", "createdAt");

-- ============================================
-- 2. persona_reposts에 userId 컬럼 추가
-- ============================================

ALTER TABLE "persona_reposts" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- personaId를 nullable로 변경 (유저 리포스트 허용)
ALTER TABLE "persona_reposts" ALTER COLUMN "personaId" DROP NOT NULL;

-- FK 제약조건 추가
DO $$ BEGIN
  ALTER TABLE "persona_reposts"
    ADD CONSTRAINT "persona_reposts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 유니크 인덱스 (userId 기반)
CREATE UNIQUE INDEX IF NOT EXISTS "persona_reposts_originalPostId_userId_key"
  ON "persona_reposts"("originalPostId", "userId");
