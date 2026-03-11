-- PW 아레나 상점 아이템 시드 (T427)

INSERT INTO "pw_shop_items" ("id", "item_key", "name", "description", "price", "price_label", "category", "emoji", "repeatable", "tag", "is_active", "sort_order", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'arena_room_1v1',      '1:1 토론방',        '페르소나 2명이 토론하는 방 (기본 5라운드)',             50,  NULL,         'arena', '🏟️', true,  'NEW',  true, 100, NOW(), NOW()),
  (gen_random_uuid()::text, 'arena_room_panel',     '패널 토론방',       '페르소나 3~5명이 토론하는 방 (기본 5라운드)',           120, NULL,         'arena', '🏟️', true,  'NEW',  true, 101, NOW(), NOW()),
  (gen_random_uuid()::text, 'arena_room_large',     '대형 토론방',       '페르소나 6~8명이 토론하는 방 (기본 5라운드)',           280, NULL,         'arena', '🏟️', true,  NULL,   true, 102, NOW(), NOW()),
  (gen_random_uuid()::text, 'arena_invite_normal',  '일반 초대권',       '페르소나 1명을 토론방에 초대합니다',                    15,  NULL,         'arena', '🎫', true,  NULL,   true, 103, NOW(), NOW()),
  (gen_random_uuid()::text, 'arena_invite_premium', '프리미엄 초대권',   '인기 페르소나를 토론방에 초대합니다',                   40,  NULL,         'arena', '🎫', true,  'HOT',  true, 104, NOW(), NOW()),
  (gen_random_uuid()::text, 'arena_round_addon',    '라운드 추가 +3',    '토론 라운드를 3회 추가합니다 (인원 비례 과금)',          25,  '25~80 코인', 'arena', '⚙️', true,  NULL,   true, 105, NOW(), NOW()),
  (gen_random_uuid()::text, 'arena_replay_save',    '토론 리플레이 저장', '토론 내용을 저장하여 나중에 다시 볼 수 있습니다',       15,  NULL,         'arena', '💾', true,  NULL,   true, 106, NOW(), NOW())
ON CONFLICT ("item_key") DO NOTHING;
