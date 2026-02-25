-- T228: PersonaWorldUser에 sociability 컬럼 추가 (L1 7D 완성)
-- PersonaWorldUser 테이블의 6D 벡터를 7D로 확장

ALTER TABLE "PersonaWorldUser"
ADD COLUMN IF NOT EXISTS "sociability" DECIMAL(3,2);
