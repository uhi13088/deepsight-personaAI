-- T383: pgvector IVFFlat 인덱스 생성
-- 코사인 거리 기반 유사 페르소나 검색을 위한 ANN 인덱스
-- lists = 10: 소규모 데이터셋 최적 (페르소나 수 < 1000). 데이터 증가 시 lists = sqrt(N) 권장

-- L1(SOCIAL) 7D — 코사인 거리
CREATE INDEX IF NOT EXISTS "idx_plv_l1vec_cosine"
  ON "persona_layer_vectors"
  USING ivfflat ("l1Vec" vector_cosine_ops)
  WITH (lists = 10);

-- L2(TEMPERAMENT) 5D — 코사인 거리
CREATE INDEX IF NOT EXISTS "idx_plv_l2vec_cosine"
  ON "persona_layer_vectors"
  USING ivfflat ("l2Vec" vector_cosine_ops)
  WITH (lists = 10);

-- L3(NARRATIVE) 4D — 코사인 거리
CREATE INDEX IF NOT EXISTS "idx_plv_l3vec_cosine"
  ON "persona_layer_vectors"
  USING ivfflat ("l3Vec" vector_cosine_ops)
  WITH (lists = 10);

-- 검증 쿼리 (프로덕션 적용 후 실행):
-- EXPLAIN ANALYZE
-- SELECT "id", "personaId", "l1Vec" <=> '[0.5,0.3,0.7,0.2,0.8,0.1,0.9]'::vector AS distance
-- FROM "persona_layer_vectors"
-- WHERE "layerType" = 'SOCIAL' AND "l1Vec" IS NOT NULL
-- ORDER BY "l1Vec" <=> '[0.5,0.3,0.7,0.2,0.8,0.1,0.9]'::vector ASC
-- LIMIT 10;
-- → Index Scan using idx_plv_l1vec_cosine 확인
