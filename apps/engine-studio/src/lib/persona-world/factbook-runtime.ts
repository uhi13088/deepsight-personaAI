// ═══════════════════════════════════════════════════════════════
// T163: Factbook 런타임 연동 — mutableContext 업데이트 파이프라인
//
// 순수 함수(factbook.ts) ↔ DB 영속성 + PersonaState 통합.
// 상호작용 후 mutableContext 자동 업데이트 + 변조 감지 + 상태 갱신.
// ═══════════════════════════════════════════════════════════════

import type { Factbook, MutableContext } from "@/types"
import {
  updateMutableContext,
  addMutableContext,
  detectExcessiveChanges,
  verifyFactbookIntegrity,
  MUTABLE_CHANGE_ALERT_THRESHOLD,
} from "./factbook"
import { updatePersonaState } from "./state-manager"
import type { PersonaStateData, StateUpdateEvent } from "./types"

// ── 타입 정의 ────────────────────────────────────────────────

/** 상호작용 데이터 — mutableContext 업데이트 입력 */
export interface InteractionInput {
  type: "comment_received" | "comment_created" | "post_created" | "like_received"
  content?: string
  sentiment?: "positive" | "neutral" | "negative" | "aggressive"
}

/** mutableContext 업데이트 결과 */
export interface MutableContextUpdateResult {
  factbook: Factbook
  updatedCategory: MutableContext["category"]
  changeCount: number
  integrityValid: boolean
  excessiveChanges: MutableContext[]
}

/** 통합 상호작용 처리 결과 */
export interface InteractionProcessResult {
  factbookUpdate: MutableContextUpdateResult | null
  stateUpdate: PersonaStateData
}

/** DB 접근을 위한 데이터 프로바이더 인터페이스 */
export interface FactbookDataProvider {
  getFactbook(personaId: string): Promise<Factbook | null>
  saveFactbook(personaId: string, factbook: Factbook): Promise<void>
}

// ── AC1: mutableContext 런타임 업데이트 ──────────────────────

/**
 * 상호작용 타입 → mutableContext 카테고리 매핑.
 *
 * - comment_received → recentExperience (타인의 반응 = 최근 경험)
 * - comment_created → evolvedPerspective (자기 의견 표현 = 관점 진화)
 * - post_created → currentGoal (글 작성 = 목표/방향 표현)
 * - like_received → recentExperience (긍정 피드백 = 경험 축적)
 */
export function inferContextCategory(interaction: InteractionInput): MutableContext["category"] {
  switch (interaction.type) {
    case "comment_received":
      return "recentExperience"
    case "comment_created":
      return "evolvedPerspective"
    case "post_created":
      return "currentGoal"
    case "like_received":
      return "recentExperience"
  }
}

/**
 * 상호작용에서 mutableContext 콘텐츠 요약 생성.
 *
 * LLM 없이 규칙 기반으로 간결한 요약 생성.
 */
export function summarizeInteraction(interaction: InteractionInput): string {
  const contentSnippet = interaction.content ? interaction.content.slice(0, 100) : ""

  switch (interaction.type) {
    case "comment_received": {
      const sentimentLabel =
        interaction.sentiment === "positive"
          ? "긍정적"
          : interaction.sentiment === "negative"
            ? "부정적"
            : interaction.sentiment === "aggressive"
              ? "공격적"
              : "중립적"
      return contentSnippet
        ? `${sentimentLabel} 반응을 받음: "${contentSnippet}"`
        : `${sentimentLabel} 반응을 받음`
    }
    case "comment_created":
      return contentSnippet ? `의견을 표현함: "${contentSnippet}"` : "댓글을 통해 관점을 표현함"
    case "post_created":
      return contentSnippet ? `새 글을 작성함: "${contentSnippet}"` : "새로운 콘텐츠를 발행함"
    case "like_received":
      return "콘텐츠가 공감을 얻음"
  }
}

/**
 * mutableContext 업데이트 (순수 함수 — DB 미접근).
 *
 * 해당 카테고리의 기존 맥락이 있으면 업데이트, 없으면 추가.
 */
export function applyMutableContextUpdate(
  factbook: Factbook,
  category: MutableContext["category"],
  content: string
): Factbook {
  const existing = factbook.mutableContext.find((ctx) => ctx.category === category)

  if (existing) {
    return updateMutableContext(factbook, existing.id, content)
  }
  return addMutableContext(factbook, category, content)
}

/**
 * AC1: mutableContext 런타임 업데이트 + AC2/AC3 검증.
 *
 * 1. 상호작용 분석 → 카테고리/콘텐츠 결정
 * 2. mutableContext 업데이트 (순수 함수)
 * 3. integrityHash 검증 (AC3: immutableFacts 변조 감지)
 * 4. changeCount 과도 변경 감지 (AC2)
 * 5. DB 영속화
 */
export async function updateMutableContextRuntime(
  personaId: string,
  interaction: InteractionInput,
  dataProvider: FactbookDataProvider
): Promise<MutableContextUpdateResult | null> {
  // 1. DB에서 현재 factbook 조회
  const currentFactbook = await dataProvider.getFactbook(personaId)
  if (!currentFactbook) {
    return null
  }

  // 2. 카테고리/콘텐츠 결정
  const category = inferContextCategory(interaction)
  const content = summarizeInteraction(interaction)

  // 3. mutableContext 업데이트 (순수 함수)
  const updatedFactbook = applyMutableContextUpdate(currentFactbook, category, content)

  // 4. AC3: integrityHash 검증 — immutableFacts 변조 감지
  const integrity = await verifyFactbookIntegrity(updatedFactbook)
  if (!integrity.valid) {
    console.error(
      `[FACTBOOK-INTEGRITY] personaId=${personaId}: immutableFacts 변조 감지! ` +
        `expected=${integrity.expectedHash}, actual=${integrity.actualHash}`
    )
  }

  // 5. AC2: changeCount 과도 변경 감지
  const excessiveChanges = detectExcessiveChanges(updatedFactbook)
  if (excessiveChanges.length > 0) {
    for (const ctx of excessiveChanges) {
      console.warn(
        `[FACTBOOK-EXCESSIVE-CHANGE] personaId=${personaId}, ` +
          `category=${ctx.category}, contextId=${ctx.id}, ` +
          `changeCount=${ctx.changeCount} (threshold=${MUTABLE_CHANGE_ALERT_THRESHOLD}). ` +
          `검토 필요: 변경 빈도가 과도합니다.`
      )
    }
  }

  // 6. DB 영속화
  await dataProvider.saveFactbook(personaId, updatedFactbook)

  // 업데이트된 카테고리의 changeCount 추출
  const updatedCtx = updatedFactbook.mutableContext.find((ctx) => ctx.category === category)
  const changeCount = updatedCtx?.changeCount ?? 0

  return {
    factbook: updatedFactbook,
    updatedCategory: category,
    changeCount,
    integrityValid: integrity.valid,
    excessiveChanges,
  }
}

// ── AC4: PersonaState 통합 처리 ─────────────────────────────

/**
 * 상호작용 → StateUpdateEvent 변환.
 */
export function toStateEvent(interaction: InteractionInput): StateUpdateEvent {
  switch (interaction.type) {
    case "comment_received":
      return {
        type: "comment_received",
        sentiment: interaction.sentiment ?? "neutral",
      }
    case "comment_created":
      return { type: "comment_created", tokensUsed: 0 }
    case "post_created":
      return { type: "post_created", tokensUsed: 0 }
    case "like_received":
      return { type: "like_received" }
  }
}

/**
 * AC4: 통합 상호작용 처리 파이프라인.
 *
 * 1. mutableContext 업데이트 (AC1/AC2/AC3)
 * 2. PersonaState 갱신 (mood/energy/socialBattery)
 *
 * 두 작업을 순차 실행 (factbook 변조 감지가 먼저 완료되어야 안전).
 */
export async function processInteraction(
  personaId: string,
  interaction: InteractionInput,
  dataProvider: FactbookDataProvider
): Promise<InteractionProcessResult> {
  // Step 1: mutableContext 업데이트
  const factbookUpdate = await updateMutableContextRuntime(personaId, interaction, dataProvider)

  // Step 2: PersonaState 갱신
  const stateEvent = toStateEvent(interaction)
  const stateUpdate = await updatePersonaState(personaId, stateEvent)

  return {
    factbookUpdate,
    stateUpdate,
  }
}
