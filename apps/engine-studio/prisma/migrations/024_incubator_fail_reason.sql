-- 인큐베이터 불합격 사유 추가
-- IncubatorLog에 failReason 컬럼 추가

ALTER TABLE "incubator_logs" ADD COLUMN IF NOT EXISTS "failReason" TEXT;
