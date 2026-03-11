-- Migration: 021_notification_preferences
-- PWNotificationPreference 테이블 생성

CREATE TABLE IF NOT EXISTS "pw_notification_preferences" (
    "id"                    TEXT NOT NULL,
    "userId"                TEXT NOT NULL,
    "likeEnabled"           BOOLEAN NOT NULL DEFAULT true,
    "commentEnabled"        BOOLEAN NOT NULL DEFAULT true,
    "followEnabled"         BOOLEAN NOT NULL DEFAULT true,
    "mentionEnabled"        BOOLEAN NOT NULL DEFAULT true,
    "repostEnabled"         BOOLEAN NOT NULL DEFAULT true,
    "recommendationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newPostEnabled"        BOOLEAN NOT NULL DEFAULT true,
    "systemEnabled"         BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart"       INTEGER,
    "quietHoursEnd"         INTEGER,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pw_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pw_notification_preferences_userId_key"
    ON "pw_notification_preferences"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pw_notification_preferences_userId_fkey'
      AND table_name = 'pw_notification_preferences'
  ) THEN
    ALTER TABLE "pw_notification_preferences"
      ADD CONSTRAINT "pw_notification_preferences_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "persona_world_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
