-- 성향 초기화 기능 구현 완료 → SOON 태그 제거
UPDATE "pw_shop_items"
SET "tag" = NULL, "updatedAt" = NOW()
WHERE "itemKey" = 'profile_reset';
