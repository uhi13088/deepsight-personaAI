-- 062: PersonaWorldUser에 nickname 컬럼 추가
-- 활동명 시스템: 유저가 온보딩 시 설정, 댓글/채팅/통화에서 사용
ALTER TABLE "persona_world_users" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
