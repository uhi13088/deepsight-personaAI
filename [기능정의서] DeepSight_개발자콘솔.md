# DeepSight AI \- 개발자 콘솔 기능 정의서

**Developer Console & API Management System**

---

**문서 정보**

- 작성일: 2026\. 01\. 12  
- 버전: v3.0 (Full Specification \- 6D Vector Redesign)  
- 대상: 외부 개발자, 고객사, 파트너사

---

## 📂 목차 (Table of Contents)

### 1\. 개요 (Overview)

- 1.1 문서의 목적 및 범위  
- 1.2 타겟 사용자 정의  
- 1.3 핵심 가치 및 설계 철학  
- 1.4 주요 용어 사전

### 2\. 시스템 아키텍처 (System Architecture)

- 2.1 전체 구조도  
- 2.2 외부 시스템 연동  
- 2.3 메뉴 및 네비게이션 구조

### 3\. 인증 및 보안 (Authentication & Security)

- 3.1 회원가입 및 로그인  
- 3.2 OAuth 2.0 연동  
- 3.3 보안 정책

### 4\. 대시보드 (Dashboard)

- 4.1 메인 대시보드  
- 4.2 실시간 모니터링  
- 4.3 알림 센터

### 5\. API Keys 관리 (API Key Management)

- 5.1 API Key 생성  
- 5.2 Key 권한 설정  
- 5.3 Key 갱신 및 폐기

### 6\. 사용량 분석 (Usage Analytics)

- 6.1 사용량 대시보드  
- 6.2 상세 분석  
- 6.3 리포트 생성

### 7\. API 로그 (API Logs)

- 7.1 실시간 로그  
- 7.2 로그 검색 및 필터  
- 7.3 에러 분석

### 8\. 결제 및 빌링 (Billing & Payment)

- 8.1 요금제 안내  
- 8.2 결제 관리  
- 8.3 청구서 및 영수증

### 9\. API 레퍼런스 (API Reference)

- 9.1 API 개요  
- 9.2 인증 방식  
- 9.3 엔드포인트 명세  
- 9.4 에러 코드

### 10\. Webhook 연동 (Webhook Integration) ← **v2.0 신규**

- 10.1 Webhook 개요  
- 10.2 이벤트 유형  
- 10.3 Webhook 설정

### 11\. SDK 및 통합 가이드 (SDK & Integration Guide) ← **v2.0 신규**

- 11.1 공식 SDK  
- 11.2 통합 가이드  
- 11.3 샘플 코드

### 12\. 지원 및 도움말 (Support & Help)

- 12.1 문서 센터  
- 12.2 기술 지원  
- 12.3 개발자 커뮤니티 ← **v2.0 확장**

### 13\. 팀 및 조직 관리 (Team & Organization)

- 13.1 조직 설정  
- 13.2 팀원 관리  
- 13.3 역할 및 권한  
- 13.4 Enterprise Private 페르소나 ← **Phase 2 예정**

### 14\. 데이터 구조 설계 (Data Schema)

- 14.1 기존 테이블  
- 14.2 신규 테이블 ← **v2.0 신규**

---

\\newpage

# 1\. 개요 (Overview)

## 1.1 문서의 목적 및 범위

본 문서는 \*\*DeepSight AI 개발자 콘솔(Developer Console)\*\*의 상세 기능 명세를 정의합니다.

개발자 콘솔은 \*\*외부 개발자(고객사, 파트너사)\*\*가 DeepSight AI의 API를 활용하기 위한 셀프 서비스 플랫폼입니다.

### 엔진 스튜디오와의 관계

- **개발자 콘솔 (Developer Console):** 외부 개발자 대상. API Key 발급, 사용량 확인, 결제 관리.  
- **엔진 스튜디오 (Engine Studio):** DeepSight AI 내부 팀 전용. 페르소나 생성, 알고리즘 튜닝.  
- 두 시스템은 **물리적으로 분리**되어 있으며, 외부 개발자는 엔진 스튜디오에 접근할 수 없습니다.

### 포함 범위

- 회원가입, 로그인, 계정 관리  
- API Key 발급 및 관리  
- API 사용량 모니터링 및 분석  
- 결제 및 빌링  
- API 문서 및 레퍼런스  
- **Webhook 연동** ← v2.0 신규 추가  
- **SDK 및 통합 가이드** ← v2.0 신규 추가  
- 기술 지원 및 커뮤니티

### 제외 범위

- 페르소나 생성/수정 (내부 전용)  
- 매칭 알고리즘 튜닝 (내부 전용)  
- 사용자 벡터 직접 조작 (내부 전용)

## 1.2 타겟 사용자 정의 (User Personas)

개발자 콘솔은 다음 사용자를 대상으로 설계되었습니다.

### 1\. 개발자 (Developer)

- **주요 업무:** API 통합 개발, 테스트, 디버깅.  
- **핵심 니즈:**  
  - 명확한 API 문서  
  - 빠른 API Key 발급  
  - 실시간 테스트 환경 (Playground)  
  - 상세한 에러 로그  
- **전문성:** 백엔드 개발, REST API 사용 경험.

### 2\. 기술 리더 (Tech Lead / CTO)

- **주요 업무:** 아키텍처 설계, 기술 의사결정, 비용 관리.  
- **핵심 니즈:**  
  - 성능 및 안정성 지표  
  - 비용 예측 및 최적화  
  - SLA 및 보안 정보  
  - 팀 권한 관리  
- **전문성:** 시스템 아키텍처, 기술 전략.

### 3\. 비즈니스 담당자 (Business Owner)

- **주요 업무:** 계약, 결제, ROI 분석.  
- **핵심 니즈:**  
  - 사용량 리포트  
  - 청구서 및 영수증  
  - 요금제 비교  
  - 계약 관리  
- **전문성:** 비즈니스 운영, 재무 관리.

## 1.3 핵심 가치 및 설계 철학

개발자 콘솔은 다음 3가지 핵심 원칙을 기반으로 설계되었습니다.

### 1\. 개발자 경험 (Developer Experience, DX)

- **목표:** 개발자가 5분 안에 첫 API 호출에 성공.  
- **전략:**  
  - 직관적인 온보딩 플로우  
  - 복사-붙여넣기 가능한 코드 예제  
  - 실시간 API Playground  
  - 명확한 에러 메시지

### 2\. 투명한 비용 관리

- **목표:** 예상치 못한 비용 발생 방지.  
- **전략:**  
  - 실시간 사용량 모니터링  
  - 예산 알림 설정  
  - 상세한 비용 breakdown  
  - 비용 시뮬레이터

### 3\. 엔터프라이즈 보안

- **목표:** 기업 고객의 보안 요구사항 충족.  
- **전략:**  
  - SOC 2 Type II 준수  
  - 역할 기반 접근 제어 (RBAC)  
  - API Key 세분화 권한  
  - 감사 로그

## 1.4 주요 용어 사전 (Terminology)

### API 관련

- **API Key:** DeepSight API 호출 시 인증에 사용되는 고유 키.  
- **Secret Key:** API Key와 함께 사용되는 비밀 키. 노출 시 즉시 갱신 필요.  
- **Rate Limit:** 단위 시간당 허용되는 API 호출 횟수 제한.  
- **Quota:** 월간 또는 일간 허용되는 총 API 호출 횟수.

### 과금 관련

- **Credit:** API 사용량을 측정하는 단위. 1 Credit \= 1 API 호출 (기본).  
- **Token:** LLM 호출 시 사용량 측정 단위. 약 4글자 \= 1 토큰.  
- **Overage:** 플랜 포함량 초과 시 추가 과금되는 사용량.

### 매칭 관련

- **페르소나 (Persona):** AI가 특정 성향으로 콘텐츠를 추천하는 가상의 인격.  
- **매칭 (Matching):** 사용자와 가장 적합한 페르소나를 연결하는 프로세스.  
- **매칭 스코어 (Matching Score):** 페르소나와 사용자 간 적합도 (0\~100점).

---

\\newpage

# 2\. 시스템 아키텍처 (System Architecture)

## 2.1 전체 구조도

개발자 콘솔은 다음과 같은 구조로 DeepSight AI 시스템과 연동됩니다.

\[외부 개발자 영역\]

┌─────────────────────────────────────────────────────────────┐

│                   Developer Console                         │

│  ([https://console.deepsight.ai](https://console.deepsight.ai))                            │

│  \- 회원가입/로그인                                          │

│  \- API Key 관리                                             │

│  \- 사용량 모니터링                                          │

│  \- 결제 관리                                                │

│  \- API 문서                                                 │

└─────────────────────────────────────────────────────────────┘

                          │

                          ▼ API Key 인증

┌─────────────────────────────────────────────────────────────┐

│                   DeepSight AI Engine                       │

│  ([https://api.deepsight.ai](https://api.deepsight.ai))                                │

│  \- /v1/match (매칭 API)                                    │

│  \- /v1/personas (페르소나 조회)                            │

│  \- /v1/feedback (피드백 전송)                              │

└─────────────────────────────────────────────────────────────┘

                          │

                          │ 내부 통신 (격리됨)

                          ▼

\[내부 팀 영역 \- 외부 접근 불가\]

┌─────────────────────────────────────────────────────────────┐

│                   Engine Studio                             │

│  ([https://studio-internal.deepsight.ai](https://studio-internal.deepsight.ai))                    │

│  \- 페르소나 생성/관리                                      │

│  \- 알고리즘 튜닝                                           │

│  \- 성과 분석                                               │

└─────────────────────────────────────────────────────────────┘

### 주요 컴포넌트 설명

**1\) Developer Console (개발자 콘솔)**

- 역할: 외부 개발자가 API를 사용하기 위한 셀프 서비스 플랫폼.  
- 기능: API Key 발급, 사용량 확인, 결제, 문서 조회.

**2\) DeepSight AI Engine (API 엔진)**

- 역할: 실제 AI 매칭 서비스를 제공하는 백엔드.  
- 기능: 매칭 요청 처리, 페르소나 응답 생성, 피드백 수집.

**3\) Engine Studio (엔진 스튜디오)**

- 역할: 내부 팀이 AI 엔진을 관리하는 시스템.  
- 접근: **외부 개발자 접근 불가** (물리적 격리).

## 2.2 외부 시스템 연동

### 결제 시스템

**연동 대상:**

- Stripe (글로벌 결제)  
- 토스페이먼츠 (국내 결제)

**데이터 흐름:**

\[개발자 콘솔\] → \[결제 게이트웨이\] → \[Stripe/토스\]

                 │

                 ▼

          \\\[결제 완료 Webhook\\\]

                 │

                 ▼

          \\\[플랜 업그레이드\\\]

### 인증 시스템

**연동 대상:**

- Google OAuth 2.0  
- GitHub OAuth  
- 자체 이메일/비밀번호

### 알림 시스템

**연동 대상:**

- 이메일: SendGrid  
- SMS: Twilio (선택)  
- Slack: Incoming Webhook

## 2.3 메뉴 및 네비게이션 구조

### LNB (Left Navigation Bar) 구성

Developer Console

├── 🏠 Dashboard

│   ├── 사용량 요약

│   ├── 최근 활동

│   └── 알림

├── \[구분선\]

├── 🔑 API Keys

│   ├── Key 목록

│   ├── 새 Key 생성

│   └── Key 설정

├── 📊 Usage

│   ├── 실시간 모니터링

│   ├── 상세 분석

│   └── 리포트

├── 📋 Logs

│   ├── API 로그

│   └── 에러 로그

├── \[구분선\]

├── 💳 Billing

│   ├── 현재 플랜

│   ├── 결제 수단

│   └── 청구서

├── 🔗 Webhooks  ← v2.0 신규

│   ├── Webhook 목록

│   └── 이벤트 로그

├── \[구분선\]

├── 📚 Documentation

│   ├── 시작하기

│   ├── API Reference

│   ├── SDK 가이드  ← v2.0 신규

│   └── 샘플 코드

├── 🛠️ Playground

│   └── API 테스트

├── \[구분선\]

├── 👥 Team

│   ├── 팀원 관리

│   └── 권한 설정

├── ⚙️ Settings

│   ├── 계정 설정

│   ├── 알림 설정

│   └── 보안 설정

└── 🆘 Support

├── 문의하기

├── FAQ

└── 커뮤니티  ← v2.0 신규

---

\\newpage

# 3\. 인증 및 보안 (Authentication & Security)

## 3.1 회원가입 및 로그인

### 3.1.1 회원가입 플로우

**Step 1: 가입 방식 선택**

- 이메일/비밀번호  
- Google 계정으로 가입  
- GitHub 계정으로 가입

**Step 2: 기본 정보 입력**

- 이름 (필수)  
- 회사명 (선택)  
- 역할: 개발자 / 기술 리더 / 비즈니스

**Step 3: 이메일 인증**

- 인증 이메일 발송  
- 24시간 내 인증 완료 필요

**Step 4: 온보딩**

- 첫 API Key 자동 생성  
- 간단한 튜토리얼 제공  
- Playground에서 첫 API 호출 유도

### 3.1.2 로그인

**지원 방식:**

- 이메일/비밀번호  
- Google OAuth 2.0  
- GitHub OAuth  
- SSO (Enterprise 플랜)

**보안 기능:**

- 2단계 인증 (2FA): TOTP 앱 (Google Authenticator 등)  
- 로그인 알림: 새 기기에서 로그인 시 이메일 알림  
- 세션 관리: 활성 세션 목록 조회 및 강제 로그아웃

### 3.1.3 비밀번호 정책

**요구사항:**

- 최소 8자 이상  
- 대문자, 소문자, 숫자, 특수문자 중 3가지 이상 포함  
- 이전 5개 비밀번호와 동일 불가

**비밀번호 재설정:**

- "비밀번호 찾기" → 이메일로 재설정 링크 발송  
- 링크 유효시간: 1시간  
- 재설정 완료 시 모든 세션 로그아웃

## 3.2 OAuth 2.0 연동

### 3.2.1 Google OAuth

**Scope:**

- `openid`: 기본 인증  
- `email`: 이메일 주소  
- `profile`: 이름, 프로필 사진

**플로우:**

1. 사용자가 "Google로 로그인" 클릭  
2. Google 인증 페이지로 리다이렉트  
3. 사용자 동의 후 Authorization Code 발급  
4. 서버에서 Access Token 교환  
5. 사용자 정보 조회 및 세션 생성

### 3.2.2 GitHub OAuth

**Scope:**

- `user:email`: 이메일 주소  
- `read:user`: 기본 프로필

**플로우:**

- Google OAuth와 동일한 Authorization Code 플로우

### 3.2.3 Enterprise SSO

**지원 프로토콜:**

- SAML 2.0  
- OIDC (OpenID Connect)

**설정:**

- Enterprise 플랜 고객에게만 제공  
- IdP (Identity Provider) 설정 필요: Okta, Azure AD 등  
- 도메인 검증 필수

## 3.3 보안 정책

### 3.3.1 API Key 보안

**Key 형식:**

- Public Key: `pk_live_xxxxxxxxxxxx` (32자)  
- Secret Key: `sk_live_xxxxxxxxxxxx` (32자)

**보안 권장사항:**

- Secret Key는 서버 측에서만 사용  
- 환경변수로 관리 (코드에 직접 포함 금지)  
- 정기적 Key 갱신 (90일 권장)

**유출 대응:**

- Key 유출 감지 시 즉시 폐기  
- 새 Key 발급  
- 감사 로그 확인

### 3.3.2 네트워크 보안

**HTTPS 강제:**

- 모든 통신은 TLS 1.2 이상  
- HTTP 요청은 HTTPS로 리다이렉트

**IP 화이트리스트 (Enterprise):**

- 특정 IP에서만 API 호출 허용  
- CIDR 표기법 지원

### 3.3.3 감사 로그

**기록 항목:**

- 로그인/로그아웃  
- API Key 생성/삭제/갱신  
- 팀원 초대/제거  
- 권한 변경  
- 결제 관련 활동

**보존 기간:**

- 기본: 90일  
- Enterprise: 1년 이상 (협의)

### 3.3.4 컴플라이언스

**인증:**

- SOC 2 Type II  
- ISO 27001 (예정)  
- GDPR 준수

**데이터 처리:**

- 사용자 데이터는 암호화 저장  
- 요청 시 데이터 삭제 (Right to be Forgotten)  
- 데이터 처리 동의 (DPA) 제공

---

\\newpage

# 4\. 대시보드 (Dashboard)

## 4.1 메인 대시보드

### 4.1.1 대시보드 레이아웃

로그인 후 가장 먼저 표시되는 화면입니다.

**상단: 환영 메시지 및 퀵 액션**

안녕하세요, \[사용자명\]님\! 👋

오늘의 API 사용량: 1,234 calls | 이번 달: 45,678 calls

\[새 API Key 생성\]  \[문서 보기\]  \[Playground 열기\]

**중단: 핵심 지표 카드**

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐

│  API Calls   │ │   Success    │ │   Latency    │ │    Cost     │

│   Today      │ │    Rate      │ │    P95       │ │  This Month │

│   1,234      │ │   99.8%      │ │   142ms      │ │   $234.56   │

│   ↑12%       │ │   ↑0.2%      │ │   ↓5ms       │ │   65% used  │

└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

**하단: 차트 및 활동**

- 좌측: 최근 7일 API 호출 추이 (라인 차트)  
- 우측: 최근 활동 로그 (10개)

### 4.1.2 대시보드 커스터마이징

**위젯 추가/제거:**

- 드래그 앤 드롭으로 위젯 배치 변경  
- 불필요한 위젯 숨김 가능  
- 사용 가능한 위젯:  
  - API 호출량  
  - 성공률  
  - 응답 시간  
  - 비용  
  - 에러 Top 5  
  - 엔드포인트별 사용량

**기간 필터:**

- 오늘, 어제, 최근 7일, 최근 30일, 커스텀

## 4.2 실시간 모니터링

### 4.2.1 실시간 지표

**Live Metrics:**

- 현재 초당 요청 수 (RPS)  
- 실시간 성공률  
- 실시간 평균 응답 시간  
- 활성 연결 수

**업데이트 주기:** 5초

### 4.2.2 실시간 로그 스트림

**표시 정보:**

- 타임스탬프  
- 엔드포인트  
- 상태 코드  
- 응답 시간  
- Request ID

**필터:**

- 엔드포인트별  
- 상태 코드별 (2xx, 4xx, 5xx)  
- 응답 시간 임계값

## 4.3 알림 센터

### 4.3.1 알림 유형

| 유형 | 설명 | 기본 설정 |
| :---- | :---- | :---- |
| 사용량 알림 | 사용량이 임계값 도달 | 80%, 100% |
| 에러 알림 | 에러율 급증 | 5% 이상 |
| 보안 알림 | 의심스러운 활동 감지 | 항상 |
| 결제 알림 | 결제 실패, 플랜 만료 | 항상 |
| 시스템 알림 | 유지보수, 장애 공지 | 항상 |

### 4.3.2 알림 채널 설정

**지원 채널:**

- 이메일 (기본)  
- Slack  
- Webhook ← v2.0 신규

**채널별 설정:**

- 알림 유형별 on/off  
- 조용한 시간 설정 (야간 알림 금지)

### 4.3.3 알림 히스토리

- 최근 30일 알림 목록  
- 읽음/안읽음 상태  
- 알림별 상세 정보 및 액션 링크

---

\\newpage

# 5\. API Keys 관리 (API Key Management)

## 5.1 API Key 생성

### 5.1.1 Key 생성 플로우

**Step 1: 기본 정보**

- Key 이름 (필수): 식별용 이름 (예: "Production Server", "Development")  
- 설명 (선택): 용도 메모

**Step 2: 환경 선택**

- **Test Mode:** 테스트용. 실제 과금 없음. 기능 동일.  
- **Live Mode:** 실제 서비스용. 과금 적용.

**Step 3: 권한 설정**

- 전체 권한 (기본)  
- 제한된 권한 (세부 설정)

**Step 4: 생성 완료**

- Public Key 및 Secret Key 표시  
- **Secret Key는 이 시점에만 표시됨** (복사 필수)  
- 확인 체크박스: "Secret Key를 안전하게 저장했습니다"

### 5.1.2 Key 형식

**Test Mode:**

Public Key:  pk\_test\_xxxxxxxxxxxxxxxxxxxxxxxx

Secret Key:  sk\_test\_xxxxxxxxxxxxxxxxxxxxxxxx

**Live Mode:**

Public Key:  pk\_live\_xxxxxxxxxxxxxxxxxxxxxxxx

Secret Key:  sk\_live\_xxxxxxxxxxxxxxxxxxxxxxxx

### 5.1.3 Key 제한

**플랜별 Key 개수:** | 플랜 | 최대 Key 수 | |------|-----------| | Free | 2 | | Starter | 5 | | Pro | 20 | | Enterprise | 무제한 |

## 5.2 Key 권한 설정

### 5.2.1 기본 권한

**전체 권한 (Full Access):**

- 모든 API 엔드포인트 접근 가능  
- 읽기/쓰기 모두 허용

### 5.2.2 세분화 권한

**엔드포인트별 권한:** | 엔드포인트 | 권한 옵션 | |-----------|----------| | /v1/match | 허용 / 거부 | | /v1/personas | 허용 / 거부 | | /v1/feedback | 허용 / 거부 | | /v1/users | 허용 / 거부 |

**Rate Limit 커스터마이징:**

- Key별로 개별 Rate Limit 설정 가능  
- 플랜 기본값보다 낮게만 설정 가능

### 5.2.3 IP 제한 (Enterprise)

**화이트리스트:**

- 특정 IP에서만 해당 Key 사용 가능  
- CIDR 표기법 지원 (예: 10.0.0.0/24)  
- 최대 50개 IP 등록

## 5.3 Key 갱신 및 폐기

### 5.3.1 Key 갱신 (Rotation)

**자동 갱신:**

- 설정된 주기(30/60/90일)마다 자동 갱신  
- 이전 Key는 24시간 유예 기간 후 비활성화  
- 갱신 시 이메일 알림

**수동 갱신:**

- \[Rotate Key\] 버튼 클릭  
- 새 Secret Key 발급  
- 이전 Key 즉시 비활성화 또는 유예 기간 설정

### 5.3.2 Key 폐기 (Revoke)

**폐기 프로세스:**

1. Key 목록에서 대상 Key 선택  
2. \[Revoke\] 버튼 클릭  
3. 확인 다이얼로그: "이 작업은 되돌릴 수 없습니다"  
4. Key 즉시 비활성화

**폐기된 Key:**

- API 호출 시 401 Unauthorized 반환  
- 로그에서 조회는 가능  
- 복구 불가

### 5.3.3 Key 활동 로그

**기록 항목:**

- Key로 호출된 API 기록  
- 호출 IP 주소  
- 성공/실패 여부

**조회:**

- Key 상세 페이지에서 최근 활동 확인  
- 의심스러운 활동 감지 시 알림

---

\\newpage

# 6\. 사용량 분석 (Usage Analytics)

## 6.1 사용량 대시보드

### 6.1.1 기간별 사용량

**표시 항목:**

- 총 API 호출 수  
- 성공/실패 비율  
- 평균 응답 시간  
- 토큰 사용량 (LLM 호출 시)

**기간 선택:**

- 오늘  
- 어제  
- 최근 7일  
- 최근 30일  
- 이번 달  
- 지난 달  
- 커스텀 범위

### 6.1.2 사용량 차트

**시계열 차트:**

- X축: 시간 (시간/일/주 단위)  
- Y축: API 호출 수  
- 라인: 성공, 실패 별도 표시

**파이 차트:**

- 엔드포인트별 사용 비율  
- 상태 코드별 비율

### 6.1.3 사용량 요약 테이블

| 엔드포인트 | 호출 수 | 성공률 | 평균 응답시간 | 비용 |
| :---- | :---- | :---- | :---- | :---- |
| /v1/match | 45,000 | 99.8% | 145ms | $180 |
| /v1/personas | 12,000 | 99.9% | 45ms | $12 |
| /v1/feedback | 8,000 | 99.7% | 32ms | $8 |

## 6.2 상세 분석

### 6.2.1 엔드포인트별 분석

**선택한 엔드포인트의 상세 지표:**

- 시간대별 호출 패턴  
- 응답 시간 분포 (히스토그램)  
- 에러 유형 분석  
- 상위 에러 메시지

### 6.2.2 응답 시간 분석

**백분위 지표:**

- P50 (Median)  
- P90  
- P95  
- P99

**시간대별 응답 시간 추이:**

- 피크 시간대 식별  
- 지연 발생 구간 탐지

### 6.2.3 에러 분석

**에러율 추이:**

- 시간대별 에러율 차트  
- 이상 탐지 (평소 대비 급증 시 표시)

**에러 유형별 분류:** | 에러 코드 | 설명 | 발생 수 | 비율 | |----------|------|--------|------| | 400 | Bad Request | 150 | 45% | | 401 | Unauthorized | 80 | 24% | | 429 | Rate Limited | 60 | 18% | | 500 | Server Error | 43 | 13% |

### 6.2.4 비용 분석

**비용 breakdown:**

- 엔드포인트별 비용  
- 일별 비용 추이  
- 예상 월말 비용

**비용 시뮬레이터:**

- 예상 사용량 입력 → 예상 비용 계산  
- 플랜별 비용 비교

## 6.3 리포트 생성

### 6.3.1 정기 리포트

**자동 생성:**

- 매일: 전일 사용량 요약  
- 매주: 주간 트렌드 분석  
- 매월: 월간 상세 리포트

**발송 설정:**

- 이메일 수신자 목록  
- 발송 시간 설정  
- 형식: PDF 또는 CSV

### 6.3.2 커스텀 리포트

**리포트 빌더:**

- 원하는 지표 선택  
- 기간 설정  
- 필터 적용 (엔드포인트, API Key 등)  
- 차트 포함 여부

**내보내기:**

- PDF: 시각화 포함  
- CSV: 원시 데이터  
- JSON: API 연동용

---

\\newpage

# 7\. API 로그 (API Logs)

## 7.1 실시간 로그

### 7.1.1 로그 스트림

**실시간 표시:**

\[14:30:15.123\] POST /v1/match  200  145ms  req\_abc123  pk\_live\_xxx...

\[14:30:15.456\] POST /v1/match  200  132ms  req\_def456  pk\_live\_xxx...

\[14:30:15.789\] POST /v1/feedback  201  45ms  req\_ghi789  pk\_live\_xxx...

\[14:30:16.012\] POST /v1/match  400  12ms  req\_jkl012  pk\_live\_xxx...

**컬럼:**

- 타임스탬프  
- HTTP 메서드  
- 엔드포인트  
- 상태 코드 (색상 구분: 2xx 녹색, 4xx 노란색, 5xx 빨간색)  
- 응답 시간  
- Request ID  
- API Key (마스킹)

### 7.1.2 로그 상세

**클릭 시 상세 정보:**

Request ID: req\_abc123

Timestamp: 2026-01-10 14:30:15.123 KST

Endpoint: POST /v1/match

Status: 200 OK

Duration: 145ms

API Key: pk\_live\_xxxx...xxxx (Production Server)

IP Address: 203.0.113.50

\[Request\]

Headers:

Content-Type: application/json

Authorization: Bearer sk\_live\_xxxx...

Body:

{

"user\\\_id": "user\\\_12345",

"context": {"category": "movie"}

}

\[Response\]

Headers:

X-Request-ID: req\_abc123

X-RateLimit-Remaining: 4999

Body:

{

"matches": \\\[

  {"persona\\\_id": "persona\\\_001", "score": 92.5}

\\\]

}

## 7.2 로그 검색 및 필터

### 7.2.1 필터 옵션

**기본 필터:**

- 기간: 시작\~종료 일시  
- 엔드포인트: 선택 또는 전체  
- 상태 코드: 2xx, 4xx, 5xx 또는 특정 코드  
- API Key: 선택 또는 전체

**고급 필터:**

- Request ID 검색  
- 응답 시간 범위 (예: 500ms 이상만)  
- IP 주소  
- Request/Response Body 내용 검색 (Pro 이상)

### 7.2.2 검색 쿼리

**지원 문법:**

status:400              \# 상태 코드 400

endpoint:/v1/match      \# 특정 엔드포인트

duration:\>500           \# 500ms 초과

ip:203.0.113.\*          \# IP 와일드카드

body:"user\_12345"       \# Body 내용 검색

**복합 검색:**

status:4xx AND endpoint:/v1/match AND duration:\>100

### 7.2.3 로그 내보내기

**형식:**

- JSON Lines (.jsonl)  
- CSV

**제한:**

- 한 번에 최대 10,000건  
- 30일 이내 로그만 내보내기 가능

## 7.3 에러 분석

### 7.3.1 에러 대시보드

**에러 요약:**

- 총 에러 수  
- 에러율 (전체 대비)  
- 가장 많은 에러 유형  
- 에러 추이 차트

### 7.3.2 에러 유형별 분석

**에러 그룹화:**

- 동일한 에러 메시지끼리 그룹화  
- 발생 빈도순 정렬

**에러 상세:** | 에러 | 발생 수 | 최근 발생 | 영향 API Key | |------|--------|----------|-------------| | Invalid user\_id format | 120 | 5분 전 | 3개 | | Rate limit exceeded | 80 | 2분 전 | 1개 | | Internal server error | 15 | 1시간 전 | 5개 |

### 7.3.3 에러 알림 설정

**트리거 조건:**

- 에러율 임계값 (예: 5% 이상)  
- 특정 에러 발생 시  
- 연속 에러 횟수 (예: 10회 연속)

**알림 채널:**

- 이메일  
- Slack  
- Webhook

---

\\newpage

# 8\. 결제 및 빌링 (Billing & Payment)

## 8.1 요금제 안내

### 8.1.1 플랜 비교

#### 기본 플랜 비교

| 항목 | Free | Starter | Pro | Enterprise |
| :---- | :---- | :---- | :---- | :---- |
| **상태** | ✅ 활성 | ✅ 활성 | ✅ 활성 | ⏸️ 준비 중 |
| **월 요금** | $0 | $49 | $199 | 협의 |
| **API 호출** | **3,000/월** | 50,000/월 | 500,000/월 | 무제한 |
| **일 평균 호출** | \~100회 | \~1,600회 | \~16,000회 | \- |
| **Rate Limit** | 10/분 | 100/분 | 1,000/분 | 협의 |
| **API Keys** | 2개 | 5개 | 20개 | 무제한 |
| **팀원** | 1명 | 3명 | 10명 | 무제한 |
| **지원** | 커뮤니티 | 이메일 | 우선 이메일 | 전담 매니저 |
| **SLA** | \- | 99.5% | 99.9% | 99.99% |
| **Webhook** | \- | ✅ | ✅ | ✅ |
| **SSO** | \- | \- | \- | ✅ |
| **IP 화이트리스트** | \- | \- | \- | ✅ |

※ Free 플랜 API 호출이 1,000 → **3,000/월**로 변경되었습니다. ※ Enterprise 플랜은 현재 준비 중이며, 출시 시기는 추후 공지됩니다.

#### 매칭 기능 비교 (신규)

| 매칭 기능 | Free | Starter | Pro | Enterprise |
| :---- | :---- | :---- | :---- | :---- |
| **벡터 매칭 (6D 코사인)** | ✅ | ✅ | ✅ | ✅ |
| **규칙 기반 가중치** | ✅ | ✅ | ✅ | ✅ |
| **스마트 캐싱** | ✅ | ✅ | ✅ | ✅ |
| **LLM 컨텍스트 분석** | 토큰 추가과금 | 토큰 추가과금 | ✅ **기본 포함** | ✅ 기본 포함 |
| **커스텀 가중치** | \- | \- | \- | ✅ |
| **예상 매칭 퀄리티** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**매칭 기능 설명:**

| 기능 | 설명 |
| :---- | :---- |
| **벡터 매칭** | 6차원 성향 벡터(논리-감성, 비판-지지, 창의-전통)를 기반으로 한 코사인 유사도 매칭 |
| **규칙 기반 가중치** | 콘텐츠 장르/카테고리에 따라 미리 정의된 가중치를 적용하여 매칭 정확도 향상 |
| **스마트 캐싱** | LLM 분석 결과를 캐싱하여 동일 콘텐츠 재요청 시 비용 및 지연 최소화 |
| **LLM 컨텍스트 분석** | 매 요청마다 LLM이 콘텐츠를 실시간 분석하여 동적으로 가중치 조정 |
| **커스텀 가중치** | 고객사가 직접 가중치 테이블을 정의하고 관리 |

### 8.1.2 초과 요금 (Overage)

**포함량 초과 시:**

| 플랜 | 초과 요금 |
| :---- | :---- |
| Free | 추가 호출 불가 (차단) |
| Starter | $0.002 / call |
| Pro | $0.001 / call |
| Enterprise | 협의 |

**토큰 기반 과금 (Free/Starter에서 LLM 컨텍스트 분석 사용 시):**

| 토큰 유형 | 단가 |
| :---- | :---- |
| 입력 토큰 | $0.00001 / token |
| 출력 토큰 | $0.00003 / token |

**LLM 컨텍스트 분석 예상 비용:**

- 1회당 약 250 tokens 사용  
- 예상 비용: **\~$0.00008 / call**

**Pro 플랜 사용자:** LLM 컨텍스트 분석이 기본 포함되어 추가 토큰 과금 없음

### 8.1.3 연간 결제 할인

| 플랜 | 월 결제 | 연간 결제 (월 환산) | 연간 총액 | 할인율 |
| :---- | :---- | :---- | :---- | :---- |
| Starter | $49/월 | $39/월 | $468/년 | 20% |
| Pro | $199/월 | $159/월 | $1,908/년 | 20% |

**연간 결제 혜택:**

- 20% 할인  
- Starter도 우선 이메일 지원  
- 가격 인상 면제 (결제 기간 동안)

### 8.1.4 매칭 기능 상세 (신규)

#### 8.1.4.1 매칭 레이어 구조

DeepSight의 매칭 시스템은 3개의 레이어로 구성됩니다:

┌─────────────────────────────────────────────────────────────┐

│  Layer 3: LLM 컨텍스트 분석                                  │

│  → 콘텐츠 특성을 LLM이 실시간 분석하여 동적 가중치 조정       │

│  → Pro 이상: 기본 포함 / Free·Starter: 토큰 추가과금         │

├─────────────────────────────────────────────────────────────┤

│  Layer 2: 규칙 기반 가중치                                   │

│  → 장르/카테고리별 사전 정의된 가중치 테이블 적용            │

│  → 모든 플랜: 기본 포함 (추가 비용 없음)                     │

├─────────────────────────────────────────────────────────────┤

│  Layer 1: 벡터 매칭                                         │

│  → 6차원 성향 벡터 기반 코사인 유사도 계산                   │

│  → 모든 플랜: 기본 포함 (추가 비용 없음)                     │

└─────────────────────────────────────────────────────────────┘

#### 8.1.4.2 플랜별 매칭 흐름

**Free / Starter 플랜 (기본):**

API 요청 → 벡터 매칭 → 규칙 기반 가중치 적용 → 결과 반환

**Free / Starter 플랜 (LLM 옵션 사용 시):**

API 요청 → 캐시 확인 → \[히트\] → 캐시된 LLM 가중치 적용 → 결과 반환

                  → \\\[미스\\\] → LLM 분석 (토큰 과금) → 캐시 저장 → 결과 반환

**Pro / Enterprise 플랜:**

API 요청 → 캐시 확인 → \[히트\] → 캐시된 LLM 가중치 적용 → 결과 반환

                  → \\\[미스\\\] → LLM 분석 (비용 포함) → 캐시 저장 → 결과 반환

#### 8.1.4.3 LLM 컨텍스트 분석 사용 방법

**API 요청 옵션:**

POST /v1/match

{

"user\_id": "user\_123",

"content": {

"title": "기생충",

"type": "movie",

"genre": \\\["drama", "thriller"\\\]

},

"options": {

"use\\\_llm\\\_context": true

}

}

**플랜별 동작:**

| 플랜 | use\_llm\_context: false | use\_llm\_context: true |
| :---- | :---- | :---- |
| Free | 벡터 \+ 규칙 매칭 | 벡터 \+ 규칙 \+ LLM (토큰 과금) |
| Starter | 벡터 \+ 규칙 매칭 | 벡터 \+ 규칙 \+ LLM (토큰 과금) |
| Pro | 벡터 \+ 규칙 \+ LLM | 벡터 \+ 규칙 \+ LLM (동일) |
| Enterprise | 벡터 \+ 규칙 \+ LLM | 벡터 \+ 규칙 \+ LLM (동일) |

※ Pro 이상에서는 `use_llm_context` 옵션과 관계없이 항상 LLM 분석이 적용됩니다.

#### 8.1.4.4 LLM 옵션 활성화 시 결제 수단 검증 ← **v2.5 신규**

⚠️ **Revenue Leak 방지:** Free/Starter 플랜 사용자가 LLM 옵션을 사용하면 토큰 과금이 발생합니다. 결제 수단이 없는 상태에서 과금이 발생하면 미수금 또는 무료 서비스 제공 위험이 있습니다.

**검증 흐름:**

\[API 호출: use\_llm\_context: true\]

↓

\[플랜 체크\]

↓

┌───┴───┐

Pro+    Free/Starter

↓           ↓

통과    \[결제 수단 등록 여부 체크\]

          ↓

    ┌─────┴─────┐

   YES          NO

    ↓            ↓

  통과      에러 반환 (402)

            "결제 수단 등록이 필요합니다"

**에러 응답 (결제 수단 미등록 시):**

{

"error": {

"code": "PAYMENT\\\_REQUIRED",

"message": "LLM 컨텍스트 분석 사용을 위해 결제 수단 등록이 필요합니다.",

"details": {

  "option": "use\\\_llm\\\_context",

  "action\\\_required": "register\\\_payment\\\_method",

  "console\\\_url": "https://console.deepsight.ai/billing/payment-methods"

}

}

}

**Developer Console UI 처리:**

┌─────────────────────────────────────────────────────────────────┐

│  ⚠️ 결제 수단 등록 필요                                         │

│                                                                 │

│  LLM 컨텍스트 분석 옵션을 사용하려면                            │

│  결제 수단을 먼저 등록해야 합니다.                              │

│                                                                 │

│  예상 비용: 약 $0.00008 / 요청                                  │

│                                                                 │

│  \[결제 수단 등록하기\]          \[취소\]                           │

└─────────────────────────────────────────────────────────────────┘

**적용 조건:**

| 플랜 | 결제 수단 필수 | LLM 옵션 사용 |
| :---- | :---- | :---- |
| Free | ✅ (LLM 사용 시) | 결제 수단 등록 후 가능 |
| Starter | ✅ (이미 등록됨) | 바로 사용 가능 |
| Pro | ✅ (이미 등록됨) | 기본 포함 |
| Enterprise | ✅ (이미 등록됨) | 기본 포함 |

※ Starter 이상은 유료 플랜이므로 이미 결제 수단이 등록되어 있습니다.

#### 8.1.4.5 스마트 캐싱

**작동 방식:**

- 동일 콘텐츠에 대한 LLM 분석 결과를 7일간 캐싱  
- 캐시 히트 시 LLM 호출 없이 즉시 결과 반환  
- 예상 캐시 히트율: 80% 이상

**장점:**

- 동일 콘텐츠 반복 요청 시 비용 절감  
- 응답 지연 최소화 (캐시 히트 시 \<10ms)  
- 모든 플랜에서 자동 적용

#### 8.1.4.6 매칭 퀄리티 비교

| 매칭 방식 | 예상 정확도 | 적용 플랜 |
| :---- | :---- | :---- |
| 벡터만 | 80% | \- |
| 벡터 \+ 규칙 | 88% | Free, Starter (기본) |
| 벡터 \+ 규칙 \+ LLM | 95% | Pro, Enterprise (기본) |

※ 정확도는 내부 테스트 기준이며, 실제 환경에서 차이가 있을 수 있습니다.

---

## 8.1.5 Enterprise 플랜 안내 (준비 중)

⚠️ **Enterprise 플랜은 현재 준비 중입니다.**

출시 시기는 추후 공지됩니다. Pro 플랜으로 먼저 시작하시고, 추가 요구사항이 있으시면 문의해 주세요.

### 예정 기능 (참고용)

| 항목 | 예정 사양 |
| :---- | :---- |
| 월 요금 | 협의 (예상 $2,000+) |
| API 호출 | 무제한 또는 대량 협의 |
| Rate Limit | 협의 |
| API Keys | 무제한 |
| 팀원 | 무제한 |
| 지원 | 전담 매니저 |
| SLA | 99.99% |
| SSO | ✅ (SAML 2.0, OIDC) |
| IP 화이트리스트 | ✅ |
| 커스텀 가중치 | ✅ |
| 온프레미스 | 협의 |

### 문의

**Enterprise 문의:** [enterprise@deepsight.ai](mailto:enterprise@deepsight.ai)

현재 Pro 플랜에서 제공하지 않는 기능이 필요하시다면 문의해 주세요.

---

## 8.2 결제 관리

### 8.2.1 결제 수단 등록

**지원 결제 수단:**

- 신용카드/체크카드 (Visa, Mastercard, Amex)  
- 계좌이체 (Enterprise)  
- PayPal (글로벌)

**카드 등록:**

- 카드 번호, 만료일, CVC 입력  
- 3D Secure 인증 (필요 시)  
- 기본 결제 수단 설정

### 8.2.2 결제 주기

**자동 결제:**

- 매월 1일 자동 청구  
- 결제 3일 전 이메일 알림  
- 결제 실패 시 3회 재시도 (3일 간격)

**결제 실패 시:**

1. 1차 실패: 이메일 알림  
2. 2차 실패: 이메일 \+ 대시보드 경고  
3. 3차 실패: 서비스 일시 정지 경고  
4. 7일 후: Free 플랜으로 다운그레이드

### 8.2.3 플랜 변경

**업그레이드:**

- 즉시 적용  
- 잔여 기간 비례 계산 (Pro-rata)  
- 다음 결제일에 새 플랜 요금 청구

**다운그레이드:**

- 현재 결제 주기 종료 후 적용  
- 포함량 초과분은 초과 요금 청구  
- 팀원/API Key 초과 시 조정 필요

### 8.2.4 플랜 해지

**해지 프로세스:**

1. Settings → Billing → Cancel Plan  
2. 해지 사유 선택 (선택)  
3. 확인: "현재 주기 종료 후 Free 플랜으로 전환됩니다"  
4. 결제 주기 종료일까지 서비스 이용 가능

**데이터 보존:**

- 해지 후 30일간 데이터 보존  
- 30일 후 영구 삭제 (복구 불가)  
- 요청 시 데이터 내보내기 제공

## 8.3 청구서 및 영수증

### 8.3.1 청구서 조회

**월별 청구서:**

- 청구 금액  
- 사용량 상세  
- 결제 수단  
- 결제 상태

**청구서 항목:**

DeepSight AI \- 월간 청구서

청구 기간: 2026년 1월 1일 \~ 2026년 1월 31일

\[기본 요금\]

Pro Plan                              $199.00

\[사용량 기반\]

API 호출 (500,000 포함)               포함

초과 호출 (23,456 calls)              $23.46

토큰 사용량 (1,234,567 tokens)        $24.69

\[합계\]

소계                                  $247.15

세금 (VAT 10%)                        $24.72

───────────────────────────────────────

총액                                  $271.87

### 8.3.2 영수증 다운로드

**형식:**

- PDF (공식 영수증)  
- CSV (회계 연동용)

**포함 정보:**

- 사업자 정보 (DeepSight AI Inc.)  
- 고객 정보 (회사명, 주소)  
- 상세 내역  
- 결제 일시  
- 세금 정보

### 8.3.3 세금 설정

**사업자 정보 등록:**

- 회사명  
- 사업자등록번호  
- 주소  
- 세금계산서 발행 요청 (국내)

**VAT/GST:**

- 지역에 따라 자동 계산  
- EU: VAT 적용  
- 한국: 부가세 10%  
- 미국: Sales Tax (주별)

---

\\newpage

# 9\. API 레퍼런스 (API Reference)

## 9.1 API 개요

### 9.1.1 Base URL

**Production:**

[https://api.deepsight.ai/v1](https://api.deepsight.ai/v1)

**Sandbox (테스트):**

[https://api-sandbox.deepsight.ai/v1](https://api-sandbox.deepsight.ai/v1)

### 9.1.2 요청 형식

**Content-Type:**

- `application/json` (기본)

**Character Encoding:**

- UTF-8

**요청 예시:**

POST /v1/match HTTP/1.1

Host: api.deepsight.ai

Authorization: Bearer sk\_live\_xxxxxxxxxxxxx

Content-Type: application/json

{

"user\_id": "user\_12345",

"context": {

"category": "movie",

"time\\\_of\\\_day": "evening"

}

}

### 9.1.3 응답 형식

**성공 응답:**

{

"success": true,

"data": {

// 응답 데이터

},

"meta": {

"request\\\_id": "req\\\_abc123",

"timestamp": "2026-01-10T14:30:00Z"

}

}

**에러 응답:**

{

"success": false,

"error": {

"code": "INVALID\\\_REQUEST",

"message": "user\\\_id is required",

"details": {

  "field": "user\\\_id"

}

},

"meta": {

"request\\\_id": "req\\\_abc123",

"timestamp": "2026-01-10T14:30:00Z"

}

}

## 9.2 인증 방식

### 9.2.1 API Key 인증

**Header 방식 (권장):**

Authorization: Bearer sk\_live\_xxxxxxxxxxxxx

**Query Parameter 방식 (비권장):**

[https://api.deepsight.ai/v1/match?api\\\_key=sk\\\_live\\\_xxxxxxxxxxxxx](https://api.deepsight.ai/v1/match?api\\_key=sk\\_live\\_xxxxxxxxxxxxx)

### 9.2.2 멀티테넌시 데이터 격리 ← v2.1 추가

⚠️ **중요:** API Key는 조직(Organization)에 귀속되며, 모든 API 호출은 해당 조직의 데이터에만 접근할 수 있습니다.

**자동 격리:**

- API Key 인증 시 `organization_id`가 자동으로 식별됩니다  
- 별도 파라미터 전달 없이 조직 데이터만 조회/수정됩니다  
- 다른 조직의 데이터에는 절대 접근할 수 없습니다

**페르소나 접근 범위:** | 페르소나 유형 | 접근 가능 여부 | |--------------|---------------| | GLOBAL (DeepSight 제공) | ✅ 모든 조직 | | PRIVATE (조직 전용) | ✅ 해당 조직만 | | SHARED (공유) | ✅ 공유 대상 조직만 | | 타 조직 PRIVATE | ❌ 접근 불가 |

**API 응답 예시:**

{

"success": true,

"data": {

"personas": \\\[

  {"id": "p\\\_001", "visibility": "GLOBAL"},

  {"id": "p\\\_002", "visibility": "PRIVATE"}

\\\]

},

"meta": {

"organization\\\_id": "org\\\_12345",

"filtered\\\_by": "organization"

}

}

### 9.2.3 인증 에러

**401 Unauthorized:**

{

"success": false,

"error": {

"code": "UNAUTHORIZED",

"message": "Invalid or missing API key"

}

}

**403 Forbidden:**

{

"success": false,

"error": {

"code": "FORBIDDEN",

"message": "API key does not have permission for this endpoint"

}

}

## 9.3 엔드포인트 명세

### 9.3.1 POST /v1/match

사용자에게 최적의 페르소나를 매칭합니다.

**Request:**

{

"user\_id": "string (required)",

"context": {

"category": "string (optional)",

"time\\\_of\\\_day": "string (optional)",

"device": "string (optional)",

"custom": {}

},

"options": {

"top\\\_n": "integer (default: 5)",

"include\\\_score": "boolean (default: true)",

"include\\\_explanation": "boolean (default: false)"

}

}

**Response:**

{

"success": true,

"data": {

"matches": \\\[

  {

    "persona\\\_id": "persona\\\_12345",

    "persona\\\_name": "논리적 평론가",

    "score": 92.5,

    "explanation": "논리적 성향이 높은 사용자에게 적합"

  },

  {

    "persona\\\_id": "persona\\\_12346",

    "persona\\\_name": "분석가",

    "score": 87.3

  }

\\\],

"user\\\_archetype": "Analyst"

},

"meta": {

"request\\\_id": "req\\\_abc123",

"processing\\\_time\\\_ms": 145

}

}

**Rate Limit:**

- Free: 10/분  
- Starter: 100/분  
- Pro: 1,000/분

---

### 9.3.2 GET /v1/personas

사용 가능한 페르소나 목록을 조회합니다.

**Query Parameters:** | 파라미터 | 타입 | 설명 | 기본값 | |---------|------|------|--------| | role | string | 역할 필터 | all | | expertise | string | 전문 분야 필터 | all | | page | integer | 페이지 번호 | 1 | | limit | integer | 페이지당 개수 | 20 |

**Response:**

{

"success": true,

"data": {

"personas": \\\[

  {

    "id": "persona\\\_12345",

    "name": "논리적 평론가",

    "role": "Reviewer",

    "expertise": \\\["영화", "드라마"\\\],

    "description": "영화를 분석적으로 평가하는 평론가"

  }

\\\]

},

"meta": {

"pagination": {

  "current\\\_page": 1,

  "total\\\_pages": 5,

  "total\\\_count": 98

}

}

}

---

### 9.3.3 GET /v1/personas/{id}

특정 페르소나의 상세 정보를 조회합니다.

**Response:**

{

"success": true,

"data": {

"id": "persona\\\_12345",

"name": "논리적 평론가",

"role": "Reviewer",

"expertise": \\\["영화", "드라마"\\\],

"description": "영화를 분석적으로 평가하는 평론가",

"vector": {

  "depth": 0.85,

  "lens": 0.90,

  "stance": 0.75,

  "scope": 0.80,

  "taste": 0.35,

  "purpose": 0.70

},

"confidence\\\_scores": {

  "depth": 0.92,

  "lens": 0.88,

  "stance": 0.85,

  "scope": 0.90,

  "taste": 0.78,

  "purpose": 0.82

}

}

}

---

### 9.3.4 POST /v1/feedback

사용자 피드백을 전송합니다.

**Request:**

{

"user\_id": "string (required)",

"persona\_id": "string (required)",

"feedback\_type": "LIKE | DISLIKE (required)",

"content\_id": "string (optional)",

"comment": "string (optional)"

}

**Response:**

{

"success": true,

"data": {

"feedback\\\_id": "fb\\\_xyz789",

"processed": true

}

}

---

### 9.3.5 GET /v1/users/{id}/profile

사용자 프로필 및 벡터를 조회합니다.

**Response:** ← **v3.0 벡터 필드 변경**

{

"success": true,

"data": {

"user\\\_id": "user\\\_12345",

"archetype": "Balanced Explorer",

"onboarding\\\_level": "STANDARD",

"vector": {

  "depth": 0.6,

  "lens": 0.4,

  "stance": 0.4,

  "scope": 0.5,

  "taste": 0.6,

  "purpose": 0.5

},

"confidence\\\_scores": {

  "depth": 0.85,

  "lens": 0.72,

  "stance": 0.68,

  "scope": 0.90,

  "taste": 0.75,

  "purpose": 0.60

},

"feedback\\\_count": 45,

"created\\\_at": "2026-01-01T00:00:00Z",

"last\\\_active\\\_at": "2026-01-10T14:30:00Z"

}

}

---

### 9.3.6 POST /v1/users/{id}/onboarding

사용자 온보딩 응답을 제출합니다.

**Request:**

{

"level": "QUICK | STANDARD | DEEP",

"responses": \[

{

  "question\\\_id": "q\\\_001",

  "answer": "A"

},

{

  "question\\\_id": "q\\\_002",

  "answer": 0.7

}

\]

}

**Response:**

{

"success": true,

"data": {

"user\\\_id": "user\\\_12345",

"archetype": "Analyst",

"vector\\\_updated": true,

"recommended\\\_personas": \\\[

  {"persona\\\_id": "persona\\\_12345", "score": 95.0}

\\\]

}

}

---

### 9.3.7 POST /v1/multimodal/analyze ← v2.1 추가 (Phase 2\)

멀티모달 콘텐츠(영상, 이미지, 오디오)를 분석합니다.

⚠️ **비동기 API:** 이 엔드포인트는 처리 시간이 길어 **비동기 방식**으로 동작합니다.

**Request:**

{

"content\_type": "video | image | audio",

"source\_url": "[https://youtube.com/watch?v=](https://youtube.com/watch?v=)...",

"analysis\_options": {

"extract\\\_text": true,

"extract\\\_sentiment": true,

"generate\\\_summary": true

}

}

**Response (202 Accepted):**

{

"success": true,

"data": {

"job\\\_id": "job\\\_abc123",

"status": "QUEUED",

"estimated\\\_seconds": 120,

"polling\\\_url": "/v1/multimodal/jobs/job\\\_abc123",

"websocket\\\_url": "wss://api.deepsight.ai/ws/jobs/job\\\_abc123"

}

}

---

### 9.3.8 GET /v1/multimodal/jobs/{job\_id} ← v2.1 추가

비동기 작업 상태를 조회합니다.

**Response (처리 중):**

{

"success": true,

"data": {

"job\\\_id": "job\\\_abc123",

"status": "PROCESSING",

"progress": 0.65,

"current\\\_step": "STT 변환 중...",

"started\\\_at": "2026-01-10T14:30:00Z"

}

}

**Response (완료):**

{

"success": true,

"data": {

"job\\\_id": "job\\\_abc123",

"status": "COMPLETED",

"result": {

  "transcript": "영상 내용 텍스트...",

  "sentiment": {"positive": 0.7, "negative": 0.1, "neutral": 0.2},

  "summary": "영상 요약 내용..."

},

"completed\\\_at": "2026-01-10T14:32:15Z",

"processing\\\_time\\\_ms": 135000

}

}

**작업 상태:** | 상태 | 설명 | |------|------| | QUEUED | 대기열에 추가됨 | | PROCESSING | 처리 중 | | COMPLETED | 완료 | | FAILED | 실패 | | TIMEOUT | 시간 초과 (10분) |

**WebSocket 실시간 알림:**

const ws \= new WebSocket('wss://api.deepsight.ai/ws/jobs/job\_abc123');

ws.onmessage \= (event) \=\> {

const data \= JSON.parse(event.data);

console.log(\`Status: ${data.status}, Progress: ${data.progress}\`);

if (data.status \=== 'COMPLETED') {

console.log('Result:', data.result);

ws.close();

}

};

## 9.4 에러 코드

### 9.4.1 HTTP 상태 코드

| 코드 | 설명 |
| :---- | :---- |
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 429 | Rate Limit 초과 |
| 500 | 서버 오류 |
| 503 | 서비스 일시 중단 |

### 9.4.2 에러 코드 상세

| 코드 | HTTP | 설명 | 해결 방법 |
| :---- | :---- | :---- | :---- |
| INVALID\_REQUEST | 400 | 요청 형식 오류 | 요청 본문 확인 |
| MISSING\_FIELD | 400 | 필수 필드 누락 | 누락된 필드 추가 |
| INVALID\_FIELD | 400 | 필드 값 오류 | 값 형식 확인 |
| UNAUTHORIZED | 401 | API Key 오류 | Key 확인 |
| KEY\_EXPIRED | 401 | API Key 만료 | 새 Key 발급 |
| FORBIDDEN | 403 | 권한 없음 | 권한 설정 확인 |
| NOT\_FOUND | 404 | 리소스 없음 | ID 확인 |
| RATE\_LIMITED | 429 | 호출 한도 초과 | 잠시 후 재시도 |
| QUOTA\_EXCEEDED | 429 | 월간 한도 초과 | 플랜 업그레이드 |
| SERVER\_ERROR | 500 | 서버 오류 | 재시도 또는 문의 |

### 9.4.3 Rate Limit 응답 헤더

X-RateLimit-Limit: 100

X-RateLimit-Remaining: 95

X-RateLimit-Reset: 1704892800

**Rate Limit 초과 시:**

{

"success": false,

"error": {

"code": "RATE\\\_LIMITED",

"message": "Rate limit exceeded. Retry after 60 seconds.",

"retry\\\_after": 60

}

}

---

\\newpage

# 10\. Webhook 연동 (Webhook Integration) ← v2.0 신규

## 10.1 Webhook 개요

### 10.1.1 Webhook이란?

Webhook은 특정 이벤트 발생 시 DeepSight가 고객사 서버로 HTTP POST 요청을 보내는 방식입니다.

**사용 사례:**

- 사용량 임계값 도달 알림  
- 결제 상태 변경 알림  
- 신규 페르소나 추가 알림  
- 시스템 장애 알림

**장점:**

- 폴링(polling) 불필요  
- 실시간 이벤트 수신  
- 자동화 파이프라인 구축 가능

### 10.1.2 Webhook 아키텍처

\[DeepSight AI\]

  │

  │ 이벤트 발생

  ▼

\[Webhook Queue\]

  │

  │ HTTP POST

  ▼

\[고객사 Endpoint\]

  │

  │ 200 OK

  ▼

\[전송 완료\]

### 10.1.3 요구사항

**Endpoint 요구사항:**

- HTTPS 필수 (HTTP 지원 안 함)  
- 5초 내 응답 (타임아웃)  
- 2xx 상태 코드로 응답

## 10.2 이벤트 유형

### 10.2.1 사용량 이벤트

**usage.threshold.reached**

{

"event\_id": "evt\_abc123",

"event\_type": "usage.threshold.reached",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"threshold\\\_type": "api\\\_calls",

"threshold\\\_value": 80,

"current\\\_value": 40250,

"limit": 50000,

"percentage": 80.5

}

}

**usage.quota.exceeded**

{

"event\_id": "evt\_def456",

"event\_type": "usage.quota.exceeded",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"quota\\\_type": "monthly\\\_api\\\_calls",

"limit": 50000,

"current": 50001,

"overage": 1,

"overage\\\_cost": 0.002

}

}

### 10.2.2 결제 이벤트

**billing.payment.succeeded**

{

"event\_id": "evt\_ghi789",

"event\_type": "billing.payment.succeeded",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"invoice\\\_id": "inv\\\_12345",

"amount": 271.87,

"currency": "USD",

"plan": "Pro",

"payment\\\_method": "card\\\_\\\*\\\*\\\*\\\*1234"

}

}

**billing.payment.failed**

{

"event\_id": "evt\_jkl012",

"event\_type": "billing.payment.failed",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"invoice\\\_id": "inv\\\_12345",

"amount": 271.87,

"currency": "USD",

"failure\\\_reason": "card\\\_declined",

"retry\\\_count": 1,

"next\\\_retry\\\_at": "2026-01-13T14:30:00Z"

}

}

**billing.plan.changed**

{

"event\_id": "evt\_mno345",

"event\_type": "billing.plan.changed",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"previous\\\_plan": "Starter",

"new\\\_plan": "Pro",

"effective\\\_date": "2026-01-10T14:30:00Z",

"prorated\\\_amount": 75.00

}

}

### 10.2.3 시스템 이벤트

**system.maintenance.scheduled**

{

"event\_id": "evt\_pqr678",

"event\_type": "system.maintenance.scheduled",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"maintenance\\\_start": "2026-01-15T02:00:00Z",

"maintenance\\\_end": "2026-01-15T04:00:00Z",

"affected\\\_services": \\\["api.deepsight.ai"\\\],

"description": "정기 유지보수"

}

}

**system.incident.created**

{

"event\_id": "evt\_stu901",

"event\_type": "system.incident.created",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"incident\\\_id": "inc\\\_12345",

"severity": "minor",

"title": "API 응답 지연 증가",

"status\\\_page\\\_url": "https://status.deepsight.ai/incidents/inc\\\_12345"

}

}

### 10.2.4 API 이벤트

**api.key.created**

{

"event\_id": "evt\_vwx234",

"event\_type": "api.key.created",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"key\\\_id": "key\\\_12345",

"key\\\_name": "Production Server",

"environment": "live",

"created\\\_by": "user@company.com"

}

}

**api.key.revoked**

{

"event\_id": "evt\_yz0567",

"event\_type": "api.key.revoked",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"key\\\_id": "key\\\_12345",

"key\\\_name": "Production Server",

"revoked\\\_by": "admin@company.com",

"reason": "security\\\_concern"

}

}

### 10.2.5 페르소나 이벤트 ← v2.1 추가

**persona.activated**

{

"event\_id": "evt\_per001",

"event\_type": "persona.activated",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"persona\\\_id": "persona\\\_12345",

"persona\\\_name": "트렌디 큐레이터",

"visibility": "GLOBAL"

}

}

**persona.deprecated**

{

"event\_id": "evt\_per002",

"event\_type": "persona.deprecated",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"persona\\\_id": "persona\\\_12345",

"persona\\\_name": "오래된 평론가",

"reason": "zombie\\\_cleanup",

"replacement\\\_suggestion": "persona\\\_67890"

}

}

**persona.updated**

{

"event\_id": "evt\_per003",

"event\_type": "persona.updated",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"persona\\\_id": "persona\\\_12345",

"changes": \\\["prompt\\\_template", "vector"\\\],

"version": "v1.2.0"

}

}

### 10.2.6 비동기 작업 이벤트 ← v2.1 추가

**job.completed**

{

"event\_id": "evt\_job001",

"event\_type": "job.completed",

"timestamp": "2026-01-10T14:32:15Z",

"data": {

"job\\\_id": "job\\\_abc123",

"job\\\_type": "multimodal\\\_analysis",

"status": "COMPLETED",

"processing\\\_time\\\_ms": 135000,

"result\\\_url": "/v1/multimodal/jobs/job\\\_abc123"

}

}

**job.failed**

{

"event\_id": "evt\_job002",

"event\_type": "job.failed",

"timestamp": "2026-01-10T14:35:00Z",

"data": {

"job\\\_id": "job\\\_def456",

"job\\\_type": "multimodal\\\_analysis",

"status": "FAILED",

"error\\\_code": "CONTENT\\\_TOO\\\_LONG",

"error\\\_message": "Video exceeds maximum duration of 30 minutes"

}

}

## 10.3 Webhook 설정

### 10.3.1 Endpoint 등록

**설정 UI:**

1. Developer Console → Webhooks → Add Endpoint  
2. Endpoint URL 입력 (HTTPS 필수)  
3. 수신할 이벤트 유형 선택  
4. (선택) Secret Key 설정 (서명 검증용)  
5. 저장

**Endpoint 설정:**

{

"url": "[https://your-server.com/webhooks/deepsight](https://your-server.com/webhooks/deepsight)",

"events": \[

"usage.threshold.reached",

"billing.payment.failed",

"system.incident.created"

\],

"secret": "whsec\_xxxxxxxxxxxxx",

"active": true

}

### 10.3.2 서명 검증

**서명 생성:**

- DeepSight는 각 Webhook 요청에 서명을 포함  
- Header: `X-DeepSight-Signature`  
- 알고리즘: HMAC-SHA256

**검증 코드 (Python):**

import hmac

import hashlib

def verify\_signature(payload, signature, secret):

expected \\= hmac.new(

    secret.encode(),

    payload.encode(),

    hashlib.sha256

).hexdigest()

return hmac.compare\\\_digest(f"sha256={expected}", signature)

\# 사용 예

payload \= request.body

signature \= request.headers.get('X-DeepSight-Signature')

secret \= "whsec\_xxxxxxxxxxxxx"

if verify\_signature(payload, signature, secret):

\\\# 유효한 요청 처리

process\\\_webhook(payload)

else:

\\\# 서명 불일치 \\- 거부

return Response(status=401)

**검증 코드 (Node.js):**

const crypto \= require('crypto');

function verifySignature(payload, signature, secret) {

const expected \= crypto

.createHmac('sha256', secret)

.update(payload)

.digest('hex');

return crypto.timingSafeEqual(

Buffer.from(\\\`sha256=${expected}\\\`),

Buffer.from(signature)

);

}

### 10.3.3 재시도 정책

**재시도 조건:**

- 응답 없음 (타임아웃)  
- 5xx 상태 코드  
- 네트워크 오류

**재시도 스케줄:** | 시도 | 대기 시간 | |------|----------| | 1차 | 즉시 | | 2차 | 1분 후 | | 3차 | 5분 후 | | 4차 | 30분 후 | | 5차 | 2시간 후 |

**최대 재시도 후:**

- 이벤트 실패로 기록  
- 이메일 알림 발송  
- Webhook 로그에서 수동 재전송 가능

### 10.3.4 Webhook 테스트

**테스트 이벤트 전송:**

1. Webhooks 페이지에서 Endpoint 선택  
2. \[Send Test Event\] 클릭  
3. 이벤트 유형 선택  
4. 테스트 이벤트 전송  
5. 응답 확인

**테스트 이벤트 예시:**

{

"event\_id": "evt\_test\_12345",

"event\_type": "test.webhook",

"timestamp": "2026-01-10T14:30:00Z",

"data": {

"message": "This is a test webhook event"

}

}

### 10.3.5 Webhook 로그

**로그 정보:**

- 이벤트 ID  
- 이벤트 유형  
- 전송 시간  
- 응답 상태 코드  
- 응답 시간  
- 재시도 횟수

**필터:**

- 기간  
- 이벤트 유형  
- 상태 (성공/실패)  
- Endpoint

---

\\newpage

# 11\. SDK 및 통합 가이드 (SDK & Integration Guide) ← v2.0 신규

## 11.1 공식 SDK

### 11.1.1 지원 언어

| 언어 | 패키지 | 버전 | 상태 |
| :---- | :---- | :---- | :---- |
| Python | `deepsight-python` | 1.2.0 | Stable |
| Node.js | `@deepsight/sdk` | 1.2.0 | Stable |
| Java | `com.deepsight:sdk` | 1.2.0 | Stable |
| Go | `github.com/deepsight/go-sdk` | 1.2.0 | Stable |
| Ruby | `deepsight` | 1.2.0 | Beta |
| PHP | `deepsight/sdk` | 1.2.0 | Beta |

### 11.1.2 Python SDK

**설치:**

pip install deepsight-python

**초기화:**

from deepsight import DeepSight

client \= DeepSight(api\_key="sk\_live\_xxxxxxxxxxxxx")

**매칭 요청:**

\# 기본 매칭

result \= client.match(

user\\\_id="user\\\_12345",

context={"category": "movie"}

)

for match in result.matches:

print(f"{match.persona\\\_name}: {match.score}")

\# 옵션 추가

result \= client.match(

user\\\_id="user\\\_12345",

context={"category": "movie", "time\\\_of\\\_day": "evening"},

top\\\_n=3,

include\\\_explanation=True

)

**페르소나 조회:**

\# 목록 조회

personas \= client.personas.list(role="Reviewer")

\# 상세 조회

persona \= client.personas.get("persona\_12345")

**피드백 전송:**

client.feedback.create(

user\\\_id="user\\\_12345",

persona\\\_id="persona\\\_12345",

feedback\\\_type="LIKE"

)

**에러 처리:**

from deepsight.exceptions import (

AuthenticationError,

RateLimitError,

APIError

)

try:

result \\= client.match(user\\\_id="user\\\_12345")

except AuthenticationError:

print("API Key가 유효하지 않습니다")

except RateLimitError as e:

print(f"Rate limit 초과. {e.retry\\\_after}초 후 재시도")

except APIError as e:

print(f"API 오류: {e.message}")

### 11.1.3 Node.js SDK

**설치:**

npm install @deepsight/sdk

**초기화:**

const DeepSight \= require('@deepsight/sdk');

const client \= new DeepSight({

apiKey: 'sk\_live\_xxxxxxxxxxxxx'

});

**매칭 요청:**

// 기본 매칭

const result \= await client.match({

userId: 'user\_12345',

context: { category: 'movie' }

});

result.matches.forEach(match \=\> {

console.log(\`${match.personaName}: ${match.score}\`);

});

// Promise 체이닝

client.match({ userId: 'user\_12345' })

.then(result \=\> console.log(result))

.catch(error \=\> console.error(error));

**TypeScript 지원:**

import DeepSight, { MatchResult, Persona } from '@deepsight/sdk';

const client \= new DeepSight({ apiKey: process.env.DEEPSIGHT\_API\_KEY });

const result: MatchResult \= await client.match({

userId: 'user\_12345'

});

### 11.1.4 Java SDK

**설치 (Maven):**

\<dependency\>

\<groupId\>com.deepsight\</groupId\>

\<artifactId\>sdk\</artifactId\>

\<version\>1.2.0\</version\>

\</dependency\>

**사용:**

import com.deepsight.DeepSight;

import com.deepsight.model.MatchResult;

DeepSight client \= DeepSight.builder()

.apiKey("sk\\\_live\\\_xxxxxxxxxxxxx")

.build();

MatchResult result \= client.match()

.userId("user\\\_12345")

.context(Map.of("category", "movie"))

.execute();

result.getMatches().forEach(match \-\> {

System.out.printf("%s: %.2f%n", 

    match.getPersonaName(), 

    match.getScore());

});

### 11.1.5 Go SDK

**설치:**

go get github.com/deepsight/go-sdk

**사용:**

package main

import (

"fmt"

deepsight "github.com/deepsight/go-sdk"

)

func main() {

client := deepsight.NewClient("sk\\\_live\\\_xxxxxxxxxxxxx")

result, err := client.Match(\\\&deepsight.MatchRequest{

    UserID:  "user\\\_12345",

    Context: map\\\[string\\\]interface{}{"category": "movie"},

})

if err \\\!= nil {

    panic(err)

}

for \\\_, match := range result.Matches {

    fmt.Printf("%s: %.2f\\\\n", match.PersonaName, match.Score)

}

}

## 11.2 통합 가이드

### 11.2.1 빠른 시작 (Quick Start)

**1\. API Key 발급**

- Developer Console 로그인  
- API Keys 메뉴 → 새 Key 생성  
- Secret Key 안전하게 저장

**2\. SDK 설치**

pip install deepsight-python  \# Python

npm install @deepsight/sdk    \# Node.js

**3\. 환경변수 설정**

export DEEPSIGHT\_API\_KEY=sk\_live\_xxxxxxxxxxxxx

**4\. 첫 API 호출**

from deepsight import DeepSight

import os

client \= DeepSight(api\_key=os.environ\['DEEPSIGHT\_API\_KEY'\])

result \= client.match(user\_id="user\_12345")

print(result.matches\[0\].persona\_name)

### 11.2.2 사용자 온보딩 통합 ← **v2.3 개편**

**온보딩 모드:**

| 모드 | 질문 수 | 소요 시간 | 초기 정밀도 | 90% 달성 |
| :---- | :---- | :---- | :---- | :---- |
| **QUICK** | 12개 | 1.5분 | 50-55% | D+90 |
| **STANDARD** | 30개 | 4분 | 60-68% | D+45 |
| **DEEP** | 60개 | 8분 | 70-78% | D+30 |

**온보딩 플로우:**

\[앱 첫 실행\]

  ↓

\[모드 선택 화면 표시\] ← 경고 문구 포함

  ↓

\[DeepSight 온보딩 질문 조회\]

  ↓

\[사용자에게 질문 표시 (강제 선택 방식)\]

  ↓

\[응답 수집\]

  ↓

\[DeepSight에 응답 제출\]

  ↓

\[사용자 프로파일 \+ 유형 결과 표시\]

**구현 예시:**

\# 1\. 온보딩 모드 선택 UI (앱에서 구현)

\# ⚠️ QUICK 선택 시 경고: "매일 3개씩 답하면 90일 후 90% 달성"

\# ✅ DEEP 선택 시 안내: "가장 빠르게 정확한 추천을 받을 수 있어요\!"

\# 2\. 온보딩 질문 조회

questions \= client.onboarding.get\_questions(

level="DEEP"  \\\# QUICK | STANDARD | DEEP

)

\# 3\. 사용자에게 표시하고 응답 수집 (앱 UI에서)

\# ⚠️ 슬라이더 대신 강제 선택(A/B) UI 사용 권장

responses \= collect\_user\_responses(questions)

\# 4\. 응답 제출

result \= client.users.submit\_onboarding(

user\\\_id="user\\\_12345",

level="DEEP",

responses=responses

)

\# 5\. 결과 확인

print(f"유형: {result.user\_type}")           \# 예: "분석적 탐험가 (LCV)"

print(f"초기 정밀도: {result.precision}%")   \# 예: 74

print(f"90% 예상일: D+{result.days\_to\_90}")  \# 예: 28

print(f"추천 페르소나: {result.recommended\_personas}")

**온보딩 결과 응답:**

{

"user\_id": "user\_12345",

"level": "DEEP",

"user\_type": {

"code": "LCV",

"name": "분석적 탐험가",

"name\\\_en": "Analytical Explorer",

"description": "논리적 시선으로 새로운 작품을 발굴하는 까다롭지만 열린 마음의 감상자"

},

"precision": {

"current": 74,

"target": 90,

"days\\\_to\\\_target": 28

},

"vector": {

"depth": 0.72,

"lens": 0.68,

"stance": 0.45,

"scope": 0.55,

"taste": 0.62,

"purpose": 0.58

},

"confidence": {

"depth": 0.85,

"lens": 0.82,

"stance": 0.72,

"scope": 0.78,

"taste": 0.65,

"purpose": 0.70

},

"recommended\_personas": \[

{"id": "persona\\\_001", "name": "시네필 평론가", "score": 92},

{"id": "persona\\\_002", "name": "트렌드 분석가", "score": 87}

\]

}

### 11.2.3 데일리 성향 체크 통합 ← **v2.3 신규**

**데일리 체크 플로우:**

\[매일 앱 실행 시\]

  ↓

\[데일리 질문 조회 (3개)\]

  ↓

\[사용자에게 질문 표시\]

  ↓

\[응답 제출\]

  ↓

\[크레딧 지급 \+ 정밀도 업데이트\]

**구현 예시:**

\# 1\. 오늘의 질문 조회

daily \= client.daily\_check.get\_questions(user\_id="user\_12345")

if daily.completed\_today:

print("오늘 이미 완료했습니다\\\!")

else:

\\\# 2\\. 질문 표시 (3개)

for q in daily.questions:

    print(f"Q. {q.text}")

    print(f"  A) {q.option\\\_a}")

    print(f"  B) {q.option\\\_b}")

    print(f"  측정 축: {q.axis} (현재 확신도: {q.axis\\\_confidence}%)")

\\\# 3\\. 응답 수집 및 제출

responses \\= collect\\\_responses(daily.questions)

result \\= client.daily\\\_check.submit(

    user\\\_id="user\\\_12345",

    responses=responses

)

\\\# 4\\. 결과 확인

print(f"크레딧 획득: \\+{result.credits\\\_earned}")

print(f"총 크레딧: {result.total\\\_credits}")

print(f"정밀도: {result.precision\\\_before}% → {result.precision\\\_after}%")

print(f"연속 일수: {result.streak}일")

**데일리 체크 응답:**

{

"user\_id": "user\_12345",

"completed\_at": "2025-01-15T09:30:00Z",

"responses\_valid": true,

"validation\_issues": \[\],

"credits\_earned": 1,

"total\_credits": 23,

"streak": 15,

"precision\_before": 76,

"precision\_after": 78,

"next\_milestone": {

"target\\\_precision": 80,

"estimated\\\_days": 5

},

"rewards": \[

{"type": "daily\\\_complete", "credits": 1}

\]

}

**불성실 응답 처리:**

\# 응답이 너무 빠르거나 일관성 없으면 validation\_issues 발생

result \= client.daily\_check.submit(user\_id="user\_12345", responses=responses)

if result.validation\_issues:

for issue in result.validation\\\_issues:

    if issue.type \\== "too\\\_fast":

        print("⚠️ 천천히 읽고 답해주세요")

    elif issue.type \\== "inconsistent":

        print("⚠️ 이전 답변과 다른데, 다시 생각해보세요")

\\\# 크레딧 미지급 또는 감소

print(f"크레딧: {result.credits\\\_earned} (검증 실패로 감소)")

### 11.2.4 정밀도 조회 API ← **v2.3 신규**

\# 사용자 정밀도 상세 조회

precision \= client.users.get\_precision(user\_id="user\_12345")

print(f"전체 정밀도: {precision.current}%")

print(f"신뢰도 점수: {precision.trust\_score}")

\# 축별 상세

for axis, conf in precision.by\_axis.items():

print(f"  {axis}: {conf}%")

\# 데이터 구성

print(f"온보딩 질문: {precision.data\_sources.onboarding\_count}개")

print(f"데일리 체크: {precision.data\_sources.daily\_count}개")

print(f"행동 데이터: {precision.data\_sources.behavior\_count}건")

print(f"피드백: {precision.data\_sources.feedback\_count}개")

\# 목표 달성 예상

print(f"90% 예상일: D+{precision.days\_to\_90}")

**정밀도 응답:** ← **v3.0 개편**

{

"user\_id": "user\_12345",

"current": 78,

"trust\_score": 0.92,

"by\_dimension": {

"depth": 92,

"lens": 85,

"stance": 71,

"scope": 78,

"taste": 62,

"purpose": 80

},

"lowest\_dimension": "taste",

"data\_sources": {

"onboarding\\\_count": 60,

"daily\\\_count": 45,

"behavior\\\_count": 127,

"feedback\\\_count": 12

},

"days\_since\_onboarding": 15,

"days\_to\_90": 13

}

### 11.2.5 매칭 통합

**기본 매칭:**

\# 사용자가 콘텐츠 페이지 방문 시

result \= client.match(

user\\\_id=current\\\_user.id,

context={

    "category": content.category,

    "content\\\_id": content.id

}

)

\# 최적의 페르소나로 리뷰 생성

best\_persona \= result.matches\[0\]

review \= generate\_review(content, best\_persona)

**컨텍스트 활용:**

from datetime import datetime

\# 시간대, 디바이스 등 컨텍스트 전달

result \= client.match(

user\\\_id=current\\\_user.id,

context={

    "category": "movie",

    "time\\\_of\\\_day": "evening" if datetime.now().hour \\\>= 18 else "daytime",

    "device": request.user\\\_agent.platform,  \\\# mobile, desktop

    "mood": user\\\_selected\\\_mood  \\\# 사용자가 선택한 기분

}

)

### 11.2.4 피드백 루프 통합

**피드백 수집:**

\# 사용자가 Like 버튼 클릭 시

@app.route('/feedback', methods=\['POST'\])

def submit\_feedback():

client.feedback.create(

    user\\\_id=current\\\_user.id,

    persona\\\_id=request.json\\\['persona\\\_id'\\\],

    feedback\\\_type=request.json\\\['type'\\\],  \\\# LIKE or DISLIKE

    content\\\_id=request.json.get('content\\\_id')

)

return {'success': True}

**피드백 UI 예시:**

\<div class="review-feedback"\>

\<p\>이 리뷰가 도움이 되었나요?\</p\>

\<button onclick="sendFeedback('LIKE')"\>👍 도움돼요\</button\>

\<button onclick="sendFeedback('DISLIKE')"\>👎 별로예요\</button\>

\</div\>

\<script\>

async function sendFeedback(type) {

await fetch('/feedback', {

method: 'POST',

body: JSON.stringify({

  persona\\\_id: '{{ persona.id }}',

  type: type,

  content\\\_id: '{{ content.id }}'

})

});

}

\</script\>

### 11.2.5 콘텐츠 리뷰 조회 ← **v2.3 신규**

**핵심 기능:** 페르소나의 콘텐츠 평가(평점 \+ 리뷰) 조회

**스타일 기반 2단계 생성:**

1단계: 페르소나 → 스타일 매핑 (12개 중 1개)

2단계: 스타일 리뷰 조회 (캐시) \+ 페르소나 말투 변환

→ 스타일 리뷰가 DB에 있으면 캐시 히트 (비용 $0)

→ 없으면 생성 후 저장 ($0.002), 다음부터는 캐시

→ 수백 개 페르소나가 12개 스타일로 그룹화되어 히트율 급상승\!

**구현 예시:**

\# 1\. 사용자가 콘텐츠 페이지 방문 시

\# 먼저 매칭된 페르소나 확인

match\_result \= client.match(user\_id=current\_user.id)

matched\_persona \= match\_result.matches\[0\]

\# 2\. 해당 페르소나의 콘텐츠 리뷰 조회

review \= client.reviews.get(

persona\\\_id=matched\\\_persona.id,

content\\\_id="movie\\\_12345",

content\\\_type="movie",

content\\\_metadata={  \\\# 리뷰 없을 시 생성에 사용

    "title": "기생충",

    "genre": "드라마/스릴러",

    "synopsis": "전원백수로 살길 막막하지만..."

},

transform\\\_style="template"  \\\# 'template' (빠름) | 'llm' (자연스러움)

)

\# 3\. 결과 확인

print(f"스타일 ID: {review.style\_id}")        \# S01

print(f"스타일 캐시 히트: {review.style\_cache\_hit}")  \# True

print(f"평점: {review.rating}")               \# 4.8

print(f"리뷰: {review.text}")                 \# 페르소나 말투로 변환된 리뷰

**리뷰 응답:**

{

"review\_id": "rev\_abc123",

"persona\_id": "persona\_001",

"persona\_name": "시네필 평론가",

"style\_id": "S01",

"style\_name": "분석비평 (클래식/격식)",

"content\_id": "movie\_12345",

"content\_type": "movie",

"rating": 4.8,

"summary": "계급 갈등의 완벽한 해부",

"text": "봉준호 감독의 섬세한 연출력이 빛나는 작품입니다. 계급 간의 긴장을 공간적 구성으로 표현한 방식이 탁월합니다...",

"keywords": \["계급", "연출", "반전", "미장센"\],

"style\_cache\_hit": true,

"transform\_type": "template",

"cost": {

"style\\\_generation": 0,

"transform": 0,

"total": 0

},

"created\_at": "2025-01-10T09:00:00Z"

}

**비용 효율:**

- 기존: 페르소나 수백 개 각각 리뷰 → 수천만 조합  
- 신규: 스타일 12개로 그룹화 → 12만 조합 (150배 절감)

### 11.2.6 페르소나 추천 목록 조회 ← **v2.3 신규**

**핵심 기능:** "이 페르소나가 좋아한 콘텐츠 목록" 제공

\# 매칭된 페르소나의 추천 콘텐츠 목록 조회

recommendations \= client.personas.get\_recommendations(

persona\\\_id=matched\\\_persona.id,

content\\\_type="movie",      \\\# 선택: 콘텐츠 유형 필터

min\\\_rating=4.0,            \\\# 선택: 최소 평점

limit=20                   \\\# 선택: 개수 제한

)

\# 결과

for item in recommendations.items:

print(f"{item.content\\\_id}: ⭐{item.rating} \\- {item.summary}")

**추천 목록 응답:**

{

"persona\_id": "persona\_001",

"persona\_name": "시네필 평론가",

"style\_id": "S01",

"total\_reviews": 127,

"items": \[

{

  "content\\\_id": "movie\\\_001",

  "content\\\_type": "movie",

  "rating": 5.0,

  "summary": "영화사에 길이 남을 걸작",

  "keywords": \\\["명작", "연출", "서사"\\\]

},

{

  "content\\\_id": "movie\\\_002",

  "content\\\_type": "movie",

  "rating": 4.9,

  "summary": "SF 장르의 새로운 기준점",

  "keywords": \\\["SF", "과학", "감동"\\\]

}

\],

"has\_more": true,

"next\_cursor": "eyJwYWdlIjogMn0="

}

**UI 활용 예시:**

┌─────────────────────────────────────────────────────────────────┐

│  🎬 시네필 평론가의 추천 영화                                   │

│                                                                 │

│  "당신과 92% 유사한 시네필 평론가가 좋아한 영화들이에요"        │

│                                                                 │

│  ┌─────────────────────────────────────────────────────────┐   │

│  │  1\. 대부 ⭐5.0                                          │   │

│  │     "영화사에 길이 남을 걸작"                           │   │

│  └─────────────────────────────────────────────────────────┘   │

│  ┌─────────────────────────────────────────────────────────┐   │

│  │  2\. 인터스텔라 ⭐4.9                                    │   │

│  │     "SF 장르의 새로운 기준점"                           │   │

│  └─────────────────────────────────────────────────────────┘   │

│  ┌─────────────────────────────────────────────────────────┐   │

│  │  3\. 기생충 ⭐4.8                                        │   │

│  │     "계급 갈등의 완벽한 해부"                           │   │

│  └─────────────────────────────────────────────────────────┘   │

│                                                                 │

│  💡 이 페르소나가 좋다고 한 영화는 나도 좋아할 확률 높아요\!    │

│                                                                 │

└─────────────────────────────────────────────────────────────────┘

### 11.2.7 페르소나 포트폴리오 통계 ← **v2.3 신규**

\# 페르소나의 평가 포트폴리오 통계

stats \= client.personas.get\_portfolio\_stats(persona\_id=matched\_persona.id)

print(f"총 리뷰 수: {stats.total\_reviews}")

print(f"평균 평점: {stats.avg\_rating}")

print(f"장르별 분포: {stats.by\_content\_type}")

print(f"자주 쓰는 키워드: {stats.top\_keywords}")

**포트폴리오 통계 응답:**

{

"persona\_id": "persona\_001",

"persona\_name": "시네필 평론가",

"total\_reviews": 127,

"avg\_rating": 3.8,

"by\_content\_type": {

"movie": 98,

"drama": 24,

"documentary": 5

},

"by\_rating\_range": {

"5.0": 12,

"4.0-4.9": 45,

"3.0-3.9": 38,

"2.0-2.9": 22,

"0-1.9": 10

},

"top\_keywords": \["연출", "각본", "연기", "미장센", "서사"\],

"review\_growth": {

"last\\\_7\\\_days": 8,

"last\\\_30\\\_days": 32

}

}

### 11.2.8 에러 처리 Best Practices

**재시도 로직:**

import time

from deepsight.exceptions import RateLimitError, APIError

def match\_with\_retry(client, user\_id, max\_retries=3):

for attempt in range(max\\\_retries):

    try:

        return client.match(user\\\_id=user\\\_id)

    except RateLimitError as e:

        if attempt \\\< max\\\_retries \\- 1:

            time.sleep(e.retry\\\_after)

        else:

            raise

    except APIError as e:

        if e.status\\\_code \\\>= 500 and attempt \\\< max\\\_retries \\- 1:

            time.sleep(2 \\\*\\\* attempt)  \\\# Exponential backoff

        else:

            raise

**Fallback 처리:**

def get\_persona\_recommendation(user\_id):

try:

    result \\= client.match(user\\\_id=user\\\_id)

    return result.matches\\\[0\\\]

except Exception as e:

    logger.error(f"DeepSight API error: {e}")

    \\\# Fallback: 기본 페르소나 반환

    return get\\\_default\\\_persona()

## 11.3 샘플 코드

### 11.3.1 샘플 프로젝트

**GitHub 저장소:**

- Python: `github.com/deepsight/examples-python`  
- Node.js: `github.com/deepsight/examples-node`  
- Java: `github.com/deepsight/examples-java`

### 11.3.2 샘플 앱

**콘텐츠 추천 앱 (Flask):**

from flask import Flask, request, jsonify

from deepsight import DeepSight

app \= Flask(\_\_name\_\_)

client \= DeepSight()

@app.route('/recommend', methods=\['POST'\])

def recommend():

user\\\_id \\= request.json\\\['user\\\_id'\\\]

category \\= request.json\\\['category'\\\]

result \\= client.match(

    user\\\_id=user\\\_id,

    context={'category': category}

)

return jsonify({

    'persona': {

        'id': result.matches\\\[0\\\].persona\\\_id,

        'name': result.matches\\\[0\\\].persona\\\_name,

        'score': result.matches\\\[0\\\].score

    }

})

if \_\_name\_\_ \== '\_\_main\_\_':

app.run()

### 11.3.3 Postman Collection

**다운로드:**

- Developer Console → Documentation → Postman Collection

**포함 내용:**

- 모든 API 엔드포인트  
- 인증 설정  
- 예제 요청/응답  
- 환경 변수 템플릿

---

\\newpage

# 12\. 지원 및 도움말 (Support & Help)

## 12.1 문서 센터

### 12.1.1 문서 구조

**시작하기 (Getting Started):**

- 빠른 시작 가이드 (5분)  
- API Key 발급  
- 첫 API 호출  
- SDK 설치

**가이드 (Guides):**

- 사용자 온보딩 통합  
- 매칭 최적화  
- 피드백 루프 구현  
- Webhook 설정  
- 보안 Best Practices

**API Reference:**

- 엔드포인트 목록  
- 요청/응답 스키마  
- 에러 코드  
- Rate Limit

**SDK Reference:**

- Python SDK  
- Node.js SDK  
- Java SDK  
- Go SDK

### 12.1.2 문서 검색

**전체 검색:**

- 키워드로 모든 문서 검색  
- 실시간 자동완성  
- 검색 결과 하이라이팅

**필터:**

- 문서 유형별 (가이드, API, SDK)  
- 언어별 (Python, Node.js 등)

### 12.1.3 API Playground

**인터랙티브 테스트:**

- 브라우저에서 직접 API 호출  
- 요청 파라미터 입력 UI  
- 실시간 응답 확인  
- cURL/SDK 코드 생성

**지원 엔드포인트:**

- POST /v1/match  
- GET /v1/personas  
- POST /v1/feedback

## 12.2 기술 지원

### 12.2.1 지원 채널

| 플랜 | 지원 채널 | 응답 시간 |
| :---- | :---- | :---- |
| Free | 커뮤니티 | \- |
| Starter | 이메일 | 48시간 |
| Pro | 우선 이메일 | 24시간 |
| Enterprise | 전담 매니저 \+ Slack | 4시간 |

### 12.2.2 문의하기

**문의 양식:**

- 문의 유형: 기술 문의 / 결제 문의 / 기능 제안 / 버그 리포트  
- 제목  
- 상세 내용  
- 첨부 파일 (로그, 스크린샷)  
- 우선순위: 낮음 / 보통 / 높음 / 긴급

**문의 추적:**

- 문의 번호 발급  
- 상태 확인 (접수 / 처리 중 / 해결 / 종료)  
- 이메일 알림

### 12.2.3 FAQ

**자주 묻는 질문:**

**Q: API Key가 노출되었어요. 어떻게 해야 하나요?** A: 즉시 Developer Console에서 해당 Key를 폐기(Revoke)하고 새 Key를 발급받으세요. API Keys → 해당 Key → Revoke.

**Q: Rate Limit에 걸렸어요.** A: X-RateLimit-Reset 헤더의 시간까지 대기 후 재시도하세요. 지속적으로 한도 초과 시 플랜 업그레이드를 고려해주세요.

**Q: 테스트 환경에서 실제 요금이 청구되나요?** A: 아니요. pk\_test\_/sk\_test\_ 키로 호출하면 과금되지 않습니다.

**Q: 매칭 정확도를 높이려면?** A: 1\) 온보딩을 Quick 모드(12개 질문) \+ 행동 기반 학습을 병행하면 점진적으로 정밀도 향상 2\) 데일리 성향 체크(매일 3개)에 성실히 참여 3\) 피드백(👍👎) 꾸준히 수집 4\) DEEP \+ 데일리 30일 \= 90% 도달 가능 ⚠️ 질문만으로 90% 이상은 불가능. 행동 데이터 \+ 피드백 필수\!

## 12.3 개발자 커뮤니티 ← v2.0 확장

### 12.3.1 커뮤니티 포럼

**카테고리:**

- 공지사항  
- Q\&A  
- 팁 & 노하우  
- 기능 제안  
- 쇼케이스 (구현 사례 공유)

**기능:**

- 질문/답변  
- 투표 (유용한 답변)  
- 태그 검색  
- 북마크

### 12.3.2 Discord 서버

**채널 구성:**

- \#announcements: 공지사항  
- \#general: 일반 대화  
- \#help: 기술 질문  
- \#showcase: 구현 사례  
- \#feedback: 기능 제안

**혜택:**

- DeepSight 팀과 직접 소통  
- 다른 개발자와 네트워킹  
- 베타 기능 우선 접근

### 12.3.3 뉴스레터

**구독 내용:**

- 월간 업데이트  
- 신규 기능 안내  
- 팁 & Best Practices  
- 커뮤니티 하이라이트

**구독 설정:**

- Settings → Notifications → Newsletter

### 12.3.4 Status Page

**URL:** [https://status.deepsight.ai](https://status.deepsight.ai)

**표시 정보:**

- 현재 시스템 상태  
- 컴포넌트별 상태 (API, Console, Webhook)  
- 예정된 유지보수  
- 과거 장애 이력

**구독:**

- 이메일 알림 구독  
- RSS 피드

---

\\newpage

# 13\. 팀 및 조직 관리 (Team & Organization)

## 13.1 조직 설정

### 13.1.1 조직 생성

**첫 가입 시:**

- 개인 계정으로 시작  
- 필요 시 조직 생성

**조직 생성:**

- Settings → Organization → Create Organization  
- 조직 이름  
- 조직 URL (slug)  
- 로고 (선택)

### 13.1.2 조직 정보

**설정 항목:**

- 조직 이름  
- 조직 로고  
- 청구 이메일  
- 기술 연락처 이메일  
- 타임존

### 13.1.3 조직 전환

**여러 조직 소속 시:**

- 헤더에서 조직 드롭다운  
- 클릭하여 전환  
- 각 조직별 독립된 API Key, 사용량, 결제

## 13.2 팀원 관리

### 13.2.1 팀원 초대

**초대 프로세스:**

1. Team → Invite Member  
2. 이메일 주소 입력  
3. 역할 선택  
4. 초대 이메일 발송  
5. 수락 시 팀 합류

**초대 제한:** | 플랜 | 최대 팀원 | |------|---------| | Free | 1명 | | Starter | 3명 | | Pro | 10명 | | Enterprise | 무제한 |

### 13.2.2 팀원 목록

**표시 정보:**

- 이름  
- 이메일  
- 역할  
- 상태 (활성 / 초대 대기)  
- 마지막 활동  
- 2FA 상태

**액션:**

- 역할 변경  
- 팀에서 제거  
- 초대 재발송 (대기 중인 경우)

### 13.2.3 팀원 제거

**제거 프로세스:**

1. 팀원 선택 → Remove  
2. 확인 다이얼로그  
3. 즉시 접근 권한 해제  
4. 해당 팀원이 생성한 API Key는 유지 (필요 시 별도 폐기)

## 13.3 역할 및 권한

### 13.3.1 기본 역할

| 역할 | 설명 |
| :---- | :---- |
| Owner | 조직 소유자. 모든 권한. 조직 삭제 가능. |
| Admin | 관리자. 팀원 관리, 결제 관리, 모든 기능 접근. |
| Developer | 개발자. API Key 관리, 로그 조회, 문서 접근. |
| Viewer | 조회자. 대시보드, 사용량 조회만 가능. |
| Billing | 결제 담당. 결제, 청구서만 접근 가능. |

### 13.3.2 권한 매트릭스

| 기능 | Owner | Admin | Developer | Viewer | Billing |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 대시보드 조회 | ✅ | ✅ | ✅ | ✅ | ✅ |
| API Key 생성 | ✅ | ✅ | ✅ | ❌ | ❌ |
| API Key 삭제 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 사용량 조회 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 로그 조회 | ✅ | ✅ | ✅ | ✅ | ❌ |
| Webhook 관리 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 팀원 초대 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 팀원 제거 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 역할 변경 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 결제 수단 관리 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 플랜 변경 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 청구서 조회 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 조직 설정 변경 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 조직 삭제 | ✅ | ❌ | ❌ | ❌ | ❌ |

### 13.3.3 커스텀 역할 (Enterprise)

**Enterprise 플랜에서:**

- 기본 역할 외 커스텀 역할 생성 가능  
- 세분화된 권한 조합  
- 역할 이름 및 설명 지정

---

## 13.4 Enterprise Private 페르소나 ← **Phase 2 예정**

⚠️ **초기 런칭 범위 외:** Private 페르소나는 Phase 2에서 구현 예정입니다.

### 13.4.1 개요 (Phase 2 계획)

**Private 페르소나란?**

- 해당 고객사 API Key에서만 접근 가능한 맞춤형 AI 페르소나  
- 고객사 브랜드 톤앤매너, 도메인 전문성 반영  
- 공개 페르소나 풀에 노출되지 않음

**Phase 2 구현 조건:**

- 유저 5,000명+ 달성  
- Public 페르소나 매칭 정확도 80% 이상 달성  
- B2B 고객 요청 발생

**상세 스펙은 Phase 2 진입 시 정의 예정.**

---

# 14\. 데이터 구조 설계 (Data Schema)

## 14.1 기존 테이블

### 14.1.1 Organizations Table

조직 정보를 저장합니다.

CREATE TABLE Organizations (

id UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),

name VARCHAR(100) NOT NULL,

slug VARCHAR(50) NOT NULL UNIQUE,

logo\\\_url VARCHAR(500),

billing\\\_email VARCHAR(255),

tech\\\_contact\\\_email VARCHAR(255),

timezone VARCHAR(50) DEFAULT 'UTC',

plan VARCHAR(20) DEFAULT 'FREE'

    CHECK (plan IN ('FREE', 'STARTER', 'PRO', 'ENTERPRISE')),

plan\\\_started\\\_at TIMESTAMP,

stripe\\\_customer\\\_id VARCHAR(100),

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

updated\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP

);

CREATE INDEX idx\_organizations\_slug ON Organizations(slug);

CREATE INDEX idx\_organizations\_plan ON Organizations(plan);

### 14.1.2 Users Table

사용자 계정 정보를 저장합니다.

CREATE TABLE Users (

id UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),

email VARCHAR(255) NOT NULL UNIQUE,

password\\\_hash VARCHAR(255),

name VARCHAR(100),

avatar\\\_url VARCHAR(500),

auth\\\_provider VARCHAR(20) DEFAULT 'email'

    CHECK (auth\\\_provider IN ('email', 'google', 'github')),

auth\\\_provider\\\_id VARCHAR(255),

email\\\_verified BOOLEAN DEFAULT FALSE,

two\\\_factor\\\_enabled BOOLEAN DEFAULT FALSE,

two\\\_factor\\\_secret VARCHAR(100),

last\\\_login\\\_at TIMESTAMP,

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

updated\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP

);

CREATE INDEX idx\_users\_email ON Users(email);

CREATE INDEX idx\_users\_auth\_provider ON Users(auth\_provider, auth\_provider\_id);

### 14.1.3 OrganizationMembers Table

조직-사용자 관계를 저장합니다.

CREATE TABLE OrganizationMembers (

id UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),

organization\\\_id UUID NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,

user\\\_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,

role VARCHAR(20) NOT NULL DEFAULT 'DEVELOPER'

    CHECK (role IN ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER', 'BILLING')),

invited\\\_by UUID REFERENCES Users(id),

invited\\\_at TIMESTAMP,

accepted\\\_at TIMESTAMP,

status VARCHAR(20) DEFAULT 'PENDING'

    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED')),

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

UNIQUE(organization\\\_id, user\\\_id)

);

CREATE INDEX idx\_org\_members\_org ON OrganizationMembers(organization\_id);

CREATE INDEX idx\_org\_members\_user ON OrganizationMembers(user\_id);

### 14.1.4 APIKeys Table

API Key를 저장합니다.

CREATE TABLE APIKeys (

id UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),

organization\\\_id UUID NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,

name VARCHAR(100) NOT NULL,

description TEXT,

public\\\_key VARCHAR(50) NOT NULL UNIQUE,

secret\\\_key\\\_hash VARCHAR(255) NOT NULL,

environment VARCHAR(10) NOT NULL DEFAULT 'test'

    CHECK (environment IN ('test', 'live')),

permissions JSONB DEFAULT '{"full\\\_access": true}',

ip\\\_whitelist TEXT\\\[\\\],

rate\\\_limit\\\_override INT,

last\\\_used\\\_at TIMESTAMP,

expires\\\_at TIMESTAMP,

status VARCHAR(20) DEFAULT 'ACTIVE'

    CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),

created\\\_by UUID REFERENCES Users(id),

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

revoked\\\_at TIMESTAMP,

revoked\\\_by UUID REFERENCES Users(id)

);

CREATE INDEX idx\_api\_keys\_org ON APIKeys(organization\_id);

CREATE INDEX idx\_api\_keys\_public ON APIKeys(public\_key);

CREATE INDEX idx\_api\_keys\_status ON APIKeys(status);

### 14.1.5 APIUsage Table

API 사용량을 저장합니다.

CREATE TABLE APIUsage (

id BIGSERIAL PRIMARY KEY,

organization\\\_id UUID NOT NULL REFERENCES Organizations(id),

api\\\_key\\\_id UUID REFERENCES APIKeys(id),

endpoint VARCHAR(100) NOT NULL,

method VARCHAR(10) NOT NULL,

status\\\_code INT NOT NULL,

response\\\_time\\\_ms INT,

request\\\_size\\\_bytes INT,

response\\\_size\\\_bytes INT,

tokens\\\_input INT DEFAULT 0,

tokens\\\_output INT DEFAULT 0,

cost DECIMAL(10,6) DEFAULT 0,

ip\\\_address INET,

user\\\_agent TEXT,

request\\\_id VARCHAR(50),

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP

);

\-- 파티셔닝: 일별

CREATE INDEX idx\_api\_usage\_org ON APIUsage(organization\_id);

CREATE INDEX idx\_api\_usage\_key ON APIUsage(api\_key\_id);

CREATE INDEX idx\_api\_usage\_created ON APIUsage(created\_at DESC);

CREATE INDEX idx\_api\_usage\_endpoint ON APIUsage(endpoint);

### 14.1.6 Invoices Table

청구서를 저장합니다.

CREATE TABLE Invoices (

id UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),

organization\\\_id UUID NOT NULL REFERENCES Organizations(id),

invoice\\\_number VARCHAR(50) NOT NULL UNIQUE,

billing\\\_period\\\_start DATE NOT NULL,

billing\\\_period\\\_end DATE NOT NULL,

subtotal DECIMAL(10,2) NOT NULL,

tax DECIMAL(10,2) DEFAULT 0,

total DECIMAL(10,2) NOT NULL,

currency VARCHAR(3) DEFAULT 'USD',

status VARCHAR(20) DEFAULT 'PENDING'

    CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),

stripe\\\_invoice\\\_id VARCHAR(100),

line\\\_items JSONB NOT NULL,

paid\\\_at TIMESTAMP,

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP

);

CREATE INDEX idx\_invoices\_org ON Invoices(organization\_id);

CREATE INDEX idx\_invoices\_status ON Invoices(status);

CREATE INDEX idx\_invoices\_period ON Invoices(billing\_period\_start, billing\_period\_end);

## 14.2 신규 테이블 ← v2.0 신규

### 14.2.1 Webhooks Table

Webhook 엔드포인트를 저장합니다.

CREATE TABLE Webhooks (

id UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),

organization\\\_id UUID NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,

url VARCHAR(500) NOT NULL,

description TEXT,

secret VARCHAR(100) NOT NULL,

events TEXT\\\[\\\] NOT NULL,

status VARCHAR(20) DEFAULT 'ACTIVE'

    CHECK (status IN ('ACTIVE', 'PAUSED', 'DISABLED')),

failure\\\_count INT DEFAULT 0,

last\\\_triggered\\\_at TIMESTAMP,

last\\\_success\\\_at TIMESTAMP,

last\\\_failure\\\_at TIMESTAMP,

created\\\_by UUID REFERENCES Users(id),

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

updated\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP

);

CREATE INDEX idx\_webhooks\_org ON Webhooks(organization\_id);

CREATE INDEX idx\_webhooks\_status ON Webhooks(status);

### 14.2.2 WebhookDeliveries Table

Webhook 전송 로그를 저장합니다.

CREATE TABLE WebhookDeliveries (

id BIGSERIAL PRIMARY KEY,

webhook\\\_id UUID NOT NULL REFERENCES Webhooks(id) ON DELETE CASCADE,

event\\\_id VARCHAR(50) NOT NULL,

event\\\_type VARCHAR(50) NOT NULL,

payload JSONB NOT NULL,

response\\\_status INT,

response\\\_body TEXT,

response\\\_time\\\_ms INT,

attempt\\\_count INT DEFAULT 1,

status VARCHAR(20) NOT NULL

    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING')),

next\\\_retry\\\_at TIMESTAMP,

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

completed\\\_at TIMESTAMP

);

CREATE INDEX idx\_webhook\_deliveries\_webhook ON WebhookDeliveries(webhook\_id);

CREATE INDEX idx\_webhook\_deliveries\_event ON WebhookDeliveries(event\_type);

CREATE INDEX idx\_webhook\_deliveries\_status ON WebhookDeliveries(status);

CREATE INDEX idx\_webhook\_deliveries\_created ON WebhookDeliveries(created\_at DESC);

### 14.2.3 AuditLogs Table

감사 로그를 저장합니다.

CREATE TABLE AuditLogs (

id BIGSERIAL PRIMARY KEY,

organization\\\_id UUID NOT NULL REFERENCES Organizations(id),

user\\\_id UUID REFERENCES Users(id),

action VARCHAR(100) NOT NULL,

resource\\\_type VARCHAR(50) NOT NULL,

resource\\\_id VARCHAR(100),

changes JSONB,

ip\\\_address INET,

user\\\_agent TEXT,

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP

);

CREATE INDEX idx\_audit\_logs\_org ON AuditLogs(organization\_id);

CREATE INDEX idx\_audit\_logs\_user ON AuditLogs(user\_id);

CREATE INDEX idx\_audit\_logs\_action ON AuditLogs(action);

CREATE INDEX idx\_audit\_logs\_created ON AuditLogs(created\_at DESC);

\-- 파티셔닝: 월별 권장

### 14.2.4 NotificationSettings Table

알림 설정을 저장합니다.

CREATE TABLE NotificationSettings (

id UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),

organization\\\_id UUID NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,

user\\\_id UUID REFERENCES Users(id) ON DELETE CASCADE,

channel VARCHAR(20) NOT NULL

    CHECK (channel IN ('email', 'slack', 'webhook')),

event\\\_types TEXT\\\[\\\] NOT NULL,

config JSONB DEFAULT '{}',

is\\\_enabled BOOLEAN DEFAULT TRUE,

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

updated\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

UNIQUE(organization\\\_id, user\\\_id, channel)

);

CREATE INDEX idx\_notification\_settings\_org ON NotificationSettings(organization\_id);

CREATE INDEX idx\_notification\_settings\_user ON NotificationSettings(user\_id);

### 14.2.5 UsageAlerts Table

사용량 알림 설정을 저장합니다.

CREATE TABLE UsageAlerts (

id UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),

organization\\\_id UUID NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,

alert\\\_type VARCHAR(50) NOT NULL

    CHECK (alert\\\_type IN ('api\\\_calls', 'cost', 'error\\\_rate')),

threshold\\\_value DECIMAL(10,2) NOT NULL,

threshold\\\_type VARCHAR(20) NOT NULL

    CHECK (threshold\\\_type IN ('absolute', 'percentage')),

notification\\\_channels TEXT\\\[\\\] NOT NULL,

is\\\_enabled BOOLEAN DEFAULT TRUE,

last\\\_triggered\\\_at TIMESTAMP,

created\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP,

updated\\\_at TIMESTAMP DEFAULT CURRENT\\\_TIMESTAMP

);

CREATE INDEX idx\_usage\_alerts\_org ON UsageAlerts(organization\_id);

CREATE INDEX idx\_usage\_alerts\_type ON UsageAlerts(alert\_type);

---

# 부록: 변경 이력 (Changelog)

## v3.0 (2026-01-16) ← 신규

- **6D 벡터 시스템 전면 개편**  
  - 기존 6차원(Logic/Emotion, Realistic/Idealistic 등)에서 콘텐츠 판단 기준 중심 6차원으로 변경  
  - 신규 차원: Depth, Lens, Stance, Scope, Taste, Purpose  
  - API 응답 필드 변경: traits → vector, confidence\_scores 추가  
- **매칭 정확도 향상을 위한 구조 개선**

## v2.0 (2026-01-11)

- **신규 기능**  
  - Webhook 연동 기능 추가 (10장)  
  - SDK 및 통합 가이드 확장 (11장)  
  - 개발자 커뮤니티 기능 확장 (12.3절)  
- **신규 DB 테이블**  
  - Webhooks  
  - WebhookDeliveries  
  - AuditLogs  
  - NotificationSettings  
  - UsageAlerts

## v1.0 (2025-12-01)

- 초기 버전 출시

