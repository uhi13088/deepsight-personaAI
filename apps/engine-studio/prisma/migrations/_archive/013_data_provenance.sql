-- v4.0: Data Provenance (출처 추적 시스템)
-- T142: InteractionLog + PersonaPost 출처/신뢰도/전파 깊이 추적

-- InteractionSource enum
CREATE TYPE "InteractionSource" AS ENUM ('DIRECT', 'PERSONA_RELAY', 'EXTERNAL_FEED', 'SYSTEM');

-- PostSource enum
CREATE TYPE "PostSource" AS ENUM ('AUTONOMOUS', 'FEED_INSPIRED', 'ARENA_TEST', 'SCHEDULED');

-- InteractionLog provenance fields
ALTER TABLE "interaction_logs"
  ADD COLUMN "source" "InteractionSource" DEFAULT 'DIRECT',
  ADD COLUMN "trustLevel" DECIMAL(3, 2),
  ADD COLUMN "propagationDepth" INTEGER DEFAULT 0,
  ADD COLUMN "originPersonaId" TEXT;

-- PersonaPost source field
ALTER TABLE "persona_posts"
  ADD COLUMN "postSource" "PostSource" DEFAULT 'AUTONOMOUS';
