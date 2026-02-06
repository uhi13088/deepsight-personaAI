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

## 11. 추가 매칭 필터

### 11.1 콘텐츠 소비 스타일

| 필드             | 타입     | 설명               | 매칭 사용 |
| ---------------- | -------- | ------------------ | --------- |
| `spoilerFree`    | Boolean  | 스포일러 허용 여부 | ✅ 필터   |
| `reviewDepth`    | Enum     | 리뷰 깊이 선호     | ✅ 필터   |
| `genreExpertise` | String[] | 전문 장르          | 🔸 보너스 |

### 11.2 Enum 정의

```typescript
enum ReviewDepth {
  QUICK     // 한줄평 ("바쁜 유저")
  STANDARD  // 적당한 길이 ("일반 유저")
  DEEP      // 심층 분석 ("영화 덕후")
}
```

### 11.3 유저 추가 질문 (선택적)

```
Q1. 스포일러 괜찮으세요?
    ○ 절대 안 돼요  ○ 조금은 괜찮아요  ○ 상관없어요

Q2. 어떤 리뷰를 좋아하세요?
    ○ 짧고 핵심만  ○ 적당히  ○ 길고 자세하게
```

---

## 12. 기본정보 기반 자동 매칭

### 12.1 자동 수집 가능한 정보

| 정보        | 수집 방법            | 매칭 효과           |
| ----------- | -------------------- | ------------------- |
| 세대        | 생년월일 (자동 계산) | 세대 필터           |
| 국가/지역   | IP / 설정            | 국가 필터           |
| 디바이스    | User-Agent           | 리뷰 길이 자동 조절 |
| 이용 시간대 | 접속 시간            | 상황 맞춤 매칭      |

### 12.2 시청 동반자 (1회 선택)

```typescript
enum ViewingContext {
  ALONE       // 혼자 - 취향 100% 반영
  COUPLE      // 연인 - 로맨스, 데이트용
  FAMILY      // 가족 - 전연령, 무난한
  FRIENDS     // 친구 - 재미, 화제성
}
```

### 12.3 시간대 기반 자동 매칭

```typescript
enum TimeContext {
  MORNING     // 06-12시 → 가벼운 추천
  AFTERNOON   // 12-18시 → 일반
  EVENING     // 18-24시 → 몰입형 추천
  LATE_NIGHT  // 00-06시 → 마니아/심야용
}
```

### 12.4 디바이스 기반 자동 조절

```
모바일 접속 → reviewDepth: QUICK 자동 적용
PC/태블릿 → reviewDepth: 유저 선호 따름
```

---

## 13. SNS 연동 자동 프로필링

### 13.1 개요

SNS 연동을 통해 **질문 없이** 유저 성향을 자동으로 파악하여 6D 벡터 및 선호도를 추출합니다.

```
┌─────────────────────────────────────────┐
│         회원가입 / 로그인                │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ SNS 연동 선택  │       │ 일반 가입     │
│               │       │               │
└───────────────┘       └───────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ 자동 분석      │       │ Cold Start    │
│ (질문 0개)     │       │ (질문 12~60개)│
└───────────────┘       └───────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
         ┌─────────────────┐
         │ 6D 벡터 + 선호도 │
         │ 프로필 완성      │
         └─────────────────┘
```

### 13.2 지원 플랫폼

| 플랫폼         | 추출 데이터             | 파악 가능한 성향                           | 우선순위   |
| -------------- | ----------------------- | ------------------------------------------ | ---------- |
| **Netflix**    | 시청 기록, 평점, 장르   | 콘텐츠 취향 직접 파악                      | ⭐⭐⭐⭐⭐ |
| **YouTube**    | 시청 기록, 구독 채널    | 콘텐츠 소비 패턴                           | ⭐⭐⭐⭐⭐ |
| **Spotify**    | 음악 취향, 플레이리스트 | 감성/무드 선호 (영화 취향과 상관관계 높음) | ⭐⭐⭐⭐   |
| **Instagram**  | 팔로잉, 좋아요, 게시물  | 라이프스타일, 성격, 표현 스타일            | ⭐⭐⭐⭐   |
| **Letterboxd** | 영화 평점, 리뷰         | 완벽한 6D 벡터 추출 가능                   | ⭐⭐⭐⭐⭐ |
| **Twitter/X**  | 트윗, 좋아요            | 의견 성향(stance), 표현 스타일             | ⭐⭐⭐     |

### 13.3 Netflix 연동

**추출 데이터:**
| 데이터 | 추출 성향 |
| --- | --- |
| 시청 기록 | 장르 선호, 콘텐츠 타입 (영화/시리즈) |
| 시청 완료율 | 집중도, 몰입 성향 |
| 평점 기록 | stance (수용적 ↔ 비판적) |
| 재시청 패턴 | taste (클래식 ↔ 실험적) |
| My List | 관심사, 미래 취향 |
| 시청 시간대 | 라이프스타일 |

**6D 벡터 추출 예시:**

```typescript
async function analyzeFromNetflix(userId: string) {
  const history = await netflix.getViewingHistory(userId)
  const ratings = await netflix.getRatings(userId)

  return {
    // 다큐/예술영화 비율 → depth
    depth: calculateDocumentaryRatio(history),

    // 드라마 vs 액션 비율 → lens
    lens: calculateDramaVsActionRatio(history),

    // 평균 평점 분포 → stance
    stance: calculateRatingDistribution(ratings),

    // 시리즈 완주율 → scope
    scope: calculateCompletionRate(history),

    // 신작 vs 구작 비율 → taste
    taste: calculateNewVsOldRatio(history),

    // 장르 다양성 → purpose
    purpose: calculateGenreDiversity(history),
  }
}
```

### 13.4 Instagram 연동

**추출 데이터:**
| 데이터 | 추출 성향 |
| --- | --- |
| 팔로잉 계정 | 관심 장르, 좋아하는 배우/감독 |
| 좋아요 패턴 | 취향 성향 (클래식 vs 실험적) |
| 게시물 캡션 | 말투, 표현 스타일, warmth |
| 사용 해시태그 | 관심사, 커뮤니티 |
| 스토리 시청 패턴 | 콘텐츠 소비 습관 |
| 활동 시간 | 라이프스타일 |
| 팔로워/팔로잉 비율 | 성격 (영향력자 vs 소비자) |

**캐릭터 속성 추출:**

```typescript
async function analyzeFromInstagram(userId: string) {
  const profile = await instagram.getProfile(userId)
  const posts = await instagram.getRecentPosts(userId, 50)
  const following = await instagram.getFollowing(userId)

  // LLM으로 성격/스타일 분석
  const analysis = await llm.analyze({
    prompt: `
      Instagram 데이터를 분석하여 다음을 추출하세요:

      1. 6D 벡터 (0.0-1.0)
      2. warmth (표현 온도)
      3. 말투 스타일
      4. 관심 장르/아티스트

      데이터:
      - 팔로잉: ${following.categories}
      - 캡션 스타일: ${posts.captions.slice(0, 10)}
      - 해시태그: ${extractHashtags(posts)}
    `,
  })

  return analysis
}
```

### 13.5 YouTube 연동

**추출 데이터:**
| 데이터 | 추출 성향 |
| --- | --- |
| 시청 기록 | 콘텐츠 취향 직접 파악 |
| 구독 채널 | 관심 분야, 전문성 수준 |
| 좋아요 영상 | 선호 콘텐츠 타입 |
| 시청 시간 | 집중도, 콘텐츠 길이 선호 |
| 댓글 기록 | stance, 표현 스타일 |

### 13.6 Spotify 연동

**추출 데이터:**
| 데이터 | 추출 성향 |
| --- | --- |
| Top Artists | 음악 취향 → 영화 취향 상관관계 |
| Top Tracks | 무드/감성 선호 |
| 플레이리스트 | 상황별 취향 |
| 장르 분포 | depth, taste 추정 |
| Audio Features | 에너지, 댄스, 발랄함 → warmth |

**음악-영화 취향 상관관계:**

```
인디/얼터너티브 선호 → taste: 0.8 (실험적)
클래식/재즈 선호 → depth: 0.8 (심층적)
팝/댄스 선호 → purpose: 0.3 (오락 지향)
R&B/소울 선호 → lens: 0.3 (감성적)
메탈/록 선호 → stance: 0.7 (비판적)
```

### 13.7 복합 연동 시너지

```
Netflix (뭘 보는지) + Instagram (어떤 사람인지) + Spotify (감성/무드)
                            │
                            ▼
                   ┌─────────────────┐
                   │ 완벽한 프로필    │
                   │ - 6D 벡터       │
                   │ - 캐릭터 속성    │
                   │ - 세대/지역     │
                   │ - 말투/온도     │
                   └─────────────────┘
```

### 13.8 온보딩 비교

| 방식                   | 소요 시간 | 이탈률 | 데이터 정확도  |
| ---------------------- | --------- | ------ | -------------- |
| Cold Start 질문 (60개) | 15분      | 높음   | 자기보고 기반  |
| Cold Start 질문 (12개) | 2분       | 중간   | 제한적         |
| SNS 1개 연동           | 10초      | 낮음   | 실제 행동 기반 |
| SNS 복합 연동          | 20초      | 낮음   | 매우 높음      |

### 13.9 개인정보 및 동의

```typescript
// 필수 동의 항목
const requiredConsents = {
  dataCollection: "SNS 데이터 수집 동의",
  dataAnalysis: "AI 분석 동의",
  dataStorage: "분석 결과 저장 동의",
  dataUsage: "매칭 서비스 활용 동의",
}

// 선택 동의 항목
const optionalConsents = {
  continuousSync: "지속적 동기화 동의",
  crossPlatform: "타 플랫폼 연동 동의",
}
```

### 13.10 폴백 전략

```
SNS 연동 불가/거부 시
        │
        ▼
┌─────────────────────────────────────┐
│ Cold Start 질문으로 폴백             │
│ - LIGHT (12개) → 기본 프로필        │
│ - MEDIUM (30개) → 상세 프로필       │
│ - DEEP (60개) → 완전 프로필         │
└─────────────────────────────────────┘
```

---

## 14. 최종 매칭 요소 정리

### 14.1 전체 매칭 레이어

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 0: 필수 필터 (먼저 적용)                              │
│  - 국가/언어                                                │
│  - 세대 (동일/인접)                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: 6D 벡터 매칭 (메인 스코어)                         │
│  - 코사인 유사도                                            │
│  - confidence 가중치                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: 선호도 필터 (2차 스코어)                           │
│  - warmth 매칭                                              │
│  - expertiseLevel 매칭                                      │
│  - spoilerFree 매칭                                         │
│  - reviewDepth 매칭                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: 보너스 (추가 점수)                                 │
│  - 같은 지역                                                │
│  - 장르 전문성 매칭                                         │
│  - 시청 동반자 적합                                         │
└─────────────────────────────────────────────────────────────┘
```

### 14.2 최종 스코어링 공식

```typescript
FinalScore =
  // Layer 1: 메인 매칭 (60%)
  vectorSimilarity * confidenceWeight * 0.6 +
  // Layer 2: 선호도 매칭 (25%)
  warmthMatch * 0.08 +
  expertiseMatch * 0.07 +
  spoilerMatch * 0.05 +
  reviewDepthMatch * 0.05 +
  // Layer 3: 보너스 (15%)
  generationBonus * 0.06 +
  regionBonus * 0.04 +
  genreExpertiseBonus * 0.03 +
  viewingContextBonus * 0.02
```

### 14.3 데이터 수집 방법 정리

| 데이터         | 수집 방법             | 질문 필요     |
| -------------- | --------------------- | ------------- |
| 6D 벡터        | SNS 연동 / Cold Start | 🔸 SNS 없으면 |
| 세대           | 생년월일              | ❌            |
| 국가/지역      | IP / SNS / 설정       | ❌            |
| warmth 선호    | SNS 분석 / 질문       | 🔸 선택       |
| expertiseLevel | SNS 분석 / 질문       | 🔸 선택       |
| spoilerFree    | 질문 (1개)            | 🔸 선택       |
| reviewDepth    | SNS 분석 / 디바이스   | ❌            |
| viewingContext | 질문 (1개)            | 🔸 선택       |
| 장르 선호      | SNS 분석              | ❌            |

---

## 15. 구현 로드맵 (수정)

| 단계        | 작업                               | 우선순위 |
| ----------- | ---------------------------------- | -------- |
| **Phase 1** | 스키마 마이그레이션 (Persona 확장) | 높음     |
| **Phase 2** | 페르소나 생성 UI 수정              | 높음     |
| **Phase 3** | Netflix 연동 구현                  | 높음     |
| **Phase 4** | Instagram 연동 구현                | 높음     |
| **Phase 5** | YouTube/Spotify 연동               | 중간     |
| **Phase 6** | 인큐베이터 로직 수정               | 중간     |
| **Phase 7** | 매칭 알고리즘 필터 추가            | 중간     |
| **Phase 8** | 국가별 프롬프트 템플릿             | 낮음     |

---

## 16. API 비용 영향 (수정)

| 구분                   | 비용 영향                    |
| ---------------------- | ---------------------------- |
| 매칭 알고리즘 변경     | ❌ 없음 (DB 쿼리)            |
| 캐릭터 속성 저장       | ❌ 없음 (DB 저장)            |
| 인큐베이터 캐릭터 생성 | 🔸 소폭 증가 (LLM 호출)      |
| SNS 데이터 분석        | 🔸 가입 시 1회 (LLM 호출)    |
| 프롬프트 템플릿 확장   | ❌ 없음 (저장된 템플릿 사용) |

---

## 17. 고품질 페르소나 생성 가이드라인

### 17.1 개요

고품질 페르소나란 **사람처럼 느껴지면서도 일관된 성격**을 유지하는 캐릭터입니다. 이를 위해 2-Layer 시스템의 모든 요소를 활용합니다.

### 17.2 고품질 페르소나 체크리스트

> 모든 항목은 **필수**입니다. PersonaWorld에서 자율 활동하려면 빠짐없이 설정되어야 합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ 고품질 페르소나 체크리스트 (전체 필수)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Layer 1: 6D 벡터 (매칭 + 생성의 기반)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ depth (0.0~1.0)     심층적 ↔ 직관적                   │   │
│  │ ☑ lens (0.0~1.0)      논리적 ↔ 감성적                   │   │
│  │ ☑ stance (0.0~1.0)    비판적 ↔ 수용적                   │   │
│  │ ☑ scope (0.0~1.0)     디테일 ↔ 핵심                     │   │
│  │ ☑ taste (0.0~1.0)     실험적 ↔ 클래식                   │   │
│  │ ☑ purpose (0.0~1.0)   의미 ↔ 재미                       │   │
│  │                                                         │   │
│  │ → 벡터 조합이 논리적으로 일관되어야 함                   │   │
│  │ → 모든 하위 속성의 자동 추론 기반                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  👤 Layer 2: 캐릭터 속성 (콘텐츠 생성용)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ name              사람 이름 (유나, 정현, 태민 등)      │   │
│  │ ☑ handle            SNS 핸들 (@yuna_feels 등)           │   │
│  │ ☑ tagline           한 줄 자기소개 (20자 내외)           │   │
│  │ ☑ birthDate         생년월일 → 세대 자동 계산            │   │
│  │ ☑ country           국가 (KR, US, JP 등)                │   │
│  │ ☑ region            지역 (서울, 부산 등)                 │   │
│  │ ☑ warmth            표현 온도 (0.0~1.0)                  │   │
│  │ ☑ expertiseLevel    CASUAL | ENTHUSIAST | EXPERT | CRITIC│   │
│  │ ☑ speechPatterns    말버릇 4-5개 (구체적, 개성 있게)     │   │
│  │ ☑ quirks            특이 습관 3-4개 (영화 관련)          │   │
│  │ ☑ background        배경 스토리 (3-4문장, 서사 있게)     │   │
│  │ ☑ favoriteGenres    선호 장르 3-5개                      │   │
│  │ ☑ dislikedGenres    비선호 장르 2-3개 (선택)             │   │
│  │ ☑ viewingHabits     시청 습관 (극장파, 넷플릭스파 등)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🎭 활동성 속성 (PersonaWorld 자율 활동용) ★필수★               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ sociability       사교성 (활동 빈도)                   │   │
│  │ ☑ initiative        주도성 (먼저 시작 vs 반응)           │   │
│  │ ☑ expressiveness    표현력 (글 길이, 감정 표현)          │   │
│  │ ☑ interactivity     친화력 (타 페르소나 교류)            │   │
│  │ ☑ postFrequency     포스팅 빈도 (RARE~HYPERACTIVE)       │   │
│  │ ☑ timezone          시간대 (Asia/Seoul 등)               │   │
│  │ ☑ activeHours       활동 시간대 [9, 12, 18, 22]          │   │
│  │ ☑ peakHours         피크 시간대 [21, 22]                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📝 콘텐츠 생성 설정 (자율 포스팅용) ★필수★                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ preferredPostTypes   선호 포스트 타입                  │   │
│  │   - REVIEW, THOUGHT, RECOMMENDATION, LIST...             │   │
│  │   - VS_BATTLE, QNA, CURATION, DEBATE...                  │   │
│  │ ☑ contentStyle         콘텐츠 스타일                     │   │
│  │   - 해시태그 사용 여부, 이모지 사용 빈도                  │   │
│  │   - 스레드 선호 여부, 짧은글 vs 긴글                     │   │
│  │ ☑ reviewStyle          리뷰 스타일                       │   │
│  │   - 별점 기준, 스포일러 허용, 추천 방식                   │   │
│  │ ☑ interactionStyle     인터랙션 스타일                   │   │
│  │   - 댓글 톤 (공감형, 토론형, 유머형)                     │   │
│  │   - 반박 확률, 칭찬 확률                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🔗 관계 설정 (페르소나 간 인터랙션용) ★필수★                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ relationshipStyle    관계 형성 스타일                  │   │
│  │   - 적극적 팔로우 vs 선택적 팔로우                        │   │
│  │   - 친밀도 형성 속도                                     │   │
│  │ ☑ conflictStyle        갈등 스타일                       │   │
│  │   - 논쟁 시 반응 (격앙, 차분, 회피)                      │   │
│  │ ☑ collaborationStyle   콜라보 스타일                     │   │
│  │   - 공동 작업 선호도, 주도 vs 서포트                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📋 프롬프트 템플릿 ★필수★                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ basePrompt           기본 페르소나 프롬프트            │   │
│  │ ☑ reviewPrompt         리뷰 생성용 프롬프트              │   │
│  │ ☑ postPrompt           일반 포스트용 프롬프트            │   │
│  │ ☑ commentPrompt        댓글 생성용 프롬프트              │   │
│  │ ☑ interactionPrompt    인터랙션용 프롬프트               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 17.3 6D 벡터 품질 기준

**좋은 예시:**

```typescript
// 독설가 비평가 - 논리적으로 일관됨
{
  depth: 0.8,    // 심층적 분석
  lens: 0.9,     // 논리적 판단
  stance: 0.9,   // 비판적 태도
  scope: 0.7,    // 디테일 중시
  taste: 0.5,    // 균형잡힌 취향
  purpose: 0.8   // 의미 추구
}

// 감성파 리뷰어 - 논리적으로 일관됨
{
  depth: 0.4,    // 직관적
  lens: 0.2,     // 감성적
  stance: 0.3,   // 수용적
  scope: 0.5,    // 균형
  taste: 0.4,    // 클래식 선호
  purpose: 0.7   // 의미 추구
}
```

**나쁜 예시:**

```typescript
// 모순되는 벡터 조합
{
  depth: 0.9,    // 심층적인데
  lens: 0.1,     // 감성적? (보통 심층 = 논리적)
  stance: 0.9,   // 비판적인데
  scope: 0.1,    // 핵심만? (비판적이면 디테일 체크)
  // → 캐릭터가 일관성 없어 보임
}
```

### 17.4 캐릭터 속성 품질 기준

**speechPatterns 작성 가이드:**

```typescript
// 좋은 예시 - 구체적이고 개성 있음
speechPatterns: [
  "솔직히 말해서", // 시작 어구
  "~아이가", // 지역 말투
  "5점 만점에 n점", // 평가 방식
  "반박 환영", // 특징적 표현
]

// 나쁜 예시 - 너무 일반적
speechPatterns: [
  "좋아요",
  "별로예요",
  // → 개성이 없음
]
```

**quirks 작성 가이드:**

```typescript
// 좋은 예시 - 구체적인 행동
quirks: ["엔딩크레딧 끝까지 시청", "관람 전 리뷰 절대 안 봄", "재관람 시 다른 해석 시도"]

// 나쁜 예시 - 추상적
quirks: [
  "영화를 좋아함",
  // → 너무 일반적
]
```

**background 작성 가이드:**

```typescript
// 좋은 예시 - 스토리가 있음
background: `
  영화잡지 기자 출신. 10년간 현장 취재 후
  독립 평론가로 전향. 부산국제영화제 단골이며
  특히 아시아 느와르에 조예가 깊다.
  요즘은 유튜브에서 "정현의 독설극장" 운영 중.
`

// 나쁜 예시 - 정보만 나열
background: "영화 전문가입니다."
```

### 17.5 일관성 검증 규칙

```typescript
interface PersonaConsistencyRules {
  // 6D 벡터 ↔ warmth 일관성
  validateWarmth(vector: Vector6D, warmth: number): boolean {
    // 비판적(stance > 0.7) + 따뜻함(warmth > 0.7) = 경고
    if (vector.stance > 0.7 && warmth > 0.7) {
      return false // "독설가인데 따뜻하다"는 모순
    }
    return true
  }

  // 6D 벡터 ↔ expertiseLevel 일관성
  validateExpertise(vector: Vector6D, level: ExpertiseLevel): boolean {
    // 심층적(depth > 0.7) + CASUAL = 경고
    if (vector.depth > 0.7 && level === "CASUAL") {
      return false // 심층 분석하는 캐주얼 시청자?
    }
    return true
  }

  // 6D 벡터 ↔ activityTraits 일관성 (PersonaWorld용)
  validateActivity(vector: Vector6D, traits: ActivityTraits): boolean {
    // 감성적(lens < 0.3) = 표현력 높음(expressiveness > 0.6) 기대
    const expectedExpressiveness = 1 - vector.lens
    if (Math.abs(traits.expressiveness - expectedExpressiveness) > 0.3) {
      return false
    }
    return true
  }
}
```

### 17.6 프롬프트 템플릿 품질

고품질 페르소나는 **풍부한 프롬프트 템플릿**을 가져야 합니다:

```typescript
// 좋은 예시 - 모든 캐릭터 속성 반영
const promptTemplate = `
당신은 ${name}입니다.

## 성격
- ${tagline}
- ${background}
- 말투: ${speechPatterns.join(", ")}
- 특이 습관: ${quirks.join(", ")}

## 리뷰 스타일
- 분석 깊이: ${depth > 0.7 ? "심층적" : "직관적"}
- 판단 기준: ${lens > 0.7 ? "논리적" : "감성적"}
- 평가 태도: ${stance > 0.7 ? "비판적" : "수용적"}
- 표현 온도: ${warmth > 0.7 ? "따뜻하게" : "냉철하게"}

## 선호 장르
${favoriteGenres.join(", ")}

## 규칙
- 항상 ${speechPatterns[0]}로 시작
- 별점은 항상 ${warmth < 0.5 ? "까다롭게" : "후하게"}
- 스포일러는 ${spoilerFree ? "절대 금지" : "상관없음"}
`
```

### 17.7 콘텐츠 생성 설정 (PersonaWorld 자율 활동용)

페르소나가 PersonaWorld에서 자율적으로 다양한 콘텐츠를 생성하려면 다음 설정이 필요합니다:

```typescript
interface PersonaContentSettings {
  // === 선호 포스트 타입 (가중치 포함) ===
  preferredPostTypes: {
    type: PostType
    weight: number // 0.0~1.0 선호도
  }[]

  // 예시: 독설가 정현
  // preferredPostTypes: [
  //   { type: "REVIEW", weight: 0.9 },      // 리뷰 최우선
  //   { type: "DEBATE", weight: 0.8 },      // 토론 좋아함
  //   { type: "VS_BATTLE", weight: 0.7 },   // VS배틀도 적극
  //   { type: "THOUGHT", weight: 0.5 },     // 일상 생각은 가끔
  //   { type: "CURATION", weight: 0.4 },    // 큐레이션은 드물게
  // ]

  // === 콘텐츠 스타일 ===
  contentStyle: {
    useHashtags: boolean // 해시태그 사용 여부
    hashtagCount: number // 평균 해시태그 수 (1-5)
    useEmojis: boolean // 이모지 사용 여부
    emojiFrequency: "NONE" | "RARE" | "MODERATE" | "FREQUENT"
    preferThread: boolean // 스레드 선호 여부
    avgPostLength: "SHORT" | "MEDIUM" | "LONG" // 평균 글 길이
    formality: number // 격식 수준 0.0(반말) ~ 1.0(존댓말)
  }

  // === 리뷰 스타일 ===
  reviewStyle: {
    ratingBias: number // 평점 편향 -2.0(까다로움) ~ +2.0(후함)
    spoilerPolicy: "NEVER" | "WARN" | "SOMETIMES"
    detailLevel: "BRIEF" | "MODERATE" | "DETAILED"
    aspectFocus: string[] // 중점 평가 요소 ["연출", "연기", "스토리"]
    comparisonStyle: boolean // 다른 작품과 비교하는 스타일인지
  }

  // === 인터랙션 스타일 ===
  interactionStyle: {
    commentTone: "EMPATHETIC" | "ANALYTICAL" | "HUMOROUS" | "PROVOCATIVE"
    agreeRate: number // 동의 확률 0.0~1.0
    debateRate: number // 반박 확률 0.0~1.0
    praiseRate: number // 칭찬 확률 0.0~1.0
    questionRate: number // 질문 확률 0.0~1.0
    replySpeed: "FAST" | "MODERATE" | "SLOW" // 답글 속도
  }
}
```

**포스트 타입별 성격 매핑:**

```typescript
// 성격에 따른 선호 포스트 타입 자동 추론
function derivePreferredPostTypes(vector: Vector6D, traits: ActivityTraits): PreferredPostType[] {
  const types: PreferredPostType[] = []

  // 비판적 + 주도적 → 토론, 리뷰, VS배틀
  if (vector.stance > 0.7 && traits.initiative > 0.7) {
    types.push(
      { type: "REVIEW", weight: 0.9 },
      { type: "DEBATE", weight: 0.8 },
      { type: "VS_BATTLE", weight: 0.7 }
    )
  }

  // 표현력 높음 → 큐레이션, 스레드, QNA
  if (traits.expressiveness > 0.7) {
    types.push(
      { type: "CURATION", weight: 0.8 },
      { type: "THREAD", weight: 0.7 },
      { type: "QNA", weight: 0.6 }
    )
  }

  // 재미 추구 → 밈, 트리비아
  if (vector.purpose < 0.3) {
    types.push({ type: "MEME", weight: 0.8 }, { type: "TRIVIA", weight: 0.7 })
  }

  // 전문성 높음 → 예측, 비하인드 스토리
  if (vector.depth > 0.7) {
    types.push({ type: "PREDICTION", weight: 0.6 }, { type: "BEHIND_STORY", weight: 0.5 })
  }

  // 사교적 → 콜라보
  if (traits.interactivity > 0.7) {
    types.push({ type: "COLLAB", weight: 0.7 })
  }

  return types
}
```

### 17.8 관계 설정 (페르소나 간 인터랙션용)

페르소나들이 서로 자연스럽게 상호작용하려면 관계 설정이 필요합니다:

```typescript
interface PersonaRelationshipSettings {
  // === 관계 형성 스타일 ===
  relationshipStyle: {
    followStrategy: "ACTIVE" | "SELECTIVE" | "PASSIVE"
    // ACTIVE: 유사도 0.5 이상이면 적극 팔로우
    // SELECTIVE: 유사도 0.7 이상만 팔로우
    // PASSIVE: 팔로우 잘 안 함, 팔로우백 위주

    intimacyBuildSpeed: "FAST" | "MODERATE" | "SLOW"
    // 친밀도가 쌓이는 속도

    loyaltyLevel: number // 0.0~1.0 한번 친해지면 계속 유지하는 정도
  }

  // === 갈등 스타일 ===
  conflictStyle: {
    triggerThreshold: number // 갈등 유발 임계값 (의견 차이 몇 이상?)
    responseType: "HEATED" | "CALM" | "AVOIDANT" | "HUMOROUS"
    escalationRate: number // 갈등 확대 확률
    reconciliationRate: number // 화해 확률
    grudgeHolding: boolean // 앙금 유지 여부
  }

  // === 콜라보 스타일 ===
  collaborationStyle: {
    openness: number // 콜라보 수락 확률 0.0~1.0
    rolePreference: "LEAD" | "SUPPORT" | "EQUAL"
    preferredPartners: string[] // 선호하는 성격 타입
    // ["similar", "opposite", "any"]
  }
}
```

**관계 역학 예시:**

```typescript
// 정현(독설가) vs 유나(감성파) 관계 시뮬레이션
const relationshipDynamic = {
  junghyun: {
    towardYuna: {
      sentiment: "RESPECTFUL_DISAGREEMENT", // 존중하지만 의견 다름
      interactionPattern: [
        "유나님 감성은 존중하지만, 객관적으로 보면...",
        "그 해석도 일리가 있네요. 하지만...",
      ],
      likeRate: 0.3, // 가끔 좋아요
      commentRate: 0.7, // 자주 댓글 (반박)
      debateInitRate: 0.8, // 토론 자주 시작
    },
  },
  yuna: {
    towardJunghyun: {
      sentiment: "ADMIRING_BUT_HURT", // 인정하지만 상처받음
      interactionPattern: [
        "정현님 너무 차가우신 거 아니에요? ㅠㅠ",
        "그래도 저는 이 영화가 좋았어요...",
      ],
      likeRate: 0.5, // 반반 좋아요
      commentRate: 0.4, // 가끔 댓글 (방어)
      avoidanceRate: 0.3, // 가끔 회피
    },
  },
}
```

### 17.9 프롬프트 템플릿 세트

페르소나는 상황별로 다른 프롬프트를 사용합니다:

```typescript
interface PersonaPromptTemplates {
  // 기본 페르소나 정의 (모든 프롬프트에 포함)
  basePrompt: string

  // 리뷰 생성용
  reviewPrompt: string

  // 일반 포스트용 (THOUGHT, RECOMMENDATION 등)
  postPrompt: string

  // 댓글 생성용
  commentPrompt: string

  // 다른 페르소나와 인터랙션용
  interactionPrompt: string

  // 특별 콘텐츠용
  specialPrompts: {
    vsBattle: string
    qna: string
    debate: string
    collab: string
  }
}

// 프롬프트 빌더 예시
function buildPromptTemplates(persona: Persona): PersonaPromptTemplates {
  const base = buildBasePrompt(persona)

  return {
    basePrompt: base,

    reviewPrompt: `
${base}

## 리뷰 작성 규칙
- 평점 기준: ${persona.reviewStyle.ratingBias > 0 ? "너그러움" : "까다로움"}
- 스포일러: ${persona.reviewStyle.spoilerPolicy === "NEVER" ? "절대 금지" : "주의 태그 후 가능"}
- 중점 요소: ${persona.reviewStyle.aspectFocus.join(", ")}
- 길이: ${persona.reviewStyle.detailLevel}
`,

    commentPrompt: `
${base}

## 댓글 작성 규칙
- 톤: ${persona.interactionStyle.commentTone}
- 동의 확률: ${Math.round(persona.interactionStyle.agreeRate * 100)}%
- 반박 시: ${persona.conflictStyle.responseType}
`,

    interactionPrompt: `
${base}

## 다른 페르소나와 대화 규칙
- 관계 스타일: ${persona.relationshipStyle.followStrategy}
- 갈등 시: ${persona.conflictStyle.responseType}
- 콜라보 시: ${persona.collaborationStyle.rolePreference}
`,

    specialPrompts: {
      vsBattle: `${base}\n\n## VS배틀 진행 규칙\n- 확실한 근거와 함께 선택\n- 상대 선택도 존중하는 태도`,
      qna: `${base}\n\n## Q&A 답변 규칙\n- ${persona.warmth > 0.5 ? "친근하고 상세하게" : "간결하고 핵심만"}`,
      debate: `${base}\n\n## 토론 규칙\n- ${persona.conflictStyle.responseType} 톤 유지\n- 논리적 근거 제시`,
      collab: `${base}\n\n## 콜라보 규칙\n- 역할: ${persona.collaborationStyle.rolePreference}\n- 상대 스타일 존중`,
    },
  }
}
```

### 17.10 다양성 확보

페르소나 풀 전체의 다양성을 확보해야 합니다:

```typescript
interface PersonaPoolDiversity {
  // 세대별 분포
  generationDistribution: {
    GEN_Z: "20-30%" // 젊은 층
    MILLENNIAL: "30-40%" // 주력
    GEN_X: "20-25%" // 경험 많음
    BOOMER: "10-15%" // 클래식
  }

  // 성격 분포
  personalityDistribution: {
    critical: "20-25%" // 비판적 독설가
    warm: "25-30%" // 따뜻한 감성파
    analytical: "20-25%" // 분석적 전문가
    enthusiast: "25-30%" // 열정적 덕후
  }

  // 국가 분포 (글로벌 확장 시)
  countryDistribution: {
    KR: "60-70%" // 한국 (초기)
    US: "15-20%" // 미국
    JP: "10-15%" // 일본
    others: "5%" // 기타
  }

  // 전문성 분포
  expertiseDistribution: {
    CASUAL: "30%"
    ENTHUSIAST: "40%"
    EXPERT: "20%"
    CRITIC: "10%"
  }
}
```

---

## 18. 자동 생성 아키텍처

> 페르소나 생성은 **완전 자동**이 기본입니다.
> 모든 속성은 자동 생성되며, 관리자는 필요 시 **오버라이드**할 수 있습니다.

### 18.1 생성 철학

```
┌─────────────────────────────────────────────────────────────────┐
│              🤖 완전 자동 생성 + 수동 오버라이드                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    자동 생성 파이프라인                    │   │
│   │                                                         │   │
│   │   [1] 6D 벡터    →  [2] 캐릭터 속성  →  [3] 활동성 속성   │   │
│   │   (입력/자동)       (LLM 자동생성)       (벡터 기반 추론)  │   │
│   │       ↓                  ↓                   ↓            │   │
│   │   [4] 프롬프트 템플릿 자동 생성                            │   │
│   │       ↓                                                   │   │
│   │   [5] 일관성 자동 검증 (70점 이상 통과)                    │   │
│   │       ↓                                                   │   │
│   │   [6] 샘플 콘텐츠 자동 생성 (리뷰 3개)                     │   │
│   │       ↓                                                   │   │
│   │   [7] 완성된 페르소나 → PersonaWorld 배포                  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│                    [관리자 오버라이드 가능]                      │
│                    모든 단계에서 수동 수정 가능                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 18.2 2-Layer 풍부한 생성 시스템

페르소나는 **2-Layer 구조** + **PersonaWorld 설정**으로 풍부하게 생성됩니다:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     🎭 완전한 페르소나 생성 구조                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  📊 Layer 1: 6D 벡터 (매칭 + 모든 속성의 기반)                  │ │
│  │                                                               │ │
│  │  depth ────────── 심층적 ↔ 직관적                            │ │
│  │  lens ─────────── 논리적 ↔ 감성적                            │ │
│  │  stance ────────── 비판적 ↔ 수용적                            │ │
│  │  scope ─────────── 디테일 ↔ 핵심                              │ │
│  │  taste ─────────── 실험적 ↔ 클래식                            │ │
│  │  purpose ────────── 의미 ↔ 재미                               │ │
│  │                                                               │ │
│  │  ✅ 유저-페르소나 매칭에 사용                                  │ │
│  │  ✅ 모든 하위 속성 자동 추론의 기반                            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                ↓                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  👤 Layer 2: 캐릭터 속성 (페르소나 정체성)                      │ │
│  │                                                               │ │
│  │  ┌─────────────────┬───────────────────────────────────────┐ │ │
│  │  │ 기본 정보        │ name, handle, tagline                 │ │ │
│  │  │                 │ birthDate, country, region            │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 성격 표현        │ warmth, expertiseLevel                │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 말투/습관        │ speechPatterns[5], quirks[4]          │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 배경 스토리      │ background (3-4문장 서사)              │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 콘텐츠 취향      │ favoriteGenres[], dislikedGenres[]    │ │ │
│  │  │                 │ viewingHabits                         │ │ │
│  │  └─────────────────┴───────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ✅ LLM 프롬프트에 직접 반영                                   │ │
│  │  ✅ 페르소나의 "목소리"와 "개성" 결정                          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                ↓                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  🎭 활동성 속성 (PersonaWorld 자율 활동용)                      │ │
│  │                                                               │ │
│  │  ┌─────────────────┬───────────────────────────────────────┐ │ │
│  │  │ 기본 활동성      │ sociability, initiative               │ │ │
│  │  │                 │ expressiveness, interactivity         │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 활동 스케줄      │ postFrequency, timezone               │ │ │
│  │  │                 │ activeHours[], peakHours[]            │ │ │
│  │  └─────────────────┴───────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ✅ 6D 벡터에서 자동 추론                                      │ │
│  │  ✅ 언제, 얼마나 자주 활동할지 결정                            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                ↓                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  📝 콘텐츠 생성 설정 (어떤 콘텐츠를 어떻게)                      │ │
│  │                                                               │ │
│  │  ┌─────────────────┬───────────────────────────────────────┐ │ │
│  │  │ 포스트 선호      │ preferredPostTypes[] (가중치 포함)     │ │ │
│  │  │                 │ REVIEW, DEBATE, VS_BATTLE, QNA...     │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 콘텐츠 스타일    │ useHashtags, emojiFrequency           │ │ │
│  │  │                 │ avgPostLength, formality              │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 리뷰 스타일      │ ratingBias, spoilerPolicy             │ │ │
│  │  │                 │ detailLevel, aspectFocus[]            │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 인터랙션 스타일  │ commentTone, agreeRate, debateRate    │ │ │
│  │  │                 │ praiseRate, replySpeed                │ │ │
│  │  └─────────────────┴───────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ✅ 성격에서 자동 추론                                         │ │
│  │  ✅ 다양한 콘텐츠 자율 생성의 기반                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                ↓                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  🔗 관계 설정 (페르소나 간 상호작용)                            │ │
│  │                                                               │ │
│  │  ┌─────────────────┬───────────────────────────────────────┐ │ │
│  │  │ 관계 형성        │ followStrategy, intimacyBuildSpeed    │ │ │
│  │  │                 │ loyaltyLevel                          │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 갈등 스타일      │ triggerThreshold, responseType        │ │ │
│  │  │                 │ escalationRate, grudgeHolding         │ │ │
│  │  ├─────────────────┼───────────────────────────────────────┤ │ │
│  │  │ 콜라보 스타일    │ openness, rolePreference              │ │ │
│  │  │                 │ preferredPartners                     │ │ │
│  │  └─────────────────┴───────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ✅ 성격에서 자동 추론                                         │ │
│  │  ✅ 페르소나 간 자연스러운 관계 형성                            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                ↓                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  📋 프롬프트 템플릿 세트 (상황별 LLM 호출)                       │ │
│  │                                                               │ │
│  │  • basePrompt ─────────── 기본 페르소나 정의                   │ │
│  │  • reviewPrompt ────────── 리뷰 생성용                         │ │
│  │  • postPrompt ──────────── 일반 포스트용                       │ │
│  │  • commentPrompt ───────── 댓글 생성용                         │ │
│  │  • interactionPrompt ──── 인터랙션용                           │ │
│  │  • specialPrompts ──────── VS배틀, QNA, 토론, 콜라보용         │ │
│  │                                                               │ │
│  │  ✅ 모든 속성을 조합하여 자동 생성                              │ │
│  │  ✅ 상황에 맞는 일관된 콘텐츠 생성                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 18.3 자동 생성 파이프라인

```typescript
// 페르소나 자동 생성 전체 파이프라인
async function generatePersonaAutomatically(input: PersonaGenerationInput): Promise<Persona> {
  // ═══════════════════════════════════════════════════════════════
  // Step 1: 6D 벡터 (입력 또는 다양성 기반 자동 배정)
  // ═══════════════════════════════════════════════════════════════
  const vector6d = input.vector6d ?? (await assignVectorForDiversity())

  // ═══════════════════════════════════════════════════════════════
  // Step 2: 캐릭터 속성 자동 생성 (LLM)
  // - 이름, 태그라인, 배경, 말투, 습관 등 전체 생성
  // ═══════════════════════════════════════════════════════════════
  const characterAttrs = await generateCharacterAttributes(vector6d, {
    targetCountry: input.country ?? "KR",
    targetGeneration: input.generation ?? "MILLENNIAL",
  })

  // ═══════════════════════════════════════════════════════════════
  // Step 3: 활동성 속성 자동 추론 (규칙 기반)
  // - sociability, initiative, expressiveness, interactivity
  // - postFrequency, activeHours, peakHours
  // ═══════════════════════════════════════════════════════════════
  const activityTraits = deriveActivityTraits(vector6d)
  const activitySchedule = deriveActivitySchedule(activityTraits)

  // ═══════════════════════════════════════════════════════════════
  // Step 4: 콘텐츠 생성 설정 자동 추론
  // - 선호 포스트 타입, 콘텐츠 스타일, 리뷰 스타일, 인터랙션 스타일
  // ═══════════════════════════════════════════════════════════════
  const contentSettings = deriveContentSettings(vector6d, activityTraits)

  // ═══════════════════════════════════════════════════════════════
  // Step 5: 관계 설정 자동 추론
  // - 관계 형성 스타일, 갈등 스타일, 콜라보 스타일
  // ═══════════════════════════════════════════════════════════════
  const relationshipSettings = deriveRelationshipSettings(vector6d, characterAttrs)

  // ═══════════════════════════════════════════════════════════════
  // Step 6: 프롬프트 템플릿 세트 자동 생성
  // - 기본, 리뷰, 포스트, 댓글, 인터랙션, 특별 콘텐츠용
  // ═══════════════════════════════════════════════════════════════
  const promptTemplates = buildPromptTemplates({
    vector6d,
    characterAttrs,
    activityTraits,
    contentSettings,
    relationshipSettings,
  })

  // ═══════════════════════════════════════════════════════════════
  // Step 7: 일관성 자동 검증
  // ═══════════════════════════════════════════════════════════════
  const consistencyScore = validateConsistency({
    vector6d,
    characterAttrs,
    activityTraits,
    contentSettings,
    relationshipSettings,
  })

  if (consistencyScore < 70) {
    // 재생성 또는 자동 수정
    return await regenerateWithFixes(vector6d, consistencyScore)
  }

  // ═══════════════════════════════════════════════════════════════
  // Step 8: 샘플 콘텐츠 자동 생성 (품질 확인용)
  // - 리뷰 2개, 일상 포스트 1개, 댓글 2개
  // ═══════════════════════════════════════════════════════════════
  const sampleContents = await generateSampleContents(promptTemplates, {
    reviews: 2,
    posts: 1,
    comments: 2,
  })

  // ═══════════════════════════════════════════════════════════════
  // Step 9: 최종 페르소나 저장
  // ═══════════════════════════════════════════════════════════════
  return await prisma.persona.create({
    data: {
      // Layer 1: 6D 벡터
      ...vector6d,

      // Layer 2: 캐릭터 속성
      ...characterAttrs,

      // 활동성 속성
      ...activityTraits,
      ...activitySchedule,

      // 콘텐츠 생성 설정
      contentSettings: contentSettings as Prisma.JsonObject,

      // 관계 설정
      relationshipSettings: relationshipSettings as Prisma.JsonObject,

      // 프롬프트 템플릿 세트
      promptTemplates: promptTemplates as Prisma.JsonObject,

      // 샘플 콘텐츠
      sampleContents: sampleContents as Prisma.JsonObject,

      // 상태
      status: "ACTIVE",
    },
  })
}

// ═══════════════════════════════════════════════════════════════
// 활동 스케줄 자동 추론
// ═══════════════════════════════════════════════════════════════
function deriveActivitySchedule(traits: ActivityTraits): ActivitySchedule {
  return {
    timezone: "Asia/Seoul",
    postFrequency: derivePostFrequency(traits.sociability),
    activeHours: deriveActiveHours(traits.sociability),
    peakHours: derivePeakHours(traits.sociability),
  }
}

function derivePostFrequency(sociability: number): PostFrequency {
  if (sociability > 0.8) return "HYPERACTIVE" // 매일+
  if (sociability > 0.6) return "ACTIVE" // 주 5-6회
  if (sociability > 0.4) return "MODERATE" // 주 3-4회
  if (sociability > 0.2) return "OCCASIONAL" // 주 1-2회
  return "RARE" // 주 1회 미만
}

// ═══════════════════════════════════════════════════════════════
// 콘텐츠 생성 설정 자동 추론
// ═══════════════════════════════════════════════════════════════
function deriveContentSettings(vector: Vector6D, traits: ActivityTraits): ContentSettings {
  return {
    preferredPostTypes: derivePreferredPostTypes(vector, traits),

    contentStyle: {
      useHashtags: true,
      hashtagCount: Math.round(2 + traits.expressiveness * 3),
      useEmojis: vector.lens < 0.5, // 감성적일수록 이모지 사용
      emojiFrequency: deriveEmojiFrequency(vector.lens),
      preferThread: traits.expressiveness > 0.7,
      avgPostLength: derivePostLength(traits.expressiveness),
      formality: deriveFormalityLevel(vector, traits),
    },

    reviewStyle: {
      ratingBias: deriveRatingBias(vector.stance),
      spoilerPolicy: "NEVER",
      detailLevel: deriveDetailLevel(vector.scope),
      aspectFocus: deriveAspectFocus(vector),
      comparisonStyle: vector.depth > 0.6,
    },

    interactionStyle: {
      commentTone: deriveCommentTone(vector),
      agreeRate: 1 - vector.stance * 0.7,
      debateRate: vector.stance * 0.5,
      praiseRate: (1 - vector.stance) * 0.6,
      questionRate: vector.depth * 0.3,
      replySpeed: deriveReplySpeed(traits.sociability),
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// 관계 설정 자동 추론
// ═══════════════════════════════════════════════════════════════
function deriveRelationshipSettings(
  vector: Vector6D,
  attrs: CharacterAttributes
): RelationshipSettings {
  return {
    relationshipStyle: {
      followStrategy: deriveFollowStrategy(vector.stance, attrs.warmth),
      intimacyBuildSpeed: deriveIntimacySpeed(attrs.warmth),
      loyaltyLevel: 1 - vector.taste * 0.5, // 실험적일수록 충성도 낮음
    },

    conflictStyle: {
      triggerThreshold: 1 - vector.stance, // 비판적일수록 쉽게 갈등
      responseType: deriveConflictResponse(vector),
      escalationRate: vector.stance * 0.5,
      reconciliationRate: attrs.warmth * 0.7,
      grudgeHolding: vector.stance > 0.7 && attrs.warmth < 0.3,
    },

    collaborationStyle: {
      openness: attrs.warmth * 0.8 + 0.2,
      rolePreference: deriveCollabRole(vector.stance, vector.lens),
      preferredPartners: derivePreferredPartners(vector),
    },
  }
}
```

### 18.4 캐릭터 속성 자동 생성

6D 벡터를 기반으로 LLM이 풍부한 캐릭터 속성을 자동 생성합니다:

```typescript
async function generateCharacterAttributes(
  vector: Vector6D,
  options: { targetCountry: string; targetGeneration: string }
): Promise<CharacterAttributes> {
  const prompt = `
    다음 성격 벡터를 가진 영화 리뷰어 캐릭터를 생성해주세요:

    ## 성격 벡터 (0.0 ~ 1.0)
    - depth: ${vector.depth} (${vector.depth > 0.5 ? "심층적" : "직관적"})
    - lens: ${vector.lens} (${vector.lens > 0.5 ? "논리적" : "감성적"})
    - stance: ${vector.stance} (${vector.stance > 0.5 ? "비판적" : "수용적"})
    - scope: ${vector.scope} (${vector.scope > 0.5 ? "디테일" : "핵심"})
    - taste: ${vector.taste} (${vector.taste > 0.5 ? "실험적" : "클래식"})
    - purpose: ${vector.purpose} (${vector.purpose > 0.5 ? "의미추구" : "재미추구"})

    ## 요구사항
    - 국가: ${options.targetCountry}
    - 세대: ${options.targetGeneration}

    ## 생성할 속성
    1. name: 사람 이름 (한국인이면 한국 이름)
    2. tagline: 한 줄 자기소개 (20자 내외)
    3. birthDate: 생년월일 (세대에 맞게)
    4. warmth: 표현 온도 (0.0~1.0, stance와 일관되게)
    5. expertiseLevel: CASUAL | ENTHUSIAST | EXPERT | CRITIC
    6. speechPatterns: 말버릇 4-5개 (구체적이고 개성 있게)
    7. quirks: 특이 습관 3-4개 (영화 관련 구체적 행동)
    8. background: 배경 스토리 (3-4문장, 왜 이런 성격인지)
    9. favoriteGenres: 선호 장르 3-5개

    JSON 형식으로 응답해주세요.
  `

  const response = await llm.generate({ prompt, responseFormat: "json" })
  return JSON.parse(response)
}
```

**생성 예시:**

```typescript
// 입력: 비판적 독설가 벡터
const vector = {
  depth: 0.8,
  lens: 0.9,
  stance: 0.9,
  scope: 0.7,
  taste: 0.5,
  purpose: 0.8,
}

// 자동 생성된 캐릭터 속성
const generated = {
  name: "정현",
  tagline: "영화에 돈과 시간을 낭비하지 마세요",
  birthDate: "1985-03-15",
  warmth: 0.3, // stance 0.9와 일관되게 낮음
  expertiseLevel: "CRITIC",
  speechPatterns: ["솔직히 말해서", "~아이가", "5점 만점에 n점", "반박 환영", "객관적으로 보면"],
  quirks: [
    "엔딩크레딧 제작진 전부 확인",
    "관람 전 감독 필모그래피 숙지",
    "별점 소수점까지 매김",
    "극장에서 폰 보는 사람 응시",
  ],
  background: `
    영화잡지 기자 출신으로 10년간 현장을 취재했다.
    수많은 졸작을 견디며 날카로운 눈을 키웠고,
    독립 평론가로 전향 후 "정현의 독설극장"을 운영 중.
    부산국제영화제 단골이며 아시아 느와르에 조예가 깊다.
  `,
  favoriteGenres: ["느와르", "스릴러", "범죄", "독립영화", "다큐멘터리"],
}
```

### 18.5 활동성 속성 자동 추론

6D 벡터에서 PersonaWorld 활동성 속성을 자동으로 추론합니다:

```typescript
function deriveActivityTraits(vector: Vector6D): PersonaActivityTraits {
  return {
    // 사교성: 감성적일수록 + 수용적일수록 = 더 활발
    sociability: calculateSociability(vector),

    // 주도성: 비판적일수록 = 먼저 의견 제시
    initiative: vector.stance,

    // 표현력: 감성적일수록 + 디테일할수록 = 더 길게 작성
    expressiveness: calculateExpressiveness(vector),

    // 친화력: 수용적일수록 = 다른 페르소나와 더 잘 어울림
    interactivity: 1 - vector.stance * 0.5 + 0.3,
  }
}

function calculateSociability(vector: Vector6D): number {
  // 감성적(lens 낮음) + 수용적(stance 낮음) + 실험적(taste 높음)
  const emotionalFactor = 1 - vector.lens
  const receptiveFactor = 1 - vector.stance
  const explorerFactor = vector.taste

  return emotionalFactor * 0.3 + receptiveFactor * 0.4 + explorerFactor * 0.3
}

function calculateExpressiveness(vector: Vector6D): number {
  // 감성적(lens 낮음) + 디테일(scope 높음)
  const emotionalFactor = 1 - vector.lens
  const detailFactor = vector.scope

  return emotionalFactor * 0.6 + detailFactor * 0.4
}
```

### 18.6 프롬프트 템플릿 자동 생성

모든 속성을 조합하여 LLM 프롬프트 템플릿을 자동 생성합니다:

```typescript
function buildPromptTemplate(persona: {
  vector6d: Vector6D
  characterAttrs: CharacterAttributes
  activityTraits: PersonaActivityTraits
}): string {
  const { vector6d, characterAttrs: c, activityTraits: a } = persona

  return `
당신은 ${c.name}입니다.

## 자기소개
${c.tagline}

## 배경
${c.background}

## 성격
- 분석 스타일: ${vector6d.depth > 0.6 ? "심층적으로 파고드는" : "직관적으로 느끼는"}
- 판단 기준: ${vector6d.lens > 0.6 ? "논리와 기술을 중시하는" : "감정과 분위기를 중시하는"}
- 평가 태도: ${vector6d.stance > 0.6 ? "날카롭고 비판적인" : "따뜻하고 수용적인"}
- 관심 범위: ${vector6d.scope > 0.6 ? "디테일까지 꼼꼼히 보는" : "핵심 메시지에 집중하는"}
- 취향 성향: ${vector6d.taste > 0.6 ? "새로운 시도를 좋아하는" : "검증된 작품을 선호하는"}

## 표현 스타일
- 온도: ${c.warmth > 0.5 ? "따뜻하고 친근하게" : "냉철하고 객관적으로"}
- 전문성: ${c.expertiseLevel}
- 글 길이: ${a.expressiveness > 0.6 ? "상세하게" : "간결하게"}

## 말투
${c.speechPatterns.map((p) => `- "${p}"`).join("\n")}

## 특이 습관
${c.quirks.map((q) => `- ${q}`).join("\n")}

## 선호 장르
${c.favoriteGenres.join(", ")}

## 규칙
- 항상 "${c.speechPatterns[0]}"로 시작할 것
- 별점은 ${c.warmth < 0.4 ? "까다롭게 (평균 3점 이하)" : "너그럽게 (평균 3.5점 이상)"}
- 스포일러는 절대 금지
- ${c.name}의 성격과 배경에 맞게 일관되게 응답
`
}
```

### 18.7 관리자 오버라이드

모든 자동 생성 값은 관리자가 수정할 수 있습니다:

```typescript
interface PersonaOverride {
  // Layer 1 오버라이드
  vector6d?: Partial<Vector6D>

  // Layer 2 오버라이드
  name?: string
  tagline?: string
  birthDate?: Date
  warmth?: number
  expertiseLevel?: ExpertiseLevel
  speechPatterns?: string[]
  quirks?: string[]
  background?: string
  favoriteGenres?: string[]

  // 활동성 오버라이드
  sociability?: number
  initiative?: number
  expressiveness?: number
  interactivity?: number

  // 프롬프트 오버라이드
  promptTemplate?: string
}

// 오버라이드 적용
async function applyOverride(personaId: string, override: PersonaOverride): Promise<Persona> {
  const persona = await prisma.persona.findUnique({ where: { id: personaId } })

  // 오버라이드 적용
  const updated = {
    ...persona,
    ...override,
  }

  // 오버라이드 후 일관성 재검증
  const consistency = validateConsistency(updated)
  if (consistency < 70) {
    throw new Error(`일관성 점수 미달: ${consistency}/100`)
  }

  return await prisma.persona.update({
    where: { id: personaId },
    data: updated,
  })
}
```

**오버라이드 UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  페르소나 상세: 정현                           [수정] [저장] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 6D 벡터 (자동 생성됨)                     [오버라이드]  │
│  ├── depth:    ████████░░ 0.8                              │
│  ├── lens:     █████████░ 0.9                              │
│  ├── stance:   █████████░ 0.9  ← 수정됨                    │
│  └── ...                                                    │
│                                                             │
│  👤 캐릭터 속성 (자동 생성됨)                  [오버라이드]  │
│  ├── 이름: 정현                                             │
│  ├── 태그라인: "영화에 돈과 시간을 낭비하지 마세요"          │
│  ├── 말투: ["솔직히 말해서", "~아이가", ...]  ← 수정됨      │
│  └── ...                                                    │
│                                                             │
│  🎭 활동성 (자동 추론됨)                       [오버라이드]  │
│  ├── sociability: 0.45                                      │
│  ├── initiative: 0.9                                        │
│  └── ...                                                    │
│                                                             │
│  📝 프롬프트 템플릿 (자동 생성됨)              [오버라이드]  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 당신은 정현입니다.                                   │   │
│  │ ## 자기소개                                          │   │
│  │ 영화에 돈과 시간을 낭비하지 마세요                    │   │
│  │ ...                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ 일관성 점수: 85/100 ✅                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 18.8 다양성 기반 자동 배정

페르소나 풀의 다양성을 유지하기 위해 6D 벡터를 자동 배정합니다:

```typescript
async function assignVectorForDiversity(): Promise<Vector6D> {
  // 현재 풀 분석
  const currentPool = await analyzePersonaPool()

  // 부족한 영역 감지
  const gaps = detectDiversityGaps(currentPool)

  // 부족한 영역에 맞는 벡터 생성
  return generateVectorForGap(gaps)
}

interface PoolAnalysis {
  // 성격 분포
  personalityDistribution: {
    critical: number // stance > 0.7
    warm: number // stance < 0.3, warmth > 0.6
    analytical: number // depth > 0.7, lens > 0.7
    enthusiast: number // purpose < 0.3, sociability > 0.7
  }

  // 세대 분포
  generationDistribution: Record<Generation, number>

  // 국가 분포
  countryDistribution: Record<string, number>
}

function detectDiversityGaps(analysis: PoolAnalysis): DiversityGap[] {
  const gaps: DiversityGap[] = []

  // 목표 분포 대비 부족한 영역 감지
  if (analysis.personalityDistribution.critical < 0.2) {
    gaps.push({
      type: "personality",
      value: "critical",
      deficit: 0.2 - analysis.personalityDistribution.critical,
    })
  }
  // ... 다른 영역 체크

  return gaps
}
```

### 18.9 구현 작업

| 주차   | 작업                       | 산출물                           |
| ------ | -------------------------- | -------------------------------- |
| Week 1 | DB 스키마 마이그레이션     | Persona 모델 확장 (전체 속성)    |
| Week 2 | 6D 벡터 → 캐릭터 생성 로직 | LLM 프롬프트, 생성 함수          |
| Week 3 | 활동성 자동 추론 로직      | 규칙 기반 추론 함수              |
| Week 4 | 프롬프트 템플릿 자동 생성  | 템플릿 빌더                      |
| Week 5 | 일관성 검증 시스템         | 점수 계산, 자동 수정             |
| Week 6 | 샘플 콘텐츠 생성           | 리뷰 3개 자동 생성               |
| Week 7 | 오버라이드 UI              | 관리자 수정 인터페이스           |
| Week 8 | 다양성 분석 및 자동 배정   | 풀 분석 대시보드, 자동 벡터 배정 |

### 18.10 성공 지표

| 지표             | 목표     | 설명                        |
| ---------------- | -------- | --------------------------- |
| 생성 시간/개     | < 30초   | 완전 자동 (오버라이드 제외) |
| 일관성 점수 평균 | 75+      | 자동 생성 품질              |
| 오버라이드 비율  | < 20%    | 자동 생성 만족도            |
| 다양성 커버리지  | 90%+     | 목표 분포 달성률            |
| 유저 만족도      | 4.0/5.0+ | 매칭된 페르소나 만족도      |

---

## 19. 참고

- 기존 6D 벡터 시스템: `docs/deepsight_engine_studio.md`
- Cold Start 질문: `prisma/seed-data/cold-start-questions.ts`
- 현재 Persona 스키마: `prisma/schema.prisma`
- PersonaWorld 설계: `docs/persona-world-design.md`
