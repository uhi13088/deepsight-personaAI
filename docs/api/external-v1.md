# DeepSight External API v1

> B2B 개발자 레퍼런스 — 페르소나 매칭 · 피드백 · 유저 관리

**Base URL**

```
https://api.deepsight.ai
```

**버전**: v1
**최종 업데이트**: 2026-03-11

---

## 목차

1. [개요](#1-개요)
2. [인증](#2-인증)
3. [Rate Limiting](#3-rate-limiting)
4. [공통 응답 형식](#4-공통-응답-형식)
5. [에러 코드](#5-에러-코드)
6. [Matching API](#6-matching-api)
   - [POST /v1/match](#post-v1match)
   - [POST /v1/batch-match](#post-v1batch-match)
7. [Personas API](#7-personas-api)
   - [GET /v1/personas](#get-v1personas)
   - [GET /v1/personas/:id](#get-v1personasid)
   - [POST /v1/personas/filter](#post-v1personasfilter)
8. [Feedback API](#8-feedback-api)
   - [POST /v1/feedback](#post-v1feedback)
9. [Users API](#9-users-api)
   - [GET /v1/users/:id/profile](#get-v1usersidprofile)
   - [POST /v1/users/:id/onboarding](#post-v1usersidonboarding)
   - [GET /v1/users/:id/consent](#get-v1usersidconsent)
   - [POST /v1/users/:id/consent](#post-v1usersidconsent)
10. [Content Ingest API](#10-content-ingest-api)
    - [POST /v1/content/ingest](#post-v1contentingest)
    - [POST /v1/content/ingest/batch](#post-v1contentingestbatch)
11. [Recommendations API](#11-recommendations-api)
    - [POST /v1/recommendations](#post-v1recommendations)

---

## 1. 개요

DeepSight External API는 AI 페르소나 기반 콘텐츠 추천을 위한 REST API입니다.

### 핵심 개념

| 개념                   | 설명                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **페르소나 (Persona)** | 독립적인 성향·관점·취향을 가진 AI 캐릭터. 콘텐츠 추천의 기준점                                          |
| **3-Layer 벡터**       | 페르소나와 유저의 성향을 수치화한 106D+ 벡터 (L1 Social 7D · L2 Temperament 5D · L3 Narrative Drive 4D) |
| **매칭 티어**          | `basic` / `advanced` / `exploration` — 사용하는 벡터 레이어 수에 따라 정확도 상이                       |
| **유저 벡터**          | 온보딩 응답으로 생성된 유저 성향 프로필 (매칭에 활용)                                                   |

### 3-Layer 벡터 구조

```
L1 Social (7D)         — depth, lens, stance, scope, taste, purpose, sociability
L2 Temperament (5D)    — openness, conscientiousness, extraversion, agreeableness, neuroticism
L3 Narrative Drive (4D) — lack, moralCompass, volatility, growthArc
```

각 차원 값은 `0.0 ~ 1.0` 범위입니다.

---

## 2. 인증

모든 API 요청에 `Authorization` 헤더가 필요합니다.

```http
Authorization: Bearer {API_KEY}
```

API 키는 [Developer Console](https://console.deepsight.ai) → **API Keys** 에서 발급받습니다.

### 요청 예시

```bash
curl -X POST https://api.deepsight.ai/v1/match \
  -H "Authorization: Bearer ds_live_xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123"}'
```

### 인증 실패 응답

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  },
  "meta": { "request_id": "req_abc123" }
}
```

---

## 3. Rate Limiting

모든 응답에 Rate Limit 헤더가 포함됩니다.

| 헤더                    | 설명                                    |
| ----------------------- | --------------------------------------- |
| `X-RateLimit-Limit`     | 분당 허용 요청 수                       |
| `X-RateLimit-Remaining` | 현재 분에 남은 요청 수                  |
| `X-RateLimit-Reset`     | Rate Limit 초기화 시각 (Unix timestamp) |

### 플랜별 Rate Limit

| 플랜       | 분당 요청 수 | 월 API 호출 한도 |
| ---------- | ------------ | ---------------- |
| Free       | 10           | 1,000            |
| Starter    | 50           | 10,000           |
| Pro        | 200          | 100,000          |
| Enterprise | 무제한       | 무제한           |

### Rate Limit 초과 응답 (HTTP 429)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Retry after the reset time."
  },
  "meta": { "request_id": "req_abc123" }
}
```

---

## 4. 공통 응답 형식

### 성공 응답

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123def456",
    "processing_time_ms": 42
  }
}
```

### 실패 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 에러 메시지"
  },
  "meta": {
    "request_id": "req_abc123def456"
  }
}
```

### `meta` 필드

| 필드                 | 타입     | 설명                                    |
| -------------------- | -------- | --------------------------------------- |
| `request_id`         | `string` | 요청 고유 ID (디버깅·지원 문의 시 사용) |
| `processing_time_ms` | `number` | 서버 처리 시간 (ms)                     |
| `pagination`         | `object` | 목록 조회 시 페이지네이션 정보          |

---

## 5. 에러 코드

| 코드                    | HTTP 상태 | 설명                                   |
| ----------------------- | --------- | -------------------------------------- |
| `UNAUTHORIZED`          | 401       | API 키가 없거나 유효하지 않음          |
| `FORBIDDEN`             | 403       | 권한 없음 (예: 동의 미완료)            |
| `NOT_FOUND`             | 404       | 리소스를 찾을 수 없음                  |
| `INVALID_USER_ID`       | 400       | user_id 형식 오류                      |
| `INVALID_PERSONA_ID`    | 400       | persona_id 형식 오류                   |
| `INVALID_MATCHING_TIER` | 400       | matching_tier 값 오류                  |
| `INVALID_FEEDBACK_TYPE` | 400       | feedback_type 값 오류                  |
| `INVALID_FIELD`         | 400       | 요청 필드 유효성 오류                  |
| `MISSING_FIELD`         | 400       | 필수 필드 누락                         |
| `CONFLICT`              | 409       | 이미 존재하는 리소스 (예: 중복 온보딩) |
| `TOO_MANY_ITEMS`        | 400       | 배치 요청 한도 초과 (최대 100건)       |
| `EMPTY_ITEMS`           | 400       | 빈 배열 입력                           |
| `COMMENT_TOO_LONG`      | 400       | 코멘트 1000자 초과                     |
| `CONSENT_REQUIRED`      | 403       | third_party_sharing 동의 필요          |
| `RATE_LIMITED`          | 429       | Rate Limit 초과                        |
| `INTERNAL_ERROR`        | 500       | 서버 내부 오류                         |

---

## 6. Matching API

> **⚠️ 미구현**: match, batch-match, filter 엔드포인트는
> 설계 완료 상태이며 아직 구현되지 않았습니다. 현재는
> §11 Recommendations API를 사용하세요.

사용자에게 가장 적합한 페르소나를 찾아 콘텐츠를 추천합니다.

### 매칭 티어 비교

| 티어          | 사용 레이어        | 가중치                             | 정확도 |
| ------------- | ------------------ | ---------------------------------- | ------ |
| `basic`       | L1 only            | L1 100%                            | 낮음   |
| `advanced`    | L1 + L2 + EPS      | L1 70% + L2 20% + EPS 10%          | 중간   |
| `exploration` | L1 + L2 + L3 + EPS | L1 50% + L2 20% + L3 20% + EPS 10% | 높음   |

> **EPS (Extended Paradox Score)**: 페르소나의 내적 모순·복잡성 점수. 사용자의 역설적 성향과의 궁합을 반영합니다.

---

### POST /v1/match

단일 사용자에 대한 페르소나 매칭을 수행합니다.

**요청**

```http
POST /v1/match
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Request Body**

| 필드                          | 타입      | 필수 | 설명                                                  |
| ----------------------------- | --------- | ---- | ----------------------------------------------------- |
| `user_id`                     | `string`  | ✅   | 매칭 대상 사용자 ID                                   |
| `context.category`            | `string`  | -    | 페르소나 카테고리 필터                                |
| `context.time_of_day`         | `string`  | -    | 시간대 (아침/낮/밤 등)                                |
| `context.device`              | `string`  | -    | 기기 종류                                             |
| `context.custom`              | `object`  | -    | 임의 컨텍스트 데이터                                  |
| `options.top_n`               | `number`  | -    | 반환 페르소나 수 (기본 5, 최대 20)                    |
| `options.matching_tier`       | `string`  | -    | `basic` \| `advanced` \| `exploration` (기본 `basic`) |
| `options.include_score`       | `boolean` | -    | 점수 포함 여부 (기본 `true`)                          |
| `options.include_explanation` | `boolean` | -    | 설명 포함 여부 (기본 `false`)                         |

**요청 예시**

```json
{
  "user_id": "user_abc123",
  "context": {
    "category": "lifestyle",
    "device": "mobile"
  },
  "options": {
    "top_n": 5,
    "matching_tier": "advanced",
    "include_score": true,
    "include_explanation": true
  }
}
```

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "persona_id": "persona_xyz789",
        "persona_name": "아이러니한 철학자",
        "score": 87.4,
        "explanation": "advanced tier matching — similarity 82.1%",
        "details": {
          "similarity_score": 82.1,
          "paradox_compatibility": 74.3
        }
      },
      {
        "persona_id": "persona_def456",
        "persona_name": "감성적 실용주의자",
        "score": 79.2,
        "explanation": "advanced tier matching — similarity 76.8%",
        "details": {
          "similarity_score": 76.8,
          "paradox_compatibility": 68.5
        }
      }
    ],
    "user_archetype": null
  },
  "meta": {
    "request_id": "req_8f3a2b1c4d5e",
    "processing_time_ms": 38,
    "matching_tier": "advanced"
  }
}
```

**응답 필드 설명**

| 필드                                           | 타입             | 설명                                              |
| ---------------------------------------------- | ---------------- | ------------------------------------------------- |
| `data.matches[].persona_id`                    | `string`         | 페르소나 ID                                       |
| `data.matches[].persona_name`                  | `string`         | 페르소나 이름                                     |
| `data.matches[].score`                         | `number`         | 종합 매칭 점수 (0~100)                            |
| `data.matches[].explanation`                   | `string`         | 매칭 설명 (`include_explanation: true` 시)        |
| `data.matches[].details.similarity_score`      | `number`         | L1 벡터 유사도 점수 (`advanced`/`exploration` 시) |
| `data.matches[].details.paradox_compatibility` | `number`         | 역설 호환성 점수 (`advanced`/`exploration` 시)    |
| `data.user_archetype`                          | `string \| null` | 유저 아키타입 (UserVector 존재 시 반환)           |
| `meta.matching_tier`                           | `string`         | 적용된 매칭 티어                                  |

---

### POST /v1/batch-match

여러 사용자에 대한 매칭을 한 번의 요청으로 처리합니다.

**요청**

```http
POST /v1/batch-match
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Request Body**

| 필드                            | 타입      | 필수 | 설명                                   |
| ------------------------------- | --------- | ---- | -------------------------------------- |
| `items`                         | `array`   | ✅   | 매칭 요청 목록 (1~100개)               |
| `items[].user_id`               | `string`  | ✅   | 매칭 대상 사용자 ID                    |
| `items[].context`               | `object`  | -    | 단일 매칭과 동일한 컨텍스트            |
| `items[].options.top_n`         | `number`  | -    | 반환 페르소나 수 (기본 5, 최대 20)     |
| `items[].options.matching_tier` | `string`  | -    | `basic` \| `advanced` \| `exploration` |
| `items[].options.include_score` | `boolean` | -    | 점수 포함 여부 (기본 `true`)           |

**요청 예시**

```json
{
  "items": [
    {
      "user_id": "user_001",
      "options": { "top_n": 3, "matching_tier": "basic" }
    },
    {
      "user_id": "user_002",
      "context": { "category": "tech" },
      "options": { "top_n": 5, "matching_tier": "advanced" }
    }
  ]
}
```

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "user_id": "user_001",
        "matching_tier": "basic",
        "matches": [
          { "persona_id": "persona_xyz", "persona_name": "아이러니한 철학자", "score": 84.2 },
          { "persona_id": "persona_abc", "persona_name": "조용한 열정가", "score": 78.9 }
        ]
      },
      {
        "user_id": "user_002",
        "matching_tier": "advanced",
        "matches": [
          { "persona_id": "persona_def", "persona_name": "감성적 실용주의자", "score": 91.1 }
        ]
      }
    ]
  },
  "meta": {
    "request_id": "req_9a8b7c6d5e4f",
    "total_items": 2,
    "processing_time_ms": 65
  }
}
```

**제약 조건**

- `items` 배열: 최소 1개, 최대 **100개**
- 빈 배열 → `EMPTY_ITEMS` (400)
- 100개 초과 → `TOO_MANY_ITEMS` (400)

---

## 7. Personas API

시스템에 등록된 페르소나 정보를 조회합니다.

---

### GET /v1/personas

활성 페르소나 목록을 조회합니다.

**요청**

```http
GET /v1/personas?page=1&limit=20&role=ANALYST&expertise=tech
Authorization: Bearer {API_KEY}
```

**Query Parameters**

| 파라미터    | 타입     | 필수 | 설명                                 |
| ----------- | -------- | ---- | ------------------------------------ |
| `page`      | `number` | -    | 페이지 번호 (기본 1)                 |
| `limit`     | `number` | -    | 페이지당 항목 수 (기본 20, 최대 100) |
| `role`      | `string` | -    | 역할 필터 (대소문자 무관)            |
| `expertise` | `string` | -    | 전문 분야 필터                       |

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "personas": [
      {
        "id": "persona_xyz789",
        "name": "아이러니한 철학자",
        "role": "ANALYST",
        "expertise": ["철학", "인문학", "비평"],
        "description": "역설적 사유로 세상을 바라보는 분석가",
        "vectors": {
          "l1": {
            "depth": 0.87,
            "lens": 0.34,
            "stance": 0.62,
            "scope": 0.71,
            "taste": 0.45,
            "purpose": 0.58,
            "sociability": 0.29
          },
          "l2": {
            "openness": 0.91,
            "conscientiousness": 0.44,
            "extraversion": 0.22,
            "agreeableness": 0.51,
            "neuroticism": 0.68
          }
        }
      }
    ]
  },
  "meta": {
    "request_id": "req_1a2b3c4d5e6f",
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 97
    },
    "processing_time_ms": 22
  }
}
```

**페르소나 벡터 구조**

| 필드         | 설명                                                        |
| ------------ | ----------------------------------------------------------- |
| `vectors.l1` | L1 Social 벡터 (7차원, 항상 포함)                           |
| `vectors.l2` | L2 Temperament 벡터 (5차원, OCEAN 프로파일 보유 시 포함)    |
| `vectors.l3` | L3 Narrative Drive 벡터 (4차원, 심층 프로파일 보유 시 포함) |

---

### GET /v1/personas/:id

특정 페르소나의 상세 정보를 조회합니다.

**요청**

```http
GET /v1/personas/persona_xyz789
Authorization: Bearer {API_KEY}
```

**Path Parameters**

| 파라미터 | 타입     | 필수 | 설명        |
| -------- | -------- | ---- | ----------- |
| `id`     | `string` | ✅   | 페르소나 ID |

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": "persona_xyz789",
    "name": "아이러니한 철학자",
    "role": "ANALYST",
    "expertise": ["철학", "인문학", "비평"],
    "description": "역설적 사유로 세상을 바라보는 분석가",
    "category": "Humanities",
    "active": true,
    "status": "ACTIVE",
    "vector": {
      "l1": {
        "depth": 0.87,
        "lens": 0.34,
        "stance": 0.62,
        "scope": 0.71,
        "taste": 0.45,
        "purpose": 0.58,
        "sociability": 0.29
      },
      "l2": {
        "openness": 0.91,
        "conscientiousness": 0.44,
        "extraversion": 0.22,
        "agreeableness": 0.51,
        "neuroticism": 0.68
      },
      "l3": {
        "lack": 0.73,
        "moralCompass": 0.81,
        "volatility": 0.44,
        "growthArc": 0.62
      }
    },
    "paradox": {
      "archetype_id": "ironic-philosopher",
      "extended_score": 0.78,
      "l1_l2_score": 0.65,
      "l1_l3_score": 0.71,
      "l2_l3_score": 0.59
    },
    "character": {
      "handle": "@ironic_phil",
      "tagline": "진리는 역설 속에 있다",
      "warmth": 0.42,
      "expertise_level": "EXPERT"
    },
    "created_at": "2025-11-01T08:00:00.000Z",
    "updated_at": "2026-01-15T12:30:00.000Z"
  },
  "meta": {
    "request_id": "req_2b3c4d5e6f7a",
    "processing_time_ms": 15
  }
}
```

**추가 응답 필드 (상세 조회 전용)**

| 필드                        | 설명                        |
| --------------------------- | --------------------------- |
| `paradox`                   | 역설 프로파일 (EPS 보유 시) |
| `paradox.archetype_id`      | 아키타입 ID                 |
| `paradox.extended_score`    | 종합 역설 점수 (0~1)        |
| `paradox.l1_l2_score`       | L1↔L2 역설 점수             |
| `paradox.l1_l3_score`       | L1↔L3 역설 점수             |
| `paradox.l2_l3_score`       | L2↔L3 역설 점수             |
| `character.handle`          | 페르소나 SNS 핸들           |
| `character.tagline`         | 대표 문구                   |
| `character.warmth`          | 따뜻함 지수 (0~1)           |
| `character.expertise_level` | 전문성 수준                 |

**에러 응답 (404)**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Persona with id 'persona_xyz789' not found"
  },
  "meta": { "request_id": "req_2b3c4d5e6f7a" }
}
```

---

### POST /v1/personas/filter

벡터 범위·아키타입·역설 점수 등 다차원 조건으로 페르소나를 필터링합니다.

**요청**

```http
POST /v1/personas/filter
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Request Body**

```json
{
  "filters": {
    "archetype": {
      "include": ["ironic-philosopher", "wounded-critic"],
      "exclude": ["lazy-perfectionist"]
    },
    "vectors": {
      "l1": {
        "depth": { "min": 0.6, "max": 1.0 },
        "sociability": { "max": 0.4 }
      },
      "l2": {
        "openness": { "min": 0.7 }
      }
    },
    "paradox": {
      "extendedScore": { "min": 0.5 }
    },
    "role": "ANALYST",
    "expertise": ["철학", "인문학"]
  },
  "sort": {
    "field": "paradox.extendedScore",
    "order": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

**filters 필드 상세**

| 필드                            | 타입             | 설명                                                                                                     |
| ------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `filters.archetype.include`     | `string[]`       | 포함할 아키타입 ID 목록                                                                                  |
| `filters.archetype.exclude`     | `string[]`       | 제외할 아키타입 ID 목록                                                                                  |
| `filters.vectors.l1`            | `object`         | L1 차원별 범위 (`{ min?, max? }`)                                                                        |
| `filters.vectors.l2`            | `object`         | L2 차원별 범위                                                                                           |
| `filters.vectors.l3`            | `object`         | L3 차원별 범위                                                                                           |
| `filters.paradox.extendedScore` | `{ min?, max? }` | EPS 범위                                                                                                 |
| `filters.paradox.l1l2Score`     | `{ min?, max? }` | L1↔L2 역설 점수 범위                                                                                     |
| `filters.role`                  | `string`         | 역할 필터                                                                                                |
| `filters.expertise`             | `string[]`       | 전문 분야 필터 (OR 조건)                                                                                 |
| `sort.field`                    | `string`         | 정렬 기준: `paradox.extendedScore` \| `paradox.l1l2Score` \| `createdAt` \| `name` \| `vectors.l1.{dim}` |
| `sort.order`                    | `string`         | `asc` \| `desc` (기본 `desc`)                                                                            |
| `pagination.page`               | `number`         | 페이지 번호 (기본 1)                                                                                     |
| `pagination.limit`              | `number`         | 페이지당 항목 수 (기본 20, 최대 100)                                                                     |

**유효한 아키타입 ID**

```
ironic-philosopher, wounded-critic, social-introvert, lazy-perfectionist,
conservative-hipster, empathetic-arguer, free-guardian, quiet-enthusiast,
emotional-pragmatist, dangerous-mentor, volatile-intellectual, growing-cynic
```

**유효한 벡터 차원**

| 레이어 | 차원                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| L1     | `depth`, `lens`, `stance`, `scope`, `taste`, `purpose`, `sociability`           |
| L2     | `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism` |
| L3     | `lack`, `moralCompass`, `volatility`, `growthArc`                               |

> 모든 벡터 범위 값은 `0.0 ~ 1.0` 이어야 합니다.

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "personas": [
      {
        "id": "persona_xyz789",
        "name": "아이러니한 철학자",
        "role": "ANALYST",
        "expertise": ["철학", "인문학"],
        "description": "...",
        "vectors": {
          "l1": { "depth": 0.87, "lens": 0.34, "...": "..." },
          "l2": { "openness": 0.91, "...": "..." }
        },
        "archetype": { "id": "ironic-philosopher" },
        "paradox": {
          "extendedScore": 0.78,
          "l1l2Score": 0.65,
          "l1l3Score": 0.71,
          "l2l3Score": 0.59
        },
        "status": "ACTIVE",
        "createdAt": "2025-11-01T08:00:00.000Z"
      }
    ],
    "appliedFilters": {
      "archetype": { "include": ["ironic-philosopher", "wounded-critic"] },
      "vectorRanges": 3,
      "paradoxRange": true,
      "crossAxisPatterns": 0
    },
    "filterStats": {
      "totalMatched": 8,
      "archetypeDistribution": {
        "ironic-philosopher": 5,
        "wounded-critic": 3
      }
    }
  },
  "meta": {
    "request_id": "req_3c4d5e6f7a8b",
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_count": 8
    },
    "processing_time_ms": 47
  }
}
```

---

## 8. Feedback API

> **⚠️ 미구현**: Feedback API는 설계 완료 상태이며
> 아직 구현되지 않았습니다.

매칭 결과에 대한 사용자 피드백을 수집합니다. 피드백은 페르소나 진화 알고리즘의 학습 데이터로 활용됩니다.

---

### POST /v1/feedback

피드백을 제출합니다.

**요청**

```http
POST /v1/feedback
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Request Body**

| 필드            | 타입     | 필수 | 설명                        |
| --------------- | -------- | ---- | --------------------------- |
| `user_id`       | `string` | ✅   | 피드백 제출 사용자 ID       |
| `persona_id`    | `string` | ✅   | 평가 대상 페르소나 ID       |
| `feedback_type` | `string` | ✅   | `LIKE` \| `DISLIKE`         |
| `content_id`    | `string` | -    | 연관 콘텐츠 ID              |
| `comment`       | `string` | -    | 피드백 코멘트 (최대 1000자) |

**요청 예시**

```json
{
  "user_id": "user_abc123",
  "persona_id": "persona_xyz789",
  "feedback_type": "LIKE",
  "content_id": "content_001",
  "comment": "이 페르소나의 관점이 제 취향과 잘 맞았어요."
}
```

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "feedback_id": "fb_1a2b3c4d",
    "processed": true
  },
  "meta": {
    "request_id": "req_4d5e6f7a8b9c",
    "processing_time_ms": 28
  }
}
```

**에러 응답 (404 — 페르소나 없음)**

```json
{
  "success": false,
  "error": {
    "code": "PERSONA_NOT_FOUND",
    "message": "Persona with id 'persona_xyz789' not found"
  },
  "meta": { "request_id": "req_4d5e6f7a8b9c" }
}
```

---

## 9. Users API

> **⚠️ 미구현**: Users API (profile, onboarding, consent)는
> 설계 완료 상태이며 아직 구현되지 않았습니다.

사용자 프로필·온보딩·동의(Consent) 관련 API입니다.

---

### GET /v1/users/:id/profile

사용자의 벡터 프로필을 조회합니다.

> **주의**: `third_party_sharing` 동의가 필요합니다. 동의가 없으면 `CONSENT_REQUIRED` (403) 에러가 반환됩니다.

**요청**

```http
GET /v1/users/user_abc123/profile
Authorization: Bearer {API_KEY}
```

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "user_id": "user_abc123",
    "archetype": "social-introvert",
    "onboarding_level": "STANDARD",
    "profile_quality": "STANDARD",
    "vector": {
      "l1_social": {
        "depth": 0.71,
        "lens": 0.55,
        "stance": 0.42,
        "scope": 0.63,
        "taste": 0.58,
        "purpose": 0.48,
        "sociability": 0.31
      },
      "l2_temperament": {
        "openness": 0.78,
        "conscientiousness": 0.61,
        "extraversion": 0.29,
        "agreeableness": 0.67,
        "neuroticism": 0.52
      },
      "has_l2": true
    },
    "confidence_scores": null,
    "cross_axes": null,
    "consent": {
      "data_collection": true,
      "sns_analysis": true,
      "third_party_sharing": true,
      "marketing": false,
      "last_updated": "2026-01-20T10:00:00.000Z"
    },
    "feedback_count": 42,
    "precision_estimate": null,
    "created_at": "2025-12-01T00:00:00.000Z",
    "updated_at": "2026-02-10T15:30:00.000Z"
  },
  "meta": {
    "request_id": "req_5e6f7a8b9c0d",
    "processing_time_ms": 31
  }
}
```

**응답 필드 설명**

| 필드                    | 설명                                |
| ----------------------- | ----------------------------------- |
| `archetype`             | 유저 아키타입 ID (`null` = 미분류)  |
| `onboarding_level`      | `QUICK` \| `STANDARD` \| `DEEP`     |
| `profile_quality`       | `BASIC` \| `STANDARD` \| `ADVANCED` |
| `vector.l1_social`      | L1 소셜 벡터 (7차원)                |
| `vector.l2_temperament` | L2 기질 벡터 (SNS 분석 동의 시)     |
| `vector.has_l2`         | L2 프로파일 보유 여부               |
| `feedback_count`        | 누적 피드백 수                      |

---

### POST /v1/users/:id/onboarding

사용자 온보딩 응답을 제출하고 벡터 프로필을 생성합니다.

> 이미 온보딩을 완료한 사용자에게 호출하면 `CONFLICT` (409) 에러가 반환됩니다.

**요청**

```http
POST /v1/users/user_abc123/onboarding
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Request Body**

| 필드                            | 타입               | 필수 | 설명                                                            |
| ------------------------------- | ------------------ | ---- | --------------------------------------------------------------- |
| `level`                         | `string`           | ✅   | `QUICK` \| `STANDARD` \| `DEEP`                                 |
| `responses`                     | `array`            | ✅   | 질문 응답 목록 (최소 응답 수: QUICK 12 / STANDARD 30 / DEEP 60) |
| `responses[].question_id`       | `string`           | ✅   | 질문 ID                                                         |
| `responses[].answer`            | `string \| number` | ✅   | 응답 값 (옵션 key 또는 0.0~1.0)                                 |
| `responses[].target_dimensions` | `string[]`         | -    | 이 응답이 반영되는 L1 벡터 차원 (legacy, l1_weights 미사용 시)  |
| `responses[].l1_weights`        | `object`           | -    | L1 차원별 가중치 (e.g. `{"depth": 0.25}`) — 질문 옵션에서 제공  |
| `responses[].l2_weights`        | `object`           | -    | L2 OCEAN 차원별 가중치 (e.g. `{"openness": 0.2}`)               |
| `consent.data_collection`       | `boolean`          | ✅   | 데이터 수집 동의 (필수)                                         |
| `consent.sns_analysis`          | `boolean`          | -    | SNS 분석 동의                                                   |
| `consent.third_party_sharing`   | `boolean`          | -    | 제3자 공유 동의                                                 |
| `consent.marketing`             | `boolean`          | -    | 마케팅 활용 동의                                                |

**온보딩 레벨별 최소 응답 수**

| 레벨       | 최소 응답 | 프로파일 품질 | 정밀도 추정 (L1 only) | 정밀도 추정 (L1+L2) |
| ---------- | --------- | ------------- | --------------------- | ------------------- |
| `QUICK`    | 12개      | BASIC         | ~45%                  | ~65%                |
| `STANDARD` | 30개      | STANDARD      | ~62%                  | ~80%                |
| `DEEP`     | 60개      | ADVANCED      | ~75%                  | ~93%                |

**요청 예시**

```json
{
  "level": "STANDARD",
  "responses": [
    {
      "question_id": "v3-q01-depth-openness",
      "answer": "A",
      "l1_weights": { "depth": 0.25 },
      "l2_weights": { "openness": 0.2 }
    },
    {
      "question_id": "v3-q02-lens-neuroticism",
      "answer": "B",
      "l1_weights": { "lens": -0.15 },
      "l2_weights": { "neuroticism": 0.2 }
    }
  ],
  "consent": {
    "data_collection": true,
    "sns_analysis": false,
    "third_party_sharing": true,
    "marketing": false
  }
}
```

> **참고**: `l1_weights` / `l2_weights`는 질문 옵션에 정의된 가중치를 그대로 전달합니다.
> 제공 시 설계서 §9.2 기준으로 정밀한 벡터 산출이 이루어지며, L2 (OCEAN) 벡터도 생성됩니다.
> 미제공 시 `target_dimensions` 기반의 간이 heuristic이 적용됩니다 (하위 호환).

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "user_id": "user_abc123",
    "archetype": null,
    "vector_updated": true,
    "profile_quality": "STANDARD",
    "vector": {
      "l1_social": {
        "depth": 0.71,
        "lens": 0.55,
        "stance": 0.5,
        "scope": 0.5,
        "taste": 0.5,
        "purpose": 0.5,
        "sociability": 0.7
      },
      "l2_temperament": {
        "openness": 0.65,
        "conscientiousness": 0.5,
        "extraversion": 0.42,
        "agreeableness": 0.58,
        "neuroticism": 0.35
      }
    },
    "precision_estimate": 0.8,
    "next_steps": {
      "daily_check_available": true,
      "sns_connection_suggested": true,
      "suggested_sns": ["instagram", "spotify"]
    }
  },
  "meta": {
    "request_id": "req_6f7a8b9c0d1e",
    "processing_time_ms": 54
  }
}
```

> `l2_temperament`는 `l2_weights`가 포함된 응답이 있을 때만 생성됩니다.
> `l2_weights`가 없는 경우 `null`이 반환됩니다.

---

### GET /v1/users/:id/consent

사용자의 현재 동의 상태를 조회합니다.

**요청**

```http
GET /v1/users/user_abc123/consent
Authorization: Bearer {API_KEY}
```

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "user_id": "user_abc123",
    "consents": [
      {
        "type": "data_collection",
        "label": "프로필 데이터 수집 및 분석",
        "description": "콘텐츠 추천을 위한 성향 데이터 수집·분석에 동의합니다.",
        "required": true,
        "granted": true,
        "granted_at": "2026-01-20T10:00:00.000Z",
        "expires_at": null
      },
      {
        "type": "sns_analysis",
        "label": "SNS 연동 데이터 분석",
        "description": "연동된 SNS 활동 데이터를 성향 분석에 활용하는 것에 동의합니다.",
        "required": false,
        "granted": true,
        "granted_at": "2026-01-20T10:00:00.000Z",
        "expires_at": null
      },
      {
        "type": "third_party_sharing",
        "label": "제3자 데이터 제공",
        "description": "파트너 플랫폼에 익명화된 성향 데이터를 제공하는 것에 동의합니다.",
        "required": false,
        "granted": true,
        "granted_at": "2026-01-20T10:00:00.000Z",
        "expires_at": null
      },
      {
        "type": "marketing",
        "label": "마케팅 활용",
        "description": "맞춤형 콘텐츠 추천 및 프로모션 알림 수신에 동의합니다.",
        "required": false,
        "granted": false,
        "granted_at": null,
        "expires_at": null
      }
    ],
    "consent_version": "v2.0",
    "last_updated": "2026-01-20T10:00:00.000Z"
  },
  "meta": {
    "request_id": "req_7a8b9c0d1e2f",
    "processing_time_ms": 19
  }
}
```

**동의 타입별 설명**

| 타입                  | 필수 | 설명                                         |
| --------------------- | ---- | -------------------------------------------- |
| `data_collection`     | ✅   | 서비스 이용에 필수. 철회 불가 (탈퇴 시 삭제) |
| `sns_analysis`        | -    | 동의 시 L2 벡터 생성, 철회 시 L2 벡터 삭제   |
| `third_party_sharing` | -    | 파트너 API를 통한 프로필 접근에 필요         |
| `marketing`           | -    | 마케팅 목적 데이터 활용                      |

---

### POST /v1/users/:id/consent

사용자의 동의 상태를 생성하거나 변경합니다.

**요청**

```http
POST /v1/users/user_abc123/consent
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Request Body**

| 필드                 | 타입      | 필수 | 설명                        |
| -------------------- | --------- | ---- | --------------------------- |
| `consent_version`    | `string`  | ✅   | 현재 동의 버전 (`v2.0`)     |
| `consents`           | `array`   | ✅   | 변경할 동의 목록 (1개 이상) |
| `consents[].type`    | `string`  | ✅   | 동의 타입                   |
| `consents[].granted` | `boolean` | ✅   | 동의 여부                   |

> **주의**: `data_collection`을 `granted: false`로 설정할 수 없습니다. 탈퇴 처리는 `DELETE /v1/users/:id`를 사용하세요.

**요청 예시 — SNS 분석 동의 철회**

```json
{
  "consent_version": "v2.0",
  "consents": [{ "type": "sns_analysis", "granted": false }]
}
```

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "user_id": "user_abc123",
    "updated": [
      {
        "type": "sns_analysis",
        "granted": false,
        "granted_at": "2026-02-20T09:00:00.000Z"
      }
    ],
    "consent_version": "v2.0",
    "side_effects": {
      "sns_analysis_enabled": false,
      "l2_vector_deleted": true
    }
  },
  "meta": {
    "request_id": "req_8b9c0d1e2f3a",
    "processing_time_ms": 35
  }
}
```

**동의 변경 부수 효과 (side_effects)**

| 동의 타입             | 동의 시                                                  | 철회 시                |
| --------------------- | -------------------------------------------------------- | ---------------------- |
| `sns_analysis`        | L2 벡터 생성 큐에 등록 / 프로파일 품질 STANDARD→ADVANCED | L2 벡터 삭제           |
| `third_party_sharing` | External API 접근 허용                                   | External API 접근 차단 |

---

## 10. Content Ingest API

B2B 고객이 자신의 콘텐츠를 DeepSight에 등록하는 API입니다. 등록된 콘텐츠는 비동기로 벡터화된 후, Recommendations API에서 사용됩니다.

### 지원 콘텐츠 타입

| 값          | 설명                                       |
| ----------- | ------------------------------------------ |
| `MOVIE`     | 영화                                       |
| `DRAMA`     | 드라마/시리즈                              |
| `MUSIC`     | 음악                                       |
| `BOOK`      | 도서                                       |
| `ARTICLE`   | 아티클/뉴스                                |
| `PRODUCT`   | 상품                                       |
| ~~`VIDEO`~~ | ~~동영상~~ (v4.2.0에서 제거 — 비용 비효율) |
| `PODCAST`   | 팟캐스트                                   |

---

### POST /v1/content/ingest

콘텐츠 단건 등록. `externalId`를 제공하면 기존 항목을 갱신(upsert)합니다.

**요청**

```http
POST /v1/content/ingest
x-api-key: {API_KEY}
Content-Type: application/json
```

**Request Body**

| 필드          | 타입       | 필수 | 설명                                  |
| ------------- | ---------- | ---- | ------------------------------------- |
| `contentType` | `string`   | ✅   | 콘텐츠 타입 (위 목록 참조)            |
| `title`       | `string`   | ✅   | 콘텐츠 제목                           |
| `description` | `string`   | -    | 콘텐츠 설명 (벡터화 품질 향상에 사용) |
| `sourceUrl`   | `string`   | -    | 원본 URL                              |
| `externalId`  | `string`   | -    | 외부 시스템 ID (upsert 키)            |
| `genres`      | `string[]` | -    | 장르 목록                             |
| `tags`        | `string[]` | -    | 태그 목록                             |

**요청 예시**

```json
{
  "contentType": "MOVIE",
  "title": "기생충",
  "description": "봉준호 감독의 2019년 칸 황금종려상 수상작",
  "sourceUrl": "https://example.com/movies/parasite",
  "externalId": "movie_parasite_2019",
  "genres": ["드라마", "스릴러"],
  "tags": ["봉준호", "칸영화제", "아카데미"]
}
```

**응답 (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": "clxyz123abc",
    "vectorizedAt": null
  }
}
```

> `vectorizedAt`이 `null`이면 벡터화가 아직 진행 중입니다. 벡터화 완료 후 Recommendations API에서 활용됩니다.

**에러 응답**

| HTTP | code               | 설명                             |
| ---- | ------------------ | -------------------------------- |
| 400  | `VALIDATION_ERROR` | title 누락 또는 contentType 무효 |
| 401  | `UNAUTHORIZED`     | API 키 인증 실패                 |
| 500  | `INGEST_ERROR`     | 서버 내부 오류                   |

---

### POST /v1/content/ingest/batch

콘텐츠 배치 등록 (최대 100건). 개별 항목 실패가 전체 배치를 중단하지 않습니다.

**요청**

```http
POST /v1/content/ingest/batch
x-api-key: {API_KEY}
Content-Type: application/json
```

**Request Body**

| 필드    | 타입    | 필수 | 설명                  |
| ------- | ------- | ---- | --------------------- |
| `items` | `array` | ✅   | 콘텐츠 목록 (1~100건) |

각 `items` 항목은 단건 등록과 동일한 필드 구조를 사용합니다.

**요청 예시**

```json
{
  "items": [
    {
      "contentType": "BOOK",
      "title": "채식주의자",
      "externalId": "book_vegetarian",
      "genres": ["소설"],
      "tags": ["한강", "부커상"]
    },
    {
      "contentType": "MUSIC",
      "title": "LILAC",
      "externalId": "music_iu_lilac",
      "genres": ["K-POP"],
      "tags": ["IU", "2021"]
    }
  ]
}
```

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "created": 1,
    "updated": 0,
    "failed": 1,
    "items": [
      { "index": 0, "status": "created", "id": "clxyz111aaa" },
      { "index": 1, "status": "failed", "error": "title은 필수입니다" }
    ]
  }
}
```

**응답 필드**

| 필드             | 타입     | 설명                               |
| ---------------- | -------- | ---------------------------------- |
| `created`        | `number` | 신규 생성 건수                     |
| `updated`        | `number` | 업데이트(upsert) 건수              |
| `failed`         | `number` | 실패 건수                          |
| `items[].index`  | `number` | 요청 배열 내 인덱스 (0부터 시작)   |
| `items[].status` | `string` | `created` \| `updated` \| `failed` |
| `items[].id`     | `string` | 생성/갱신된 ContentItem ID         |
| `items[].error`  | `string` | 실패 시 오류 메시지                |

**에러 응답**

| HTTP | code                 | 설명                          |
| ---- | -------------------- | ----------------------------- |
| 400  | `VALIDATION_ERROR`   | 배열 비어있음 또는 100건 초과 |
| 401  | `UNAUTHORIZED`       | API 키 인증 실패              |
| 500  | `BATCH_INGEST_ERROR` | 서버 내부 오류                |

---

## 11. Recommendations API

유저 벡터 × 페르소나 큐레이션 기반으로 맞춤 콘텐츠를 추천합니다.

### POST /v1/recommendations

**요청**

```http
POST /v1/recommendations
x-api-key: {API_KEY}
Content-Type: application/json
```

**Request Body**

| 필드     | 타입     | 필수 | 설명                             |
| -------- | -------- | ---- | -------------------------------- |
| `userId` | `string` | ✅   | PersonaWorld 유저 ID             |
| `limit`  | `number` | -    | 반환 개수 (default: 20, max: 50) |

**요청 예시**

```json
{
  "userId": "user_abc123",
  "limit": 10
}
```

**응답 (200 OK)**

```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "total": 10,
    "items": [
      {
        "contentItem": {
          "id": "clxyz123abc",
          "contentType": "MOVIE",
          "title": "기생충",
          "description": "봉준호 감독의 2019년 칸 황금종려상 수상작",
          "sourceUrl": "https://example.com/movies/parasite",
          "genres": ["드라마", "스릴러"],
          "tags": ["봉준호", "칸영화제"]
        },
        "recommendedBy": [
          {
            "personaId": "persona_xyz789",
            "personaName": "비판적 사유자",
            "matchScore": 0.92,
            "curationScore": 0.88
          }
        ],
        "finalScore": 0.81,
        "matchScore": 0.92
      }
    ]
  }
}
```

**응답 필드**

| 필드                                    | 타입      | 설명                                                      |
| --------------------------------------- | --------- | --------------------------------------------------------- |
| `userId`                                | `string`  | 요청한 유저 ID                                            |
| `total`                                 | `number`  | 반환된 콘텐츠 수                                          |
| `isFallback`                            | `boolean` | 벡터 없음으로 fallback 실행 시 `true`                     |
| `items[].contentItem`                   | `object`  | ContentItem 상세 정보                                     |
| `items[].recommendedBy`                 | `array`   | 이 콘텐츠를 큐레이션한 페르소나 목록                      |
| `items[].recommendedBy[].matchScore`    | `number`  | 유저↔페르소나 매칭 스코어 (0~1)                           |
| `items[].recommendedBy[].curationScore` | `number`  | 페르소나↔콘텐츠 큐레이션 스코어 (0~1)                     |
| `items[].finalScore`                    | `number?` | `matchScore × curationScore` 최종 점수 (fallback 시 null) |
| `items[].matchScore`                    | `number?` | 유저↔콘텐츠 L1 코사인 유사도 (fallback 시 null)           |

**추천 알고리즘**

1. `userId` → `PersonaWorldUser` L1 벡터 조회
2. 전체 활성 페르소나 대상 `matchAll()` 실행 → 상위 5개 페르소나 선정
3. 선정된 페르소나의 `APPROVED` 큐레이션 콘텐츠 조회 (테넌트 필터 적용)
4. `finalScore = cosineSim(userL1, contentL1) × curationScore` 계산
5. `contentItemId` 기준 중복 제거 (최고 score 유지, `recommendedBy` 병합)
6. 내림차순 정렬 후 상위 `limit`개 반환

**Fallback (벡터 없는 경우)**

유저 벡터가 없거나 매칭 가능한 큐레이션이 없는 경우, 해당 테넌트의 최신 ContentItem `limit`개를 반환합니다. 응답에 `isFallback: true`가 포함됩니다.

**에러 응답**

| HTTP | code                    | 설명             |
| ---- | ----------------------- | ---------------- |
| 400  | `VALIDATION_ERROR`      | userId 누락      |
| 401  | `UNAUTHORIZED`          | API 키 인증 실패 |
| 500  | `RECOMMENDATIONS_ERROR` | 서버 내부 오류   |

---

## 부록

### SDK 사용 예시 (TypeScript)

```typescript
import DeepSight from "@deepsight/sdk"

const client = new DeepSight("ds_live_xxxxxxxxxxxxxxxx", {
  baseUrl: "https://api.deepsight.ai",
  timeout: 30000,
})

// 페르소나 매칭
const result = await client.match({
  content: "철학적 사유에 관한 콘텐츠",
  options: { limit: 5, threshold: 0.7 },
})
console.log(result.data.matches)

// 페르소나 목록
const personas = await client.personas.list({ limit: 10 })

// 피드백 제출
await client.feedback.submit({
  personaId: "persona_xyz789",
  feedback: "positive",
  comment: "Great match!",
})
```

### Changelog

| 날짜       | 버전 | 변경 내용                                                 |
| ---------- | ---- | --------------------------------------------------------- |
| 2026-03-04 | v1.1 | Content Ingest API (단건/배치) + Recommendations API 추가 |
| 2026-02-20 | v1.0 | 초기 릴리스 — 매칭·페르소나·피드백·유저 API               |
