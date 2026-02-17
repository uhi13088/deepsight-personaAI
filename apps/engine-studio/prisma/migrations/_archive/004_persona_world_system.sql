-- 004: PersonaWorld System
-- PersonaWorld SNS 시스템 (Post, Like, Comment, Follow, Repost, User Profile)

-- ============================================
-- Persona 모델 확장 (Layer 2 + Activity Traits)
-- ============================================

-- 캐릭터 속성 (Layer 2)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS handle TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMPTZ;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'KR';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS warmth DECIMAL(3,2);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "expertiseLevel" TEXT DEFAULT 'ENTHUSIAST';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "speechPatterns" TEXT[] DEFAULT '{}';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS quirks TEXT[] DEFAULT '{}';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS background TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "favoriteGenres" TEXT[] DEFAULT '{}';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "dislikedGenres" TEXT[] DEFAULT '{}';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "viewingHabits" TEXT;

-- 활동성 속성 (PersonaWorld용)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS sociability DECIMAL(3,2);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS initiative DECIMAL(3,2);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS expressiveness DECIMAL(3,2);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS interactivity DECIMAL(3,2);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "postFrequency" TEXT DEFAULT 'MODERATE';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Seoul';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "activeHours" INTEGER[] DEFAULT '{}';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "peakHours" INTEGER[] DEFAULT '{}';

-- 콘텐츠/관계 설정 (JSON)
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "contentSettings" JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "relationshipSettings" JSONB;

-- 프롬프트 템플릿 확장
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "basePrompt" TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "reviewPrompt" TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "postPrompt" TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "commentPrompt" TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "interactionPrompt" TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "specialPrompts" JSONB;

-- 품질/생성 설정
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "consistencyScore" DECIMAL(3,2);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "generationConfig" JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS "sampleContents" JSONB;

-- ============================================
-- PersonaWorld 유저 프로필
-- ============================================

CREATE TABLE IF NOT EXISTS persona_world_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  "profileImageUrl" TEXT,

  -- 6D 벡터
  depth DECIMAL(3,2),
  lens DECIMAL(3,2),
  stance DECIMAL(3,2),
  scope DECIMAL(3,2),
  taste DECIMAL(3,2),
  purpose DECIMAL(3,2),

  -- 프로필 품질
  "profileQuality" TEXT NOT NULL DEFAULT 'BASIC',
  "confidenceScore" DECIMAL(3,2),

  -- 데이터 소스
  "dataSources" JSONB,
  "snsExtendedData" JSONB,
  preferences JSONB,

  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PersonaWorld 포스트
-- ============================================

CREATE TABLE IF NOT EXISTS persona_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "personaId" TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,

  type TEXT NOT NULL,
  content TEXT NOT NULL,
  "contentId" TEXT,
  metadata JSONB,

  -- 스레드
  "parentId" TEXT REFERENCES persona_posts(id),

  -- 트리거
  trigger TEXT NOT NULL DEFAULT 'SCHEDULED',

  -- 통계
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  "repostCount" INTEGER NOT NULL DEFAULT 0,

  -- 모더레이션
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "hiddenAt" TIMESTAMPTZ,
  "hiddenBy" TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persona_posts_persona ON persona_posts("personaId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_persona_posts_type ON persona_posts(type, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_persona_posts_parent ON persona_posts("parentId");

-- ============================================
-- PersonaWorld 좋아요
-- ============================================

CREATE TABLE IF NOT EXISTS persona_post_likes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId" TEXT NOT NULL REFERENCES persona_posts(id) ON DELETE CASCADE,
  "personaId" TEXT REFERENCES personas(id) ON DELETE CASCADE,
  "userId" TEXT REFERENCES persona_world_users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_persona_post_like UNIQUE ("postId", "personaId"),
  CONSTRAINT unique_user_post_like UNIQUE ("postId", "userId"),
  CONSTRAINT chk_like_author CHECK (
    ("personaId" IS NOT NULL AND "userId" IS NULL) OR
    ("personaId" IS NULL AND "userId" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_persona_post_likes_post ON persona_post_likes("postId");
CREATE INDEX IF NOT EXISTS idx_persona_post_likes_persona ON persona_post_likes("personaId");
CREATE INDEX IF NOT EXISTS idx_persona_post_likes_user ON persona_post_likes("userId");

-- ============================================
-- PersonaWorld 댓글
-- ============================================

CREATE TABLE IF NOT EXISTS persona_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId" TEXT NOT NULL REFERENCES persona_posts(id) ON DELETE CASCADE,
  "personaId" TEXT REFERENCES personas(id) ON DELETE CASCADE,
  "userId" TEXT REFERENCES persona_world_users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,

  -- 답글
  "parentId" TEXT REFERENCES persona_comments(id),

  -- 모더레이션
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "hiddenAt" TIMESTAMPTZ,
  "hiddenBy" TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_comment_author CHECK (
    ("personaId" IS NOT NULL AND "userId" IS NULL) OR
    ("personaId" IS NULL AND "userId" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_persona_comments_post ON persona_comments("postId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_persona_comments_parent ON persona_comments("parentId");

-- ============================================
-- PersonaWorld 리포스트
-- ============================================

CREATE TABLE IF NOT EXISTS persona_reposts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "originalPostId" TEXT NOT NULL REFERENCES persona_posts(id) ON DELETE CASCADE,
  "personaId" TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  comment TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("originalPostId", "personaId")
);

-- ============================================
-- PersonaWorld 팔로우
-- ============================================

CREATE TABLE IF NOT EXISTS persona_follows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "followerPersonaId" TEXT REFERENCES personas(id) ON DELETE CASCADE,
  "followerUserId" TEXT REFERENCES persona_world_users(id) ON DELETE CASCADE,
  "followingPersonaId" TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_persona_follow UNIQUE ("followerPersonaId", "followingPersonaId"),
  CONSTRAINT unique_user_follow UNIQUE ("followerUserId", "followingPersonaId"),
  CONSTRAINT chk_follower CHECK (
    ("followerPersonaId" IS NOT NULL AND "followerUserId" IS NULL) OR
    ("followerPersonaId" IS NULL AND "followerUserId" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_persona_follows_follower_persona ON persona_follows("followerPersonaId");
CREATE INDEX IF NOT EXISTS idx_persona_follows_follower_user ON persona_follows("followerUserId");
CREATE INDEX IF NOT EXISTS idx_persona_follows_following ON persona_follows("followingPersonaId");

-- ============================================
-- PersonaWorld 북마크
-- ============================================

CREATE TABLE IF NOT EXISTS persona_post_bookmarks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES persona_world_users(id) ON DELETE CASCADE,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("userId", "postId")
);

-- ============================================
-- PersonaWorld 유저 설문 응답
-- ============================================

CREATE TABLE IF NOT EXISTS pw_user_survey_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES persona_world_users(id) ON DELETE CASCADE,
  "surveyLevel" TEXT NOT NULL,
  answers JSONB NOT NULL,
  "computedVector" JSONB,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("userId", "surveyLevel")
);

-- ============================================
-- SNS 연동
-- ============================================

CREATE TABLE IF NOT EXISTS sns_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  platform TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMPTZ,
  "profileData" JSONB,
  "extractedData" JSONB,
  "lastSyncAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("userId", platform)
);

-- ============================================
-- PersonaWorld 신고
-- ============================================

CREATE TABLE IF NOT EXISTS persona_world_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reporterUserId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "resolvedAt" TIMESTAMPTZ,
  "resolvedBy" TEXT,
  resolution TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persona_world_reports_status ON persona_world_reports(status, "createdAt");

-- ============================================
-- PersonaWorld 활동 로그
-- ============================================

CREATE TABLE IF NOT EXISTS persona_activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "personaId" TEXT NOT NULL,
  "activityType" TEXT NOT NULL,
  "targetId" TEXT,
  metadata JSONB,
  trigger TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persona_activity_logs_persona ON persona_activity_logs("personaId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_persona_activity_logs_type ON persona_activity_logs("activityType", "createdAt" DESC);

-- ============================================
-- 트리거: 좋아요/댓글/리포스트 카운트 자동 업데이트
-- ============================================

-- 좋아요 카운트 업데이트
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE persona_posts SET "likeCount" = "likeCount" + 1 WHERE id = NEW."postId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE persona_posts SET "likeCount" = "likeCount" - 1 WHERE id = OLD."postId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_like_count ON persona_post_likes;
CREATE TRIGGER trg_update_post_like_count
AFTER INSERT OR DELETE ON persona_post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- 댓글 카운트 업데이트
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE persona_posts SET "commentCount" = "commentCount" + 1 WHERE id = NEW."postId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE persona_posts SET "commentCount" = "commentCount" - 1 WHERE id = OLD."postId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_comment_count ON persona_comments;
CREATE TRIGGER trg_update_post_comment_count
AFTER INSERT OR DELETE ON persona_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- 리포스트 카운트 업데이트
CREATE OR REPLACE FUNCTION update_post_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE persona_posts SET "repostCount" = "repostCount" + 1 WHERE id = NEW."originalPostId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE persona_posts SET "repostCount" = "repostCount" - 1 WHERE id = OLD."originalPostId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_post_repost_count ON persona_reposts;
CREATE TRIGGER trg_update_post_repost_count
AFTER INSERT OR DELETE ON persona_reposts
FOR EACH ROW EXECUTE FUNCTION update_post_repost_count();
