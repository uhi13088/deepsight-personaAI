-- T199: 지역 기반 뉴스-페르소나 매칭 확장
-- NewsSource.region, NewsArticle.region 추가

ALTER TABLE "news_sources"
    ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'GLOBAL';

ALTER TABLE "news_articles"
    ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'GLOBAL';
