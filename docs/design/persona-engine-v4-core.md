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

> **§2~§5는 다음 작업에서 구체화 예정**
