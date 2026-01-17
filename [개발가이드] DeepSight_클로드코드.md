# DeepSight AI \- 개발 가이드 v3.0 (Claude Code용)

이 문서는 Claude Code가 한번에 전체 시스템을 구축할 수 있도록 작성된 개발 가이드입니다. **v3.0 변경사항:** 6D 벡터 시스템 전면 개편 (Depth, Lens, Stance, Scope, Taste, Purpose)

---

# 1\. 프로젝트 개요

## 1.1 서비스 정의

DeepSight \= B2B API 서비스

\- 고객: 리뷰/추천 기반 플랫폼 사업자 (OTT, 커머스 등)

\- 제공: AI 페르소나 매칭 API

\- 최종 사용자 경험: "나와 비슷한 페르소나 찾기 → 그 페르소나의 리뷰/추천 보기"

## 1.2 기술 스택

Backend:

\- Language: Python 3.11+

\- Framework: FastAPI

\- ORM: SQLAlchemy 2.0

\- Task Queue: Celery \+ Redis

\- Cache: Redis

Database:

\- Primary: PostgreSQL 15+

\- Vector: pgvector extension

Frontend (Admin):

\- Framework: Next.js 14

\- UI: Tailwind CSS \+ shadcn/ui

\- State: Zustand

Infrastructure:

\- Container: Docker

\- Orchestration: Kubernetes

\- Cloud: AWS (EKS, RDS, ElastiCache)

AI/ML:

\- LLM: Claude API (Anthropic)

\- Embedding: OpenAI text-embedding-3-small

---

# 2\. 프로젝트 구조

deepsight/

├── docker-compose.yml

├── .env.example

├── README.md

│

├── api/                          \# API Engine (FastAPI)

│   ├── main.py

│   ├── requirements.txt

│   ├── config/

│   │   ├── \_\_init\_\_.py

│   │   └── settings.py

│   ├── routers/

│   │   ├── \_\_init\_\_.py

│   │   ├── match.py              \# 매칭 API

│   │   ├── personas.py           \# 페르소나 조회 API

│   │   ├── reviews.py            \# 리뷰 API

│   │   └── health.py

│   ├── services/

│   │   ├── \_\_init\_\_.py

│   │   ├── matching\_service.py   \# 매칭 비즈니스 로직

│   │   ├── persona\_service.py

│   │   ├── review\_service.py

│   │   ├── llm\_service.py        \# Claude API 호출

│   │   └── cache\_service.py

│   ├── models/

│   │   ├── \_\_init\_\_.py

│   │   ├── database.py           \# DB 연결

│   │   ├── persona.py

│   │   ├── user.py

│   │   ├── content.py

│   │   └── review.py

│   ├── schemas/

│   │   ├── \_\_init\_\_.py

│   │   ├── match.py              \# Pydantic 스키마

│   │   ├── persona.py

│   │   └── review.py

│   └── utils/

│       ├── \_\_init\_\_.py

│       ├── vector.py             \# 벡터 연산

│       └── auth.py               \# API Key 인증

│

├── studio/                       \# Engine Studio (Admin)

│   ├── app/

│   │   ├── layout.tsx

│   │   ├── page.tsx

│   │   ├── personas/

│   │   │   ├── page.tsx          \# 페르소나 빌더

│   │   │   └── \[id\]/page.tsx

│   │   ├── matching-lab/

│   │   │   ├── page.tsx          \# 매칭 시뮬레이터

│   │   │   └── simulator/page.tsx

│   │   ├── user-insight/

│   │   │   └── page.tsx          \# 유저 인사이트

│   │   └── settings/

│   │       └── page.tsx

│   ├── components/

│   │   ├── persona-builder/

│   │   ├── matching-lab/

│   │   └── ui/

│   └── lib/

│       ├── api.ts

│       └── utils.ts

│

├── console/                      \# Developer Console

│   ├── app/

│   │   ├── dashboard/

│   │   ├── api-keys/

│   │   ├── usage/

│   │   └── billing/

│   └── ...

│

├── workers/                      \# Background Jobs (Celery)

│   ├── \_\_init\_\_.py

│   ├── tasks/

│   │   ├── persona\_incubator.py  \# 페르소나 자동 생성

│   │   ├── zombie\_cleanup.py     \# Zombie 페르소나 정리

│   │   ├── review\_generator.py   \# 리뷰 생성

│   │   └── cache\_warmer.py

│   └── celery\_app.py

│

├── migrations/                   \# Alembic

│   ├── versions/

│   └── env.py

│

└── scripts/

├── seed\\\_personas.py          \\\# 초기 페르소나 시드

├── seed\\\_golden\\\_samples.py    \\\# Golden Sample 시드

└── generate\\\_style\\\_reviews.py \\\# 12개 스타일 리뷰 생성

---

# 3\. 데이터베이스 스키마

## 3.1 PostgreSQL \+ pgvector 설정

\-- pgvector 확장 설치

CREATE EXTENSION IF NOT EXISTS vector;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

## 3.2 핵심 테이블

\-- \============================================

\-- 1\. Organizations (B2B 고객사)

\-- \============================================

CREATE TABLE organizations (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

name VARCHAR(255) NOT NULL,

plan VARCHAR(20) NOT NULL DEFAULT 'FREE',  \\-- FREE, STARTER, PRO, ENTERPRISE

api\\\_call\\\_limit INTEGER NOT NULL DEFAULT 3000,

api\\\_calls\\\_used INTEGER NOT NULL DEFAULT 0,

billing\\\_email VARCHAR(255),

payment\\\_method\\\_registered BOOLEAN DEFAULT FALSE,

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

updated\\\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- \============================================

\-- 2\. API Keys

\-- \============================================

CREATE TABLE api\_keys (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

organization\\\_id UUID NOT NULL REFERENCES organizations(id),

key\\\_hash VARCHAR(64) NOT NULL UNIQUE,  \\-- SHA256 해시

key\\\_prefix VARCHAR(8) NOT NULL,         \\-- ds\\\_live\\\_xxxx (표시용)

name VARCHAR(100),

environment VARCHAR(10) DEFAULT 'live', \\-- live, test

is\\\_active BOOLEAN DEFAULT TRUE,

last\\\_used\\\_at TIMESTAMPTZ,

created\\\_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx\_api\_keys\_hash ON api\_keys(key\_hash);

\-- \============================================

\-- 3\. Personas (AI 페르소나)

\-- \============================================

CREATE TABLE personas (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

organization\\\_id UUID REFERENCES organizations(id),  \\-- NULL이면 Public

\\-- 기본 정보

name VARCHAR(100) NOT NULL,

role VARCHAR(50) NOT NULL,               \\-- REVIEWER, CURATOR, EXPERT

tagline VARCHAR(200),

description TEXT,

avatar\\\_url VARCHAR(500),

\\-- 상태

status VARCHAR(20) DEFAULT 'DRAFT',      \\-- DRAFT, ACTIVE, LEGACY, DEPRECATED, ARCHIVED

visibility VARCHAR(20) DEFAULT 'PUBLIC', \\-- PUBLIC, PRIVATE

\\-- 메타데이터

specialty JSONB DEFAULT '\\\[\\\]',            \\-- \\\["영화", "드라마"\\\]

tags JSONB DEFAULT '\\\[\\\]',

\\-- 성과 지표

impression\\\_count INTEGER DEFAULT 0,

selection\\\_count INTEGER DEFAULT 0,

avg\\\_rating DECIMAL(3,2),

\\-- Zombie 관리

zombie\\\_weeks INTEGER DEFAULT 0,

\\-- 감사

created\\\_by VARCHAR(255),

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

updated\\\_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx\_personas\_status ON personas(status);

CREATE INDEX idx\_personas\_visibility ON personas(visibility);

CREATE INDEX idx\_personas\_org ON personas(organization\_id);

\-- \============================================

\-- 4\. PersonaVectors (6D 성향 벡터) ← v3.0 개편

\-- \============================================

CREATE TABLE persona\_vectors (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

persona\\\_id UUID NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,

\\-- 6D 벡터 (0.0 \\\~ 1.0) ← v3.0 신규 차원

depth DECIMAL(3,2) NOT NULL DEFAULT 0.5,      \\-- 분석 깊이 (직관적 ↔ 심층적)

lens DECIMAL(3,2) NOT NULL DEFAULT 0.5,       \\-- 판단 렌즈 (감성 ↔ 논리)

stance DECIMAL(3,2) NOT NULL DEFAULT 0.5,     \\-- 평가 태도 (수용적 ↔ 비판적)

scope DECIMAL(3,2) NOT NULL DEFAULT 0.5,      \\-- 관심 범위 (핵심만 ↔ 디테일)

taste DECIMAL(3,2) NOT NULL DEFAULT 0.5,      \\-- 취향 성향 (클래식 ↔ 실험적)

purpose DECIMAL(3,2) NOT NULL DEFAULT 0.5,    \\-- 소비 목적 (오락 ↔ 의미)

\\-- pgvector용 임베딩 (6차원)

vector\\\_6d vector(6),

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

updated\\\_at TIMESTAMPTZ DEFAULT NOW(),

CONSTRAINT chk\\\_depth CHECK (depth \\\>= 0 AND depth \\\<= 1),

CONSTRAINT chk\\\_lens CHECK (lens \\\>= 0 AND lens \\\<= 1),

CONSTRAINT chk\\\_stance CHECK (stance \\\>= 0 AND stance \\\<= 1),

CONSTRAINT chk\\\_scope CHECK (scope \\\>= 0 AND scope \\\<= 1),

CONSTRAINT chk\\\_taste CHECK (taste \\\>= 0 AND taste \\\<= 1),

CONSTRAINT chk\\\_purpose CHECK (purpose \\\>= 0 AND purpose \\\<= 1\\)

);

\-- 벡터 인덱스 (코사인 유사도용)

CREATE INDEX idx\_persona\_vectors\_6d ON persona\_vectors USING ivfflat (vector\_6d vector\_cosine\_ops);

\-- \============================================

\-- 5\. PersonaPrompts (LLM 프롬프트)

\-- \============================================

CREATE TABLE persona\_prompts (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

persona\\\_id UUID NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,

system\\\_prompt TEXT NOT NULL,

example\\\_responses JSONB DEFAULT '\\\[\\\]',

restrictions JSONB DEFAULT '\\\[\\\]',

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

updated\\\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- \============================================

\-- 6\. UserProfiles (최종 사용자) ← v3.0 개편

\-- \============================================

CREATE TABLE user\_profiles (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

organization\\\_id UUID NOT NULL REFERENCES organizations(id),

external\\\_user\\\_id VARCHAR(255) NOT NULL,  \\-- 고객사의 유저 ID

\\-- 6D 성향 벡터 ← v3.0 신규 차원

depth DECIMAL(3,2) DEFAULT 0.5,

lens DECIMAL(3,2) DEFAULT 0.5,

stance DECIMAL(3,2) DEFAULT 0.5,

scope DECIMAL(3,2) DEFAULT 0.5,

taste DECIMAL(3,2) DEFAULT 0.5,

purpose DECIMAL(3,2) DEFAULT 0.5,

\\-- 확신도 점수 ← v3.0 신규

confidence\\\_depth DECIMAL(3,2) DEFAULT 0.5,

confidence\\\_lens DECIMAL(3,2) DEFAULT 0.5,

confidence\\\_stance DECIMAL(3,2) DEFAULT 0.5,

confidence\\\_scope DECIMAL(3,2) DEFAULT 0.5,

confidence\\\_taste DECIMAL(3,2) DEFAULT 0.5,

confidence\\\_purpose DECIMAL(3,2) DEFAULT 0.5,

\\-- pgvector

vector\\\_6d vector(6),

\\-- 프로파일링 상태

profiling\\\_stage VARCHAR(20) DEFAULT 'COLD',  \\-- COLD, ONBOARDING, ACTIVE, MATURE

interactions\\\_count INTEGER DEFAULT 0,

\\-- 선호 정보

preferences JSONB DEFAULT '{}',

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

updated\\\_at TIMESTAMPTZ DEFAULT NOW(),

UNIQUE(organization\\\_id, external\\\_user\\\_id)

);

CREATE INDEX idx\_user\_profiles\_org ON user\_profiles(organization\_id);

CREATE INDEX idx\_user\_profiles\_vector ON user\_profiles USING ivfflat (vector\_6d vector\_cosine\_ops);

\-- \============================================

\-- 7\. Contents (콘텐츠)

\-- \============================================

CREATE TABLE contents (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

organization\\\_id UUID REFERENCES organizations(id),  \\-- NULL이면 공용

external\\\_content\\\_id VARCHAR(255),

title VARCHAR(500) NOT NULL,

content\\\_type VARCHAR(50),    \\-- movie, drama, book, product

genre JSONB DEFAULT '\\\[\\\]',

\\-- 메타데이터

metadata JSONB DEFAULT '{}',

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

updated\\\_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx\_contents\_org ON contents(organization\_id);

\-- \============================================

\-- 8\. ReviewStyles (12개 스타일)

\-- \============================================

CREATE TABLE review\_styles (

id VARCHAR(10) PRIMARY KEY,              \\-- S01 \\\~ S32

\\-- v3.0: 5비트 이진 표현 (새 6차원 중 5개)

depth\\\_high BOOLEAN NOT NULL,     \\-- 심층/직관

lens\\\_high BOOLEAN NOT NULL,      \\-- 논리/감성

stance\\\_high BOOLEAN NOT NULL,    \\-- 비판/수용

scope\\\_high BOOLEAN NOT NULL,     \\-- 디테일/핵심

taste\\\_high BOOLEAN NOT NULL,     \\-- 실험/클래식

\\-- purpose는 스타일이 아닌 콘텐츠 선택에 영향

name VARCHAR(100) NOT NULL,

description TEXT,

created\\\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- \============================================

\-- 9\. StyleContentReviews (스타일별 캐시 리뷰)

\-- \============================================

CREATE TABLE style\_content\_reviews (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

style\\\_id VARCHAR(10) NOT NULL REFERENCES review\\\_styles(id),

content\\\_id UUID NOT NULL REFERENCES contents(id),

review\\\_text TEXT NOT NULL,

rating DECIMAL(2,1),

\\-- 메타데이터

generated\\\_at TIMESTAMPTZ DEFAULT NOW(),

model\\\_version VARCHAR(50),

UNIQUE(style\\\_id, content\\\_id)

);

CREATE INDEX idx\_style\_reviews\_lookup ON style\_content\_reviews(style\_id, content\_id);

\-- \============================================

\-- 10\. PersonaReviews (페르소나 최종 리뷰)

\-- \============================================

CREATE TABLE persona\_reviews (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

persona\\\_id UUID NOT NULL REFERENCES personas(id),

content\\\_id UUID NOT NULL REFERENCES contents(id),

\\-- 리뷰 내용

review\\\_text TEXT NOT NULL,

rating DECIMAL(2,1),

\\-- 생성 정보

source\\\_style\\\_id VARCHAR(10) REFERENCES review\\\_styles(id),

transform\\\_method VARCHAR(20),  \\-- template, llm

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

UNIQUE(persona\\\_id, content\\\_id)

);

CREATE INDEX idx\_persona\_reviews\_lookup ON persona\_reviews(persona\_id, content\_id);

\-- \============================================

\-- 11\. MatchingLogs (매칭 로그)

\-- \============================================

CREATE TABLE matching\_logs (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

organization\\\_id UUID NOT NULL REFERENCES organizations(id),

api\\\_key\\\_id UUID REFERENCES api\\\_keys(id),

\\-- 요청 정보

user\\\_profile\\\_id UUID REFERENCES user\\\_profiles(id),

request\\\_payload JSONB,

\\-- 결과

matched\\\_personas JSONB,       \\-- \\\[{persona\\\_id, score, rank}\\\]

selected\\\_persona\\\_id UUID REFERENCES personas(id),

\\-- 성능

latency\\\_ms INTEGER,

cache\\\_hit BOOLEAN DEFAULT FALSE,

\\-- LLM 사용 여부

used\\\_llm\\\_context BOOLEAN DEFAULT FALSE,

llm\\\_tokens\\\_input INTEGER DEFAULT 0,

llm\\\_tokens\\\_output INTEGER DEFAULT 0,

created\\\_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx\_matching\_logs\_org ON matching\_logs(organization\_id);

CREATE INDEX idx\_matching\_logs\_created ON matching\_logs(created\_at);

\-- \============================================

\-- 12\. GoldenSamples (품질 검증용)

\-- \============================================

CREATE TABLE golden\_samples (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

content\\\_id UUID REFERENCES contents(id),

content\\\_title VARCHAR(500),

content\\\_type VARCHAR(50),

genre VARCHAR(100),

\\-- 예상 반응 (Human-in-the-loop 작성)

expected\\\_reactions JSONB NOT NULL,

/\\\*

v3.0 예시:

{

    "depth": {

        "high": "영화사적 맥락과 상징체계를 분석하면...",

        "low": "와 진짜 재밌었어요\!"

    },

    "lens": {

        "logical": "연출 기법과 서사 구조를 보면...",

        "emotional": "마음이 따뜻해지는 장면이었어요"

    },

    "stance": {

        "critical": "아쉬운 점을 짚어보자면...",

        "accepting": "감독의 의도가 잘 전달됐어요"

    }

}

\\\*/

difficulty VARCHAR(20) DEFAULT 'MEDIUM',  \\-- EASY, MEDIUM, HARD

is\\\_active BOOLEAN DEFAULT TRUE,

created\\\_by VARCHAR(255),

created\\\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- \============================================

\-- 13\. PrivateGoldenSamples (Enterprise 전용)

\-- \============================================

CREATE TABLE private\_golden\_samples (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

organization\\\_id UUID NOT NULL REFERENCES organizations(id),

persona\\\_id UUID NOT NULL REFERENCES personas(id),

schema\\\_version VARCHAR(10) DEFAULT '1.0',

domain VARCHAR(50) NOT NULL,

sample\\\_data JSONB NOT NULL,

/\\\*

{

    "question": "이 재킷 어울리는 바지?",

    "expected\\\_answer": "클래식한 가죽...",

    "tags": \\\["코디", "캐주얼"\\\],

    "custom\\\_fields": {}

}

\\\*/

status VARCHAR(20) DEFAULT 'DRAFT',

approved\\\_by VARCHAR(255),

approved\\\_at TIMESTAMPTZ,

metadata JSONB DEFAULT '{}',

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

updated\\\_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx\_private\_golden\_org ON private\_golden\_samples(organization\_id);

\-- \============================================

\-- 14\. DomainTemplates (Golden Sample 템플릿)

\-- \============================================

CREATE TABLE domain\_templates (

id UUID PRIMARY KEY DEFAULT uuid\\\_generate\\\_v4(),

domain VARCHAR(50) UNIQUE NOT NULL,

display\\\_name VARCHAR(100) NOT NULL,

template\\\_questions JSONB NOT NULL,

tone\\\_guidelines JSONB,

is\\\_active BOOLEAN DEFAULT TRUE,

created\\\_at TIMESTAMPTZ DEFAULT NOW(),

updated\\\_at TIMESTAMPTZ DEFAULT NOW()

);

\-- 기본 템플릿 삽입

INSERT INTO domain\_templates (domain, display\_name, template\_questions) VALUES

('fashion', '패션', '\[{"question": "이 재킷 어울리는 바지?", "hint": "코디 추천"}\]'),

('legal', '법률', '\[{"question": "임대차 계약 해지 조건?", "hint": "정확한 설명"}\]'),

('medical', '의료', '\[{"question": "두통이 자주 있어요", "hint": "안전한 조언"}\]'),

('education', '교육', '\[{"question": "파이썬 독학 방법?", "hint": "로드맵 제시"}\]'),

('food', '식품', '\[{"question": "와인 페어링 추천", "hint": "전문적 조언"}\]'),

('beauty', '뷰티', '\[{"question": "건성 피부 스킨케어?", "hint": "성분 기반"}\]');

## 3.3 12개 스타일 시드 데이터 ← **v3.1 개편**

\-- 12개 스타일 생성 (핵심 3차원 8개 \+ 특화 4개 \= 12\)

\-- v3.0: depth\_high, lens\_high, stance\_high, scope\_high, taste\_high

INSERT INTO review\_styles (id, depth\_high, lens\_high, stance\_high, scope\_high, taste\_high, name) VALUES

('S01', true,  true,  true,  true,  false, '심층비평 클래식'),

('S02', true,  true,  true,  true,  true,  '심층비평 실험적'),

('S03', true,  true,  true,  false, false, '핵심비평 클래식'),

('S04', true,  true,  true,  false, true,  '핵심비평 실험적'),

('S05', true,  true,  false, true,  false, '친절해설 클래식'),

('S06', true,  true,  false, true,  true,  '친절해설 실험적'),

('S07', true,  true,  false, false, false, '핵심해설 클래식'),

('S08', true,  true,  false, false, true,  '핵심해설 실험적'),

('S09', true,  false, true,  true,  false, '감성분석 비판'),

('S10', true,  false, true,  true,  true,  '감성분석 실험비판'),

('S11', true,  false, true,  false, false, '감성핵심 비판'),

('S12', true,  false, true,  false, true,  '감성핵심 실험비판'),

('S13', true,  false, false, true,  false, '감성분석 공감'),

('S14', true,  false, false, true,  true,  '감성분석 실험공감'),

('S15', true,  false, false, false, false, '감성핵심 공감'),

('S16', true,  false, false, false, true,  '감성핵심 실험공감'),

('S17', false, true,  true,  true,  false, '직관논리 비판상세'),

('S18', false, true,  true,  true,  true,  '직관논리 실험비판'),

('S19', false, true,  true,  false, false, '직관논리 비판핵심'),

('S20', false, true,  true,  false, true,  '직관논리 실험핵심'),

('S21', false, true,  false, true,  false, '직관논리 공감상세'),

('S22', false, true,  false, true,  true,  '직관논리 실험공감'),

('S23', false, true,  false, false, false, '직관논리 공감핵심'),

('S24', false, true,  false, false, true,  '직관논리 실험핵심'),

('S25', false, false, true,  true,  false, '직관감성 비판상세'),

('S26', false, false, true,  true,  true,  '직관감성 실험비판'),

('S27', false, false, true,  false, false, '직관감성 비판핵심'),

('S28', false, false, true,  false, true,  '직관감성 실험핵심'),

('S29', false, false, false, true,  false, '힐링상세 클래식'),

('S30', false, false, false, true,  true,  '힐링상세 실험적'),

('S31', false, false, false, false, false, '힐링한줄평 클래식'),

('S32', false, false, false, false, true,  '힐링한줄평 실험적');

---

# 4\. API 엔드포인트

## 4.1 External API (Developer Console용)

### 인증

Header: X-API-Key: ds\_live\_xxxxxxxx

### 매칭 API

POST /v1/match

Request:

user\_id: string (required)

user\_profile:

preferences: string\\\[\\\]

history: string\\\[\\\]

traits: object  \\\# {logic: 0.8, emotion: 0.3, ...}

content:

id: string

genre: string\\\[\\\]

options:

limit: int (default: 3\\)

use\\\_llm\\\_context: bool (default: false)

Response:

matches:

\\- persona\\\_id: string

  name: string

  similarity\\\_score: float

  rank: int

request\_id: string

latency\_ms: int

### 리뷰 API

GET /v1/personas/{persona\_id}/reviews/{content\_id}

Response:

persona\_id: string

content\_id: string

review:

text: string

rating: float

generated\\\_at: datetime

POST /v1/reviews/generate

Request:

persona\_id: string

content\_id: string

force\_regenerate: bool (default: false)

### 페르소나 목록

GET /v1/personas

Query:

status: string (default: ACTIVE)

specialty: string

limit: int

offset: int

Response:

personas:

\\- id: string

  name: string

  tagline: string

  role: string

  specialty: string\\\[\\\]

total: int

### 사용량

GET /v1/usage

Response:

plan: string

limit: int

used: int

remaining: int

period\_start: datetime

period\_end: datetime

## 4.2 Internal API (Engine Studio용)

### 페르소나 CRUD ← **v3.0 개편**

POST /internal/personas

Request:

name: string

role: string

tagline: string

description: string

vector:

depth: float      \\\# 분석 깊이 (0.0 직관적 ↔ 1.0 심층적)

lens: float       \\\# 판단 렌즈 (0.0 감성적 ↔ 1.0 논리적)

stance: float     \\\# 평가 태도 (0.0 수용적 ↔ 1.0 비판적)

scope: float      \\\# 관심 범위 (0.0 핵심만 ↔ 1.0 디테일)

taste: float      \\\# 취향 성향 (0.0 클래식 ↔ 1.0 실험적)

purpose: float    \\\# 소비 목적 (0.0 오락 ↔ 1.0 의미)

prompt:

system\\\_prompt: string

example\\\_responses: string\\\[\\\]

restrictions: string\\\[\\\]

PUT /internal/personas/{id}

DELETE /internal/personas/{id}

POST /internal/personas/{id}/activate

POST /internal/personas/{id}/deactivate

### 매칭 시뮬레이터

POST /internal/simulator/match

Request:

user\_vector:

logic: float

emotion: float

...

content:

genre: string\\\[\\\]

algorithm\_version: string (optional)

Response:

matches: \[...\]

debug:

vector\\\_scores: \\\[...\\\]

rule\\\_adjustments: \\\[...\\\]

final\\\_scores: \\\[...\\\]

### 알고리즘 관리

GET /internal/algorithms

POST /internal/algorithms

PUT /internal/algorithms/{id}

POST /internal/algorithms/{id}/deploy

POST /internal/algorithms/{id}/rollback

---

# 5\. 핵심 비즈니스 로직

## 5.1 매칭 서비스

\# api/services/matching\_service.py

from typing import List, Optional

from sqlalchemy.orm import Session

from pgvector.sqlalchemy import Vector

import numpy as np

class MatchingService:

def \\\_\\\_init\\\_\\\_(self, db: Session, cache: Redis, llm: LLMService):

    self.db \\= db

    self.cache \\= cache

    self.llm \\= llm

async def match(

    self,

    user\\\_vector: dict,

    content: dict,

    options: dict,

    organization\\\_id: str

) \\-\\\> List\\\[dict\\\]:

    """

    매칭 파이프라인:

    1\\. 벡터 매칭 (코사인 유사도)

    2\\. 규칙 기반 가중치 적용

    3\\. (선택) LLM 컨텍스트 분석

    4\\. 최종 스코어 계산

    """

    

    \\\# 캐시 체크

    cache\\\_key \\= self.\\\_build\\\_cache\\\_key(user\\\_vector, content)

    cached \\= await self.cache.get(cache\\\_key)

    if cached:

        return cached

    

    \\\# 1\\. 벡터 매칭

    user\\\_vec \\= self.\\\_to\\\_vector(user\\\_vector)

    vector\\\_scores \\= await self.\\\_vector\\\_match(user\\\_vec, organization\\\_id)

    

    \\\# 2\\. 규칙 기반 가중치

    genre \\= content.get('genre', \\\[\\\])

    adjusted\\\_scores \\= self.\\\_apply\\\_genre\\\_weights(vector\\\_scores, genre)

    

    \\\# 3\\. LLM 컨텍스트 (옵션)

    if options.get('use\\\_llm\\\_context'):

        adjusted\\\_scores \\= await self.\\\_apply\\\_llm\\\_context(

            adjusted\\\_scores, user\\\_vector, content

        )

    

    \\\# 4\\. 정렬 및 반환

    limit \\= options.get('limit', 3\\)

    results \\= sorted(adjusted\\\_scores, key=lambda x: x\\\['score'\\\], reverse=True)\\\[:limit\\\]

    

    \\\# 캐시 저장

    await self.cache.set(cache\\\_key, results, ex=3600)

    

    return results

def \\\_to\\\_vector(self, user\\\_vector: dict) \\-\\\> np.ndarray:

    """딕셔너리 → 6D numpy 배열"""

    return np.array(\\\[

        user\\\_vector.get('logic', 0.5),

        user\\\_vector.get('emotion', 0.5),

        user\\\_vector.get('critical', 0.5),

        user\\\_vector.get('supportive', 0.5),

        user\\\_vector.get('trendy', 0.5),

        user\\\_vector.get('timeless', 0.5),

    \\\])

async def \\\_vector\\\_match(self, user\\\_vec: np.ndarray, org\\\_id: str) \\-\\\> List\\\[dict\\\]:

    """pgvector 코사인 유사도 검색"""

    

    query \\= """

    SELECT 

        p.id,

        p.name,

        1 \\- (pv.vector\\\_6d \\\<=\\\> :user\\\_vec) as similarity

    FROM personas p

    JOIN persona\\\_vectors pv ON p.id \\= pv.persona\\\_id

    WHERE p.status \\= 'ACTIVE'

      AND (p.visibility \\= 'PUBLIC' OR p.organization\\\_id \\= :org\\\_id)

    ORDER BY pv.vector\\\_6d \\\<=\\\> :user\\\_vec

    LIMIT 50

    """

    

    results \\= self.db.execute(query, {

        'user\\\_vec': user\\\_vec.tolist(),

        'org\\\_id': org\\\_id

    })

    

    return \\\[

        {'persona\\\_id': r.id, 'name': r.name, 'score': float(r.similarity)}

        for r in results

    \\\]

def \\\_apply\\\_genre\\\_weights(self, scores: List\\\[dict\\\], genres: List\\\[str\\\]) \\-\\\> List\\\[dict\\\]:

    """장르별 가중치 적용"""

    

    GENRE\\\_WEIGHTS \\= {

        'drama': {'logic': 0.8, 'emotion': 1.2},

        'thriller': {'logic': 1.3, 'critical': 1.2},

        'romance': {'emotion': 1.4, 'supportive': 1.2},

        'sf': {'logic': 1.3, 'trendy': 1.1},

        'documentary': {'logic': 1.4, 'detailed': 1.3},

    }

    

    for item in scores:

        persona \\= self.\\\_get\\\_persona\\\_vector(item\\\['persona\\\_id'\\\])

        adjustment \\= 1.0

        

        for genre in genres:

            if genre.lower() in GENRE\\\_WEIGHTS:

                weights \\= GENRE\\\_WEIGHTS\\\[genre.lower()\\\]

                for dim, weight in weights.items():

                    if getattr(persona, dim, 0.5) \\\> 0.6:

                        adjustment \\\*= weight

        

        item\\\['score'\\\] \\\*= adjustment

    

    return scores

async def \\\_apply\\\_llm\\\_context(

    self, 

    scores: List\\\[dict\\\], 

    user\\\_vector: dict, 

    content: dict

) \\-\\\> List\\\[dict\\\]:

    """LLM 컨텍스트 분석으로 미세 조정"""

    

    prompt \\= f"""

    사용자 성향: {user\\\_vector}

    콘텐츠: {content}

    

    위 사용자에게 가장 적합한 페르소나 유형을 분석해주세요.

    JSON 형식으로 각 성향 차원의 이상적인 값을 반환:

    {{"logic": 0.0-1.0, "emotion": 0.0-1.0, ...}}

    """

    

    ideal\\\_vector \\= await self.llm.analyze(prompt)

    ideal\\\_vec \\= self.\\\_to\\\_vector(ideal\\\_vector)

    

    for item in scores:

        persona\\\_vec \\= self.\\\_get\\\_persona\\\_vector\\\_array(item\\\['persona\\\_id'\\\])

        llm\\\_similarity \\= self.\\\_cosine\\\_similarity(persona\\\_vec, ideal\\\_vec)

        item\\\['score'\\\] \\= item\\\['score'\\\] \\\* 0.7 \\+ llm\\\_similarity \\\* 0.3

    

    return scores

@staticmethod

def \\\_cosine\\\_similarity(a: np.ndarray, b: np.ndarray) \\-\\\> float:

    return float(np.dot(a, b) / (np.linalg.norm(a) \\\* np.linalg.norm(b)))

## 5.2 리뷰 생성 서비스

\# api/services/review\_service.py

class ReviewService:

def \\\_\\\_init\\\_\\\_(self, db: Session, cache: Redis, llm: LLMService):

    self.db \\= db

    self.cache \\= cache

    self.llm \\= llm

async def get\\\_or\\\_generate\\\_review(

    self,

    persona\\\_id: str,

    content\\\_id: str

) \\-\\\> dict:

    """

    2단계 리뷰 시스템:

    1\\. 페르소나 → 스타일 매핑

    2\\. 스타일 리뷰 조회 (캐시)

    3\\. 없으면 LLM 생성

    4\\. 페르소나 말투 변환

    """

    

    persona \\= self.\\\_get\\\_persona(persona\\\_id)

    

    \\\# Private 페르소나: 스타일 시스템 Bypass

    if persona.visibility \\== 'PRIVATE':

        return await self.\\\_generate\\\_private\\\_review(persona, content\\\_id)

    

    \\\# 1\\. 스타일 매핑

    style\\\_id \\= self.\\\_get\\\_style\\\_id(persona)

    

    \\\# 2\\. 스타일 리뷰 조회

    style\\\_review \\= await self.\\\_get\\\_style\\\_review(style\\\_id, content\\\_id)

    

    if not style\\\_review:

        \\\# 3\\. LLM 생성 및 캐시 저장

        style\\\_review \\= await self.\\\_generate\\\_style\\\_review(style\\\_id, content\\\_id)

    

    \\\# 4\\. 페르소나 말투 변환

    final\\\_review \\= await self.\\\_transform\\\_to\\\_persona(style\\\_review, persona)

    

    return final\\\_review

def \\\_get\\\_style\\\_id(self, persona) \\-\\\> str:

    """페르소나 벡터 → 12개 스타일 중 하나로 매핑"""

    

    vector \\= persona.vector

    

    style\\\_bits \\= \\\[\\\]

    style\\\_bits.append(1 if vector.logic \\\>= 0.6 else 0\\)

    style\\\_bits.append(1 if vector.critical \\\>= 0.6 else 0\\)

    style\\\_bits.append(1 if vector.detailed \\\>= 0.6 else 0\\)

    style\\\_bits.append(1 if vector.trendy \\\>= 0.6 else 0\\)

    style\\\_bits.append(1 if vector.formal \\\>= 0.6 else 0\\)

    

    style\\\_num \\= int(''.join(map(str, style\\\_bits)), 2\\) \\+ 1

    return f"S{style\\\_num:02d}"

async def \\\_generate\\\_private\\\_review(self, persona, content\\\_id: str) \\-\\\> dict:

    """Private 페르소나: LLM 직접 생성 (스타일 캐시 사용 안 함)"""

    

    content \\= self.\\\_get\\\_content(content\\\_id)

    prompt \\= persona.prompt

    

    review\\\_text \\= await self.llm.generate(

        system\\\_prompt=prompt.system\\\_prompt,

        user\\\_message=f"다음 콘텐츠에 대한 리뷰를 작성해주세요: {content.title}"

    )

    

    return {

        'persona\\\_id': persona.id,

        'content\\\_id': content\\\_id,

        'review\\\_text': review\\\_text,

        'source': 'llm\\\_direct'

    }

## 5.3 Zombie 정리 서비스

\# workers/tasks/zombie\_cleanup.py

from celery import shared\_task

from datetime import datetime, timedelta

@shared\_task

def cleanup\_zombie\_personas():

"""

매주 일요일 새벽 4시 실행

Zombie 판정 및 정리

"""

db \\= get\\\_db\\\_session()

\\\# Zombie 판정 쿼리

zombies \\= db.execute("""

    SELECT id, status, zombie\\\_weeks

    FROM personas

    WHERE status \\= 'ACTIVE'

      AND visibility \\\!= 'PRIVATE'  \\-- Private 페르소나 제외\\\!

      AND impression\\\_count \\\< 10

      AND updated\\\_at \\\< NOW() \\- INTERVAL '30 days'

""").fetchall()

for persona in zombies:

    weeks \\= persona.zombie\\\_weeks \\+ 1

    

    if weeks \\== 1:

        \\\# 1차: LEGACY로 강등

        db.execute("""

            UPDATE personas 

            SET status \\= 'LEGACY', zombie\\\_weeks \\= :weeks

            WHERE id \\= :id

        """, {'id': persona.id, 'weeks': weeks})

        

    elif weeks \\== 4:

        \\\# 2차: DEPRECATED

        db.execute("""

            UPDATE personas 

            SET status \\= 'DEPRECATED', zombie\\\_weeks \\= :weeks

            WHERE id \\= :id

        """, {'id': persona.id, 'weeks': weeks})

        

    elif weeks \\== 12:

        \\\# 3차: ARCHIVED (벡터 인덱스 제거)

        db.execute("""

            UPDATE personas 

            SET status \\= 'ARCHIVED', zombie\\\_weeks \\= :weeks

            WHERE id \\= :id

        """, {'id': persona.id, 'weeks': weeks})

        

        \\\# 벡터 인덱스에서 제거

        db.execute("""

            UPDATE persona\\\_vectors 

            SET vector\\\_6d \\= NULL 

            WHERE persona\\\_id \\= :id

        """, {'id': persona.id})

db.commit()

return {'processed': len(zombies)}

## 5.4 결제 수단 검증 (LLM 옵션)

\# api/utils/billing.py

from fastapi import HTTPException

async def validate\_llm\_option(organization\_id: str, use\_llm\_context: bool, db: Session):

"""

Free/Starter 플랜에서 LLM 옵션 사용 시 결제 수단 검증

Revenue Leak 방지

"""

if not use\\\_llm\\\_context:

    return True

org \\= db.query(Organization).filter\\\_by(id=organization\\\_id).first()

\\\# Pro 이상은 LLM 기본 포함

if org.plan in \\\['PRO', 'ENTERPRISE'\\\]:

    return True

\\\# Free/Starter: 결제 수단 필수

if not org.payment\\\_method\\\_registered:

    raise HTTPException(

        status\\\_code=402,

        detail={

            "code": "PAYMENT\\\_REQUIRED",

            "message": "LLM 컨텍스트 분석 사용을 위해 결제 수단 등록이 필요합니다.",

            "details": {

                "option": "use\\\_llm\\\_context",

                "action\\\_required": "register\\\_payment\\\_method",

                "console\\\_url": "https://console.deepsight.ai/billing/payment-methods"

            }

        }

    )

return True

---

# 6\. 환경 설정

## 6.1 .env.example

\# Database

DATABASE\_URL=postgresql://deepsight:password@localhost:5432/deepsight

REDIS\_URL=redis://localhost:6379/0

\# API

API\_HOST=0.0.0.0

API\_PORT=8000

API\_ENV=development  \# development, staging, production

\# LLM

ANTHROPIC\_API\_KEY=sk-ant-xxxxx

LLM\_MODEL=claude-sonnet-4-20250514

LLM\_MAX\_TOKENS=1024

\# Auth

JWT\_SECRET=your-secret-key

API\_KEY\_PREFIX=ds\_live\_

\# Rate Limiting

RATE\_LIMIT\_FREE=10      \# per minute

RATE\_LIMIT\_STARTER=100

RATE\_LIMIT\_PRO=1000

\# Celery

CELERY\_BROKER\_URL=redis://localhost:6379/1

CELERY\_RESULT\_BACKEND=redis://localhost:6379/2

## 6.2 docker-compose.yml

version: '3.8'

services:

api:

build:

  context: ./api

  dockerfile: Dockerfile

ports:

  \\- "8000:8000"

environment:

  \\- DATABASE\\\_URL=postgresql://deepsight:password@postgres:5432/deepsight

  \\- REDIS\\\_URL=redis://redis:6379/0

depends\\\_on:

  \\- postgres

  \\- redis

volumes:

  \\- ./api:/app

studio:

build:

  context: ./studio

  dockerfile: Dockerfile

ports:

  \\- "3000:3000"

environment:

  \\- NEXT\\\_PUBLIC\\\_API\\\_URL=http://localhost:8000

depends\\\_on:

  \\- api

console:

build:

  context: ./console

  dockerfile: Dockerfile

ports:

  \\- "3001:3000"

environment:

  \\- NEXT\\\_PUBLIC\\\_API\\\_URL=http://localhost:8000

depends\\\_on:

  \\- api

worker:

build:

  context: ./workers

  dockerfile: Dockerfile

environment:

  \\- DATABASE\\\_URL=postgresql://deepsight:password@postgres:5432/deepsight

  \\- CELERY\\\_BROKER\\\_URL=redis://redis:6379/1

depends\\\_on:

  \\- postgres

  \\- redis

command: celery \\-A celery\\\_app worker \\-l info

scheduler:

build:

  context: ./workers

  dockerfile: Dockerfile

environment:

  \\- DATABASE\\\_URL=postgresql://deepsight:password@postgres:5432/deepsight

  \\- CELERY\\\_BROKER\\\_URL=redis://redis:6379/1

depends\\\_on:

  \\- postgres

  \\- redis

command: celery \\-A celery\\\_app beat \\-l info

postgres:

image: pgvector/pgvector:pg15

environment:

  \\- POSTGRES\\\_USER=deepsight

  \\- POSTGRES\\\_PASSWORD=password

  \\- POSTGRES\\\_DB=deepsight

ports:

  \\- "5432:5432"

volumes:

  \\- postgres\\\_data:/var/lib/postgresql/data

redis:

image: redis:7-alpine

ports:

  \\- "6379:6379"

volumes:

  \\- redis\\\_data:/data

volumes:

postgres\_data:

redis\_data:

---

# 7\. 실행 명령어

## 7.1 초기 설정

\# 1\. 레포지토리 클론

git clone [https://github.com/your-org/deepsight.git](https://github.com/your-org/deepsight.git)

cd deepsight

\# 2\. 환경 변수 설정

cp .env.example .env

\# .env 파일 수정

\# 3\. Docker 실행

docker-compose up \-d

\# 4\. DB 마이그레이션

docker-compose exec api alembic upgrade head

\# 5\. 초기 데이터 시드

docker-compose exec api python scripts/seed\_personas.py

docker-compose exec api python scripts/seed\_golden\_samples.py

## 7.2 개발 모드

\# API 서버

cd api

pip install \-r requirements.txt

uvicorn main:app \--reload \--host 0.0.0.0 \--port 8000

\# Studio (Admin)

cd studio

npm install

npm run dev

\# Console

cd console

npm install

npm run dev

\# Worker

cd workers

celery \-A celery\_app worker \-l info

## 7.3 테스트

\# API 테스트

cd api

pytest tests/ \-v

\# E2E 테스트

cd e2e

npm run test

---

# 8\. 주요 주의사항

## 8.1 비용 관리

1\. 캐시 히트율 70% 이상 목표

2\. ~~Private 페르소나는 LLM 직접 호출~~ → Phase 2 예정

3\. Free 플랜 LLM 옵션 → 결제 수단 필수

## 8.2 Private 페르소나 ← **Phase 2 예정**

⚠️ **초기 런칭 범위 외:** Private 페르소나 관련 코드는 Phase 2에서 구현 예정입니다.

\# Phase 2에서 구현 예정

\# \- Zombie 정리 시 Private 제외

\# \- 스타일 시스템 Bypass

\# \- Private Golden Sample 관리

## 8.3 플랜별 제한

| 플랜 | API 호출/월 | Rate Limit | LLM 옵션 |
| :---- | :---- | :---- | :---- |
| Free | 3,000 | 10/분 | 결제 수단 필수 |
| Starter | 50,000 | 100/분 | 토큰 과금 |
| Pro | 500,000 | 1,000/분 | 기본 포함 |
| Enterprise | 협의 | 협의 | 기본 포함 |

---

# 9\. 다음 단계

1. 위 스키마로 DB 생성  
2. API 엔드포인트 구현  
3. Studio UI 구현  
4. Console UI 구현  
5. Worker 태스크 구현  
6. 테스트 작성  
7. 배포 파이프라인 설정

---

**문서 끝**

