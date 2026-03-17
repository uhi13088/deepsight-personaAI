-- 미구현 상점 아이템들을 SOON 태그로 변경하여 구매 차단
-- 실제 기능 구현 전까지 "준비 중"으로 표시

UPDATE "pw_shop_items"
SET "tag" = 'SOON', "updatedAt" = NOW()
WHERE "itemKey" IN (
  'follow_slot_expand',
  'premium_persona_unlock',
  'persona_chat',
  'persona_call_reservation',
  'profile_reset'
);
