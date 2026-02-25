-- ============================================================
-- Fix: OnboardingLevel enum 값 통일 + updatedAt DEFAULT 보장 + 시드 재적용
--
-- 문제: DB enum이 LIGHT/MEDIUM인데 Prisma 스키마는 QUICK/STANDARD
-- 해결: enum 리네임 + psych_profile_templates.updatedAt DEFAULT 추가
--
-- 실행: psql $DATABASE_URL -f prisma/migrations/035_fix_onboarding_enum_and_seed.sql
-- 또는: pnpm db:push (스키마 전체 동기화)
-- ============================================================

-- 1) OnboardingLevel enum: LIGHT→QUICK, MEDIUM→STANDARD (멱등)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LIGHT' AND enumtypid = '"OnboardingLevel"'::regtype) THEN
    ALTER TYPE "OnboardingLevel" RENAME VALUE 'LIGHT' TO 'QUICK';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEDIUM' AND enumtypid = '"OnboardingLevel"'::regtype) THEN
    ALTER TYPE "OnboardingLevel" RENAME VALUE 'MEDIUM' TO 'STANDARD';
  END IF;
END $$;

-- 2) updatedAt DEFAULT 보장 (Prisma @updatedAt는 클라이언트에서만 동작)
ALTER TABLE "psych_profile_templates" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- 3) user_vectors default도 통일
ALTER TABLE "user_vectors" ALTER COLUMN "onboardingLevel" SET DEFAULT 'QUICK'::"OnboardingLevel";

-- 4) 완료 확인
DO $$ BEGIN
  RAISE NOTICE '[035] OnboardingLevel enum fix complete: QUICK/STANDARD/DEEP';
END $$;
