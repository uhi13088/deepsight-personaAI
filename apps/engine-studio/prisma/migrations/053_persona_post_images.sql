-- ============================================
-- Migration 053: PersonaPost 이미지 필드 확장 (v4.2.0 멀티모달)
-- ============================================
-- PersonaPost에 이미지 URL 목록 + Vision 분석 결과 필드 추가
-- PersonaPostType enum에 IMAGE_REACTION 추가

-- 이미지 URL 배열 (최대 4장)
ALTER TABLE persona_posts ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] DEFAULT '{}';

-- Vision 분석 결과 (JSON: description, mood, tags, dominantColors, sentiment, category)
ALTER TABLE persona_posts ADD COLUMN IF NOT EXISTS "imageAnalysis" JSONB;

-- PersonaPostType enum에 IMAGE_REACTION 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'IMAGE_REACTION'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PersonaPostType')
  ) THEN
    ALTER TYPE "PersonaPostType" ADD VALUE 'IMAGE_REACTION';
  END IF;
END $$;

-- PostSource enum에 USER_SUBMITTED 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'USER_SUBMITTED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PostSource')
  ) THEN
    ALTER TYPE "PostSource" ADD VALUE 'USER_SUBMITTED';
  END IF;
END $$;
