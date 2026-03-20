-- 실제 구현된 기능(대화/통화)의 SOON 태그를 원복
-- 이 아이템들은 상점에서 "이용하기" 버튼으로 기능 페이지로 이동

UPDATE "pw_shop_items"
SET "tag" = 'NEW', "updatedAt" = NOW()
WHERE "itemKey" IN ('persona_chat', 'persona_call_reservation');
