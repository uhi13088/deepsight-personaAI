// ═══════════════════════════════════════════════════════════════
// Trigger Map — Rule DSL
// T142: 자연어 조건 → 구조화된 기계 평가 가능 표현식으로 확장
// ═══════════════════════════════════════════════════════════════

import type { TriggerRule } from "@/types"

// ── 표현식 타입 ──────────────────────────────────────────────

export type CompareOp = ">" | ">=" | "<" | "<=" | "==" | "!="

/** 숫자 비교 표현식 */
export interface CompareExpr {
  type: "compare"
  field: string // "L2.neuroticism", "state.mood"
  op: CompareOp
  value: number
}

/** 범위 포함 표현식 */
export interface RangeExpr {
  type: "range"
  field: string
  min: number
  max: number
}

/** 문자열 포함 표현식 */
export interface ContainsExpr {
  type: "contains"
  field: string // "context.text", "context.keywords"
  value: string
}

/** AND 논리 조합 */
export interface AndExpr {
  type: "and"
  conditions: RuleExpression[]
}

/** OR 논리 조합 */
export interface OrExpr {
  type: "or"
  conditions: RuleExpression[]
}

/** NOT 논리 부정 */
export interface NotExpr {
  type: "not"
  condition: RuleExpression
}

export type RuleExpression = CompareExpr | RangeExpr | ContainsExpr | AndExpr | OrExpr | NotExpr

// ── 효과 타입 ───────────────────────────────────────────────

export interface RuleEffect {
  layer: "L1" | "L2" | "L3"
  dimension: string
  mode: "boost" | "suppress" | "override"
  magnitude: number // 0.0~1.0
}

// ── DSL 규칙 ────────────────────────────────────────────────

export interface TriggerRuleDSL {
  id: string
  name: string
  description?: string // 자연어 설명 (사람용)
  when: RuleExpression
  then: RuleEffect[]
  priority: number // 높을수록 우선
  cooldownMs?: number // 재발동 대기 시간 (ms)
}

// ── 평가 컨텍스트 ────────────────────────────────────────────

export interface RuleContext {
  L1?: Record<string, number>
  L2?: Record<string, number>
  L3?: Record<string, number>
  state?: Record<string, number>
  context?: Record<string, unknown>
}

// ── 평가 결과 ───────────────────────────────────────────────

export interface RuleMatch {
  ruleId: string
  ruleName: string
  effects: RuleEffect[]
  priority: number
}

export interface RuleEvalResult {
  matches: RuleMatch[]
  totalEvaluated: number
  appliedEffects: RuleEffect[]
}

// ── 검증 결과 ───────────────────────────────────────────────

export interface ValidationError {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// ── 컴파일된 규칙 세트 ────────────────────────────────────────

export interface CompiledRuleSet {
  rules: TriggerRuleDSL[]
  totalRules: number
  maxPriority: number
}

// ── 상수 ────────────────────────────────────────────────────

const VALID_LAYERS = new Set(["L1", "L2", "L3"])
const MAX_EXPRESSION_DEPTH = 5
const MAX_CONDITIONS_PER_GROUP = 10

// ══════════════════════════════════════════════════════════════
// 표현식 평가
// ══════════════════════════════════════════════════════════════

/** 필드 경로를 컨텍스트에서 해석 */
export function resolveField(ctx: RuleContext, field: string): unknown {
  const parts = field.split(".")
  if (parts.length === 0) return undefined

  const root = parts[0]
  let current: unknown

  switch (root) {
    case "L1":
      current = ctx.L1
      break
    case "L2":
      current = ctx.L2
      break
    case "L3":
      current = ctx.L3
      break
    case "state":
      current = ctx.state
      break
    case "context":
      current = ctx.context
      break
    default:
      return undefined
  }

  for (let i = 1; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[parts[i]]
  }

  return current
}

/** 비교 연산자 평가 */
function evaluateCompareOp(left: number, op: CompareOp, right: number): boolean {
  switch (op) {
    case ">":
      return left > right
    case ">=":
      return left >= right
    case "<":
      return left < right
    case "<=":
      return left <= right
    case "==":
      return Math.abs(left - right) < 0.0001
    case "!=":
      return Math.abs(left - right) >= 0.0001
    default:
      return false
  }
}

/** 표현식 평가 (재귀, 깊이 제한) */
export function evaluateExpression(
  expr: RuleExpression,
  ctx: RuleContext,
  depth: number = 0
): boolean {
  if (depth > MAX_EXPRESSION_DEPTH) return false

  switch (expr.type) {
    case "compare": {
      const raw = resolveField(ctx, expr.field)
      const num = typeof raw === "number" ? raw : Number(raw)
      if (Number.isNaN(num)) return false
      return evaluateCompareOp(num, expr.op, expr.value)
    }

    case "range": {
      const raw = resolveField(ctx, expr.field)
      const num = typeof raw === "number" ? raw : Number(raw)
      if (Number.isNaN(num)) return false
      return num >= expr.min && num <= expr.max
    }

    case "contains": {
      const raw = resolveField(ctx, expr.field)
      if (typeof raw === "string") {
        return raw.includes(expr.value)
      }
      if (Array.isArray(raw)) {
        return raw.some((item) => String(item).includes(expr.value))
      }
      return false
    }

    case "and":
      return expr.conditions.every((c) => evaluateExpression(c, ctx, depth + 1))

    case "or":
      return expr.conditions.some((c) => evaluateExpression(c, ctx, depth + 1))

    case "not":
      return !evaluateExpression(expr.condition, ctx, depth + 1)

    default:
      return false
  }
}

// ══════════════════════════════════════════════════════════════
// 규칙 평가
// ══════════════════════════════════════════════════════════════

/** 규칙 세트를 컨텍스트에 대해 평가 */
export function evaluateRules(
  rules: TriggerRuleDSL[],
  ctx: RuleContext,
  activeCooldowns?: Map<string, number>,
  now?: number
): RuleEvalResult {
  const currentTime = now ?? Date.now()
  const matches: RuleMatch[] = []

  for (const rule of rules) {
    // 쿨다운 체크
    if (activeCooldowns && rule.cooldownMs) {
      const lastFired = activeCooldowns.get(rule.id)
      if (lastFired !== undefined && currentTime - lastFired < rule.cooldownMs) {
        continue
      }
    }

    if (evaluateExpression(rule.when, ctx)) {
      matches.push({
        ruleId: rule.id,
        ruleName: rule.name,
        effects: rule.then,
        priority: rule.priority,
      })
    }
  }

  // 우선순위 내림차순 정렬
  matches.sort((a, b) => b.priority - a.priority)

  // 효과 병합: 같은 layer+dimension은 우선순위 높은 것만 적용
  const appliedEffects = mergeEffects(matches)

  return {
    matches,
    totalEvaluated: rules.length,
    appliedEffects,
  }
}

/** 우선순위 기반 효과 병합 */
function mergeEffects(matches: RuleMatch[]): RuleEffect[] {
  const seen = new Map<string, RuleEffect>()

  for (const match of matches) {
    for (const effect of match.effects) {
      const key = `${effect.layer}.${effect.dimension}`
      if (!seen.has(key)) {
        seen.set(key, effect)
      }
    }
  }

  return Array.from(seen.values())
}

// ══════════════════════════════════════════════════════════════
// 규칙 검증
// ══════════════════════════════════════════════════════════════

/** 규칙 유효성 검증 */
export function validateRule(rule: TriggerRuleDSL): ValidationResult {
  const errors: ValidationError[] = []

  if (!rule.id || rule.id.trim().length === 0) {
    errors.push({ path: "id", message: "id 필수" })
  }

  if (!rule.name || rule.name.trim().length === 0) {
    errors.push({ path: "name", message: "name 필수" })
  }

  if (typeof rule.priority !== "number" || rule.priority < 0) {
    errors.push({ path: "priority", message: "priority는 0 이상의 숫자" })
  }

  if (rule.cooldownMs !== undefined && rule.cooldownMs < 0) {
    errors.push({ path: "cooldownMs", message: "cooldownMs는 0 이상" })
  }

  // when 표현식 검증
  validateExpression(rule.when, "when", errors, 0)

  // then 효과 검증
  if (!Array.isArray(rule.then) || rule.then.length === 0) {
    errors.push({ path: "then", message: "최소 1개 효과 필수" })
  } else {
    for (let i = 0; i < rule.then.length; i++) {
      validateEffect(rule.then[i], `then[${i}]`, errors)
    }
  }

  return { valid: errors.length === 0, errors }
}

/** 표현식 재귀 검증 */
function validateExpression(
  expr: RuleExpression,
  path: string,
  errors: ValidationError[],
  depth: number
): void {
  if (depth > MAX_EXPRESSION_DEPTH) {
    errors.push({ path, message: `표현식 깊이 초과 (최대 ${MAX_EXPRESSION_DEPTH})` })
    return
  }

  if (!expr || typeof expr !== "object") {
    errors.push({ path, message: "유효한 표현식 객체 필요" })
    return
  }

  switch (expr.type) {
    case "compare":
      if (!expr.field) errors.push({ path: `${path}.field`, message: "field 필수" })
      if (!expr.op) errors.push({ path: `${path}.op`, message: "op 필수" })
      if (typeof expr.value !== "number")
        errors.push({ path: `${path}.value`, message: "value는 숫자" })
      break

    case "range":
      if (!expr.field) errors.push({ path: `${path}.field`, message: "field 필수" })
      if (typeof expr.min !== "number") errors.push({ path: `${path}.min`, message: "min은 숫자" })
      if (typeof expr.max !== "number") errors.push({ path: `${path}.max`, message: "max은 숫자" })
      if (typeof expr.min === "number" && typeof expr.max === "number" && expr.min > expr.max) {
        errors.push({ path, message: "min이 max보다 클 수 없음" })
      }
      break

    case "contains":
      if (!expr.field) errors.push({ path: `${path}.field`, message: "field 필수" })
      if (typeof expr.value !== "string")
        errors.push({ path: `${path}.value`, message: "value는 문자열" })
      break

    case "and":
    case "or":
      if (!Array.isArray(expr.conditions) || expr.conditions.length === 0) {
        errors.push({ path: `${path}.conditions`, message: "최소 1개 조건 필수" })
      } else if (expr.conditions.length > MAX_CONDITIONS_PER_GROUP) {
        errors.push({
          path: `${path}.conditions`,
          message: `조건 수 초과 (최대 ${MAX_CONDITIONS_PER_GROUP})`,
        })
      } else {
        for (let i = 0; i < expr.conditions.length; i++) {
          validateExpression(expr.conditions[i], `${path}.conditions[${i}]`, errors, depth + 1)
        }
      }
      break

    case "not":
      if (!expr.condition) {
        errors.push({ path: `${path}.condition`, message: "condition 필수" })
      } else {
        validateExpression(expr.condition, `${path}.condition`, errors, depth + 1)
      }
      break

    default:
      errors.push({ path, message: `알 수 없는 표현식 타입: ${(expr as { type: string }).type}` })
  }
}

/** 효과 검증 */
function validateEffect(effect: RuleEffect, path: string, errors: ValidationError[]): void {
  if (!VALID_LAYERS.has(effect.layer)) {
    errors.push({ path: `${path}.layer`, message: `유효한 레이어: L1, L2, L3` })
  }
  if (!effect.dimension || effect.dimension.trim().length === 0) {
    errors.push({ path: `${path}.dimension`, message: "dimension 필수" })
  }
  if (!["boost", "suppress", "override"].includes(effect.mode)) {
    errors.push({ path: `${path}.mode`, message: "mode: boost | suppress | override" })
  }
  if (typeof effect.magnitude !== "number" || effect.magnitude < 0 || effect.magnitude > 1) {
    errors.push({ path: `${path}.magnitude`, message: "magnitude는 0~1 범위" })
  }
}

// ══════════════════════════════════════════════════════════════
// 규칙 컴파일
// ══════════════════════════════════════════════════════════════

/** 규칙 세트 컴파일 (검증 + 정렬) */
export function compileRuleSet(rules: TriggerRuleDSL[]): CompiledRuleSet {
  // 우선순위 내림차순 정렬
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)
  const maxPriority = sorted.length > 0 ? sorted[0].priority : 0

  return {
    rules: sorted,
    totalRules: sorted.length,
    maxPriority,
  }
}

/** 규칙 세트 전체 검증 */
export function validateRuleSet(rules: TriggerRuleDSL[]): ValidationResult {
  const errors: ValidationError[] = []

  // ID 중복 검사
  const ids = new Set<string>()
  for (let i = 0; i < rules.length; i++) {
    const result = validateRule(rules[i])
    for (const err of result.errors) {
      errors.push({ path: `rules[${i}].${err.path}`, message: err.message })
    }
    if (ids.has(rules[i].id)) {
      errors.push({ path: `rules[${i}].id`, message: `중복 ID: ${rules[i].id}` })
    }
    ids.add(rules[i].id)
  }

  return { valid: errors.length === 0, errors }
}

// ══════════════════════════════════════════════════════════════
// 기존 TriggerRule 호환
// ══════════════════════════════════════════════════════════════

/** 기존 TriggerRule → TriggerRuleDSL 변환 */
export function convertLegacyTrigger(trigger: TriggerRule, index: number): TriggerRuleDSL {
  // 기존 자연어 condition은 description으로 보존
  // 기본 "always true" 표현식 + 자연어 설명 (LLM 평가 시 참조)
  return {
    id: `legacy-${index}`,
    name: trigger.condition.slice(0, 30),
    description: trigger.condition,
    when: { type: "compare", field: "state.mood", op: ">=", value: 0 },
    then: [
      {
        layer: trigger.affectedLayer,
        dimension: trigger.affectedDimension,
        mode: trigger.effect,
        magnitude: trigger.magnitude,
      },
    ],
    priority: 0,
  }
}

/** 기존 TriggerRule 배열을 DSL로 일괄 변환 */
export function convertLegacyTriggers(triggers: TriggerRule[]): TriggerRuleDSL[] {
  return triggers.map((t, i) => convertLegacyTrigger(t, i))
}

// ══════════════════════════════════════════════════════════════
// 헬퍼: DSL 표현식 빌더
// ══════════════════════════════════════════════════════════════

/** 비교 표현식 생성 */
export function compare(field: string, op: CompareOp, value: number): CompareExpr {
  return { type: "compare", field, op, value }
}

/** 범위 표현식 생성 */
export function range(field: string, min: number, max: number): RangeExpr {
  return { type: "range", field, min, max }
}

/** 문자열 포함 표현식 생성 */
export function contains(field: string, value: string): ContainsExpr {
  return { type: "contains", field, value }
}

/** AND 조합 */
export function and(...conditions: RuleExpression[]): AndExpr {
  return { type: "and", conditions }
}

/** OR 조합 */
export function or(...conditions: RuleExpression[]): OrExpr {
  return { type: "or", conditions }
}

/** NOT 부정 */
export function not(condition: RuleExpression): NotExpr {
  return { type: "not", condition }
}
