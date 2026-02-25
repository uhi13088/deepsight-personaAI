-- T177: OnboardingLevel enum 이름 통일
-- LIGHT → QUICK, MEDIUM → STANDARD (developer-console 기준으로 통합)
-- 멱등성: 이미 QUICK/STANDARD인 경우 (fresh setup) 건너뜀

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LIGHT' AND enumtypid = '"OnboardingLevel"'::regtype) THEN
    ALTER TYPE "OnboardingLevel" RENAME VALUE 'LIGHT' TO 'QUICK';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEDIUM' AND enumtypid = '"OnboardingLevel"'::regtype) THEN
    ALTER TYPE "OnboardingLevel" RENAME VALUE 'MEDIUM' TO 'STANDARD';
  END IF;
END $$;

-- 기존 default 값을 'QUICK'로 통일
ALTER TABLE "user_vectors" ALTER COLUMN "onboardingLevel" SET DEFAULT 'QUICK'::"OnboardingLevel";
