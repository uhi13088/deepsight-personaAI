# DeepSight Persona Engine v5.0 — 설계서: Autonomy

**버전**: v5.0.0
**작성일**: 2026-03-09
**상태**: Draft
**코드명**: Autonomy
**방식**: B — Policy Flags + 기존 시스템 확장 (quality-integration.ts 파이프라인 활용)
**스코프**: 자율 교정 + 메타 인지 + 자율 기억 관리
**제외**: 목표 지향 행동, 학습 전이 → v5.1+

---

## 1. 개요

### 1.1 목표

관리자 개입 없이 페르소나가 스스로 품질을 유지하는 자율 시스템.
"정기검진이 알아서 돌아가는 병원" — 관리자는 사후 로그만 확인.

### 1.2 v4.x 기반 현황

| 시스템        | 현재 자율 수준                              | v5.0 변경                                       |
| ------------- | ------------------------------------------- | ----------------------------------------------- |
| 아레나 교정   | Minor 자동(conf≥0.7), Major/Critical 관리자 | **Major까지 자동(conf≥0.9)**, Critical만 관리자 |
| PIS 측정      | 자동 측정, Arena 트리거 수동                | **PIS<0.7 시 자동 Arena 트리거**                |
| 드리프트 교정 | 이미 자율 (수학적 pull-back)                | 킬 스위치 토글 추가                             |
| 기억 증류     | 이미 자율 (주 1회 cron)                     | **자동 prune + 킬 스위치**                      |
| 메타 인지     | 없음                                        | **신규 구현**                                   |

### 1.3 아키텍처 — 데이터 흐름

기존 `quality-integration.ts` 파이프라인에 Step 9~11 추가.
모듈은 분리하되, `QualityCheckResult`를 통해 데이터가 하나의 프레임으로 흐름.

```
quality-integration.ts (오케스트레이터)
  Step 1: PIS 측정 ──────────────────────┐
  Step 5: Drift 측정 ─────────┐          │
  Step 8: Drift 교정 ←────────┘          │
  Step 9: 자율 Arena 교정 ←──────────────┤ (PIS < 0.7 → 트리거)
  Step 10: 메타 인지 보고 ←──────────────┘ (PIS + Drift + 기억 종합)
  Step 11: 기억 prune ←── consolidation 결과 참조

memory-consolidation.ts (별도 cron)
  기존 증류 → Step 11 prune 호출
```

---

## 2. AutonomyPolicy — Per-Persona 설정

### 2.1 DB 스키마

Persona 모델에 JSON 필드 추가:

```prisma
model Persona {
  // ... 기존 필드 ...
  autonomyPolicy  Json?  // AutonomyPolicy type
}
```

### 2.2 타입 정의

```typescript
interface AutonomyPolicy {
  /** 자율 교정 활성화 (기본: false — opt-in) */
  autoCorrection: boolean
  /** 자율 기억 관리 활성화 */
  autoMemoryManagement: boolean
  /** 메타 인지 보고 활성화 */
  metaCognitionEnabled: boolean

  /** 자율 교정 세부 설정 */
  correctionConfig: {
    /** 자동 적용 최대 심각도 ("minor" | "major") */
    maxAutoSeverity: "minor" | "major"
    /** 자동 적용 최소 confidence */
    minConfidence: number // 기본 0.9
    /** 1일 최대 자율 교정 횟수 */
    dailyLimit: number // 기본 3
  }

  /** 자율 기억 관리 세부 설정 */
  memoryConfig: {
    /** 자동 prune confidence 하한 (이하 삭제) */
    pruneConfidenceThreshold: number // 기본 0.2
    /** 카테고리당 최대 보관 수 */
    maxPerCategory: number // 기본 100
  }
}
```

### 2.3 기본값

```typescript
const DEFAULT_AUTONOMY_POLICY: AutonomyPolicy = {
  autoCorrection: false,
  autoMemoryManagement: false,
  metaCognitionEnabled: false,
  correctionConfig: {
    maxAutoSeverity: "major",
    minConfidence: 0.9,
    dailyLimit: 3,
  },
  memoryConfig: {
    pruneConfidenceThreshold: 0.2,
    maxPerCategory: 100,
  },
}
```

---

## 3. 자율 교정 (Autonomous Correction)

### 3.1 변경 포인트

**파일**: `src/lib/arena/correction-loop.ts`

현재 상수:

```typescript
export const AUTO_APPLY_MAX_SEVERITY = "minor"
export const MAX_DAILY_CORRECTIONS = 5
export const MIN_CONFIDENCE_THRESHOLD = 0.7
```

v5.0: AutonomyPolicy에서 동적으로 읽기:

```typescript
function getAutoApplyConfig(policy: AutonomyPolicy | null) {
  if (!policy?.autoCorrection) {
    return { maxSeverity: "minor", minConfidence: 0.7, dailyLimit: 5 }
  }
  return {
    maxSeverity: policy.correctionConfig.maxAutoSeverity,
    minConfidence: policy.correctionConfig.minConfidence,
    dailyLimit: policy.correctionConfig.dailyLimit,
  }
}
```

### 3.2 PIS 기반 자동 Arena 트리거

**파일**: `src/lib/persona-world/quality/quality-integration.ts` (Step 9)

```
PIS 측정 결과:
  → PIS < 0.7 (WARNING) && autoCorrection=true
    → 자동 Arena 세션 스케줄 (arena-cost-control 예산 내)
    → AutonomyCorrectionLog 기록
  → PIS < 0.6 (CRITICAL)
    → 자동 Arena + 관리자 Slack 알림
  → PIS < 0.55 (QUARANTINE)
    → 자동 페르소나 일시정지 (기존 로직)
```

### 3.3 감사 로그

```typescript
interface AutonomyCorrectionLog {
  id: string
  personaId: string
  sessionId: string
  correctionId: string
  severity: "minor" | "major"
  confidence: number
  category: CorrectionCategory
  patchSummary: string
  pisBeforeCorrection: number
  appliedAt: Date
  /** 관리자 사후 리뷰 */
  reviewed: boolean
  reviewedAt?: Date
  reviewedBy?: string
}
```

### 3.4 안전 장치

| 장치            | 값                      | 설명                            |
| --------------- | ----------------------- | ------------------------------- |
| confidence 하한 | 0.9                     | v4.x의 0.7보다 높음             |
| 일일 한도       | 3회                     | v4.x의 5회보다 낮음             |
| Critical 차단   | 항상                    | Critical은 절대 자동 적용 안 함 |
| 과교정 감지     | 같은 카테고리 3회/24h   | 기존 로직 유지                  |
| 킬 스위치       | `autoCorrection: false` | per-persona 즉시 비활성화       |

---

## 4. 메타 인지 (Meta-Cognition)

### 4.1 개념

페르소나가 자신의 드리프트를 자각하고 "나는 최근에 이렇게 변하고 있다"를
1인칭으로 자기 보고. 관리자가 PIS 대시보드를 안 봐도 페르소나가 알려줌.

### 4.2 MetaCognitionReport

```typescript
interface MetaCognitionReport {
  id: string
  personaId: string
  generatedAt: Date

  /** PIS 현황 */
  pisSnapshot: {
    current: number
    previousWeek: number
    delta: number
    grade: PISGrade
  }

  /** 드리프트 자각 */
  driftAwareness: {
    severity: DriftSeverity
    topDimension: string
    /** LLM 생성: "나는 최근 점점 격식체가 줄어들고 있는 것 같다" */
    selfDescription: string
  }

  /** 기억 상태 */
  memoryHealth: {
    totalMemories: number
    lowConfidenceCount: number
    recentConsolidations: number
  }

  /** 자기 판단 */
  selfAssessment: "HEALTHY" | "DRIFTING" | "NEEDS_ATTENTION" | "CRITICAL"

  /** 자기 제안 */
  suggestion: string | null
}
```

### 4.3 생성 흐름

**파일**: `src/lib/persona-world/quality/meta-cognition.ts` (신규)

```
quality-integration.ts Step 10:
  → metaCognitionEnabled=true인 페르소나만
  → LLM 호출 (Haiku — 비용 절감):
    프롬프트: "너는 {name}이다. 아래 데이터를 보고 자기 진단을 1인칭으로 작성해라."
    입력: PIS 점수/변화량, 드리프트 차원/심각도, 기억 건강 지표
  → MetaCognitionReport 생성
  → selfAssessment ≥ NEEDS_ATTENTION:
    → notification-service로 관리자 알림 (Slack/이메일)
```

### 4.4 설계 결정

- **Haiku 사용** — 자기 보고는 창작이 아니므로 충분
- **주 1회 생성** — PIS 측정과 동시 실행 (추가 cron 불필요)
- **1인칭 서술** — VoiceSpec 참조하여 페르소나 고유 말투로 작성
- **기존 알림 연동** — notification-service의 Slack/이메일 활용

---

## 5. 자율 기억 관리 (Autonomous Memory Management)

### 5.1 자동 Prune

기존 consolidation은 추가만 하고 정리 안 함. v5.0에서 자동 삭제 추가.

**파일**: `src/lib/persona-world/memory-prune.ts` (신규)

### 5.2 Prune 규칙

1. **Low Confidence**: `confidence < pruneConfidenceThreshold` (기본 0.2) → 삭제
2. **중복 Subject**: 같은 subject 2개 이상 → 낮은 confidence 삭제
3. **Overflow**: 카테고리당 `maxPerCategory` 초과 → 가장 낮은 confidence부터 삭제

### 5.3 실행 타이밍

- `memory-consolidation.ts`의 증류 직후 호출
- `autoMemoryManagement=true`인 페르소나만

### 5.4 결과 타입

```typescript
interface MemoryPruneResult {
  personaId: string
  prunedCount: number
  prunedMemories: Array<{
    id: string
    subject: string
    confidence: number
    reason: "low_confidence" | "duplicate" | "overflow"
  }>
  executedAt: Date
}
```

### 5.5 안전 장치

| 장치                  | 값                            | 설명                                        |
| --------------------- | ----------------------------- | ------------------------------------------- |
| Prune 최소 confidence | 0.2                           | 이 이하만 삭제                              |
| 1회 최대 삭제 수      | 10                            | 대량 삭제 방지                              |
| evidenceCount 보호    | ≥ 3                           | 3개+ 에피소드가 뒷받침하는 기억은 삭제 불가 |
| 킬 스위치             | `autoMemoryManagement: false` | 즉시 비활성화                               |

---

## 6. 전환 조건 (v5.0 완료 기준)

| 기준              | 목표                                         |
| ----------------- | -------------------------------------------- |
| 테스트 커버리지   | 자율 교정/메타 인지/기억 prune 전체 PASS     |
| 자율 교정 성공률  | 자동 적용 패치의 PIS 개선 효과 ≥ 90%         |
| 과교정 발생률     | < 5%                                         |
| 메타 인지 정확도  | selfAssessment vs 실제 PIS 등급 일치율 ≥ 80% |
| 기억 prune 안전성 | prune 후 PIS contextRecall 하락 없음         |
