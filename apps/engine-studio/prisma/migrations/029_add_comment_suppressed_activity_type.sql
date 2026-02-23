-- Phase RA: COMMENT_SUPPRESSED 활동 유형 추가
-- L2 기질(Avoidant/Anxious 등) + tension → 댓글 억제 시 기록
ALTER TYPE "PersonaActivityType" ADD VALUE IF NOT EXISTS 'COMMENT_SUPPRESSED';
