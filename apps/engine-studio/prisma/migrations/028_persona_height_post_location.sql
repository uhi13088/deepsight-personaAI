-- 028: Persona height + PersonaPost locationTag
-- 페르소나 신체 정보(키) 추가 + 포스트 위치 태그

-- Persona: height (cm)
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "height" INTEGER;

-- PersonaPost: locationTag
ALTER TABLE "persona_posts" ADD COLUMN IF NOT EXISTS "locationTag" TEXT;
