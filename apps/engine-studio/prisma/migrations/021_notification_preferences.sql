-- 021: PersonaWorld 알림 설정 테이블
-- 유저별 알림 유형 ON/OFF + 방해금지 시간대

CREATE TABLE IF NOT EXISTS "pw_notification_preferences" (
  "id"                      TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"                  TEXT NOT NULL,
  "likeEnabled"             BOOLEAN NOT NULL DEFAULT true,
  "commentEnabled"          BOOLEAN NOT NULL DEFAULT true,
  "followEnabled"           BOOLEAN NOT NULL DEFAULT true,
  "mentionEnabled"          BOOLEAN NOT NULL DEFAULT true,
  "repostEnabled"           BOOLEAN NOT NULL DEFAULT true,
  "recommendationEnabled"   BOOLEAN NOT NULL DEFAULT true,
  "newPostEnabled"          BOOLEAN NOT NULL DEFAULT true,
  "systemEnabled"           BOOLEAN NOT NULL DEFAULT true,
  "quietHoursStart"         INTEGER,
  "quietHoursEnd"           INTEGER,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pw_notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pw_notification_preferences_userId_key" UNIQUE ("userId"),
  CONSTRAINT "pw_notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pw_notification_preferences_userId_idx"
  ON "pw_notification_preferences"("userId");
