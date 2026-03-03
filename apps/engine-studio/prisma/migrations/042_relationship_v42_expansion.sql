-- T356: 관계 모델 v4.2 확장 — attraction/peakStage/momentum/milestones 컬럼 추가
-- 기존 persona_relationships 테이블에 v4.1/v4.2 필드 추가

-- v4.2: 로맨틱 감정 지표 (0.00~1.00)
ALTER TABLE persona_relationships
  ADD COLUMN IF NOT EXISTS attraction DECIMAL(3,2) NOT NULL DEFAULT 0.00;

-- v4.1: 최고 도달 관계 단계 (ESTRANGED 판별용)
ALTER TABLE persona_relationships
  ADD COLUMN IF NOT EXISTS peak_stage TEXT NOT NULL DEFAULT 'STRANGER';

-- v4.1: 관계 발전 속도 (-1.0~1.0)
ALTER TABLE persona_relationships
  ADD COLUMN IF NOT EXISTS momentum DECIMAL(4,3) NOT NULL DEFAULT 0.000;

-- v4.1/v4.2: 관계 마일스톤 이벤트 기록 (JSON 배열)
-- [{type: "first_flirt", occurredAt: "2026-...", qualityDelta: 0.05}, ...]
ALTER TABLE persona_relationships
  ADD COLUMN IF NOT EXISTS milestones JSONB NOT NULL DEFAULT '[]'::jsonb;
