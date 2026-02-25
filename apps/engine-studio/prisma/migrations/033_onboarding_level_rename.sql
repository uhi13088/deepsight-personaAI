-- T177: OnboardingLevel enum 이름 통일
-- LIGHT → QUICK, MEDIUM → STANDARD (developer-console 기준으로 통합)

ALTER TYPE "OnboardingLevel" RENAME VALUE 'LIGHT' TO 'QUICK';
ALTER TYPE "OnboardingLevel" RENAME VALUE 'MEDIUM' TO 'STANDARD';

-- 기존 default 값이 'LIGHT'인 컬럼의 default를 'QUICK'로 변경
ALTER TABLE "user_vectors" ALTER COLUMN "onboardingLevel" SET DEFAULT 'QUICK'::"OnboardingLevel";
