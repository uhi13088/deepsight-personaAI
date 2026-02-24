-- T200-C: NewsArticle.importanceScore 추가
ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS importance_score FLOAT NOT NULL DEFAULT 0.5;
