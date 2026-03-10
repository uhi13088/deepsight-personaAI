-- PW 아레나 시스템 (T425~T439)
-- 유저 토론방 + 턴 + 투표

-- Enum types
DO $$ BEGIN
  CREATE TYPE "PWArenaRoomType" AS ENUM ('ROOM_1V1', 'ROOM_PANEL', 'ROOM_LARGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PWArenaStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PW 아레나 세션
CREATE TABLE IF NOT EXISTS "pw_arena_sessions" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"           TEXT NOT NULL,
  "room_type"         "PWArenaRoomType" NOT NULL,
  "topic"             TEXT NOT NULL,
  "participant_ids"   JSONB NOT NULL,
  "current_round"     INTEGER NOT NULL DEFAULT 0,
  "max_rounds"        INTEGER NOT NULL,
  "status"            "PWArenaStatus" NOT NULL DEFAULT 'WAITING',
  "replay_saved"      BOOLEAN NOT NULL DEFAULT false,
  "total_coins_spent" INTEGER NOT NULL DEFAULT 0,
  "quality_synced"    BOOLEAN NOT NULL DEFAULT false,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at"      TIMESTAMP(3),
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "pw_arena_sessions_user_id_idx" ON "pw_arena_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "pw_arena_sessions_status_idx" ON "pw_arena_sessions"("status");
CREATE INDEX IF NOT EXISTS "pw_arena_sessions_created_at_idx" ON "pw_arena_sessions"("created_at");

-- PW 아레나 턴
CREATE TABLE IF NOT EXISTS "pw_arena_turns" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "session_id"   TEXT NOT NULL REFERENCES "pw_arena_sessions"("id") ON DELETE CASCADE,
  "round_number" INTEGER NOT NULL,
  "speaker_id"   TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "tokens_used"  INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "pw_arena_turns_session_round_speaker_key"
  ON "pw_arena_turns"("session_id", "round_number", "speaker_id");
CREATE INDEX IF NOT EXISTS "pw_arena_turns_session_id_idx" ON "pw_arena_turns"("session_id");

-- PW 아레나 투표
CREATE TABLE IF NOT EXISTS "pw_arena_votes" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "session_id"   TEXT NOT NULL REFERENCES "pw_arena_sessions"("id") ON DELETE CASCADE,
  "user_id"      TEXT NOT NULL,
  "persona_id"   TEXT NOT NULL,
  "round_number" INTEGER,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "pw_arena_votes_session_user_round_key"
  ON "pw_arena_votes"("session_id", "user_id", "round_number");
CREATE INDEX IF NOT EXISTS "pw_arena_votes_session_id_idx" ON "pw_arena_votes"("session_id");
