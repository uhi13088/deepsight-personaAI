-- ═══════════════════════════════════════════════════════════════
-- 005_seed_archetypes.sql
-- 아키타입 12종 시드 데이터
-- 독립적으로 재실행 가능 (idempotent)
-- ON CONFLICT DO UPDATE로 기존 데이터 덮어쓰기
-- ═══════════════════════════════════════════════════════════════

-- 기존 builtin 아키타입 삭제
DELETE FROM "archetypes" WHERE "is_builtin" = true;

-- 1. Ironic Philosopher (아이러니한 철학자)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'ironic-philosopher',
  'Ironic Philosopher',
  '아이러니한 철학자',
  '깊이 있는 분석 뒤에 자조적 유머를 숨기는 사색가',
  0.75, 0.95, 0.80, 1.00,
  0.60, 0.85, 0.70, 0.90,
  0.20, 0.50, 0.60, 0.85,
  '{"depth": 0.85, "lens": 0.90, "stance": 0.73, "scope": 0.80, "taste": 0.35, "purpose": 0.73}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 2. Wounded Critic (상처받은 비평가)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'wounded-critic',
  'Wounded Critic',
  '상처받은 비평가',
  '과거의 상처가 날카로운 비평의 원동력이 된 비평가',
  0.70, 0.90, 0.55, 0.80,
  0.75, 0.95, 0.60, 0.85,
  0.25, 0.55, 0.50, 0.75,
  '{"depth": 0.80, "lens": 0.68, "stance": 0.85, "scope": 0.73, "taste": 0.40, "purpose": 0.63}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 3. Social Introvert (사교적 내향인)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'social-introvert',
  'Social Introvert',
  '사교적 내향인',
  '사교적으로 보이지만 에너지 원천은 내면에 있는 인물',
  0.45, 0.75, 0.35, 0.65,
  0.25, 0.55, 0.35, 0.65,
  0.35, 0.65, 0.35, 0.65,
  '{"depth": 0.60, "lens": 0.50, "stance": 0.40, "scope": 0.50, "taste": 0.50, "purpose": 0.50}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 4. Lazy Perfectionist (게으른 완벽주의자)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'lazy-perfectionist',
  'Lazy Perfectionist',
  '게으른 완벽주의자',
  '완벽주의적 기준은 높지만 실행의 게으름이 공존하는 인물',
  0.55, 0.80, 0.45, 0.75,
  0.35, 0.65, 0.70, 0.95,
  0.25, 0.55, 0.35, 0.65,
  '{"depth": 0.68, "lens": 0.60, "stance": 0.50, "scope": 0.83, "taste": 0.40, "purpose": 0.50}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 5. Conservative Hipster (보수적 힙스터)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'conservative-hipster',
  'Conservative Hipster',
  '보수적 힙스터',
  '실험적 취향이지만 내면의 가치관은 보수적인 인물',
  0.40, 0.70, 0.35, 0.65,
  0.30, 0.60, 0.35, 0.65,
  0.70, 0.95, 0.25, 0.55,
  '{"depth": 0.55, "lens": 0.50, "stance": 0.45, "scope": 0.50, "taste": 0.83, "purpose": 0.40}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 6. Empathetic Arguer (공감하는 논객)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'empathetic-arguer',
  'Empathetic Arguer',
  '공감하는 논객',
  '높은 친화성이지만 논리적으로 반박하는 것을 즐기는 인물',
  0.60, 0.85, 0.65, 0.90,
  0.55, 0.80, 0.50, 0.75,
  0.35, 0.65, 0.60, 0.85,
  '{"depth": 0.73, "lens": 0.78, "stance": 0.68, "scope": 0.63, "taste": 0.50, "purpose": 0.73}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 7. Free Guardian (자유로운 수호자)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'free-guardian',
  'Free Guardian',
  '자유로운 수호자',
  '자유로운 영혼이지만 소중한 것을 지키려는 의지가 강한 인물',
  0.35, 0.65, 0.25, 0.55,
  0.15, 0.45, 0.55, 0.85,
  0.45, 0.75, 0.20, 0.50,
  '{"depth": 0.50, "lens": 0.40, "stance": 0.30, "scope": 0.70, "taste": 0.60, "purpose": 0.35}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 8. Quiet Enthusiast (조용한 열정가)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'quiet-enthusiast',
  'Quiet Enthusiast',
  '조용한 열정가',
  '표면적으로 조용하지만 내면에 깊은 열정을 품은 인물',
  0.50, 0.80, 0.40, 0.70,
  0.20, 0.50, 0.45, 0.75,
  0.55, 0.85, 0.45, 0.75,
  '{"depth": 0.65, "lens": 0.55, "stance": 0.35, "scope": 0.60, "taste": 0.70, "purpose": 0.60}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 9. Emotional Pragmatist (감성적 실용가)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'emotional-pragmatist',
  'Emotional Pragmatist',
  '감성적 실용가',
  '감성적 판단과 실용적 행동이 공존하는 인물',
  0.45, 0.75, 0.15, 0.45,
  0.25, 0.55, 0.40, 0.70,
  0.30, 0.60, 0.40, 0.70,
  '{"depth": 0.60, "lens": 0.30, "stance": 0.40, "scope": 0.55, "taste": 0.45, "purpose": 0.55}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 10. Dangerous Mentor (위험한 멘토)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'dangerous-mentor',
  'Dangerous Mentor',
  '위험한 멘토',
  '깊은 통찰력이 있지만 가르침의 방식이 도전적인 인물',
  0.75, 0.95, 0.60, 0.85,
  0.55, 0.80, 0.65, 0.90,
  0.35, 0.65, 0.70, 0.95,
  '{"depth": 0.85, "lens": 0.73, "stance": 0.68, "scope": 0.78, "taste": 0.50, "purpose": 0.83}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 11. Volatile Intellectual (폭발하는 지성인)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'volatile-intellectual',
  'Volatile Intellectual',
  '폭발하는 지성인',
  '뛰어난 지성이지만 감정 폭발을 통제하기 어려운 인물',
  0.80, 1.00, 0.75, 0.95,
  0.65, 0.90, 0.75, 0.95,
  0.30, 0.60, 0.55, 0.80,
  '{"depth": 0.90, "lens": 0.85, "stance": 0.78, "scope": 0.85, "taste": 0.45, "purpose": 0.68}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 12. Growing Cynic (성장하는 냉소가)
INSERT INTO "archetypes" (
  "id", "name", "name_ko", "description",
  "depthMin", "depthMax", "lensMin", "lensMax",
  "stanceMin", "stanceMax", "scopeMin", "scopeMax",
  "tasteMin", "tasteMax", "purposeMin", "purposeMax",
  "reference_vector", "threshold_config",
  "is_builtin", "recommendedPersonaIds",
  "createdAt", "updatedAt"
) VALUES (
  'growing-cynic',
  'Growing Cynic',
  '성장하는 냉소가',
  '냉소적이지만 내면에서는 변화를 갈망하는 인물',
  0.55, 0.80, 0.50, 0.80,
  0.65, 0.90, 0.45, 0.75,
  0.20, 0.50, 0.45, 0.75,
  '{"depth": 0.68, "lens": 0.65, "stance": 0.78, "scope": 0.60, "taste": 0.35, "purpose": 0.60}',
  null,
  true, '{}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_ko" = EXCLUDED."name_ko",
  "description" = EXCLUDED."description",
  "depthMin" = EXCLUDED."depthMin",
  "depthMax" = EXCLUDED."depthMax",
  "lensMin" = EXCLUDED."lensMin",
  "lensMax" = EXCLUDED."lensMax",
  "stanceMin" = EXCLUDED."stanceMin",
  "stanceMax" = EXCLUDED."stanceMax",
  "scopeMin" = EXCLUDED."scopeMin",
  "scopeMax" = EXCLUDED."scopeMax",
  "tasteMin" = EXCLUDED."tasteMin",
  "tasteMax" = EXCLUDED."tasteMax",
  "purposeMin" = EXCLUDED."purposeMin",
  "purposeMax" = EXCLUDED."purposeMax",
  "reference_vector" = EXCLUDED."reference_vector",
  "threshold_config" = EXCLUDED."threshold_config",
  "is_builtin" = EXCLUDED."is_builtin",
  "recommendedPersonaIds" = EXCLUDED."recommendedPersonaIds",
  "updatedAt" = CURRENT_TIMESTAMP;
