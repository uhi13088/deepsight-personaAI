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

## [2026-03-08] T370: KakaoLink (카카오톡 페르소나 연동)

### Added

- `kakao_links` 테이블: 유저 1명 = 페르소나 1개 카카오톡 연동
  - `id, userId(UNIQUE → persona_world_users), personaId → personas`
  - `kakaoUserKey TEXT UNIQUE` — 카카오 오픈빌더 userRequest.user.id
  - `isActive BOOLEAN DEFAULT true`
  - `createdAt, updatedAt`
  - INDEX: `kakaoUserKey` (웹훅에서 빠른 조회)
- `PersonaWorldUser.kakaoLink KakaoLink?` relation 추가
- `Persona.kakaoLinks KakaoLink[]` relation 추가
- `@deepsight/shared-types`에 `KakaoLink` 인터페이스 추가

### Migration

`prisma/migrations/049_kakao_link.sql`

### Claude에게

- `userId`는 UNIQUE — 유저당 1개 페르소나만 연동 가능 (upsert로 변경 처리)
- `kakaoUserKey`는 카카오 오픈빌더가 제공하는 유저 식별자 (봇 채널별 고유)
- 웹훅 수신 시 `kakaoUserKey`로 조회 → 미연동이면 안내 메시지 반환
- `isActive: false` = 연동 해제 상태 (데이터는 보존)

---

## [2026-03-04] T392: ContentItem + PersonaCuratedContent + UserContentFeedback (B2B 콘텐츠 파이프라인)

### Added

- `content_items` 테이블: B2B 고객사가 ingest API로 등록한 콘텐츠
  - `tenantId, contentType(ContentItemType), title, description, sourceUrl, externalId`
  - `genres String[], tags String[]`
  - `contentVector Json?` — L1 7D 벡터 (vectorizeContent 호출 후 저장)
  - `narrativeTheme Json?` — L3 4D 벡터
  - `vectorizedAt DateTime?`
  - `UNIQUE(tenantId, externalId)` — externalId 존재 시만 적용
- `persona_curated_contents` 테이블: 페르소나-콘텐츠 큐레이션 매핑
  - `personaId → personas, contentItemId → content_items`
  - `curationScore Decimal(4,3), curationReason, highlights String[]`
  - `status CurationStatus (PENDING|APPROVED|REJECTED)`
  - `UNIQUE(personaId, contentItemId)`
- `user_content_feedbacks` 테이블: 유저 콘텐츠 반응
  - `userId → persona_world_users, contentItemId → content_items`
  - `action ContentFeedbackAction (LIKE|SKIP|SAVE|CONSUME), viaPersonaId?`
  - `UNIQUE(userId, contentItemId)`
- enum: `ContentItemType`, `CurationStatus`, `ContentFeedbackAction`
- `Persona.curatedContents PersonaCuratedContent[]` relation 추가
- `PersonaWorldUser.contentFeedbacks UserContentFeedback[]` relation 추가

### Migration

`prisma/migrations/044_content_item_curation.sql`

### Claude에게

- `ContentItem.contentVector`는 벡터화 전까지 null — `vectorizedAt`로 상태 확인
- `PersonaCuratedContent` APPROVED 상태만 B2B 추천 API에서 노출 (T399)
- `UserContentFeedback`은 userId+contentItemId 중복 불가 (upsert 필요)
- `ContentItemType`은 `ConsumptionContentType`과 별개 (GAME/OTHER 제거, PRODUCT/VIDEO/PODCAST 추가)

---

## [2026-03-04] T378: PersonaFollow 인덱스 추가 (피드 탭 전환 성능 개선)

### Added

- `persona_follows.idx_follower_user_id`: `followerUserId` 단일 컬럼 인덱스 (팔로잉 탭/익스플로러 탭 쿼리 최적화)
- `persona_follows.idx_following_persona_id`: `followingPersonaId` 단일 컬럼 인덱스 (팔로워 조회 최적화)

### Migration

```sql
CREATE INDEX "persona_follows_followerUserId_idx" ON "persona_follows"("followerUserId");
CREATE INDEX "persona_follows_followingPersonaId_idx" ON "persona_follows"("followingPersonaId");
```

### Claude에게

- `PersonaFollow`에서 `followerUserId`로 조회 시 인덱스가 적용됨
- `prisma db push` 또는 `prisma migrate dev` 실행 필요

---

## [2026-02-23] Phase NB: NewsSource/NewsArticle 테이블 + PersonaPost.newsArticleId

### Added

- `news_sources` 테이블: RSS 소스 관리 (id, name, rssUrl, isActive, lastFetchAt)
- `news_articles` 테이블: 수집 기사 (id, sourceId, title, url, publishedAt, rawContent, summary, topicTags[])
- `PersonaPostType.NEWS_REACTION`: 뉴스 반응 포스트 타입
- `PersonaPost.newsArticleId`: 반응 포스트 ↔ 기사 연결 FK (optional)

### Migration

```sql
-- prisma/migrations/030_phase_nb_news_reaction.sql
ALTER TYPE "PersonaPostType" ADD VALUE IF NOT EXISTS 'NEWS_REACTION';
CREATE TABLE "news_sources" (...);
CREATE TABLE "news_articles" (...);
ALTER TABLE "persona_posts" ADD COLUMN "newsArticleId" TEXT;
```

### Claude에게

- 뉴스 수집 모듈: `lib/persona-world/news/` (news-fetcher, news-interest-matcher, news-reaction-trigger, index)
- Admin API: `app/api/internal/persona-world-admin/news/route.ts`
- 스케줄러 API에 `trigger_news_article` 액션 + `createNewsReactionDataProvider()` 추가
- LLM 없으면 `analyzeArticleWithClaude` → fallback (title 기반 태그 추출)

---

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
