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
