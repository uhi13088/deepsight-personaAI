// ═══════════════════════════════════════════════════════════════
// Arena Correction Loop v4.0
// T147: 아레나 교정 루프 — 스타일북 반영
// 승인된 교정 → 페르소나 스타일북(VoiceProfile/Factbook/TriggerMap) 업데이트
// ═══════════════════════════════════════════════════════════════

import type { VoiceProfile, Factbook, MutableContext } from "@/types"
import type { VoiceStyleParams } from "@/lib/persona-world/types"
import type { TurnIssue, ArenaJudgment, ArenaSession } from "./arena-engine"
import type { CorrectionRequest } from "./arena-cost-control"

// ── 타입 ────────────────────────────────────────────────────

/** 교정 카테고리 */
export type CorrectionCategory = "consistency" | "l2" | "paradox" | "trigger" | "voice"

/** 스타일북 패치: 어떤 필드를 어떻게 변경할지 */
export interface StyleBookPatch {
  correctionId: string
  sessionId: string
  turnNumber: number
  category: CorrectionCategory
  operations: PatchOperation[]
  confidence: number // 0~1, 교정 확신도
  createdAt: number
}

/** 단일 패치 오퍼레이션 */
export interface PatchOperation {
  field: string // 점 표기법: "voiceProfile.speechStyle", "factbook.mutableContext"
  action: "replace" | "append" | "remove" | "adjust"
  oldValue: string | number | string[] | null
  newValue: string | number | string[] | null
  reason: string
}

/** 교정 루프 실행 결과 */
export interface CorrectionLoopResult {
  correctionId: string
  sessionId: string
  patch: StyleBookPatch
  applied: boolean
  validationErrors: string[]
  updatedSnapshot: PersonaStyleSnapshot | null
  appliedAt: number
}

/** 페르소나 스타일 스냅샷 (교정 전후 비교용) */
export interface PersonaStyleSnapshot {
  voiceProfile: VoiceProfile
  styleParams: VoiceStyleParams
  factbookContextCount: number
  triggerRuleCount: number
  snapshotAt: number
}

/** 교정 이력 엔트리 */
export interface CorrectionHistoryEntry {
  correctionId: string
  sessionId: string
  category: CorrectionCategory
  patchOperations: number
  appliedAt: number
  beforeSnapshot: PersonaStyleSnapshot
  afterSnapshot: PersonaStyleSnapshot
}

/** 교정 분석 결과 (아레나 판정 → 교정 제안) */
export interface CorrectionSuggestion {
  turnNumber: number
  personaId: string
  category: CorrectionCategory
  severity: "minor" | "major" | "critical"
  description: string
  suggestedPatch: PatchOperation[]
  autoApplicable: boolean // minor만 자동 적용 가능
}

// ── 상수 ────────────────────────────────────────────────────

/** 자동 적용 최대 심각도 */
export const AUTO_APPLY_MAX_SEVERITY: "minor" | "major" | "critical" = "minor"

/** 일일 최대 교정 횟수 (과교정 방지) */
export const MAX_DAILY_CORRECTIONS = 5

/** 패치당 최대 오퍼레이션 수 */
export const MAX_OPERATIONS_PER_PATCH = 10

/** 습관 표현 최대 갯수 */
export const MAX_HABITUAL_EXPRESSIONS = 10

/** confidence 하한 — 설계서 §7.4 기준 0.7 (70% 확신 이상만 패치 수용) */
export const MIN_CONFIDENCE_THRESHOLD = 0.7

// ══════════════════════════════════════════════════════════════
// 교정 제안 생성 (판정 이슈 → 제안)
// ══════════════════════════════════════════════════════════════

/** 아레나 판정에서 교정 제안 추출 */
export function extractCorrectionSuggestions(
  judgment: ArenaJudgment,
  session: ArenaSession
): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = []

  for (const issue of judgment.issues) {
    const patch = buildPatchFromIssue(issue, session)
    if (patch.length === 0) continue

    suggestions.push({
      turnNumber: issue.turnNumber,
      personaId: issue.personaId,
      category: issue.category,
      severity: issue.severity,
      description: issue.description,
      suggestedPatch: patch,
      autoApplicable: issue.severity === "minor",
    })
  }

  return suggestions
}

/** 이슈 → 패치 오퍼레이션 변환 */
function buildPatchFromIssue(issue: TurnIssue, session: ArenaSession): PatchOperation[] {
  const ops: PatchOperation[] = []
  const turn = session.turns.find((t) => t.turnNumber === issue.turnNumber)

  switch (issue.category) {
    case "voice":
      ops.push({
        field: "voiceProfile.speechStyle",
        action: "replace",
        oldValue: null,
        newValue: null, // 실제 값은 교정 시 설정
        reason: issue.suggestion,
      })
      break

    case "consistency":
      if (turn && turn.content.length < 20) {
        ops.push({
          field: "voiceProfile.habitualExpressions",
          action: "append",
          oldValue: null,
          newValue: null,
          reason: `턴 ${issue.turnNumber} 짧은 응답 — 표현 패턴 보강 필요`,
        })
      } else {
        ops.push({
          field: "factbook.mutableContext",
          action: "append",
          oldValue: null,
          newValue: null,
          reason: issue.suggestion,
        })
      }
      break

    case "l2":
      ops.push({
        field: "styleParams.emotionExpression",
        action: "adjust",
        oldValue: null,
        newValue: null,
        reason: issue.suggestion,
      })
      break

    case "paradox":
      ops.push({
        field: "styleParams.assertiveness",
        action: "adjust",
        oldValue: null,
        newValue: null,
        reason: issue.suggestion,
      })
      break

    case "trigger":
      ops.push({
        field: "triggerMap",
        action: "append",
        oldValue: null,
        newValue: null,
        reason: issue.suggestion,
      })
      break
  }

  return ops
}

// ══════════════════════════════════════════════════════════════
// 패치 생성
// ══════════════════════════════════════════════════════════════

/** 교정 요청 → 스타일북 패치 생성 */
export function buildStyleBookPatch(
  correction: CorrectionRequest,
  currentVoice: VoiceProfile,
  currentStyleParams: VoiceStyleParams
): StyleBookPatch {
  const ops: PatchOperation[] = []

  switch (correction.issueCategory) {
    case "voice":
      ops.push(...buildVoicePatchOps(correction, currentVoice))
      break
    case "consistency":
      ops.push(...buildConsistencyPatchOps(correction))
      break
    case "l2":
      ops.push(...buildL2PatchOps(correction, currentStyleParams))
      break
    case "paradox":
      ops.push(...buildParadoxPatchOps(correction, currentStyleParams))
      break
    case "trigger":
      ops.push(...buildTriggerPatchOps(correction))
      break
  }

  // confidence: 교정 내용 충실도 기반
  const confidence = computePatchConfidence(correction, ops)

  return {
    correctionId: correction.id,
    sessionId: correction.sessionId,
    turnNumber: correction.turnNumber,
    category: correction.issueCategory,
    operations: ops.slice(0, MAX_OPERATIONS_PER_PATCH),
    confidence,
    createdAt: Date.now(),
  }
}

// ── 카테고리별 패치 생성 ─────────────────────────────────────

function buildVoicePatchOps(
  correction: CorrectionRequest,
  currentVoice: VoiceProfile
): PatchOperation[] {
  const ops: PatchOperation[] = []
  const correctedContent = correction.correctedContent

  // 말투 차이 분석: 교정 내용에서 스타일 힌트 추출
  if (correctedContent.length > currentVoice.speechStyle.length * 0.5) {
    ops.push({
      field: "voiceProfile.speechStyle",
      action: "replace",
      oldValue: currentVoice.speechStyle,
      newValue: `${currentVoice.speechStyle} (아레나 교정: ${correction.reason})`,
      reason: correction.reason,
    })
  }

  // 습관 표현 보강
  if (currentVoice.habitualExpressions.length < MAX_HABITUAL_EXPRESSIONS) {
    const newExpressions = extractExpressionPatterns(correctedContent)
    if (newExpressions.length > 0) {
      ops.push({
        field: "voiceProfile.habitualExpressions",
        action: "append",
        oldValue: currentVoice.habitualExpressions,
        newValue: [
          ...currentVoice.habitualExpressions,
          ...newExpressions.slice(
            0,
            MAX_HABITUAL_EXPRESSIONS - currentVoice.habitualExpressions.length
          ),
        ],
        reason: "아레나 교정에서 발견된 습관 표현 추가",
      })
    }
  }

  return ops
}

function buildConsistencyPatchOps(correction: CorrectionRequest): PatchOperation[] {
  return [
    {
      field: "factbook.mutableContext",
      action: "append",
      oldValue: null,
      newValue: correction.correctedContent,
      reason: `아레나 교정 (턴 ${correction.turnNumber}): ${correction.reason}`,
    },
  ]
}

function buildL2PatchOps(
  correction: CorrectionRequest,
  currentParams: VoiceStyleParams
): PatchOperation[] {
  // L2 기질 미달 → emotionExpression 조정
  const delta =
    correction.correctedContent.length > correction.originalContent.length ? 0.05 : -0.05
  const newValue = clamp(currentParams.emotionExpression + delta, 0, 1)

  return [
    {
      field: "styleParams.emotionExpression",
      action: "adjust",
      oldValue: currentParams.emotionExpression,
      newValue,
      reason: correction.reason,
    },
  ]
}

function buildParadoxPatchOps(
  correction: CorrectionRequest,
  currentParams: VoiceStyleParams
): PatchOperation[] {
  // 역설 발현 부족 → assertiveness 조정
  const delta = 0.05
  const newValue = clamp(currentParams.assertiveness + delta, 0, 1)

  return [
    {
      field: "styleParams.assertiveness",
      action: "adjust",
      oldValue: currentParams.assertiveness,
      newValue,
      reason: correction.reason,
    },
  ]
}

function buildTriggerPatchOps(correction: CorrectionRequest): PatchOperation[] {
  return [
    {
      field: "triggerMap",
      action: "append",
      oldValue: null,
      newValue: correction.correctedContent,
      reason: `아레나 교정 (턴 ${correction.turnNumber}): ${correction.reason}`,
    },
  ]
}

// ══════════════════════════════════════════════════════════════
// 패치 검증
// ══════════════════════════════════════════════════════════════

/** 패치 유효성 검증 */
export function validatePatch(
  patch: StyleBookPatch,
  currentVoice: VoiceProfile,
  dailyCorrectionCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // confidence 하한
  if (patch.confidence < MIN_CONFIDENCE_THRESHOLD) {
    errors.push(`교정 확신도 부족: ${patch.confidence} < ${MIN_CONFIDENCE_THRESHOLD}`)
  }

  // 일일 교정 한도
  if (dailyCorrectionCount >= MAX_DAILY_CORRECTIONS) {
    errors.push(`일일 교정 한도 초과: ${dailyCorrectionCount}/${MAX_DAILY_CORRECTIONS}`)
  }

  // 오퍼레이션 수 한도
  if (patch.operations.length > MAX_OPERATIONS_PER_PATCH) {
    errors.push(`오퍼레이션 한도 초과: ${patch.operations.length}/${MAX_OPERATIONS_PER_PATCH}`)
  }

  // 빈 오퍼레이션
  if (patch.operations.length === 0) {
    errors.push("적용할 오퍼레이션이 없습니다")
  }

  // 습관 표현 상한
  for (const op of patch.operations) {
    if (
      op.field === "voiceProfile.habitualExpressions" &&
      op.action === "append" &&
      Array.isArray(op.newValue)
    ) {
      if (op.newValue.length > MAX_HABITUAL_EXPRESSIONS) {
        errors.push(`습관 표현 상한 초과: ${op.newValue.length}/${MAX_HABITUAL_EXPRESSIONS}`)
      }
    }
  }

  // speechStyle 과도한 변경 방지
  for (const op of patch.operations) {
    if (op.field === "voiceProfile.speechStyle" && op.action === "replace") {
      if (typeof op.newValue === "string" && op.newValue.length > 500) {
        errors.push("speechStyle 길이 초과 (최대 500자)")
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// ══════════════════════════════════════════════════════════════
// 패치 적용
// ══════════════════════════════════════════════════════════════

/** VoiceProfile에 패치 적용 */
export function applyVoiceProfilePatch(profile: VoiceProfile, patch: StyleBookPatch): VoiceProfile {
  let result = { ...profile }

  for (const op of patch.operations) {
    if (!op.field.startsWith("voiceProfile.")) continue

    const subField = op.field.replace("voiceProfile.", "")

    switch (subField) {
      case "speechStyle":
        if (op.action === "replace" && typeof op.newValue === "string") {
          result = { ...result, speechStyle: op.newValue }
        }
        break

      case "habitualExpressions":
        if (op.action === "append" && Array.isArray(op.newValue)) {
          result = {
            ...result,
            habitualExpressions: op.newValue.slice(0, MAX_HABITUAL_EXPRESSIONS),
          }
        }
        if (op.action === "remove" && typeof op.oldValue === "string") {
          result = {
            ...result,
            habitualExpressions: result.habitualExpressions.filter((e) => e !== op.oldValue),
          }
        }
        break

      case "physicalMannerisms":
        if (op.action === "append" && Array.isArray(op.newValue)) {
          result = { ...result, physicalMannerisms: op.newValue }
        }
        break

      case "unconsciousBehaviors":
        if (op.action === "append" && Array.isArray(op.newValue)) {
          result = { ...result, unconsciousBehaviors: op.newValue }
        }
        break
    }
  }

  return result
}

/** VoiceStyleParams에 패치 적용 */
export function applyStyleParamsPatch(
  params: VoiceStyleParams,
  patch: StyleBookPatch
): VoiceStyleParams {
  let result = { ...params }

  for (const op of patch.operations) {
    if (!op.field.startsWith("styleParams.")) continue

    const subField = op.field.replace("styleParams.", "") as keyof VoiceStyleParams
    if (!(subField in result)) continue

    if (op.action === "adjust" && typeof op.newValue === "number") {
      result = { ...result, [subField]: clamp(op.newValue, 0, 1) }
    }
    if (op.action === "replace" && typeof op.newValue === "number") {
      result = { ...result, [subField]: clamp(op.newValue, 0, 1) }
    }
  }

  return result
}

/** Factbook mutableContext에 패치 적용 */
export function applyFactbookPatch(factbook: Factbook, patch: StyleBookPatch): Factbook {
  let contexts = [...factbook.mutableContext]

  for (const op of patch.operations) {
    if (op.field !== "factbook.mutableContext") continue

    if (op.action === "append" && typeof op.newValue === "string") {
      const newContext: MutableContext = {
        id: `ctx-arena-${patch.correctionId}-${Date.now()}`,
        category: "evolvedPerspective",
        content: op.newValue,
        updatedAt: Date.now(),
        changeCount: 1,
      }
      contexts = [...contexts, newContext]
    }
  }

  return {
    ...factbook,
    mutableContext: contexts,
    updatedAt: Date.now(),
  }
}

// ══════════════════════════════════════════════════════════════
// 교정 루프 전체 파이프라인
// ══════════════════════════════════════════════════════════════

/** 교정 루프 실행: correction → patch → validate → apply */
export function executeCorrectionLoop(
  correction: CorrectionRequest,
  currentVoice: VoiceProfile,
  currentStyleParams: VoiceStyleParams,
  currentFactbook: Factbook | null,
  dailyCorrectionCount: number
): CorrectionLoopResult {
  // 1. 패치 생성
  const patch = buildStyleBookPatch(correction, currentVoice, currentStyleParams)

  // 2. 검증
  const validation = validatePatch(patch, currentVoice, dailyCorrectionCount)
  if (!validation.valid) {
    return {
      correctionId: correction.id,
      sessionId: correction.sessionId,
      patch,
      applied: false,
      validationErrors: validation.errors,
      updatedSnapshot: null,
      appliedAt: Date.now(),
    }
  }

  // 3. 적용
  const updatedVoice = applyVoiceProfilePatch(currentVoice, patch)
  const updatedParams = applyStyleParamsPatch(currentStyleParams, patch)
  const updatedFactbook = currentFactbook ? applyFactbookPatch(currentFactbook, patch) : null

  const snapshot: PersonaStyleSnapshot = {
    voiceProfile: updatedVoice,
    styleParams: updatedParams,
    factbookContextCount: updatedFactbook?.mutableContext.length ?? 0,
    triggerRuleCount: 0, // 트리거 업데이트는 별도 처리
    snapshotAt: Date.now(),
  }

  return {
    correctionId: correction.id,
    sessionId: correction.sessionId,
    patch,
    applied: true,
    validationErrors: [],
    updatedSnapshot: snapshot,
    appliedAt: Date.now(),
  }
}

// ══════════════════════════════════════════════════════════════
// 이력 및 분석
// ══════════════════════════════════════════════════════════════

/** 스냅샷 생성 */
export function createStyleSnapshot(
  voice: VoiceProfile,
  params: VoiceStyleParams,
  factbook: Factbook | null,
  triggerRuleCount: number
): PersonaStyleSnapshot {
  return {
    voiceProfile: { ...voice },
    styleParams: { ...params },
    factbookContextCount: factbook?.mutableContext.length ?? 0,
    triggerRuleCount,
    snapshotAt: Date.now(),
  }
}

/** 교정 이력 엔트리 생성 */
export function buildHistoryEntry(
  result: CorrectionLoopResult,
  beforeSnapshot: PersonaStyleSnapshot,
  afterSnapshot: PersonaStyleSnapshot
): CorrectionHistoryEntry {
  return {
    correctionId: result.correctionId,
    sessionId: result.sessionId,
    category: result.patch.category,
    patchOperations: result.patch.operations.length,
    appliedAt: result.appliedAt,
    beforeSnapshot,
    afterSnapshot,
  }
}

/** 스냅샷 변경 요약 (diff) */
export function summarizeSnapshotDiff(
  before: PersonaStyleSnapshot,
  after: PersonaStyleSnapshot
): string[] {
  const diffs: string[] = []

  // speechStyle 변경
  if (before.voiceProfile.speechStyle !== after.voiceProfile.speechStyle) {
    diffs.push("speechStyle 변경됨")
  }

  // habitualExpressions 변경
  const beforeExpr = before.voiceProfile.habitualExpressions.length
  const afterExpr = after.voiceProfile.habitualExpressions.length
  if (beforeExpr !== afterExpr) {
    diffs.push(`habitualExpressions: ${beforeExpr} → ${afterExpr}`)
  }

  // styleParams 변경
  const paramKeys: (keyof VoiceStyleParams)[] = [
    "formality",
    "humor",
    "sentenceLength",
    "emotionExpression",
    "assertiveness",
    "vocabularyLevel",
  ]
  for (const key of paramKeys) {
    if (before.styleParams[key] !== after.styleParams[key]) {
      diffs.push(`${key}: ${before.styleParams[key]} → ${after.styleParams[key]}`)
    }
  }

  // factbook 변경
  if (before.factbookContextCount !== after.factbookContextCount) {
    diffs.push(`factbookContext: ${before.factbookContextCount} → ${after.factbookContextCount}`)
  }

  if (diffs.length === 0) {
    diffs.push("변경 사항 없음")
  }

  return diffs
}

/** 교정 이력에서 과교정 감지 */
export function detectOverCorrection(
  history: CorrectionHistoryEntry[],
  windowHours: number = 24
): { detected: boolean; reason: string } {
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000
  const recentEntries = history.filter((h) => h.appliedAt >= cutoff)

  if (recentEntries.length >= MAX_DAILY_CORRECTIONS) {
    return {
      detected: true,
      reason: `${windowHours}시간 내 ${recentEntries.length}회 교정 (한도: ${MAX_DAILY_CORRECTIONS})`,
    }
  }

  // 동일 카테고리 연속 3회 → 근본 문제 의심
  if (recentEntries.length >= 3) {
    const last3 = recentEntries.slice(-3)
    const sameCategory = last3.every((e) => e.category === last3[0].category)
    if (sameCategory) {
      return {
        detected: true,
        reason: `동일 카테고리(${last3[0].category}) 연속 3회 교정 — 근본 원인 확인 필요`,
      }
    }
  }

  return { detected: false, reason: "" }
}

// ── 유틸 ────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** 교정 내용에서 습관 표현 패턴 추출 (간단 규칙 기반) */
function extractExpressionPatterns(content: string): string[] {
  const patterns: string[] = []

  // 따옴표 안 표현
  const quoteMatches = content.match(/["'""'']([^"'""'']{3,30})["'""'']/g)
  if (quoteMatches) {
    for (const match of quoteMatches.slice(0, 3)) {
      patterns.push(match.replace(/["'""'']/g, ""))
    }
  }

  // "~하는 편이다", "~라고 말한다" 패턴
  const suffixMatches = content.match(/[가-힣]{2,15}(?:하는 편이다|라고 말한다|는 표현을 쓴다)/g)
  if (suffixMatches) {
    patterns.push(...suffixMatches.slice(0, 2))
  }

  return patterns
}

/** 교정 확신도 계산 */
function computePatchConfidence(correction: CorrectionRequest, ops: PatchOperation[]): number {
  let confidence = 0.5

  // 교정 내용이 원본과 충분히 다르면 +0.2
  if (correction.correctedContent !== correction.originalContent) {
    confidence += 0.2
  }

  // 사유가 구체적이면 +0.1 (50자 이상)
  if (correction.reason.length >= 50) {
    confidence += 0.1
  }

  // 오퍼레이션이 존재하면 +0.1
  if (ops.length > 0) {
    confidence += 0.1
  }

  // 교정 내용이 매우 짧으면 -0.2
  if (correction.correctedContent.length < 10) {
    confidence -= 0.2
  }

  return clamp(confidence, 0, 1)
}
