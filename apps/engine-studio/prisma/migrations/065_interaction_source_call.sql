-- 065: InteractionSource enum에 CALL 값 추가
-- 1:1 통화 대화의 source 추적을 위해 추가

ALTER TYPE "InteractionSource" ADD VALUE IF NOT EXISTS 'CALL';
