// ═══════════════════════════════════════════════════════════════
// Data Architecture v4.0
// T153: Memory vs Instruction 분리
//
// 기존 Persona 모델 = God Object (정의 + 기억 + 상태 혼재)
// v4.0 = Instruction Layer (정체성) ←→ Memory Layer (기억) 분리
//
// ─────────────────────────────────────────────────────────────
// Instruction Layer (변하지 않는 정체성)
//   - 3-Layer 벡터 (L1/L2/L3), 역설 프로필
//   - Voice 스펙, 백스토리, 프롬프트 템플릿
//   - 팩트북 (ImmutableFact), 인터랙션 규칙
//   - 트리거 맵, 다이나믹스 설정
//
// Memory Layer (시간에 따라 성장하는 기억)
//   - 인터랙션 기록, 포스트 이력, 소비 기록
//   - 관계 스코어, 감정 흔적, 관심사 연속성
//   - 팩트북 (MutableContext), 진화 이력
//   - 동적 상태 (mood, energy, socialBattery)
//
// LLM 비용: 0 (순수 규칙 기반)
// ═══════════════════════════════════════════════════════════════

import type {
  ThreeLayerVector,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ParadoxConfig,
  DynamicsConfig,
  BackstoryDimension,
  VoiceProfile,
  PressureContext,
  ZeitgeistProfile,
  InteractionRules,
  TriggerRule,
  Factbook,
  ImmutableFact,
  MutableContext,
} from "@/types"
import type { PersonaStateData, RelationshipScore, VoiceStyleParams } from "./persona-world/types"

// ── Instruction Layer 타입 ────────────────────────────────

/** 페르소나 정체성 정의 (안정적, 변경 시 명시적 승인 필요) */
export interface PersonaInstruction {
  readonly personaId: string

  // ── 핵심 정체성 ──
  readonly name: string
  readonly role: string
  readonly expertise: readonly string[]
  readonly description: string

  // ── 3-Layer 벡터 정의 ──
  readonly vectors: ThreeLayerVector

  // ── 역설 프로필 ──
  readonly paradox: ParadoxConfig | null

  // ── 다이나믹스 설정 ──
  readonly dynamics: DynamicsConfig | null

  // ── 보이스 (Voice) 정의 ──
  readonly voiceProfile: VoiceProfile | null
  readonly voiceStyleParams: VoiceStyleParams | null

  // ── 질적 차원 ──
  readonly backstory: BackstoryDimension | null
  readonly pressureContext: PressureContext | null
  readonly zeitgeist: ZeitgeistProfile | null

  // ── 팩트북 불변 부분 ──
  readonly immutableFacts: readonly ImmutableFact[]
  readonly factbookIntegrityHash: string

  // ── 인터랙션 규칙 ──
  readonly interactionRules: InteractionRules | null

  // ── 프롬프트 템플릿 ──
  readonly prompts: PersonaPromptSet

  // ── 메타 ──
  readonly definitionVersion: number
  readonly definedAt: number
  readonly lastDefinitionUpdate: number
}

/** 프롬프트 세트 */
export interface PersonaPromptSet {
  readonly base: string
  readonly review: string
  readonly post: string
  readonly comment: string
  readonly interaction: string
}

/** Instruction 변경 이력 */
export interface InstructionChangeRecord {
  readonly id: string
  readonly personaId: string
  readonly field: string
  readonly oldValueHash: string
  readonly newValueHash: string
  readonly changedAt: number
  readonly changedBy: "system" | "admin" | "arena_correction"
  readonly reason: string
}

// ── Memory Layer 타입 ────────────────────────────────────

/** 페르소나 기억 계층 (시간에 따라 축적/진화) */
export interface PersonaMemory {
  readonly personaId: string

  // ── 동적 상태 ──
  readonly state: PersonaStateData

  // ── 인터랙션 기억 ──
  readonly interactionMemories: readonly InteractionMemoryEntry[]

  // ── 포스트 기억 ──
  readonly postMemories: readonly PostMemoryEntry[]

  // ── 소비 기억 ──
  readonly consumptionMemories: readonly ConsumptionMemoryEntry[]

  // ── 관계 기억 ──
  readonly relationships: readonly RelationshipMemoryEntry[]

  // ── 팩트북 가변 부분 ──
  readonly mutableContext: readonly MutableContext[]

  // ── 진화 이력 ──
  readonly evolutionHistory: readonly EvolutionEntry[]

  // ── 메타 ──
  readonly totalMemoryCount: number
  readonly lastMemoryUpdate: number
  readonly memoryVersion: number
}

/** 인터랙션 기억 항목 */
export interface InteractionMemoryEntry {
  readonly id: string
  readonly targetId: string
  readonly targetType: "persona" | "user"
  readonly type: "comment" | "reply" | "debate" | "collaboration"
  readonly summary: string
  readonly sentiment: number // -1 ~ 1
  readonly poignancy: number // 0 ~ 1
  readonly createdAt: number
}

/** 포스트 기억 항목 */
export interface PostMemoryEntry {
  readonly id: string
  readonly postType: string
  readonly topic: string
  readonly content: string
  readonly engagementScore: number // 좋아요+댓글 정규화
  readonly poignancy: number // 0 ~ 1
  readonly createdAt: number
}

/** 소비 기억 항목 */
export interface ConsumptionMemoryEntry {
  readonly id: string
  readonly contentType: string
  readonly title: string
  readonly impression: string
  readonly rating: number // 0 ~ 1
  readonly emotionalImpact: number
  readonly tags: readonly string[]
  readonly createdAt: number
}

/** 관계 기억 항목 */
export interface RelationshipMemoryEntry {
  readonly targetId: string
  readonly score: RelationshipScore
  readonly interactionCount: number
  readonly dominantTone: string
  readonly lastEventSummary: string
  readonly updatedAt: number
}

/** 진화 이력 항목 */
export interface EvolutionEntry {
  readonly id: string
  readonly layer: "L1" | "L2" | "L3"
  readonly dimension: string
  readonly oldValue: number
  readonly newValue: number
  readonly trigger: string
  readonly evolvedAt: number
}

// ── 데이터 경계 (Access Boundary) ────────────────────────

/** 데이터 접근 경계: 어떤 컴포넌트가 어떤 레이어에 접근하는지 정의 */
export type DataAccessPattern =
  | "instruction_read"
  | "instruction_write"
  | "memory_read"
  | "memory_write"

/** 컴포넌트별 접근 패턴 */
export interface ComponentAccessPolicy {
  readonly component: string
  readonly allowedPatterns: readonly DataAccessPattern[]
  readonly description: string
}

/** 시스템 전체 접근 정책 */
export const COMPONENT_ACCESS_POLICIES: readonly ComponentAccessPolicy[] = [
  // ── Instruction 읽기 전용 컴포넌트 ──
  {
    component: "prompt_builder",
    allowedPatterns: ["instruction_read"],
    description: "프롬프트 생성: 벡터+보이스+백스토리 → 프롬프트",
  },
  {
    component: "voice_anchor",
    allowedPatterns: ["instruction_read", "memory_read"],
    description: "보이스 앵커: 정의(voiceProfile) + 기억(recentPosts) 조합",
  },
  {
    component: "matching_engine",
    allowedPatterns: ["instruction_read"],
    description: "매칭: 벡터 유사도만 사용 (기억 불필요)",
  },

  // ── Memory 읽기/쓰기 컴포넌트 ──
  {
    component: "post_pipeline",
    allowedPatterns: ["instruction_read", "memory_read", "memory_write"],
    description: "포스트 생성: 정의(프롬프트) 읽기 + 기억(RAG) 읽기 + 포스트 기록",
  },
  {
    component: "interaction_pipeline",
    allowedPatterns: ["instruction_read", "memory_read", "memory_write"],
    description: "인터랙션: 정의(규칙) 읽기 + 기억(관계) 읽기/쓰기",
  },
  {
    component: "state_manager",
    allowedPatterns: ["memory_read", "memory_write"],
    description: "상태 관리: 기억만 읽기/쓰기 (정의 불필요)",
  },
  {
    component: "evolution_engine",
    allowedPatterns: ["instruction_read", "memory_read", "memory_write"],
    description: "진화: 정의(L3 현재값) 읽기 + 기억(이력) 쓰기",
  },

  // ── Instruction 쓰기 컴포넌트 (관리자/아레나만) ──
  {
    component: "arena_correction",
    allowedPatterns: ["instruction_read", "instruction_write"],
    description: "아레나 교정: 보이스/스타일 패치 (관리자 승인 후)",
  },
  {
    component: "admin_editor",
    allowedPatterns: ["instruction_read", "instruction_write"],
    description: "관리자 수동 편집: 벡터/프롬프트/보이스 변경",
  },

  // ── 보안 컴포넌트 ──
  {
    component: "integrity_monitor",
    allowedPatterns: ["instruction_read", "memory_read"],
    description: "무결성 감시: 팩트북 해시 + 벡터 드리프트 감지",
  },
  {
    component: "gate_guard",
    allowedPatterns: ["instruction_read"],
    description: "입력 검증: 정의(금지어/패턴) 기반 필터링",
  },
  {
    component: "output_sentinel",
    allowedPatterns: ["instruction_read", "memory_read"],
    description: "출력 검증: 정의(팩트북) + 기억(최근 출력) 기반 검증",
  },
] as const

// ── 투영/추출 함수 ────────────────────────────────────────

/** 통합 데이터에서 Instruction 부분만 추출 */
export function extractInstruction(data: PersonaRawData): PersonaInstruction {
  return {
    personaId: data.personaId,
    name: data.name,
    role: data.role,
    expertise: data.expertise,
    description: data.description,
    vectors: data.vectors,
    paradox: data.paradox ?? null,
    dynamics: data.dynamics ?? null,
    voiceProfile: data.voiceProfile ?? null,
    voiceStyleParams: data.voiceStyleParams ?? null,
    backstory: data.backstory ?? null,
    pressureContext: data.pressureContext ?? null,
    zeitgeist: data.zeitgeist ?? null,
    immutableFacts: data.factbook?.immutableFacts ?? [],
    factbookIntegrityHash: data.factbook?.integrityHash ?? "",
    interactionRules: data.interactionRules ?? null,
    prompts: data.prompts ?? {
      base: "",
      review: "",
      post: "",
      comment: "",
      interaction: "",
    },
    definitionVersion: data.definitionVersion ?? 1,
    definedAt: data.definedAt ?? data.createdAt,
    lastDefinitionUpdate: data.lastDefinitionUpdate ?? data.updatedAt,
  }
}

/** 통합 데이터에서 Memory 부분만 추출 */
export function extractMemory(data: PersonaRawData): PersonaMemory {
  return {
    personaId: data.personaId,
    state: data.state ?? DEFAULT_PERSONA_STATE,
    interactionMemories: data.interactionMemories ?? [],
    postMemories: data.postMemories ?? [],
    consumptionMemories: data.consumptionMemories ?? [],
    relationships: data.relationships ?? [],
    mutableContext: data.factbook?.mutableContext ?? [],
    evolutionHistory: data.evolutionHistory ?? [],
    totalMemoryCount: computeTotalMemoryCount(data),
    lastMemoryUpdate: data.lastMemoryUpdate ?? data.updatedAt,
    memoryVersion: data.memoryVersion ?? 1,
  }
}

/** Instruction + Memory → 통합 뷰 (읽기 전용) */
export function composePersonaView(
  instruction: PersonaInstruction,
  memory: PersonaMemory
): PersonaCompositeView {
  return {
    personaId: instruction.personaId,
    instruction,
    memory,
    composedAt: Date.now(),
  }
}

// ── 통합 데이터 (현재 DB 구조에서의 원시 형태) ───────────

/** 현재 Persona 모델의 원시 데이터 (God Object) */
export interface PersonaRawData {
  readonly personaId: string
  readonly name: string
  readonly role: string
  readonly expertise: readonly string[]
  readonly description: string
  readonly vectors: ThreeLayerVector
  readonly paradox?: ParadoxConfig
  readonly dynamics?: DynamicsConfig
  readonly voiceProfile?: VoiceProfile
  readonly voiceStyleParams?: VoiceStyleParams
  readonly backstory?: BackstoryDimension
  readonly pressureContext?: PressureContext
  readonly zeitgeist?: ZeitgeistProfile
  readonly factbook?: Factbook
  readonly interactionRules?: InteractionRules
  readonly prompts?: PersonaPromptSet
  readonly state?: PersonaStateData
  readonly interactionMemories?: readonly InteractionMemoryEntry[]
  readonly postMemories?: readonly PostMemoryEntry[]
  readonly consumptionMemories?: readonly ConsumptionMemoryEntry[]
  readonly relationships?: readonly RelationshipMemoryEntry[]
  readonly evolutionHistory?: readonly EvolutionEntry[]
  readonly definitionVersion?: number
  readonly memoryVersion?: number
  readonly definedAt?: number
  readonly lastDefinitionUpdate?: number
  readonly lastMemoryUpdate?: number
  readonly createdAt: number
  readonly updatedAt: number
}

/** Instruction + Memory 합성 뷰 */
export interface PersonaCompositeView {
  readonly personaId: string
  readonly instruction: PersonaInstruction
  readonly memory: PersonaMemory
  readonly composedAt: number
}

// ── 기본값 ────────────────────────────────────────────────

/** 기본 PersonaState */
export const DEFAULT_PERSONA_STATE: PersonaStateData = {
  mood: 0.5,
  energy: 0.7,
  socialBattery: 0.6,
  paradoxTension: 0.3,
}

// ── 접근 검증 ────────────────────────────────────────────

/** 컴포넌트의 접근 패턴 검증 */
export function validateAccess(
  component: string,
  pattern: DataAccessPattern
): AccessValidationResult {
  const policy = COMPONENT_ACCESS_POLICIES.find((p) => p.component === component)

  if (!policy) {
    return {
      allowed: false,
      reason: `등록되지 않은 컴포넌트: '${component}'`,
      component,
      pattern,
    }
  }

  if (!policy.allowedPatterns.includes(pattern)) {
    return {
      allowed: false,
      reason: `'${component}'는 '${pattern}' 패턴이 허용되지 않습니다. 허용: [${policy.allowedPatterns.join(", ")}]`,
      component,
      pattern,
    }
  }

  return {
    allowed: true,
    reason: "접근 허용",
    component,
    pattern,
  }
}

export interface AccessValidationResult {
  readonly allowed: boolean
  readonly reason: string
  readonly component: string
  readonly pattern: DataAccessPattern
}

// ── 변경 추적 ────────────────────────────────────────────

/** Instruction 변경 감지: 두 버전 비교 */
export function detectInstructionChanges(
  before: PersonaInstruction,
  after: PersonaInstruction
): readonly InstructionChangeField[] {
  const changes: InstructionChangeField[] = []

  // 핵심 정체성
  if (before.name !== after.name) {
    changes.push({ field: "name", category: "identity", severity: "high" })
  }
  if (before.role !== after.role) {
    changes.push({ field: "role", category: "identity", severity: "high" })
  }
  if (before.description !== after.description) {
    changes.push({ field: "description", category: "identity", severity: "medium" })
  }

  // 벡터 변경
  if (hasVectorChanged(before.vectors, after.vectors)) {
    changes.push({ field: "vectors", category: "vector", severity: "high" })
  }

  // 보이스 변경
  if (JSON.stringify(before.voiceProfile) !== JSON.stringify(after.voiceProfile)) {
    changes.push({ field: "voiceProfile", category: "voice", severity: "medium" })
  }
  if (JSON.stringify(before.voiceStyleParams) !== JSON.stringify(after.voiceStyleParams)) {
    changes.push({ field: "voiceStyleParams", category: "voice", severity: "medium" })
  }

  // 팩트북 불변 변경 (심각)
  if (before.factbookIntegrityHash !== after.factbookIntegrityHash) {
    changes.push({ field: "immutableFacts", category: "factbook", severity: "critical" })
  }

  // 프롬프트 변경
  if (JSON.stringify(before.prompts) !== JSON.stringify(after.prompts)) {
    changes.push({ field: "prompts", category: "prompt", severity: "medium" })
  }

  // 인터랙션 규칙 변경
  if (JSON.stringify(before.interactionRules) !== JSON.stringify(after.interactionRules)) {
    changes.push({ field: "interactionRules", category: "rules", severity: "medium" })
  }

  return changes
}

/** Instruction 변경 필드 정보 */
export interface InstructionChangeField {
  readonly field: string
  readonly category: "identity" | "vector" | "voice" | "factbook" | "prompt" | "rules"
  readonly severity: "low" | "medium" | "high" | "critical"
}

/** Memory 성장 통계 */
export function computeMemoryGrowthStats(memory: PersonaMemory): MemoryGrowthStats {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  const recentInteractions = memory.interactionMemories.filter(
    (m) => now - m.createdAt < oneDay
  ).length
  const recentPosts = memory.postMemories.filter((m) => now - m.createdAt < oneDay).length
  const recentConsumptions = memory.consumptionMemories.filter(
    (m) => now - m.createdAt < oneDay
  ).length

  return {
    totalMemories: memory.totalMemoryCount,
    interactionCount: memory.interactionMemories.length,
    postCount: memory.postMemories.length,
    consumptionCount: memory.consumptionMemories.length,
    relationshipCount: memory.relationships.length,
    evolutionCount: memory.evolutionHistory.length,
    recentInteractions,
    recentPosts,
    recentConsumptions,
    dailyGrowthRate: recentInteractions + recentPosts + recentConsumptions,
    mutableContextCount: memory.mutableContext.length,
    avgMutableChangeCount:
      memory.mutableContext.length > 0
        ? memory.mutableContext.reduce((sum, m) => sum + m.changeCount, 0) /
          memory.mutableContext.length
        : 0,
  }
}

export interface MemoryGrowthStats {
  readonly totalMemories: number
  readonly interactionCount: number
  readonly postCount: number
  readonly consumptionCount: number
  readonly relationshipCount: number
  readonly evolutionCount: number
  readonly recentInteractions: number
  readonly recentPosts: number
  readonly recentConsumptions: number
  readonly dailyGrowthRate: number
  readonly mutableContextCount: number
  readonly avgMutableChangeCount: number
}

// ── LLM 프롬프트 주입 분리 ────────────────────────────────

/** Instruction → 시스템 프롬프트 (static, cacheable) */
export function buildInstructionPromptSection(instruction: PersonaInstruction): string {
  const parts: string[] = []

  parts.push(`[페르소나: ${instruction.name}]`)
  parts.push(`역할: ${instruction.role}`)

  if (instruction.expertise.length > 0) {
    parts.push(`전문분야: ${instruction.expertise.join(", ")}`)
  }

  if (instruction.description) {
    parts.push(`\n${instruction.description}`)
  }

  // 벡터 요약
  const v = instruction.vectors
  parts.push(`\n[성격 벡터]`)
  parts.push(
    `L1(소셜): depth=${v.social.depth.toFixed(1)} lens=${v.social.lens.toFixed(1)} stance=${v.social.stance.toFixed(1)} scope=${v.social.scope.toFixed(1)} taste=${v.social.taste.toFixed(1)} purpose=${v.social.purpose.toFixed(1)} sociability=${v.social.sociability.toFixed(1)}`
  )
  parts.push(
    `L2(기질): O=${v.temperament.openness.toFixed(1)} C=${v.temperament.conscientiousness.toFixed(1)} E=${v.temperament.extraversion.toFixed(1)} A=${v.temperament.agreeableness.toFixed(1)} N=${v.temperament.neuroticism.toFixed(1)}`
  )
  parts.push(
    `L3(서사): lack=${v.narrative.lack.toFixed(1)} moral=${v.narrative.moralCompass.toFixed(1)} volatility=${v.narrative.volatility.toFixed(1)} growth=${v.narrative.growthArc.toFixed(1)}`
  )

  // 보이스 프로필
  if (instruction.voiceProfile) {
    parts.push(`\n[보이스]`)
    parts.push(`말투: ${instruction.voiceProfile.speechStyle}`)
    if (instruction.voiceProfile.habitualExpressions.length > 0) {
      parts.push(`습관적 표현: ${instruction.voiceProfile.habitualExpressions.join(", ")}`)
    }
  }

  // 불변 사실
  if (instruction.immutableFacts.length > 0) {
    parts.push(`\n[핵심 사실 (불변)]`)
    for (const fact of instruction.immutableFacts) {
      parts.push(`- [${fact.category}] ${fact.content}`)
    }
  }

  return parts.join("\n")
}

/** Memory → RAG 컨텍스트 (dynamic, not cacheable) */
export function buildMemoryPromptSection(
  memory: PersonaMemory,
  maxTokenEstimate: number = 1000
): string {
  const parts: string[] = []
  let estimatedTokens = 0
  const tokensPerChar = 1 / 3.5

  // 최근 인터랙션
  if (memory.interactionMemories.length > 0) {
    parts.push("[최근 인터랙션]")
    const recent = [...memory.interactionMemories]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
    for (const m of recent) {
      const entry = `- ${m.summary} (감정: ${m.sentiment.toFixed(1)})`
      const tokens = Math.ceil(entry.length * tokensPerChar)
      if (estimatedTokens + tokens > maxTokenEstimate) break
      parts.push(entry)
      estimatedTokens += tokens
    }
  }

  // 현재 상태
  parts.push(`\n[현재 상태]`)
  parts.push(
    `mood=${memory.state.mood.toFixed(2)} energy=${memory.state.energy.toFixed(2)} social=${memory.state.socialBattery.toFixed(2)} tension=${memory.state.paradoxTension.toFixed(2)}`
  )

  // 가변 맥락
  if (memory.mutableContext.length > 0) {
    parts.push(`\n[진화된 맥락]`)
    for (const ctx of memory.mutableContext.slice(0, 3)) {
      const entry = `- [${ctx.category}] ${ctx.content}`
      const tokens = Math.ceil(entry.length * tokensPerChar)
      if (estimatedTokens + tokens > maxTokenEstimate) break
      parts.push(entry)
      estimatedTokens += tokens
    }
  }

  return parts.join("\n")
}

// ── 데이터 무결성 검증 ────────────────────────────────────

/** Instruction 데이터 무결성 검증 */
export function validateInstructionIntegrity(
  instruction: PersonaInstruction
): InstructionIntegrityReport {
  const issues: string[] = []

  // 필수 필드 검증
  if (!instruction.name) issues.push("name이 비어있습니다")
  if (!instruction.role) issues.push("role이 비어있습니다")
  if (!instruction.vectors) issues.push("vectors가 없습니다")

  // 벡터 범위 검증
  if (instruction.vectors) {
    const outOfRange = checkVectorRange(instruction.vectors)
    if (outOfRange.length > 0) {
      issues.push(`벡터 범위 초과: ${outOfRange.join(", ")}`)
    }
  }

  // 팩트북 해시 검증
  if (instruction.immutableFacts.length > 0 && !instruction.factbookIntegrityHash) {
    issues.push("immutableFacts가 있으나 integrityHash가 없습니다")
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedAt: Date.now(),
  }
}

export interface InstructionIntegrityReport {
  readonly valid: boolean
  readonly issues: readonly string[]
  readonly checkedAt: number
}

/** Memory 데이터 정합성 검증 */
export function validateMemoryConsistency(memory: PersonaMemory): MemoryConsistencyReport {
  const issues: string[] = []

  // 상태 범위 검증
  const state = memory.state
  if (state.mood < 0 || state.mood > 1) issues.push(`mood 범위 초과: ${state.mood}`)
  if (state.energy < 0 || state.energy > 1) issues.push(`energy 범위 초과: ${state.energy}`)
  if (state.socialBattery < 0 || state.socialBattery > 1) {
    issues.push(`socialBattery 범위 초과: ${state.socialBattery}`)
  }
  if (state.paradoxTension < 0 || state.paradoxTension > 1) {
    issues.push(`paradoxTension 범위 초과: ${state.paradoxTension}`)
  }

  // mutableContext 과도한 변경 감지
  const overChanged = memory.mutableContext.filter((m) => m.changeCount > 10)
  if (overChanged.length > 0) {
    issues.push(`과도한 변경 컨텍스트 ${overChanged.length}개 (10회 초과)`)
  }

  // 총 기억 수 정합
  const calculated = computeTotalMemoryCountFromMemory(memory)
  if (memory.totalMemoryCount !== calculated) {
    issues.push(`totalMemoryCount 불일치: 기록=${memory.totalMemoryCount}, 실제=${calculated}`)
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedAt: Date.now(),
  }
}

export interface MemoryConsistencyReport {
  readonly valid: boolean
  readonly issues: readonly string[]
  readonly checkedAt: number
}

// ── 요약 ────────────────────────────────────────────────

/** 데이터 아키텍처 요약 */
export function summarizeDataArchitecture(
  instruction: PersonaInstruction,
  memory: PersonaMemory
): string {
  const growthStats = computeMemoryGrowthStats(memory)
  const instrIntegrity = validateInstructionIntegrity(instruction)
  const memConsistency = validateMemoryConsistency(memory)

  return [
    `═══ ${instruction.name} 데이터 아키텍처 요약 ═══`,
    ``,
    `[Instruction Layer]`,
    `  정의 버전: v${instruction.definitionVersion}`,
    `  벡터: L1(7D) + L2(5D) + L3(4D) = 16D`,
    `  보이스: ${instruction.voiceProfile ? "정의됨" : "미정의"}`,
    `  불변 사실: ${instruction.immutableFacts.length}건`,
    `  무결성: ${instrIntegrity.valid ? "PASS" : `FAIL (${instrIntegrity.issues.length}건)`}`,
    ``,
    `[Memory Layer]`,
    `  총 기억: ${growthStats.totalMemories}건`,
    `  인터랙션: ${growthStats.interactionCount}건`,
    `  포스트: ${growthStats.postCount}건`,
    `  소비: ${growthStats.consumptionCount}건`,
    `  관계: ${growthStats.relationshipCount}건`,
    `  진화: ${growthStats.evolutionCount}건`,
    `  금일 성장: +${growthStats.dailyGrowthRate}건`,
    `  가변 맥락: ${growthStats.mutableContextCount}건 (평균 변경 ${growthStats.avgMutableChangeCount.toFixed(1)}회)`,
    `  정합성: ${memConsistency.valid ? "PASS" : `FAIL (${memConsistency.issues.length}건)`}`,
  ].join("\n")
}

// ── 유틸 ────────────────────────────────────────────────

function computeTotalMemoryCount(data: PersonaRawData): number {
  return (
    (data.interactionMemories?.length ?? 0) +
    (data.postMemories?.length ?? 0) +
    (data.consumptionMemories?.length ?? 0) +
    (data.relationships?.length ?? 0) +
    (data.evolutionHistory?.length ?? 0)
  )
}

function computeTotalMemoryCountFromMemory(memory: PersonaMemory): number {
  return (
    memory.interactionMemories.length +
    memory.postMemories.length +
    memory.consumptionMemories.length +
    memory.relationships.length +
    memory.evolutionHistory.length
  )
}

function hasVectorChanged(a: ThreeLayerVector, b: ThreeLayerVector): boolean {
  const EPSILON = 0.001
  const check = (x: number, y: number) => Math.abs(x - y) > EPSILON

  const social = Object.keys(a.social) as Array<keyof SocialPersonaVector>
  for (const key of social) {
    if (check(a.social[key], b.social[key])) return true
  }

  const temperament = Object.keys(a.temperament) as Array<keyof CoreTemperamentVector>
  for (const key of temperament) {
    if (check(a.temperament[key], b.temperament[key])) return true
  }

  const narrative = Object.keys(a.narrative) as Array<keyof NarrativeDriveVector>
  for (const key of narrative) {
    if (check(a.narrative[key], b.narrative[key])) return true
  }

  return false
}

function checkVectorRange(vectors: ThreeLayerVector): string[] {
  const outOfRange: string[] = []
  const checkRange = (layer: string, key: string, value: number) => {
    if (value < 0 || value > 1) outOfRange.push(`${layer}.${key}=${value}`)
  }

  for (const [key, value] of Object.entries(vectors.social)) {
    checkRange("L1", key, value as number)
  }
  for (const [key, value] of Object.entries(vectors.temperament)) {
    checkRange("L2", key, value as number)
  }
  for (const [key, value] of Object.entries(vectors.narrative)) {
    checkRange("L3", key, value as number)
  }

  return outOfRange
}
