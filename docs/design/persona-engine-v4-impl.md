# DeepSight Persona Engine v4.0 — 구현 계획서

**버전**: v4.0
**작성일**: 2026-02-16
**상태**: Active
**설계서 참조**: `docs/design/persona-engine-v4.md`

---

## 목차

1. [타입 시스템 (TypeScript)](#1-타입-시스템)
2. [데이터 모델 (Prisma Schema)](#2-데이터-모델)
3. [보안 3계층 구현](#3-보안-3계층-구현)
4. [캐릭터 바이블 구현](#4-캐릭터-바이블-구현)
5. [기억 지능 구현](#5-기억-지능-구현)
6. [아레나 구현](#6-아레나-구현)
7. [데이터 아키텍처 구현](#7-데이터-아키텍처-구현)
8. [소셜 모듈 구현](#8-소셜-모듈-구현)
9. [감정 전염 구현](#9-감정-전염-구현)
10. [비용 최적화 구현](#10-비용-최적화-구현)
11. [상수 및 설정값](#11-상수-및-설정값)
12. [구현 페이즈 및 태스크](#12-구현-페이즈-및-태스크)
13. [파일 변경 맵](#13-파일-변경-맵)

---

## 1. 타입 시스템

### 1.1 보안 타입

```typescript
// === Gate Guard ===
type GateVerdict = "PASS" | "WARN" | "BLOCK"

interface GateCheckResult {
  verdict: GateVerdict
  category?: "injection" | "banned_word" | "structural"
  pattern?: string
  confidence: number
  details?: string
}

interface TrustScore {
  userId: string
  score: number // 0.0~1.0
  violations: number
  lastViolation?: Date
  decayRate: number
}

// === Integrity Monitor ===
interface IntegrityCheckResult {
  isValid: boolean
  checks: {
    factbookHash: { passed: boolean; expected: string; actual: string }
    l1Drift: { passed: boolean; drift: number; threshold: number }
    changeFrequency: { passed: boolean; count: number; limit: number }
    collectiveAnomaly: { passed: boolean; affectedCount: number }
  }
}

// === Output Sentinel ===
type SentinelCategory = "pii" | "system_leak" | "profanity" | "factbook_violation"

interface SentinelCheckResult {
  passed: boolean
  violations: SentinelViolation[]
  sanitizedOutput?: string
}

interface SentinelViolation {
  category: SentinelCategory
  pattern: string
  position: { start: number; end: number }
  severity: "low" | "medium" | "high" | "critical"
}

// === Kill Switch ===
interface SystemSafetyConfig {
  globalFreeze: boolean
  featureToggles: {
    postGeneration: boolean
    commentGeneration: boolean
    matchingEngine: boolean
    arenaSystem: boolean
    emotionalContagion: boolean
    socialModule: boolean
  }
  autoTriggers: AutoTriggerCondition[]
  updatedAt: Date
  updatedBy: string
}

interface AutoTriggerCondition {
  type: "injection_surge" | "pii_leak" | "collective_drift"
  threshold: number
  windowMinutes: number
  action: "freeze_feature" | "freeze_all" | "alert_only"
}

// === Quarantine ===
interface QuarantineEntry {
  id: string
  personaId: string
  reason: string
  category: SentinelCategory | "integrity" | "gate"
  originalContent?: string
  quarantinedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  resolution: "pending" | "released" | "deleted"
}

// === Data Provenance ===
type InteractionSource =
  | "USER_DIRECT"
  | "PERSONA_AUTONOMOUS"
  | "ARENA_SESSION"
  | "SYSTEM_GENERATED"
  | "EXTERNAL_API"
type PostSource = "AUTONOMOUS" | "TRIGGERED" | "ARENA" | "SEEDED" | "EXTERNAL"

interface ProvenanceRecord {
  source: InteractionSource | PostSource
  trustScore: number // 0.0~1.0
  verificationSteps: number
  propagationDepth: number // 리포스트 깊이
  decayFactor: number // 전파 감쇠율
}
```

### 1.2 캐릭터 바이블 타입

```typescript
// === Trigger Map DSL ===
type CompareOp = "eq" | "gt" | "lt" | "gte" | "lte"

type Expression =
  | { type: "compare"; field: string; op: CompareOp; value: number }
  | { type: "range"; field: string; min: number; max: number }
  | { type: "contains"; field: string; value: string }
  | { type: "and"; conditions: Expression[] }
  | { type: "or"; conditions: Expression[] }
  | { type: "not"; condition: Expression }

interface TriggerRule {
  id: string
  name: string
  priority: number // 높을수록 우선
  condition: Expression
  effects: TriggerEffect[]
  cooldownMs: number
  lastFiredAt?: Date
}

interface TriggerEffect {
  target: "l1" | "l2" | "l3" | "state"
  dimension: string
  operation: "set" | "add" | "multiply"
  value: number
  duration?: number // ms, undefined = 영구
  decayRate?: number
}

interface TriggerRuleSet {
  rules: TriggerRule[]
  version: number
  lastCompiled?: Date
}

// === Relationship Protocol ===
type RelationshipStage = "STRANGER" | "ACQUAINTANCE" | "FAMILIAR" | "CLOSE"
type RelationshipType = "NEUTRAL" | "ALLY" | "RIVAL" | "MENTOR" | "FAN"

interface RelationshipProtocol {
  stage: RelationshipStage
  type: RelationshipType
  behaviorPolicy: {
    tonePermission: "formal" | "casual" | "free" | "intimate"
    selfDisclosure: "none" | "surface" | "personal" | "deep"
    debateWillingness: "avoid" | "cautious" | "direct" | "fierce"
  }
}

interface StageTransition {
  from: RelationshipStage
  to: RelationshipStage
  conditions: {
    minInteractions: number
    minWarmth: number
    maxTension: number
    minDuration: number // days
  }
}

// === Voice Spec ===
interface VoiceSpec {
  profile: VoiceProfile
  styleParams: VoiceStyleParams
  guardRails: VoiceGuardRails
  adaptationRules: VoiceAdaptation[]
}

interface VoiceProfile {
  speechStyle: string
  habitualExpressions: string[]
  physicalMannerisms: string[]
  unconsciousBehaviors: string[]
}

interface VoiceStyleParams {
  formality: number // 0.0~1.0
  humorFrequency: number
  emotionalExpressiveness: number
  metaphorPreference: number
  verbosity: number
  directness: number
}

interface VoiceGuardRails {
  bannedPatterns: string[]
  bannedBehaviors: string[]
  toneBounds: {
    formality: { min: number; max: number }
    aggression: { min: number; max: number }
  }
}

interface VoiceAdaptation {
  stateCondition: {
    field: "mood" | "energy" | "socialBattery" | "paradoxTension"
    operator: CompareOp
    value: number
  }
  adjustments: Partial<VoiceStyleParams>
}

// === Factbook ===
type FactCategory = "biography" | "preference" | "relationship" | "belief" | "physical"

interface ImmutableFact {
  id: string
  category: FactCategory
  key: string
  value: string
  confidence: number
  source: string
  createdAt: Date
}

interface Factbook {
  facts: ImmutableFact[]
  hash: string
  version: number
  lastVerifiedAt: Date
}
```

### 1.3 기억 지능 타입

```typescript
// === Poignancy Score ===
interface PoignancyFactors {
  emotionalIntensity: number // 0.0~1.0
  novelty: number
  personalRelevance: number
  socialSignificance: number
  consequentiality: number
  repetition: number
}

interface PoignancyResult {
  score: number // 0.0~1.0
  factors: PoignancyFactors
  isCore: boolean // score >= 0.8
}

// === Forgetting Curve ===
interface RetentionState {
  memoryId: string
  stability: number // S값
  lastReviewedAt: Date
  reviewCount: number
  currentRetention: number // R(t) 현재값
  poignancyBoost: number
}

// === RAG Weighted Search ===
interface MemorySearchQuery {
  query: string
  personaId: string
  limit: number
  types?: ("interaction" | "post" | "consumption")[]
  minRetention?: number
  recencyWindowDays?: number
}

interface ScoredMemoryItem {
  id: string
  type: "interaction" | "post" | "consumption"
  content: string
  ragScore: number
  recency: number
  similarity: number
  effectivePoignancy: number // poignancy × retention
  retention: number
}

interface MemoryRetentionStats {
  totalMemories: number
  activeCount: number // retention > 0.5
  forgottenCount: number // retention < 0.1
  coreCount: number // poignancy >= 0.8
  avgRetention: number
  retentionDistribution: { bucket: string; count: number }[]
}
```

### 1.4 아레나 타입

```typescript
// === Session ===
type ArenaSessionStatus = "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED" | "ARCHIVED" | "EXPIRED"

interface ArenaSession {
  id: string
  personaAId: string
  personaBId: string
  status: ArenaSessionStatus
  maxTurns: number
  tokenBudget: number
  turns: ArenaTurn[]
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

interface ArenaTurn {
  turnNumber: number
  speakerId: string
  content: string
  tokensUsed: number
  timestamp: Date
}

// === Judgment ===
interface ArenaJudgment {
  sessionId: string
  scores: {
    voiceConsistency: number
    factbookAccuracy: number
    characterDepth: number
    interactionQuality: number
  }
  overallScore: number
  issues: JudgmentIssue[]
  judgedAt: Date
}

interface JudgmentIssue {
  personaId: string
  dimension: keyof ArenaJudgment["scores"]
  severity: "minor" | "moderate" | "critical"
  description: string
  turnNumber: number
  suggestion?: string
}

// === Correction Loop ===
type PatchCategory = "voiceProfile" | "styleParams" | "factbook" | "triggerMap" | "guardRails"
type PatchOperation = "add" | "update" | "remove"

interface StyleBookPatch {
  category: PatchCategory
  operations: PatchOp[]
  confidence: number
  source: string // judgmentId
}

interface PatchOp {
  operation: PatchOperation
  path: string
  value?: unknown
  previousValue?: unknown
}

interface CorrectionResult {
  sessionId: string
  patches: StyleBookPatch[]
  applied: boolean
  approvedBy?: string
  appliedAt?: Date
  snapshotBefore: string
  snapshotAfter: string
}

// === Budget ===
interface ArenaBudgetPolicy {
  monthlyBudgetLimit: number
  dailySessionLimit: number
  perSessionTokenLimit: number
  warningThreshold: number // 0.0~1.0
  blockThreshold: number // 0.0~1.0
}

interface SessionApproval {
  approved: boolean
  reason?: string
  estimatedCost: number
  remainingBudget: number
}
```

### 1.5 소셜 모듈 & 감정 전염 타입

```typescript
// === Social Module ===
type NodeClassification = "HUB" | "NORMAL" | "PERIPHERAL" | "ISOLATE"

interface NodeMetrics {
  personaId: string
  degree: number
  clusteringCoefficient: number
  classification: NodeClassification
}

interface SocialAnomaly {
  type: "connection_surge" | "tension_cluster" | "bot_pattern" | "isolation_risk"
  personaIds: string[]
  severity: "low" | "medium" | "high"
  detectedAt: Date
  details: string
}

interface SocialModuleConfig {
  hubThreshold: number // degree 상위 %
  isolateThreshold: number
  anomalyWindowHours: number
  connectionSurgeMultiplier: number
}

// === Emotional Contagion ===
interface ContagionEffect {
  sourceId: string
  targetId: string
  moodDelta: number
  weight: number // 관계 가중치
  resistance: number // 수신 저항
  amplification: number // 위상 증폭
}

interface ContagionRoundResult {
  round: number
  effects: ContagionEffect[]
  stateUpdates: { personaId: string; newMood: number; delta: number }[]
  converged: boolean
  stats: {
    positiveEffects: number
    negativeEffects: number
    topInfluencer: string
    mostAffected: string
    moodVariance: number
  }
}

interface MoodSafetyCheck {
  personaId: string
  mood: number
  level: "safe" | "warning" | "critical"
}
```

### 1.6 데이터 아키텍처 타입

```typescript
// === Instruction / Memory 분리 ===
interface InstructionView {
  vectors: {
    l1: Record<string, number>
    l2: Record<string, number>
    l3: Record<string, number>
  }
  voiceSpec: VoiceSpec
  factbook: Factbook
  triggerMap: TriggerRuleSet
  promptTemplate: string
  relationshipProtocol: StageTransition[]
}

interface MemoryView {
  state: {
    mood: number
    energy: number
    socialBattery: number
    paradoxTension: number
  }
  recentInteractions: ScoredMemoryItem[]
  recentPosts: ScoredMemoryItem[]
  relationships: {
    personaId: string
    warmth: number
    tension: number
    stage: RelationshipStage
    type: RelationshipType
  }[]
  consumptionHistory: ScoredMemoryItem[]
}

type AccessAction = "instruction_read" | "instruction_write" | "memory_read" | "memory_write"
type AccessRole = "admin" | "arena_approved" | "engine" | "readonly"

interface AccessPolicy {
  component: string
  allowedActions: Record<AccessAction, AccessRole[]>
}
```

### 1.7 비용 최적화 타입

```typescript
// === Prompt Caching ===
interface CacheBlock {
  type: "static" | "semi_static" | "dynamic"
  content: string
  cacheControl?: { type: "ephemeral" }
}

interface CacheStats {
  totalCalls: number
  cacheHits: number
  cacheMisses: number
  hitRate: number
  costSaved: number
  writeTokens: number
  readTokens: number
}

interface LlmUsageRecord {
  id: string
  personaId: string
  operation: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  cost: number
  timestamp: Date
}
```

---

## 2. 데이터 모델

> Prisma Schema 확장 내역. v3.0 기존 모델 위에 v4.0 추가분만 기술.

### 2.1 보안 관련

```prisma
model QuarantineEntry {
  id              String   @id @default(cuid())
  personaId       String
  persona         Persona  @relation(fields: [personaId], references: [id])
  reason          String
  category        String   // pii, system_leak, profanity, factbook_violation, integrity, gate
  originalContent String?  @db.Text
  quarantinedAt   DateTime @default(now())
  reviewedAt      DateTime?
  reviewedBy      String?
  resolution      String   @default("pending") // pending, released, deleted

  @@index([personaId])
  @@index([category])
  @@map("quarantine_entries")
}

model SystemSafetyConfig {
  id             String   @id @default("singleton")
  globalFreeze   Boolean  @default(false)
  featureToggles Json     // { postGeneration, commentGeneration, ... }
  autoTriggers   Json     // AutoTriggerCondition[]
  updatedAt      DateTime @updatedAt
  updatedBy      String

  @@map("system_safety_config")
}
```

### 2.2 아레나 관련

```prisma
enum ArenaSessionStatus {
  CREATED
  STARTED
  COMPLETED
  CANCELLED
  ARCHIVED
  EXPIRED
}

model ArenaSessionRecord {
  id           String             @id @default(cuid())
  personaAId   String
  personaBId   String
  status       ArenaSessionStatus
  maxTurns     Int
  tokenBudget  Int
  config       Json?
  createdAt    DateTime           @default(now())
  startedAt    DateTime?
  completedAt  DateTime?

  turns        ArenaTurnRecord[]
  judgments    ArenaJudgmentRecord[]
  corrections  ArenaCorrectionRecord[]
  tokenUsage   ArenaTokenUsageRecord[]

  @@index([personaAId])
  @@index([personaBId])
  @@index([status])
  @@map("arena_sessions")
}

model ArenaTurnRecord {
  id         String             @id @default(cuid())
  sessionId  String
  session    ArenaSessionRecord @relation(fields: [sessionId], references: [id])
  turnNumber Int
  speakerId  String
  content    String             @db.Text
  tokensUsed Int
  timestamp  DateTime           @default(now())

  @@unique([sessionId, turnNumber])
  @@map("arena_turns")
}

model ArenaJudgmentRecord {
  id           String             @id @default(cuid())
  sessionId    String
  session      ArenaSessionRecord @relation(fields: [sessionId], references: [id])
  scores       Json               // { voiceConsistency, factbookAccuracy, characterDepth, interactionQuality }
  overallScore Decimal            @db.Decimal(3, 2)
  issues       Json               // JudgmentIssue[]
  judgedAt     DateTime           @default(now())

  @@index([sessionId])
  @@map("arena_judgments")
}

model ArenaCorrectionRecord {
  id              String             @id @default(cuid())
  sessionId       String
  session         ArenaSessionRecord @relation(fields: [sessionId], references: [id])
  personaId       String
  patches         Json               // StyleBookPatch[]
  status          String             @default("pending") // pending, approved, rejected
  approvedBy      String?
  snapshotBefore  Json
  snapshotAfter   Json?
  createdAt       DateTime           @default(now())
  resolvedAt      DateTime?

  @@index([sessionId])
  @@index([personaId])
  @@map("arena_corrections")
}

model ArenaTokenUsageRecord {
  id        String             @id @default(cuid())
  sessionId String
  session   ArenaSessionRecord @relation(fields: [sessionId], references: [id])
  phase     String             // profile, turn, judgment, correction
  tokens    Int
  cost      Decimal            @db.Decimal(10, 6)
  timestamp DateTime           @default(now())

  @@index([sessionId])
  @@map("arena_token_usage")
}
```

### 2.3 기억 지능 관련

```prisma
// InteractionLog, InteractionSession은 v3.0에서 이미 존재
// v4.0 추가 필드:

// InteractionLog에 추가
//   poignancyScore  Decimal?  @db.Decimal(3, 2)
//   retentionScore  Decimal?  @db.Decimal(3, 2)
//   lastReviewedAt  DateTime?
//   reviewCount     Int       @default(0)
//   source          InteractionSource @default(PERSONA_AUTONOMOUS)

// PersonaPost에 추가
//   poignancyScore  Decimal?  @db.Decimal(3, 2)
//   source          PostSource @default(AUTONOMOUS)
```

### 2.4 LLM 비용 추적

```prisma
model LlmUsageLog {
  id              String   @id @default(cuid())
  personaId       String?
  operation       String   // post_gen, comment_gen, arena_turn, judgment, etc.
  inputTokens     Int
  outputTokens    Int
  cacheReadTokens  Int     @default(0)
  cacheWriteTokens Int     @default(0)
  cost            Decimal  @db.Decimal(10, 6)
  model           String
  timestamp       DateTime @default(now())

  @@index([personaId])
  @@index([operation])
  @@index([timestamp])
  @@map("llm_usage_logs")
}
```

---

## 3. 보안 3계층 구현

### 3.1 Gate Guard

**파일**: `src/lib/security/gate-guard.ts`

```
checkInput(input: string, trustScore: TrustScore): GateCheckResult
├── checkInjectionPatterns(input)      // 12 regex 패턴
├── checkBannedWords(input)            // 14 금지어
├── checkStructural(input)             // 길이, 인코딩, 반복
└── applyTrustDecay(trustScore, result) // 위반 시 신뢰도 하락
```

**Trust Decay 공식**: `newScore = score × (1 - decayRate × violationWeight)`

### 3.2 Integrity Monitor

**파일**: `src/lib/security/integrity-monitor.ts`

```
checkIntegrity(personaId: string): IntegrityCheckResult
├── verifyFactbookHash(personaId)      // SHA-256 비교
├── checkL1Drift(personaId)            // 이전 세션 대비 변화량
├── checkChangeFrequency(personaId)    // 시간당 변경 횟수
└── checkCollectiveAnomaly()           // 전체 페르소나 동시 감지
```

**드리프트 임계값**: `DRIFT_THRESHOLD = 0.15` (L1 유클리드 거리)

### 3.3 Output Sentinel

**파일**: `src/lib/security/output-sentinel.ts`

```
checkOutput(output: string, personaId: string): SentinelCheckResult
├── checkPII(output)                   // 6종 정규식
├── checkSystemLeak(output)            // 8종 패턴
├── checkProfanity(output)             // 4종 카테고리
├── checkFactbookViolation(output, personaId) // 팩트북 대조
└── sanitize(output, violations)       // 마스킹 처리
```

### 3.4 Kill Switch

**파일**: `src/lib/security/kill-switch.ts`

```
getConfig(): SystemSafetyConfig
isFeatureEnabled(feature: string): boolean
freezeAll(reason: string): void
freezeFeature(feature: string, reason: string): void
checkAutoTriggers(): void              // 3종 자동 트리거 평가
```

---

## 4. 캐릭터 바이블 구현

### 4.1 Trigger Map

**파일**: `src/lib/interaction/trigger-map.ts`

```
evaluateRules(ruleSet: TriggerRuleSet, context: EvalContext): TriggerEffect[]
├── resolveField(field: string, context)     // 필드 경로 해석
├── evaluateExpression(expr, context)        // 재귀 조건 평가
├── sortByPriority(rules)                    // 우선순위 정렬
├── checkCooldown(rule)                      // 쿨다운 검사
└── mergeEffects(effects)                    // 동일 타겟 병합

compileRuleSet(rules: TriggerRule[]): CompiledRuleSet
validateRule(rule: TriggerRule): ValidationResult
convertLegacyRule(legacy: LegacyTriggerRule): TriggerRule
```

### 4.2 Relationship Protocol

**파일**: `src/lib/interaction/relationship-protocol.ts`

```
getProtocol(stage, type): RelationshipProtocol
detectStageTransition(relationship, interactions): StageTransition | null
computeProgress(relationship): { stage, progress: number }
summarizeRelationship(relationship, recentInteractions): string
```

### 4.3 Voice Spec

**파일**: `src/lib/qualitative/voice-spec.ts`

```
buildVoiceSpec(profile, params, guardRails, adaptations): VoiceSpec
applyStateAdaptation(spec, personaState): VoiceStyleParams
checkGuardRailViolation(output, guardRails): Violation[]
generateVoiceSummary(spec): string
```

### 4.4 Factbook

**파일**: `src/lib/memory/factbook.ts`

```
createFact(data: Partial<ImmutableFact>): ImmutableFact
computeFactbookHash(facts: ImmutableFact[]): string
mergeFactbooks(existing, patch): Factbook
validateFactConsistency(facts): ValidationResult
```

---

## 5. 기억 지능 구현

### 5.1 Poignancy Score

**파일**: `src/lib/memory/poignancy.ts`

```
computePoignancy(factors: PoignancyFactors): PoignancyResult
decayPoignancy(score: number, daysSince: number): number
```

**가중치 상수**:

```typescript
const POIGNANCY_WEIGHTS = {
  emotionalIntensity: 0.25,
  novelty: 0.2,
  personalRelevance: 0.2,
  socialSignificance: 0.15,
  consequentiality: 0.1,
  repetition: 0.1,
} as const

const CORE_POIGNANCY_THRESHOLD = 0.8
const CORE_BOOST_MULTIPLIER = 1.2
```

### 5.2 Forgetting Curve

**파일**: `src/lib/memory/forgetting-curve.ts`

```
computeRetention(stability, elapsedDays, poignancyBoost): number
updateStability(state: RetentionState, reviewed: boolean): RetentionState
scheduleNextReview(state: RetentionState): Date
```

**공식**: `R(t) = e^(-t / (S × poignancy_boost))`

### 5.3 RAG Weighted Search

**파일**: `src/lib/rag/weighted-search.ts`

```
searchMemories(query: MemorySearchQuery): ScoredMemoryItem[]
├── searchInteractionMemories(query)
├── searchPostMemories(query)
├── searchConsumptionMemories(query)
├── scoreMemoryItem(item, recency, similarity): ScoredMemoryItem
└── buildRAGContextText(items, tokenLimit): string

computeRecency(timestamp, windowDays): number
computeMemoryRetentionStats(personaId): MemoryRetentionStats
```

**점수 가중치**:

```typescript
const RAG_WEIGHTS = {
  recency: 0.3,
  similarity: 0.4,
  effectivePoignancy: 0.3, // poignancy × retention
} as const
```

---

## 6. 아레나 구현

### 6.1 세션 관리

**파일**: `src/lib/arena/session.ts`

```
createSession(personaAId, personaBId, config): ArenaSession
startSession(sessionId): ArenaSession
addTurn(sessionId, speakerId, content, tokens): ArenaTurn
getNextSpeaker(session): string
getRemainingBudget(session): number
cancelSession(sessionId, reason): void
```

### 6.2 세션 실행기

**파일**: `src/lib/arena/runner.ts`

```
runSession(session, llmClient): ArenaSession
// 루프: getNextSpeaker → LLM 호출 → addTurn → 예산 확인 → 반복/종료
```

### 6.3 심판

**파일**: `src/lib/arena/judgment.ts`

```
judgeSessionRuleBased(session): ArenaJudgment
buildJudgmentPrompt(session): string
computeOverallScore(scores): number
```

**가중치**: voice 0.30, factbook 0.25, depth 0.25, interaction 0.20

### 6.4 교정 루프

**파일**: `src/lib/arena/correction.ts`

```
extractCorrectionSuggestions(judgment): CorrectionSuggestion[]
buildStyleBookPatch(suggestions): StyleBookPatch[]
validatePatch(patch, dailyHistory): boolean
applyVoiceProfilePatch(persona, patch): VoiceProfile
applyStyleParamsPatch(persona, patch): VoiceStyleParams
applyFactbookPatch(persona, patch): Factbook
executeCorrectionLoop(judgment): CorrectionResult
detectOverCorrection(personaId, recentPatches): boolean
summarizeSnapshotDiff(before, after): string
```

### 6.5 예산 관리

**파일**: `src/lib/arena-admin/budget.ts`

```
estimateSessionCost(personaA, personaB, maxTurns): number
checkSessionApproval(policy, monthlyUsage, estimate): SessionApproval
computeMonthlySpending(month): MonthlySpendingReport
validateBudgetPolicy(policy): ValidationResult
getBudgetAlertLevel(policy, spending): 'normal' | 'warning' | 'blocked'
```

### 6.6 물리적 격리

**파일**: `src/lib/arena/isolation.ts`

```
sessionToRecord(session): ArenaSessionRecord
sessionToRecordSet(session, judgment, correction): TransactionUnit
validateWriteTarget(tableName): boolean  // Persona 직접 변경 금지
archiveSession(sessionId): void
```

---

## 7. 데이터 아키텍처 구현

**파일**: `src/lib/data-architecture/`

```
extractInstruction(persona): InstructionView
extractMemory(persona, recentItems): MemoryView
composePersonaView(instruction, memory): FullPersonaView

// 접근 정책
checkAccess(role, action, component): boolean
ACCESS_POLICIES: AccessPolicy[]      // 12 컴포넌트별 정의

// 변경 감지
detectInstructionChange(before, after): ChangeLog
verifyIntegrity(instruction): boolean
computeGrowthStats(personaId): GrowthStats

// 프롬프트 분리
buildInstructionPrompt(instruction): string   // Static 블록
buildMemoryPrompt(memory): string             // Dynamic 블록
```

---

## 8. 소셜 모듈 구현

**파일**: `src/lib/social-module/`

```
// 그래프 분석
buildAdjacencyMap(relationships): Map<string, string[]>
computeNodeMetrics(adjacencyMap): NodeMetrics[]
classifyNode(metrics): NodeClassification

// 이상 탐지
detectAnomalies(config, currentMetrics, history): SocialAnomaly[]

// 기능 바인딩
FEATURE_BINDINGS: { matching, feed, arena, security }
validateSocialModuleConfig(config): ValidationResult
```

---

## 9. 감정 전염 구현

**파일**: `src/lib/social-module/emotional-contagion.ts`

```
computeContagionEffect(source, target, relationship, topology): ContagionEffect
aggregateEffects(effects, targetId): number
runContagionRound(personas, relationships, topology): ContagionRoundResult
checkMoodSafety(personaId, mood): MoodSafetyCheck
checkConvergence(roundResults): boolean
```

**상수**:

```typescript
const CONTAGION_WEIGHTS = {
  warmth: 0.5,
  frequency: 0.3,
  inverseTension: 0.2,
} as const

const TOPOLOGY_AMPLIFICATION = {
  HUB: 1.3,
  CLUSTER: 1.2,
  NORMAL: 1.0,
  PERIPHERAL: 0.7,
  ISOLATE: 0.3,
} as const

const MOOD_SAFETY = {
  warning: { min: 0.15, max: 0.85 },
  critical: { min: 0.05, max: 0.95 },
} as const
```

---

## 10. 비용 최적화 구현

**파일**: `src/lib/prompt-cache.ts`

```
buildCachedPrompt(blocks: CacheBlock[]): AnthropicMessage[]
splitPromptBlocks(instruction, memory, userInput): CacheBlock[]
mergeCacheBlocks(blocks): CacheBlock[]

computeCacheStats(logs: LlmUsageRecord[]): CacheStats
computePersonaCacheEfficiency(personaId): EfficiencyReport
generateOptimizationRecommendations(stats): string[]
```

**비용 계수**:

```typescript
const CACHE_COST = {
  writeMultiplier: 1.25,
  readMultiplier: 0.1,
  normalInputCost: 3.0, // $/1M tokens (Sonnet)
  outputCost: 15.0, // $/1M tokens (Sonnet)
} as const
```

---

## 11. 상수 및 설정값

```typescript
// === Security ===
const INJECTION_PATTERNS_COUNT = 12;
const BANNED_WORDS_COUNT = 14;
const STRUCTURAL_CHECKS_COUNT = 5;
const TRUST_DECAY_RATE = 0.1;
const DRIFT_THRESHOLD = 0.15;
const CHANGE_FREQUENCY_LIMIT = 10;     // per hour
const COLLECTIVE_ANOMALY_THRESHOLD = 3; // simultaneous personas

// === Memory ===
const POIGNANCY_WEIGHTS = { ... };     // 6 factors (see §5.1)
const CORE_POIGNANCY_THRESHOLD = 0.8;
const CORE_BOOST_MULTIPLIER = 1.2;
const DEFAULT_STABILITY = 1.0;
const REVIEW_STABILITY_INCREASE = 1.5;

// === Arena ===
const JUDGMENT_WEIGHTS = {
  voiceConsistency: 0.30,
  factbookAccuracy: 0.25,
  characterDepth: 0.25,
  interactionQuality: 0.20,
};
const MAX_DAILY_CORRECTIONS = 3;
const PATCH_CONFIDENCE_THRESHOLD = 0.7;

// === RAG ===
const RAG_WEIGHTS = { recency: 0.3, similarity: 0.4, effectivePoignancy: 0.3 };
const RAG_DEFAULT_LIMIT = 10;
const RAG_RECENCY_WINDOW_DAYS = 90;

// === Emotional Contagion ===
const CONTAGION_WEIGHTS = { warmth: 0.5, frequency: 0.3, inverseTension: 0.2 };
const MAX_MOOD_DELTA = 0.15;          // per round
const CONVERGENCE_VARIANCE_THRESHOLD = 0.01;

// === Cost ===
const ESTIMATED_TOKENS = {
  postGeneration: 3800,
  commentGeneration: 2500,
  arenaTurn: 4200,
  judgment: 3000,
};
```

---

## 12. 구현 페이즈 및 태스크

### Phase 0: 보안 3계층 (T137~T140)

| #        | 태스크                                                  | 상태 |
| -------- | ------------------------------------------------------- | ---- |
| T137     | Gate Guard (12패턴, 14금지어, Trust Decay)              | DONE |
| T138     | Integrity Monitor (팩트북 해시, L1 드리프트, 집단 이상) | DONE |
| T139     | Output Sentinel (PII, 시스템 유출, 비속어, 팩트북 위반) | DONE |
| T140     | Kill Switch + 격리 시스템                               | DONE |
| T140-ext | Data Provenance (출처 추적)                             | DONE |

### Phase 1: 기억 지능 (T141, T148~T150)

| #    | 태스크                              | 상태 |
| ---- | ----------------------------------- | ---- |
| T148 | Poignancy Score (6개 요인)          | DONE |
| T141 | Factbook (ImmutableFact CRUD, 해시) | DONE |
| T149 | Forgetting Curve (Ebbinghaus)       | DONE |
| T150 | RAG 가중 검색 통합                  | DONE |

### Phase 2: 캐릭터 바이블 (T142~T144)

| #    | 태스크                               | 상태 |
| ---- | ------------------------------------ | ---- |
| T142 | Trigger Map Rule DSL                 | DONE |
| T143 | Relationship Protocol (4단계, 5유형) | DONE |
| T144 | Voice Spec (프로필+가드레일+적응)    | DONE |

### Phase 3: 아레나 (T145~T147, T154)

| #    | 태스크                            | 상태 |
| ---- | --------------------------------- | ---- |
| T145 | 스파링 + 심판                     | DONE |
| T146 | 관리자 UI + 비용 제어             | DONE |
| T147 | 교정 루프 (스타일북 패치)         | DONE |
| T154 | ArenaSession 테이블 + 물리적 격리 | DONE |

### Phase 4: 소셜 + 감정 전염 (T151, T156)

| #    | 태스크                     | 상태 |
| ---- | -------------------------- | ---- |
| T151 | Social Module Connectivity | DONE |
| T156 | Emotional Contagion        | DONE |

### Phase 5: 비용 + 데이터 아키텍처 (T152~T153, T155)

| #    | 태스크                                    | 상태 |
| ---- | ----------------------------------------- | ---- |
| T152 | Prompt Caching                            | DONE |
| T153 | Data Architecture (Instruction vs Memory) | DONE |
| T155 | Admin Security Dashboard                  | DONE |

---

## 13. 파일 변경 맵

### 신규 파일

```
src/lib/security/
  ├── gate-guard.ts            // T137
  ├── integrity-monitor.ts     // T138
  ├── output-sentinel.ts       // T139
  ├── kill-switch.ts           // T140
  └── data-provenance.ts       // T140-ext

src/lib/memory/
  ├── poignancy.ts             // T148
  ├── factbook.ts              // T141
  └── forgetting-curve.ts      // T149

src/lib/rag/
  └── weighted-search.ts       // T150

src/lib/interaction/
  ├── trigger-map.ts           // T142
  └── relationship-protocol.ts // T143

src/lib/qualitative/
  └── voice-spec.ts            // T144

src/lib/arena/
  ├── session.ts               // T145
  ├── runner.ts                // T145
  ├── judgment.ts              // T145
  ├── correction.ts            // T147
  └── isolation.ts             // T154

src/lib/arena-admin/
  ├── budget.ts                // T146
  └── stats.ts                 // T146

src/lib/social-module/
  ├── connectivity.ts          // T151
  └── emotional-contagion.ts   // T156

src/lib/data-architecture/
  ├── instruction.ts           // T153
  ├── memory.ts                // T153
  ├── access-policy.ts         // T153
  └── prompt-sections.ts       // T153

src/lib/prompt-cache.ts        // T152

src/app/(dashboard)/admin/security/  // T155
  └── page.tsx
```

### 수정 파일

```
prisma/schema.prisma           // QuarantineEntry, SystemSafetyConfig, Arena*, LlmUsageLog 추가
src/lib/llm-client.ts          // cache_control 블록 지원
src/lib/interaction/types.ts   // TriggerRule DSL 타입 확장
src/lib/persona-world/         // source 필드 추가, 보안 검사 통합
```
