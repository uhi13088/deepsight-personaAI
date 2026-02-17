// ═══════════════════════════════════════════════════════════════
// Daily Batch 워크플로우
// T62-AC1: 스케줄링, 배치 실행 (생성→시험→채점→등록), 결과 저장
// ═══════════════════════════════════════════════════════════════

import { getGoldenSampleConfig, type GoldenSampleConfig } from "./golden-sample"

// ── 타입 정의 ─────────────────────────────────────────────────

export type IncubatorStatus = "PENDING" | "PASSED" | "FAILED" | "APPROVED" | "REJECTED"

export interface BatchStrategy {
  userDriven: number // 유저 분포 기반 (default 0.6)
  exploration: number // 강제 탐험 (default 0.2)
  gapFilling: number // GAP 영역 집중 (default 0.2)
}

export interface DailyBatchConfig {
  batchId: string
  batchDate: Date
  strategy: BatchStrategy
  dailyLimit: number
  goldenSampleConfig: GoldenSampleConfig
  passThreshold: number // 합격 기준 (default 0.9)
}

export interface ConsistencyScoreBreakdown {
  vectorAlignment: number // 벡터-응답 정합성 (weight 0.4)
  toneMatch: number // 말투 일치도 (weight 0.3)
  reasoningQuality: number // 논리 품질 (weight 0.3)
}

export interface IncubatorLogEntry {
  id: string
  batchId: string
  batchDate: Date
  personaConfig: Record<string, unknown> | null
  generatedVector: {
    l1: Record<string, number>
    l2: Record<string, number>
    l3: Record<string, number>
  } | null
  generatedPrompt: string | null
  testSampleIds: string[]
  testResults: Record<string, unknown>[] | null
  consistencyScore: number | null
  scoreBreakdown: ConsistencyScoreBreakdown | null
  status: IncubatorStatus
  createdAt: Date
}

export interface BatchResult {
  batchId: string
  batchDate: Date
  generatedCount: number
  passedCount: number
  failedCount: number
  passRate: number
  estimatedCost: number
  logs: IncubatorLogEntry[]
  durationMs: number
}

// ── 기본 설정 ─────────────────────────────────────────────────

export const DEFAULT_BATCH_STRATEGY: BatchStrategy = {
  userDriven: 0.6,
  exploration: 0.2,
  gapFilling: 0.2,
}

export const DEFAULT_PASS_THRESHOLD = 0.9

// ── 배치 ID 생성 ──────────────────────────────────────────────

export function generateBatchId(date: Date): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "")
  const rand = Math.random().toString(36).slice(2, 8)
  return `batch-${dateStr}-${rand}`
}

// ── 배치 설정 생성 ────────────────────────────────────────────

export function createBatchConfig(
  activePersonaCount: number,
  options?: {
    dailyLimit?: number
    strategy?: Partial<BatchStrategy>
    passThreshold?: number
  }
): DailyBatchConfig {
  const now = new Date()
  const batchId = generateBatchId(now)
  const gsConfig = getGoldenSampleConfig(activePersonaCount)

  const strategy: BatchStrategy = {
    ...DEFAULT_BATCH_STRATEGY,
    ...options?.strategy,
  }

  // 전략 가중치 합이 1.0이 되도록 정규화
  const total = strategy.userDriven + strategy.exploration + strategy.gapFilling
  if (total > 0 && Math.abs(total - 1.0) > 0.01) {
    strategy.userDriven /= total
    strategy.exploration /= total
    strategy.gapFilling /= total
  }

  return {
    batchId,
    batchDate: now,
    strategy,
    dailyLimit: options?.dailyLimit ?? 10,
    goldenSampleConfig: gsConfig,
    passThreshold: options?.passThreshold ?? DEFAULT_PASS_THRESHOLD,
  }
}

// ── Step 1: 생성 (페르소나 벡터 + 설정 생성) ──────────────────

export interface GenerationSlot {
  type: "user_driven" | "exploration" | "gap_filling"
  weight: number
}

export function allocateGenerationSlots(count: number, strategy: BatchStrategy): GenerationSlot[] {
  const slots: GenerationSlot[] = []

  const userCount = Math.round(count * strategy.userDriven)
  const explorationCount = Math.round(count * strategy.exploration)
  const gapCount = count - userCount - explorationCount

  for (let i = 0; i < userCount; i++) {
    slots.push({ type: "user_driven", weight: strategy.userDriven })
  }
  for (let i = 0; i < explorationCount; i++) {
    slots.push({ type: "exploration", weight: strategy.exploration })
  }
  for (let i = 0; i < gapCount; i++) {
    slots.push({ type: "gap_filling", weight: strategy.gapFilling })
  }

  return slots
}

// ── Step 3: 채점 (일관성 점수 계산) ────────────────────────────

const SCORE_WEIGHTS = {
  vectorAlignment: 0.4,
  toneMatch: 0.3,
  reasoningQuality: 0.3,
} as const

export function calculateConsistencyScore(breakdown: ConsistencyScoreBreakdown): number {
  const score =
    breakdown.vectorAlignment * SCORE_WEIGHTS.vectorAlignment +
    breakdown.toneMatch * SCORE_WEIGHTS.toneMatch +
    breakdown.reasoningQuality * SCORE_WEIGHTS.reasoningQuality
  return Math.round(score * 100) / 100
}

// ── Step 4: 등록 (합격/불합격 판정) ────────────────────────────

export function determineStatus(consistencyScore: number, passThreshold: number): IncubatorStatus {
  return consistencyScore >= passThreshold ? "PASSED" : "FAILED"
}

// ── 배치 실행 (전체 파이프라인) ─────────────────────────────────

export function executeBatch(
  config: DailyBatchConfig,
  generateFn: (slot: GenerationSlot) => {
    vector: { l1: Record<string, number>; l2: Record<string, number>; l3: Record<string, number> }
    prompt: string
    config: Record<string, unknown>
  },
  testFn: (
    prompt: string,
    sampleIds: string[]
  ) => {
    results: Record<string, unknown>[]
    breakdown: ConsistencyScoreBreakdown
  }
): BatchResult {
  const startTime = Date.now()
  const slots = allocateGenerationSlots(config.dailyLimit, config.strategy)
  const logs: IncubatorLogEntry[] = []
  let passedCount = 0
  let failedCount = 0

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const logId = `${config.batchId}-${String(i).padStart(3, "0")}`

    // Step 1: 생성
    const generated = generateFn(slot)

    // Step 2: 시험 (골든 샘플 랜덤 선택)
    const sampleIds = selectTestSamples(config.goldenSampleConfig)
    const testResult = testFn(generated.prompt, sampleIds)

    // Step 3: 채점
    const consistencyScore = calculateConsistencyScore(testResult.breakdown)

    // Step 4: 등록
    const status = determineStatus(consistencyScore, config.passThreshold)
    if (status === "PASSED") passedCount++
    else failedCount++

    logs.push({
      id: logId,
      batchId: config.batchId,
      batchDate: config.batchDate,
      personaConfig: generated.config,
      generatedVector: generated.vector,
      generatedPrompt: generated.prompt,
      testSampleIds: sampleIds,
      testResults: testResult.results,
      consistencyScore,
      scoreBreakdown: testResult.breakdown,
      status,
      createdAt: new Date(),
    })
  }

  const generatedCount = logs.length
  const passRate = generatedCount > 0 ? passedCount / generatedCount : 0

  return {
    batchId: config.batchId,
    batchDate: config.batchDate,
    generatedCount,
    passedCount,
    failedCount,
    passRate: Math.round(passRate * 100) / 100,
    estimatedCost: estimateBatchCost(generatedCount),
    logs,
    durationMs: Date.now() - startTime,
  }
}

// ── 골든 샘플 선택 ────────────────────────────────────────────

function selectTestSamples(gsConfig: GoldenSampleConfig): string[] {
  // 실제 구현에서는 DB에서 랜덤 선택
  // 여기서는 설정에 따른 개수만 반환
  const ids: string[] = []
  for (let i = 0; i < gsConfig.samplesPerTest; i++) {
    ids.push(`gs-${crypto.randomUUID().slice(0, 8)}`)
  }
  return ids
}

// ── 비용 추정 ──────────────────────────────────────────────────

const COST_PER_GENERATION_KRW = 5 // GPT-4o-mini 기준
const COST_PER_TEST_KRW = 2

export function estimateBatchCost(generatedCount: number): number {
  return generatedCount * (COST_PER_GENERATION_KRW + COST_PER_TEST_KRW)
}

// ── 배치 결과 요약 ────────────────────────────────────────────

export function summarizeBatch(result: BatchResult): {
  date: string
  generated: number
  passed: number
  failed: number
  passRate: string
  cost: string
  duration: string
} {
  return {
    date: result.batchDate.toISOString().slice(0, 10),
    generated: result.generatedCount,
    passed: result.passedCount,
    failed: result.failedCount,
    passRate: `${Math.round(result.passRate * 100)}%`,
    cost: `₩${result.estimatedCost.toLocaleString()}`,
    duration: `${result.durationMs}ms`,
  }
}
