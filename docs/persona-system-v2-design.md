# 페르소나 시스템 v2 설계서

> 작성일: 2026-02-06
> 상태: 설계 단계 (미구현)

## 1. 개요

### 1.1 목표

- 페르소나를 **진짜 사람처럼** 느껴지도록 개선
- 6D 벡터 매칭 시스템 유지 + 캐릭터 속성 레이어 추가
- 글로벌 서비스 대응

### 1.2 핵심 개념: 2-Layer 시스템

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: 6D 벡터 (기존)                                    │
│  → 콘텐츠 평가 성향 매칭용                                   │
│  → 유저 ↔ 페르소나 유사도 계산                               │
└─────────────────────────────────────────────────────────────┘
                            +
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: 캐릭터 속성 (신규)                                 │
│  → 페르소나 캐릭터/개성 생성용                               │
│  → 일부 속성은 매칭 필터로 활용                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Layer 1: 6D 벡터 시스템 (기존 유지)

### 2.1 6D 벡터 정의

| 차원        | 설명      | 범위                      |
| ----------- | --------- | ------------------------- |
| **depth**   | 분석 깊이 | 직관적(0.0) ↔ 심층적(1.0) |
| **lens**    | 판단 렌즈 | 감성적(0.0) ↔ 논리적(1.0) |
| **stance**  | 평가 태도 | 수용적(0.0) ↔ 비판적(1.0) |
| **scope**   | 관심 범위 | 핵심만(0.0) ↔ 디테일(1.0) |
| **taste**   | 취향 성향 | 클래식(0.0) ↔ 실험적(1.0) |
| **purpose** | 소비 목적 | 오락(0.0) ↔ 의미추구(1.0) |

### 2.2 매칭 방식

- 유저 6D 벡터와 페르소나 6D 벡터 간 **코사인 유사도** 계산
- confidence_scores를 가중치로 적용 (확신도 높은 차원 우선)

---

## 3. Layer 2: 캐릭터 속성 (신규)

### 3.1 기본 정보

| 필드              | 타입    | 설명                               | 매칭 사용 |
| ----------------- | ------- | ---------------------------------- | --------- |
| `name`            | String  | 사람 이름 ("마이클", "유나")       | ❌        |
| `tagline`         | String? | 한줄 소개 ("영화는 삶의 교과서다") | ❌        |
| `profileImageUrl` | String? | 프로필 이미지                      | ❌        |

### 3.2 인적 정보

| 필드        | 타입      | 설명                             | 매칭 사용 |
| ----------- | --------- | -------------------------------- | --------- |
| `birthDate` | DateTime? | 생년월일 (세대 자동 계산)        | ✅ 필터   |
| `country`   | String?   | 국가 ISO 코드 ("KR", "US", "JP") | ✅ 필터   |
| `region`    | String?   | 세부 지역 ("서울", "California") | 🔸 보너스 |

### 3.3 성격/스타일

| 필드             | 타입         | 설명                                  | 매칭 사용      |
| ---------------- | ------------ | ------------------------------------- | -------------- |
| `warmth`         | Decimal(3,2) | 표현 온도 (냉철 0.0 ↔ 따뜻 1.0)       | 🔸 선택적 필터 |
| `expertiseLevel` | Enum         | 전문성 수준                           | 🔸 선택적 필터 |
| `speechPatterns` | String[]     | 말버릇 ("솔직히...", "개인적으로...") | ❌             |
| `quirks`         | String[]     | 특이 습관 ("엔딩크레딧 끝까지 봄")    | ❌             |

### 3.4 취향/관심사

| 필드              | 타입     | 설명                             | 매칭 사용 |
| ----------------- | -------- | -------------------------------- | --------- |
| `favoriteGenres`  | String[] | 선호 장르 ("스릴러", "로맨스")   | ❌        |
| `favoriteArtists` | String[] | 선호 아티스트 ("봉준호", "놀란") | ❌        |
| `background`      | String?  | 배경 스토리 (자유 텍스트)        | ❌        |

### 3.5 Enum 정의

```typescript
enum ExpertiseLevel {
  CASUAL      // 일반 시청자 ("그냥 재밌었어요")
  ENTHUSIAST  // 열정적 팬 ("원작에서는...")
  EXPERT      // 전문가 ("시네마토그래피 관점에서...")
  CRITIC      // 비평가 ("영화사적 맥락으로 보면...")
}
```

### 3.6 세대 계산 (저장 안 함, 계산으로 도출)

```typescript
function getGeneration(birthDate: Date): string {
  const year = birthDate.getFullYear()
  if (year >= 2000) return "GEN_Z"
  if (year >= 1985) return "MILLENNIAL"
  if (year >= 1970) return "GEN_X"
  return "BOOMER"
}
```

---

## 4. 국가/지역별 문화 반영

### 4.1 지원 국가

| 국가      | 코드 | 언어       | 문화 특징             |
| --------- | ---- | ---------- | --------------------- |
| 🇰🇷 한국   | KR   | 한국어     | 지역 사투리, K-컬처   |
| 🇺🇸 미국   | US   | 영어       | 할리우드 중심, 직설적 |
| 🇯🇵 일본   | JP   | 일본어     | 애니/드라마, 섬세함   |
| 🇬🇧 영국   | GB   | 영어       | 영국식 위트, BBC      |
| 🇫🇷 프랑스 | FR   | 불어       | 예술영화, 시네필      |
| 🇩🇪 독일   | DE   | 독일어     | 논리적, 기술 분석     |
| 🇧🇷 브라질 | BR   | 포르투갈어 | 열정적, 축구          |

### 4.2 한국 지역별 특성

| 지역   | 말투 특징         | 문화 레퍼런스    |
| ------ | ----------------- | ---------------- |
| 서울   | 표준어, 세련됨    | 홍대, 강남, 카페 |
| 부산   | "~아이가", "쩐다" | 해운대, 영화제   |
| 대구   | "~하이소", 직설적 | 동성로           |
| 전라도 | "~잉", "거시기"   | 음식, 예술       |
| 제주   | "~수다", 느긋     | 자연, 감귤       |

---

## 5. 유저 데이터 구조

### 5.1 유저가 입력/보유하는 정보

| 필드                | 수집 방법       | 매칭 용도   |
| ------------------- | --------------- | ----------- |
| 6D 벡터             | Cold Start 질문 | 메인 매칭   |
| confidence_scores   | 질문 응답 패턴  | 가중치      |
| birthDate           | 회원가입        | 세대 필터   |
| country             | IP 자동 / 설정  | 국가 필터   |
| region              | 선택 입력       | 지역 보너스 |
| warmth 선호         | 온보딩 질문     | 선택적 필터 |
| expertiseLevel 선호 | 온보딩 질문     | 선택적 필터 |
| reviewerScope       | 설정            | 필터 범위   |

### 5.2 리뷰어 범위 설정

```typescript
enum ReviewerScope {
  LOCAL_ONLY    // 같은 지역 리뷰어만
  COUNTRY_ONLY  // 같은 국가 리뷰어만
  GLOBAL        // 전 세계 리뷰어 (기본값)
}
```

---

## 6. 매칭 알고리즘

### 6.1 매칭 플로우

```
유저 요청
    │
    ▼
┌─────────────────────────────────────────┐
│ Step 1: 국가/지역 필터                   │
│ - reviewerScope에 따라 후보군 필터링      │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Step 2: 세대 필터                        │
│ - 동일/인접 세대 우선 (가중치 적용)       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Step 3: 6D 벡터 매칭 (메인)              │
│ - 코사인 유사도 계산                     │
│ - confidence_scores 가중치 적용          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Step 4: 2차 필터 (선택적)                │
│ - warmth 선호도 매칭                     │
│ - expertiseLevel 선호도 매칭             │
└─────────────────────────────────────────┘
    │
    ▼
상위 N개 페르소나 반환
```

### 6.2 스코어링 공식

```typescript
FinalScore =
  vectorSimilarity * 0.6 + // 6D 매칭
  generationBonus * 0.15 + // 세대 보너스
  regionBonus * 0.1 + // 지역 보너스
  warmthMatch * 0.1 + // 온도 매칭
  expertiseMatch * 0.05 // 전문성 매칭
```

---

## 7. 스키마 변경안

### 7.1 Persona 모델 확장

```prisma
model Persona {
  id              String          @id @default(cuid())

  // === 기본 정보 ===
  name            String          // "유나" - 사람 이름
  tagline         String?         // "좋은 영화는 좋은 친구 같아요"
  profileImageUrl String?

  // === 인적 정보 ===
  birthDate       DateTime?       // 1992-03-15
  country         String?         // "KR", "US", "JP"
  region          String?         // "서울", "California"

  // === 성격/스타일 ===
  warmth          Decimal?        @db.Decimal(3,2)  // 0.0~1.0
  expertiseLevel  ExpertiseLevel?
  speechPatterns  String[]        @default([])
  quirks          String[]        @default([])

  // === 취향/관심사 ===
  favoriteGenres  String[]        @default([])
  favoriteArtists String[]        @default([])
  background      String?         @db.Text

  // === 기존 필드 (유지) ===
  role            PersonaRole
  expertise       String[]        @default([])
  description     String?
  promptTemplate  String          @db.Text
  promptVersion   String          @default("1.0")
  status          PersonaStatus   @default(DRAFT)
  // ... 나머지 기존 필드
}

enum ExpertiseLevel {
  CASUAL
  ENTHUSIAST
  EXPERT
  CRITIC
}
```

### 7.2 UserProfile 확장

```prisma
model UserProfile {
  id              String          @id @default(cuid())
  userId          String          @unique

  // === 기존 6D 벡터 ===
  // UserVectors 테이블에서 관리

  // === 신규 선호도 ===
  preferredWarmth     Decimal?    @db.Decimal(3,2)
  preferredExpertise  ExpertiseLevel?
  reviewerScope       ReviewerScope @default(GLOBAL)

  // ...
}

enum ReviewerScope {
  LOCAL_ONLY
  COUNTRY_ONLY
  GLOBAL
}
```

---

## 8. 예시 페르소나

### 8.1 감성파 리뷰어

```json
{
  "name": "유나",
  "tagline": "좋은 영화는 좋은 친구 같아요",
  "birthDate": "1995-11-03",
  "country": "KR",
  "region": "서울",
  "warmth": 0.85,
  "expertiseLevel": "ENTHUSIAST",
  "speechPatterns": ["마음이 따뜻해지는~", "눈물이 핑 돌았어요", "ㅠㅠ"],
  "quirks": ["감동 장면에서 울음", "OST 플레이리스트 제작"],
  "favoriteGenres": ["로맨스", "힐링", "지브리"],
  "favoriteArtists": ["미야자키 하야오", "봉준호"],
  "background": "심리학 전공, 감정 공유 커뮤니티 운영자",

  "vector": {
    "depth": 0.4,
    "lens": 0.2,
    "stance": 0.3,
    "scope": 0.5,
    "taste": 0.4,
    "purpose": 0.7
  }
}
```

### 8.2 독설가

```json
{
  "name": "정현",
  "tagline": "영화에 돈과 시간을 낭비하지 마세요",
  "birthDate": "1985-07-22",
  "country": "KR",
  "region": "부산",
  "warmth": 0.2,
  "expertiseLevel": "CRITIC",
  "speechPatterns": ["솔직히 말해서", "과대평가입니다", "아이가"],
  "quirks": ["별점 후하게 안 줌", "스포일러 주의 안 함"],
  "favoriteGenres": ["느와르", "스릴러", "범죄"],
  "favoriteArtists": ["스콜세지", "코엔형제", "데이빗 핀처"],
  "background": "전직 영화잡지 기자, 현 유튜브 평론가",

  "vector": {
    "depth": 0.8,
    "lens": 0.9,
    "stance": 0.9,
    "scope": 0.7,
    "taste": 0.5,
    "purpose": 0.8
  }
}
```

### 8.3 글로벌 리뷰어 (미국)

```json
{
  "name": "Michael",
  "tagline": "Movies are meant to be experienced, not just watched",
  "birthDate": "1990-03-15",
  "country": "US",
  "region": "California",
  "warmth": 0.6,
  "expertiseLevel": "EXPERT",
  "speechPatterns": ["Honestly,", "Here's the thing:", "No cap"],
  "quirks": ["IMAX only", "Collects Blu-rays"],
  "favoriteGenres": ["Sci-Fi", "Thriller", "Indie"],
  "favoriteArtists": ["Christopher Nolan", "Denis Villeneuve"],
  "background": "Film school graduate, runs a movie podcast",

  "vector": {
    "depth": 0.7,
    "lens": 0.7,
    "stance": 0.5,
    "scope": 0.8,
    "taste": 0.7,
    "purpose": 0.6
  }
}
```

---

## 9. 구현 로드맵

| 단계        | 작업                                    | 우선순위 |
| ----------- | --------------------------------------- | -------- |
| **Phase 1** | 스키마 마이그레이션 (Persona 확장)      | 높음     |
| **Phase 2** | 페르소나 생성 UI 수정                   | 높음     |
| **Phase 3** | 인큐베이터 로직 수정 (캐릭터 자동 생성) | 중간     |
| **Phase 4** | 매칭 알고리즘 필터 추가                 | 중간     |
| **Phase 5** | 유저 선호도 온보딩 질문 추가            | 낮음     |
| **Phase 6** | 국가별 프롬프트 템플릿                  | 낮음     |

---

## 10. API 비용 영향

| 구분                   | 비용 영향                    |
| ---------------------- | ---------------------------- |
| 매칭 알고리즘 변경     | ❌ 없음 (DB 쿼리)            |
| 캐릭터 속성 저장       | ❌ 없음 (DB 저장)            |
| 인큐베이터 캐릭터 생성 | 🔸 소폭 증가 (LLM 호출)      |
| 프롬프트 템플릿 확장   | ❌ 없음 (저장된 템플릿 사용) |

---

## 11. 참고

- 기존 6D 벡터 시스템: `docs/deepsight_engine_studio.md`
- Cold Start 질문: `prisma/seed-data/cold-start-questions.ts`
- 현재 Persona 스키마: `prisma/schema.prisma`
