// ═══════════════════════════════════════════════════════════════
// 제어 흐름 노드 평가 로직
// T61-AC3: Conditional / Switch / Merge
// ═══════════════════════════════════════════════════════════════

// ── Conditional 노드 ────────────────────────────────────────────

export type ConditionalOperator = ">" | ">=" | "<" | "<=" | "==" | "!="
export type ConditionalMode = "threshold" | "range" | "enum" | "exists"

export interface ConditionalData {
  conditionType: ConditionalMode
  operator: ConditionalOperator
  threshold: number
  rangeMin?: number
  rangeMax?: number
  enumValue?: string
  fieldPath?: string // 객체 내 필드 경로 (예: "overall", "l1l2")
}

export interface ConditionalResult {
  branchTaken: "true" | "false"
  reason: string
  value: unknown // 패스스루
}

function resolveValue(input: unknown, fieldPath?: string): unknown {
  if (!fieldPath || typeof input !== "object" || input === null) return input
  const parts = fieldPath.split(".")
  let current: unknown = input
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function evaluateConditional(data: ConditionalData, rawInput: unknown): ConditionalResult {
  const input = resolveValue(rawInput, data.fieldPath)

  switch (data.conditionType) {
    case "threshold": {
      const numVal = typeof input === "number" ? input : Number(input)
      if (Number.isNaN(numVal)) {
        return { branchTaken: "false", reason: `숫자 변환 실패: ${String(input)}`, value: rawInput }
      }
      const passed = evaluateOperator(numVal, data.operator, data.threshold)
      return {
        branchTaken: passed ? "true" : "false",
        reason: `${numVal} ${data.operator} ${data.threshold} → ${passed}`,
        value: rawInput,
      }
    }

    case "range": {
      const numVal = typeof input === "number" ? input : Number(input)
      if (Number.isNaN(numVal)) {
        return { branchTaken: "false", reason: `숫자 변환 실패: ${String(input)}`, value: rawInput }
      }
      const min = data.rangeMin ?? 0
      const max = data.rangeMax ?? 1
      const inRange = numVal >= min && numVal <= max
      return {
        branchTaken: inRange ? "true" : "false",
        reason: `${numVal} ∈ [${min}, ${max}] → ${inRange}`,
        value: rawInput,
      }
    }

    case "enum": {
      const strVal = String(input)
      const matched = strVal === data.enumValue
      return {
        branchTaken: matched ? "true" : "false",
        reason: `"${strVal}" == "${data.enumValue}" → ${matched}`,
        value: rawInput,
      }
    }

    case "exists": {
      const exists = input !== null && input !== undefined
      return {
        branchTaken: exists ? "true" : "false",
        reason: `exists(${String(input)}) → ${exists}`,
        value: rawInput,
      }
    }

    default:
      return {
        branchTaken: "false",
        reason: `알 수 없는 조건 타입: ${String(data.conditionType)}`,
        value: rawInput,
      }
  }
}

function evaluateOperator(
  value: number,
  operator: ConditionalOperator,
  threshold: number
): boolean {
  switch (operator) {
    case ">":
      return value > threshold
    case ">=":
      return value >= threshold
    case "<":
      return value < threshold
    case "<=":
      return value <= threshold
    case "==":
      return Math.abs(value - threshold) < 0.0001
    case "!=":
      return Math.abs(value - threshold) >= 0.0001
    default:
      return false
  }
}

// ── Switch 노드 ─────────────────────────────────────────────────

export type SwitchMode = "threshold-band" | "enum-match"

export interface SwitchBand {
  id: string
  label: string
  min: number
  max: number
}

export interface SwitchEnumCase {
  id: string
  label: string
  matchValues: string[]
}

export interface SwitchData {
  switchMode: SwitchMode
  bands?: SwitchBand[]
  enumCases?: SwitchEnumCase[]
  defaultCaseId: string
  fieldPath?: string
}

export interface SwitchResult {
  activeCases: string[]
  caseLabel: string
  selectedValue: unknown
}

export function evaluateSwitch(data: SwitchData, rawInput: unknown): SwitchResult {
  const input = resolveValue(rawInput, data.fieldPath)

  if (data.switchMode === "threshold-band") {
    const numVal = typeof input === "number" ? input : Number(input)
    if (Number.isNaN(numVal)) {
      return {
        activeCases: [data.defaultCaseId],
        caseLabel: "default (NaN)",
        selectedValue: rawInput,
      }
    }

    const bands = data.bands ?? []
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i]
      // 마지막 밴드는 상한 포함 (<=), 나머지는 상한 미포함 (<)
      const isLast = i === bands.length - 1
      const inBand = isLast
        ? numVal >= band.min && numVal <= band.max
        : numVal >= band.min && numVal < band.max

      if (inBand) {
        return {
          activeCases: [band.id],
          caseLabel: band.label,
          selectedValue: rawInput,
        }
      }
    }

    return {
      activeCases: [data.defaultCaseId],
      caseLabel: "default",
      selectedValue: rawInput,
    }
  }

  if (data.switchMode === "enum-match") {
    const strVal = String(input)
    const enumCases = data.enumCases ?? []

    for (const ec of enumCases) {
      if (ec.matchValues.includes(strVal)) {
        return {
          activeCases: [ec.id],
          caseLabel: ec.label,
          selectedValue: rawInput,
        }
      }
    }

    return {
      activeCases: [data.defaultCaseId],
      caseLabel: "default",
      selectedValue: rawInput,
    }
  }

  return {
    activeCases: [data.defaultCaseId],
    caseLabel: "default",
    selectedValue: rawInput,
  }
}

// ── Merge 노드 ──────────────────────────────────────────────────

export type MergeStrategy = "first-active" | "combine"

export interface MergeData {
  mergeStrategy: MergeStrategy
}

export interface MergeResult {
  merged: unknown
  activeCount: number
  source: string // "first" | "combined"
}

export function evaluateMerge(data: MergeData, inputs: Record<string, unknown>): MergeResult {
  const activeInputs = Object.entries(inputs).filter(([, v]) => v !== undefined && v !== null)

  if (activeInputs.length === 0) {
    return { merged: null, activeCount: 0, source: "none" }
  }

  if (data.mergeStrategy === "first-active") {
    const [, value] = activeInputs[0]
    return {
      merged: value,
      activeCount: activeInputs.length,
      source: "first",
    }
  }

  // combine: 배열로 합침
  if (data.mergeStrategy === "combine") {
    const values = activeInputs.map(([, v]) => v)
    return {
      merged: values.length === 1 ? values[0] : values,
      activeCount: activeInputs.length,
      source: "combined",
    }
  }

  // fallback
  return {
    merged: activeInputs[0][1],
    activeCount: activeInputs.length,
    source: "first",
  }
}
