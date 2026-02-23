# 스키마 변경 이력 (Schema Changelog)

> DB 스키마 또는 API 계약이 변경될 때마다 여기에 기록합니다.
> **Claude에게:** 스키마/API 변경 시 이 파일에 반드시 항목을 추가하세요.

---

## 기록 규칙

1. 변경 시 **최상단**에 새 항목 추가
2. 영향받는 코드 파일을 반드시 명시
3. Claude에게 줄 주의사항은 `Claude에게` 섹션에 작성

---

## 변경 이력

<!--
## [YYYY-MM-DD] 변경 제목

### Added
- 테이블명.컬럼명: 설명

### Changed
- 테이블명.컬럼명: 이전값 → 이후값
- 영향받는 파일: `src/...`

### Removed
- 테이블명.컬럼명: 설명 (대체 컬럼: 새컬럼명)

### Migration
```sql
-- 실행한 마이그레이션 SQL
```

### Claude에게
- 이 변경 이후 주의할 점
- 사용하면 안 되는 구버전 필드명
- 새로운 사용 방법
-->

## [2026-02-23] PersonaActivityType 열거형에 COMMENT_SUPPRESSED 추가

### Added

- `PersonaActivityType.COMMENT_SUPPRESSED`: Phase RA (Rapport-Aware Engagement) L2 기질 + tension 기반 댓글 억제 이벤트 기록용
  - skip (완전 침묵) 또는 react_only (좋아요만) 결정 시 로그
  - metadata: `{ action, reason, suppressedBy, l2Pattern, tension }`

### Migration

```sql
ALTER TYPE "PersonaActivityType" ADD VALUE IF NOT EXISTS 'COMMENT_SUPPRESSED';
```

### Claude에게

- 마이그레이션: `prisma/migrations/029_add_comment_suppressed_activity_type.sql`
- 사용 위치: `src/lib/persona-world/interaction-pipeline.ts` (saveActivityLog)
- 어드민 API: `src/app/api/internal/persona-world-admin/activity/route.ts` (24h 집계)

---

## [2026-02-22] PWSecurityLog 보안 감사 로그 테이블

### Added

- pw_security_logs 테이블: PersonaWorld 보안 이벤트 기록 (SNS 연동, 분석, 소유권 거부 등)
  - id, userId, eventType, details (Json), ipAddress, createdAt
  - 인덱스: (userId, createdAt), (eventType, createdAt)

### Migration

```sql
CREATE TABLE IF NOT EXISTS "pw_security_logs" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "eventType"   TEXT NOT NULL,
    "details"     JSONB,
    "ipAddress"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pw_security_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX ... ON "pw_security_logs"("userId", "createdAt");
CREATE INDEX ... ON "pw_security_logs"("eventType", "createdAt");
```

### Claude에게

- 로그 유틸: `apps/engine-studio/src/lib/persona-world/security-log.ts`
- fire-and-forget 패턴 (void logSecurityEvent) — 메인 로직 차단 안 함
- 이벤트 타입: SNS_OAUTH_CONNECTED, SNS_DATA_ANALYZED, SNS_DATA_REANALYZED, OWNERSHIP_DENIED, RATE_LIMITED 등

---

## [2026-02-22] PersonaWorldUser SNS 분석 횟수 추적

### Added

- PersonaWorldUser.snsAnalysisCount (Int, default 0): SNS LLM 분석 횟수. 최초 1회 무료, 이후 크레딧 차감.

### Migration

```sql
ALTER TABLE "persona_world_users" ADD COLUMN "sns_analysis_count" INTEGER NOT NULL DEFAULT 0;
```

### Claude에게

- snsAnalysisCount가 0이면 최초 무료 분석 대상
- 재분석 시 크레딧 차감 로직: `apps/engine-studio/src/app/api/persona-world/onboarding/sns/reanalyze/route.ts`
- LLM 분석 모듈: `apps/engine-studio/src/lib/persona-world/onboarding/sns-llm-analyzer.ts`

---

## [2026-02-21] IncubatorLog failReason 추가

### Added

- IncubatorLog.failReason: 불합격 사유 텍스트 (nullable)

### Migration

```sql
ALTER TABLE "incubator_logs" ADD COLUMN IF NOT EXISTS "failReason" TEXT;
```

### Claude에게

- 배치 실행 시 FAILED 상태의 IncubatorLog에 failReason이 자동 기록됨
- buildDashboard()에서 topFailureReasons를 failReason 기반으로 집계
- 기존 데이터의 failReason은 NULL (영향 없음)

---

## [2026-02-21] Persona 인구통계 필드 추가

### Added

- Persona.gender: 성별 (nullable)
- Persona.nationality: 국적 (nullable)
- Persona.educationLevel: 교육 수준 (nullable)
- Persona.languages: 언어 목록 (String[], default [])
- Persona.knowledgeAreas: 지식 분야 (String[], default [])

### Migration

```sql
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Persona" ADD COLUMN IF NOT EXISTS "knowledgeAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];
```

### Claude에게

- 생성 파이프라인에서 벡터 기반으로 자동 추론하여 채움
- 기존 페르소나의 해당 필드는 NULL/빈배열 (영향 없음)
