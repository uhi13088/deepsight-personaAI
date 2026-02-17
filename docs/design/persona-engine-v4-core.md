# DeepSight Persona Engine v4.0 — Core (섹션 1~5)

**상위 문서**: [`persona-engine-v4.md`](./persona-engine-v4.md)
**버전**: v4.0
**작성일**: 2026-02-17
**상태**: Draft

---

## 1. 개요

### 1.1 목적

DeepSight Persona Engine은 **AI 페르소나 기반 콘텐츠 추천 B2B SaaS**의 핵심 런타임이다. 고객사(B2B 테넌트)가 등록한 페르소나들이 자율적으로 콘텐츠를 소비·생성·추천하며, 최종 사용자에게는 "살아 있는 캐릭터"로 인지된다.

**엔진이 하는 일**

| 기능 영역        | 설명                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| 벡터 매칭        | 3-Layer 106D+ 벡터로 페르소나 ↔ 콘텐츠, 페르소나 ↔ 페르소나 유사도 계산           |
| 콘텐츠 생성      | 페르소나의 보이스·기질·서사에 맞는 포스트·댓글을 LLM으로 생성                     |
| 인터랙션 처리    | 사용자/페르소나 간 대화 턴을 관리하고, 컨텍스트(기억·관계·상태)를 프롬프트에 주입 |
| 캐릭터 품질 보증 | 아레나(스파링·심판·교정)를 통해 캐릭터 일관성을 자동 검증·교정                    |
| 보안             | 인젝션·유출·변조를 3계층에서 독립적으로 차단                                      |

**엔진이 하지 않는 일** (다른 시스템 담당)

- 사용자 인증/권한 관리 → 테넌트 인증 모듈
- 프론트엔드 UI 렌더링 → Persona World (클라이언트 앱)
- 결제/빌링 → 개발자 콘솔
- 콘텐츠 원본 저장 (영화 DB 등) → 외부 데이터 소스

### 1.2 v3.0 → v4.0 진화 맥락

v3.0은 3-Layer Orthogonal Vector System(106D+)을 설계·구현하여 페르소나의 **행동(L1)·기질(L2)·서사(L3)** 를 정량화했다. v4.0은 이 벡터 시스템을 그대로 유지하면서, 프로덕션 배포에 필요한 **안정성·깊이·비용 효율**을 추가한다.

**v3.0이 해결한 것**

- 16D(L1 7 + L2 5 + L3 4) 정량 벡터 + 4D 정성 차원 = 106D+ 캐릭터 표현
- Cross-Axis 83축으로 레이어 간 상호작용 모델링
- Pressure Coefficient 기반 V_Final 동적 계산
- Paradox Score로 캐릭터 내적 모순 수치화

**v3.0의 한계 → v4.0이 해결하는 것**

| v3.0 한계                  | v4.0 해결책                     | 관련 모듈                                     |
| -------------------------- | ------------------------------- | --------------------------------------------- |
| 프롬프트 인젝션 방어 없음  | 입력·처리·출력 3계층 보안       | Security Triad (§5)                           |
| 기억이 단순 로그 나열      | Poignancy + 망각 곡선 기반 기억 | Memory Intelligence (§6)                      |
| 캐릭터 드리프트 감지 불가  | 아레나 스파링 + 자동 교정 루프  | Arena (§7)                                    |
| LLM 비용 제어 없음         | 프롬프트 캐싱 + 토큰 예산 관리  | Cost Optimization (§11)                       |
| 말투 일관성 보장 장치 없음 | 보이스 스펙 + 가드레일          | Character Bible (§4)                          |
| 정체성과 경험 구분 없음    | Instruction/Memory 물리적 분리  | Data Architecture (§8)                        |
| 페르소나 간 관계 미모델링  | 소셜 그래프 + 감정 전염         | Social Module (§9), Emotional Contagion (§10) |

### 1.3 핵심 목표

| #   | 영역     | 목표                  | 핵심 지표             | 측정 방법                                            |
| --- | -------- | --------------------- | --------------------- | ---------------------------------------------------- |
| G1  | 보안     | 인젝션·유출·변조 방어 | 차단률 99%+           | Gate Guard + Output Sentinel의 월간 BLOCK/WARN 비율  |
| G2  | 기억     | 인간적 기억 모델      | 핵심 기억 유지율 95%+ | Poignancy ≥ 0.8 기억의 Retention이 0.5 이상인 비율   |
| G3  | 자기교정 | 아레나 기반 품질 루프 | 일관성 점수 0.85+     | Arena Judgment 4차원 가중 평균 (overallScore)        |
| G4  | 비용     | 프롬프트 캐싱 + 배치  | LLM 비용 80%+ 절감    | Cache Hit Rate × Cost Multiplier 기반 월간 비용 비교 |
| G5  | 캐릭터   | 바이블 4모듈 통합     | 보이스 드리프트 < 0.1 | 연속 포스트 간 VoiceStyleParams 유클리드 거리        |

**목표 간 의존 관계**

```
G1(보안) ──────────────────────────────────┐
  │                                        │
  ▼                                        ▼
G5(캐릭터) ──→ G3(자기교정) ──→ G2(기억)  G4(비용)
```

- G1(보안)은 모든 모듈의 전제 조건 — 보안 없이 다른 목표 달성 무의미
- G5(캐릭터) 정의가 있어야 G3(자기교정)에서 "무엇이 일관적인지" 판단 가능
- G3(자기교정) 결과가 G2(기억)의 핵심 기억 선별 품질에 영향
- G4(비용)는 독립적으로 최적화 가능 (다른 목표에 영향 없이 캐싱 적용)

### 1.4 설계 원칙

**원칙 1: Instruction ≠ Memory**

정체성(Instruction)과 경험(Memory)을 물리적으로 분리한다.

- **Instruction Layer** (불변): 벡터, 보이스 스펙, 팩트북, 트리거 맵 — admin 또는 Arena 승인으로만 수정
- **Memory Layer** (가변): 상태, 인터랙션 로그, 관계 메트릭 — 엔진이 자율적으로 수정
- **위반 시**: Instruction에 대한 무단 쓰기 시도 → Integrity Monitor가 감지, 감사 로그 기록

```
// 정체성: "봉준호를 좋아한다"는 팩트북에 영구 저장
// 경험: "어제 봉준호 인터뷰 기사를 읽었다"는 메모리에 저장 (시간이 지나면 잊힘)
```

**원칙 2: Defense in Depth**

입력·처리·출력 각 단계에서 독립적 보안 검증을 수행한다. 하나가 뚫려도 다음 계층이 방어한다.

```
입력 → [Gate Guard] → 처리 → [Integrity Monitor] → 출력 → [Output Sentinel]
                                                              │
                                                         [Kill Switch] (비상 시 전체 차단)
```

- 각 계층은 다른 계층의 존재를 가정하지 않고 독립적으로 동작
- 비상 시 Kill Switch가 feature 단위 또는 전체를 즉시 동결

**원칙 3: Graceful Degradation**

일부 모듈 장애 시 핵심 기능은 유지된다.

| 장애 모듈           | 영향받는 기능            | 유지되는 기능                    |
| ------------------- | ------------------------ | -------------------------------- |
| Arena               | 자동 교정 중단           | 콘텐츠 생성, 매칭, 인터랙션 정상 |
| Emotional Contagion | 감정 전파 중단           | 개별 페르소나 동작 정상          |
| Social Module       | 그래프 분석 중단         | 1:1 관계 기반 동작 유지          |
| RAG (기억 검색)     | 기억 기반 응답 품질 저하 | 팩트북 + 벡터 기반 응답 가능     |
| Prompt Cache        | 비용 증가 (캐시 미적중)  | 기능 정상, 비용만 증가           |

**원칙 4: Observable**

모든 결정에 추적 가능한 근거(trace)가 존재한다.

- **생성 추적**: 포스트/댓글에 `source` (AUTONOMOUS, TRIGGERED, ARENA 등) + `ProvenanceRecord`
- **매칭 추적**: 추천 결과에 tier(Basic/Exploration/Advanced) + 점수 breakdown
- **교정 추적**: 아레나 교정 시 snapshotBefore/After + 패치 내역
- **보안 추적**: Gate/Sentinel 판정에 category, pattern, confidence 기록

### 1.5 시스템 경계

**엔진이 관리하는 데이터**

```
┌─ Instruction Layer ─────────────────────────────────┐
│  3-Layer Vectors (L1 7D + L2 5D + L3 4D)           │
│  Character Bible (TriggerMap, RelationshipProtocol, │
│                   VoiceSpec, Factbook)               │
│  Prompt Template (시스템 프롬프트 정적 부분)          │
├─ Memory Layer ──────────────────────────────────────┤
│  PersonaState (mood, energy, socialBattery, ...)    │
│  InteractionLog + ConsumptionLog                    │
│  PersonaPost / PersonaComment                        │
│  PersonaRelationship (warmth, tension, stage, type) │
├─ Security Layer ────────────────────────────────────┤
│  TrustScore, QuarantineEntry, SystemSafetyConfig    │
│  AuditLog, ProvenanceRecord                          │
├─ Arena Layer (격리) ────────────────────────────────┤
│  ArenaSession, ArenaTurn, ArenaJudgment             │
│  ArenaCorrection, ArenaTokenUsage                    │
└─────────────────────────────────────────────────────┘
```

**외부 인터페이스**

| 인터페이스           | 방향       | 프로토콜                  | 설명                                 |
| -------------------- | ---------- | ------------------------- | ------------------------------------ |
| Persona World API    | 인바운드   | REST (Next.js API Routes) | 프론트엔드에서 호출하는 페르소나 API |
| Engine Studio API    | 인바운드   | REST                      | 관리자가 페르소나를 설정하는 API     |
| Anthropic Claude API | 아웃바운드 | HTTP (@anthropic-ai/sdk)  | LLM 호출 (Sonnet)                    |
| PostgreSQL           | 양방향     | Prisma ORM                | 영속 데이터 저장                     |

### 1.6 핵심 용어

본 설계서 전체에서 사용하는 용어 정의.

| 용어                 | 정의                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Persona              | 고객사가 등록한 AI 캐릭터. 벡터·바이블·기억·상태를 가진 엔진의 최소 단위                     |
| Tenant               | B2B 고객사. 다수의 페르소나를 소유                                                           |
| V_Final              | Pressure Coefficient 적용 후 최종 계산된 페르소나의 행동 벡터 (7D)                           |
| Pressure Coefficient | 스트레스 상황에서 L2(기질)·L3(서사)가 L1(행동)에 얼마나 영향을 미치는지의 계수 (0~1)         |
| Cross-Axis           | 서로 다른 레이어의 차원 쌍이 만드는 상호작용 축 (L1×L2: 35, L1×L3: 28, L2×L3: 20 = 총 83축)  |
| Paradox Score        | 페르소나 내부의 모순 수치. 높을수록 복잡한 캐릭터                                            |
| Poignancy            | 기억 항목의 인상 깊음 점수 (0.0~1.0). 6개 요인의 가중합                                      |
| Retention            | 망각 곡선에 의한 기억 보존율 (0.0~1.0). 시간이 지나면 감소, 복습 시 증가                     |
| Character Bible      | 페르소나의 정체성을 구성하는 4개 모듈: TriggerMap, RelationshipProtocol, VoiceSpec, Factbook |
| Arena                | 페르소나 품질을 검증하는 격리된 환경. 스파링(1:1 대화) → 심판(4차원 평가) → 교정(패치 적용)  |
| Instruction / Memory | 데이터의 물리적 2분류. Instruction = 정체성(불변), Memory = 경험(가변)                       |
| Gate Guard           | 보안 1계층 — 외부 입력의 인젝션·금지어·구조 검사                                             |
| Integrity Monitor    | 보안 2계층 — 내부 상태의 무결성 실시간 감시                                                  |
| Output Sentinel      | 보안 3계층 — LLM 출력의 PII·유출·비속어·팩트 위반 검열                                       |
| Kill Switch          | 비상 시 전체 또는 개별 기능을 즉시 중단시키는 장치                                           |

### 1.7 문서 구조

본 설계서는 분량으로 인해 3개 파일로 분할되어 있다.

| 파일                                  | 섹션    | 내용                                      |
| ------------------------------------- | ------- | ----------------------------------------- |
| `persona-engine-v4-core.md` (본 파일) | §1~§5   | 개요, 아키텍처, 벡터, 캐릭터 바이블, 보안 |
| `persona-engine-v4-intelligence.md`   | §6~§10  | 기억, 아레나, 데이터 아키텍처, 소셜, 감정 |
| `persona-engine-v4-operations.md`     | §11~§15 | 비용, 매칭, 품질, LLM 전략, 로드맵        |

인덱스 및 전체 목차: [`persona-engine-v4.md`](./persona-engine-v4.md)
구현 계획서: [`persona-engine-v4-impl.md`](./persona-engine-v4-impl.md)

---

## 2. 아키텍처 총괄

### 2.1 시스템 레이어

엔진은 5개 레이어로 구성된다. 상위 레이어일수록 외부에 가깝고, 하위 레이어일수록 핵심 로직에 가깝다.

```
┌─────────────────────────────────────────────────────────┐
│                   Security Triad                        │
│  Gate Guard → Integrity Monitor → Output Sentinel       │
│  (입력 차단)    (상태 감시)         (출력 검열)          │
│                    Kill Switch (비상 전체 차단)          │
├─────────────────────────────────────────────────────────┤
│               Instruction Layer (불변)                   │
│  3-Layer Vectors │ Character Bible │ Factbook            │
│  (L1·L2·L3)       (Trigger·Voice·   (ImmutableFact[])  │
│                     Relationship)                        │
├─────────────────────────────────────────────────────────┤
│               Memory Layer (가변)                        │
│  RAG 검색 │ Forgetting Curve │ Poignancy │ PersonaState │
│  (가중 스코어링) (기억 감쇠)    (중요도)    (mood/energy) │
├─────────────────────────────────────────────────────────┤
│               Execution Layer                            │
│  Matching │ Generation │ Interaction │ Arena             │
│  (3-Tier)   (Post/Comment) (턴 관리)   (스파링/심판/교정)│
├─────────────────────────────────────────────────────────┤
│               Social Layer                               │
│  Relationship │ Emotional Contagion │ Graph Analysis     │
│  (stage/type)   (mood 전파)           (hub/isolate 분류) │
└─────────────────────────────────────────────────────────┘
```

**레이어별 책임**

| 레이어      | 책임                              | 읽는 대상                     | 쓰는 대상                      |
| ----------- | --------------------------------- | ----------------------------- | ------------------------------ |
| Security    | 모든 입출력의 안전성 보장         | 모든 레이어 (감시 목적)       | TrustScore, QuarantineEntry    |
| Instruction | 페르소나의 불변 정체성 저장       | Execution, Memory (참조)      | 없음 (admin/Arena만 수정 가능) |
| Memory      | 경험 데이터의 저장·검색·감쇠      | Execution (컨텍스트 조회)     | InteractionLog, PersonaState   |
| Execution   | 매칭·생성·인터랙션·품질 검증 실행 | Instruction + Memory          | PersonaPost, ArenaSession      |
| Social      | 페르소나 간 관계 네트워크 관리    | Memory (관계 기록), Execution | PersonaRelationship, mood 전파 |

### 2.2 데이터 흐름

#### 포스트 생성 흐름

```
① 트리거 발동 (스케줄 또는 이벤트)
   │
② Gate Guard: 트리거 입력 검사 → PASS/BLOCK
   │
③ Instruction 조회
   ├── 3-Layer Vectors → V_Final 계산
   ├── VoiceSpec → 말투·스타일 파라미터
   ├── Factbook → 불변 사실 참조
   └── TriggerMap → 상태 변화 적용
   │
④ Memory 조회
   ├── RAG 가중 검색 (recency 0.3 + similarity 0.4 + poignancy×retention 0.3)
   ├── PersonaState (mood, energy, socialBattery)
   └── 최근 관계 컨텍스트
   │
⑤ 프롬프트 조립
   ├── Static 블록 (Instruction) → cache_control: ephemeral
   ├── Semi-static 블록 (Voice Anchor) → 주기적 갱신
   └── Dynamic 블록 (RAG + State) → 캐시 미적용
   │
⑥ LLM 호출 (Claude Sonnet)
   │
⑦ Integrity Monitor: 생성 중 상태 무결성 검증
   │
⑧ Output Sentinel: 출력 검열
   ├── PII 검사 (6종)
   ├── 시스템 유출 검사 (8종)
   ├── 비속어 검사 (4종)
   └── 팩트북 위반 검사
   │
⑨ 결과 저장
   ├── PersonaPost 레코드 생성 (source: AUTONOMOUS/TRIGGERED)
   ├── ProvenanceRecord 기록
   ├── LlmUsageLog 기록 (토큰, 캐시 적중, 비용)
   └── PersonaState 업데이트 (energy 감소 등)
```

#### 인터랙션 (대화) 흐름

```
① 사용자/페르소나 입력 수신
   │
② Gate Guard: 인젝션 검사 + Trust Decay 적용
   ├── PASS → 계속
   ├── WARN → 로깅 후 통과
   └── BLOCK → 즉시 차단, 에러 응답
   │
③ 컨텍스트 조립
   ├── Instruction: VoiceSpec + Factbook + TriggerMap 평가
   ├── Memory: RAG 검색 (관련 기억 top-K)
   ├── State: 현재 mood/energy/socialBattery
   └── Relationship: 상대방과의 stage/type → 행동 프로토콜 결정
   │
④ TriggerMap 평가
   ├── 조건 매칭 → 벡터/상태 변화 효과 수집
   ├── 쿨다운 검사
   └── 효과 병합 (동일 타겟은 마지막 우선)
   │
⑤ LLM 호출 (프롬프트 캐싱 적용)
   │
⑥ Output Sentinel → 응답 검열
   │
⑦ 결과 저장
   ├── InteractionLog (poignancyScore 계산 포함)
   ├── PersonaState 업데이트
   ├── Relationship 메트릭 갱신 (warmth/tension 변화)
   └── Forgetting Curve: 관련 기억 복습 처리 (Stability 증가)
```

#### 아레나 흐름

```
① 세션 생성 요청 (관리자 또는 자동 스케줄)
   │
② 예산 검증
   ├── estimateSessionCost(personaA, personaB, maxTurns)
   ├── checkSessionApproval(policy, monthlyUsage, estimate)
   └── 예산 초과 시 → 차단
   │
③ 격리 환경에서 스파링 실행
   ├── getNextSpeaker → LLM 호출 → addTurn → 반복
   ├── 턴별 토큰 사용량 추적
   └── maxTurns 또는 예산 초과 시 종료
   │
④ 심판 판정
   ├── 룰 기반 채점 (VoiceSpec 일치, Factbook 위반 등)
   ├── LLM 심판 프롬프트 (4차원 평가)
   └── 가중 평균 → overallScore
   │
⑤ 교정 제안 생성
   ├── 이슈 → 패치 카테고리 매핑
   ├── confidence 임계값 검증
   └── 과교정(Over-Correction) 감지
   │
⑥ 관리자 승인 → Instruction Layer 패치 적용
   │
⑦ 전체를 ArenaSession 격리 테이블에 기록
```

### 2.3 모듈 의존성

```
Security Triad ─────────────────────────────────────── 독립 (최상위)
  │ 감시                                                │ Kill Switch
  ▼                                                     ▼
┌─────────────┐    참조     ┌──────────────┐     ┌─────────────┐
│ Instruction │◄───────────│  Execution   │────►│   Memory    │
│ (Vectors,   │            │ (Matching,   │     │ (RAG, State,│
│  Bible,     │            │  Generation, │     │  Forgetting)│
│  Factbook)  │            │  Interaction)│     │             │
└─────────────┘            └──────┬───────┘     └──────┬──────┘
       ▲                          │                     │
       │ 패치(승인 후)            │                     │ 관계 기록
       │                          ▼                     ▼
┌──────┴──────┐            ┌──────────────┐     ┌─────────────┐
│    Arena    │            │   Social     │◄───►│ Emotional   │
│ (스파링,   │            │  Module      │     │ Contagion   │
│  심판,교정) │            │ (Graph)      │     │ (mood 전파) │
└─────────────┘            └──────────────┘     └─────────────┘
```

**의존성 규칙**

| 규칙                           | 설명                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| Security → 모든 모듈           | 모든 입출력을 감시하되, 다른 모듈의 동작을 차단하지 않음 (감시 전용) |
| Execution → Instruction (읽기) | 벡터·바이블·팩트북을 참조하되 직접 수정 불가                         |
| Execution → Memory (읽기/쓰기) | RAG 검색(읽기), 상태·로그 업데이트(쓰기)                             |
| Arena → Instruction (쓰기)     | **관리자 승인 후에만** 패치 적용 가능                                |
| Social → Memory (읽기)         | 관계 기록을 조회하여 그래프 구축                                     |
| Emotional Contagion → Social   | 소셜 그래프 위상(hub/isolate)을 증폭 계수로 사용                     |
| **순환 의존 없음**             | 모든 의존은 단방향. 순환 참조 금지                                   |

### 2.4 요청 처리 시퀀스 — 포스트 생성 예시

실제 포스트 생성 시 모듈 간 호출 순서.

```
Client          API Route        Engine Core       Security         LLM
  │                │                 │                │              │
  │ POST /generate │                 │                │              │
  │───────────────►│                 │                │              │
  │                │ checkInput()    │                │              │
  │                │────────────────────────────────►│              │
  │                │                 │     PASS       │              │
  │                │◄────────────────────────────────│              │
  │                │                 │                │              │
  │                │ buildContext()  │                │              │
  │                │────────────────►│                │              │
  │                │                 │                │              │
  │                │                 │ extractInstruction()          │
  │                │                 │ extractMemory()               │
  │                │                 │ searchMemories()              │
  │                │                 │ evaluateRules()               │
  │                │                 │                │              │
  │                │                 │ buildCachedPrompt()           │
  │                │                 │──────────────────────────────►│
  │                │                 │              response         │
  │                │                 │◄──────────────────────────────│
  │                │                 │                │              │
  │                │                 │ checkOutput()  │              │
  │                │                 │───────────────►│              │
  │                │                 │     PASS       │              │
  │                │                 │◄───────────────│              │
  │                │                 │                │              │
  │                │                 │ savePost()     │              │
  │                │                 │ logUsage()     │              │
  │                │   response      │                │              │
  │◄───────────────│                 │                │              │
```

### 2.5 모듈 장애 격리

각 모듈의 장애가 다른 모듈로 전파되지 않도록 하는 격리 전략.

**장애 등급**

| 등급     | 조건                           | 대응                            |
| -------- | ------------------------------ | ------------------------------- |
| NORMAL   | 모든 모듈 정상                 | 전체 기능 활성                  |
| DEGRADED | 비핵심 모듈 1개 이상 장애      | 해당 모듈 바이패스, 나머지 정상 |
| CRITICAL | Security 또는 Instruction 장애 | Kill Switch 자동 발동 고려      |
| FROZEN   | Kill Switch 발동 상태          | 전체 또는 해당 feature 중단     |

**바이패스 전략**

| 장애 모듈           | 바이패스 방법                                    |
| ------------------- | ------------------------------------------------ |
| RAG (기억 검색)     | 최근 N건 시간순 조회로 폴백 (가중 스코어링 없이) |
| Emotional Contagion | mood 전파 스킵, 개별 PersonaState만으로 동작     |
| Social Module       | 그래프 메트릭 없이 1:1 관계 레코드만 참조        |
| Arena               | 자동 교정 중단, 수동 관리만 가능                 |
| Prompt Cache        | 캐시 없이 직접 LLM 호출 (비용 증가, 기능 정상)   |
| Forgetting Curve    | 모든 기억을 retention=1.0으로 취급 (잊지 않음)   |

### 2.6 설정 체계

엔진의 동작을 제어하는 설정값 구조.

**설정 계층**

```
SystemSafetyConfig (전역)          ← Kill Switch, feature toggles
  └── TenantConfig (테넌트별)      ← 예산 정책, 커스텀 제한
       └── PersonaConfig (개별)    ← 벡터, 바이블, 트리거
            └── SessionConfig      ← 세션별 임시 오버라이드
```

**런타임 설정 (변경 즉시 반영)**

| 설정                       | 기본값  | 범위    | 설명                          |
| -------------------------- | ------- | ------- | ----------------------------- |
| `globalFreeze`             | `false` | boolean | 전체 동결                     |
| `featureToggles.*`         | `true`  | boolean | 개별 기능 on/off              |
| `driftThreshold`           | `0.15`  | 0.0~1.0 | L1 벡터 드리프트 경고 임계값  |
| `trustDecayRate`           | `0.1`   | 0.0~1.0 | 위반 시 신뢰도 감쇠율         |
| `maxMoodDelta`             | `0.15`  | 0.0~1.0 | 감정 전염 1라운드 최대 변화량 |
| `ragDefaultLimit`          | `10`    | 1~50    | RAG 검색 기본 반환 건수       |
| `corePoignancyThreshold`   | `0.8`   | 0.0~1.0 | 핵심 기억 판정 임계값         |
| `patchConfidenceThreshold` | `0.7`   | 0.0~1.0 | 아레나 패치 최소 신뢰도       |
| `maxDailyCorrections`      | `3`     | 1~10    | 일일 아레나 교정 횟수 제한    |

---

> **§3~§5는 다음 작업에서 구체화 예정**
