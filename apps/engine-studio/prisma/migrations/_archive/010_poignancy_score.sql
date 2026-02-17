-- v4.0: Poignancy Score — 감정 가중 기억 검색
-- PersonaPost + InteractionLog에 poignancyScore 필드 추가

-- PersonaPost에 poignancyScore 추가
ALTER TABLE "persona_posts" ADD COLUMN "poignancyScore" DECIMAL(4, 3);

-- InteractionLog에 poignancyScore 추가
ALTER TABLE "interaction_logs" ADD COLUMN "poignancyScore" DECIMAL(4, 3);
