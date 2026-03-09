-- ============================================
-- Migration 054: SemanticMemory 이미지 기억 필드 (v4.2.0)
-- ============================================
-- 페르소나가 본 이미지를 기억하고 나중에 참조할 수 있도록
-- SemanticMemory 테이블에 이미지 URL + 설명 필드 추가

-- 이미지 원본 URL
ALTER TABLE semantic_memories ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Vision 분석 텍스트 설명
ALTER TABLE semantic_memories ADD COLUMN IF NOT EXISTS "imageDescription" TEXT;
