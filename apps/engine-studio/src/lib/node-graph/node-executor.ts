// ═══════════════════════════════════════════════════════════════
// 노드 실행기
// T61-AC1: 25노드 execute() 디스패처 + 개별 실행 함수
// ═══════════════════════════════════════════════════════════════

import type { NodeExecutionResult } from "./dag-engine"
import type { LLMAdapter } from "./llm-adapter"
import { PROMPTS, getLLMConfig, toPromptString } from "./llm-adapter"
import {
  evaluateConditional,
  evaluateSwitch,
  evaluateMerge,
  type ConditionalData,
  type SwitchData,
  type MergeData,
} from "./control-flow"

// ── 실행 컨텍스트 ──────────────────────────────────────────────

export interface ExecutionContext {
  llm?: LLMAdapter
}

// ── 유틸 ────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}

function success(nodeId: string, outputs: Record<string, unknown>): NodeExecutionResult {
  return { nodeId, outputs, status: "success" }
}

function error(nodeId: string, message: string): NodeExecutionResult {
  return { nodeId, outputs: {}, status: "error", error: message }
}

// ── 디스패처 ───────────────────────────────────────────────────

const EXECUTOR_MAP: Record<
  string,
  (
    nodeId: string,
    data: Record<string, unknown>,
    inputs: Record<string, unknown>,
    ctx: ExecutionContext
  ) => NodeExecutionResult | Promise<NodeExecutionResult>
> = {
  // Input
  "basic-info": executeBasicInfo,
  "l1-vector": executeL1Vector,
  "l2-vector": executeL2Vector,
  "l3-vector": executeL3Vector,
  "archetype-select": executeArchetypeSelect,
  // Engine
  "paradox-calc": executeParadoxCalc,
  "pressure-ctrl": executePressureCtrl,
  "v-final": executeVFinal,
  projection: executeProjection,
  // Control Flow
  conditional: executeConditional,
  switch: executeSwitch,
  merge: executeMerge,
  // Generation
  "character-gen": executeCharacterGen,
  "backstory-gen": executeBackstoryGen,
  "voice-gen": executeVoiceGen,
  "activity-gen": executeActivityGen,
  "content-gen": executeContentGen,
  "pressure-gen": executePressureGen,
  "zeitgeist-gen": executeZeitgeistGen,
  // Assembly
  "prompt-builder": executePromptBuilder,
  "interaction-rules": executeInteractionRules,
  // Output
  consistency: executeConsistency,
  fingerprint: executeFingerprint,
  "test-sim": executeTestSim,
  deploy: executeDeploy,
}

export function getNodeExecutor(
  nodeType: string
): (
  nodeId: string,
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext
) => NodeExecutionResult | Promise<NodeExecutionResult> {
  return EXECUTOR_MAP[nodeType] ?? executeUnknown
}

export function executeNode(
  nodeId: string,
  nodeType: string,
  data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext = {}
): NodeExecutionResult | Promise<NodeExecutionResult> {
  const executor = getNodeExecutor(nodeType)
  return executor(nodeId, data, inputs, ctx)
}

function executeUnknown(nodeId: string): NodeExecutionResult {
  return error(nodeId, `알 수 없는 노드 타입`)
}

// ═══════════════════════════════════════════════════════════════
// Input Nodes (5)
// ═══════════════════════════════════════════════════════════════

function executeBasicInfo(nodeId: string, data: Record<string, unknown>): NodeExecutionResult {
  const name = String(data.name ?? "")
  if (!name) return error(nodeId, "이름이 필요합니다")

  return success(nodeId, {
    out: {
      name,
      age: Number(data.age ?? 25),
      occupation: String(data.occupation ?? ""),
      role: String(data.role ?? ""),
      description: String(data.description ?? ""),
      expertise: Array.isArray(data.expertise) ? data.expertise : [],
      demographics: data.demographics ?? {},
    },
  })
}

function executeL1Vector(nodeId: string, data: Record<string, unknown>): NodeExecutionResult {
  const dims = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"] as const
  const vector: Record<string, number> = {}

  for (const dim of dims) {
    const val = Number(data[dim] ?? 0.5)
    vector[dim] = clamp(val)
  }

  return success(nodeId, { out: vector })
}

function executeL2Vector(nodeId: string, data: Record<string, unknown>): NodeExecutionResult {
  const dims = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ] as const
  const vector: Record<string, number> = {}

  for (const dim of dims) {
    const val = Number(data[dim] ?? 0.5)
    vector[dim] = clamp(val)
  }

  return success(nodeId, { out: vector })
}

function executeL3Vector(nodeId: string, data: Record<string, unknown>): NodeExecutionResult {
  const dims = ["conflictOrientation", "resolutionStyle", "narrativePace", "emotionalArc"] as const
  const vector: Record<string, number> = {}

  for (const dim of dims) {
    const val = Number(data[dim] ?? 0.5)
    vector[dim] = clamp(val)
  }

  return success(nodeId, { out: vector })
}

function executeArchetypeSelect(
  nodeId: string,
  data: Record<string, unknown>
): NodeExecutionResult {
  const archetypeId = String(data.archetypeId ?? "")
  if (!archetypeId) return error(nodeId, "아키타입 ID가 필요합니다")

  return success(nodeId, {
    out: {
      archetypeId,
      name: String(data.name ?? archetypeId),
      l1Base: data.l1Base ?? null,
      l2Base: data.l2Base ?? null,
      l3Base: data.l3Base ?? null,
      voiceKeywords: Array.isArray(data.voiceKeywords) ? data.voiceKeywords : [],
      paradoxDesign: data.paradoxDesign ?? null,
    },
  })
}

// ═══════════════════════════════════════════════════════════════
// Engine Nodes (4)
// ═══════════════════════════════════════════════════════════════

function executeParadoxCalc(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const l1 = inputs.l1 as Record<string, number> | undefined
  const l2 = inputs.l2 as Record<string, number> | undefined

  if (!l1) return error(nodeId, "L1 벡터가 필요합니다")
  if (!l2) return error(nodeId, "L2 벡터가 필요합니다")

  // L1↔L2 Paradox: 7쌍 역설 매핑
  const PARADOX_PAIRS = [
    { l1Key: "depth", l2Key: "openness", direction: "inverse" },
    { l1Key: "lens", l2Key: "openness", direction: "direct" },
    { l1Key: "stance", l2Key: "agreeableness", direction: "inverse" },
    { l1Key: "scope", l2Key: "conscientiousness", direction: "direct" },
    { l1Key: "taste", l2Key: "openness", direction: "direct" },
    { l1Key: "purpose", l2Key: "conscientiousness", direction: "direct" },
    { l1Key: "sociability", l2Key: "extraversion", direction: "direct" },
  ] as const

  let sumWeighted = 0
  let sumWeights = 0
  const pairs: Array<{ l1Dim: string; l2Dim: string; score: number }> = []

  for (const pair of PARADOX_PAIRS) {
    const l1Val = l1[pair.l1Key] ?? 0.5
    const l2Val = l2[pair.l2Key] ?? 0.5
    const adjusted = pair.direction === "inverse" ? 1 - l2Val : l2Val
    const score = Math.abs(l1Val - adjusted)
    pairs.push({ l1Dim: pair.l1Key, l2Dim: pair.l2Key, score })
    sumWeighted += score
    sumWeights += 1
  }

  const l1l2Score = sumWeights > 0 ? sumWeighted / sumWeights : 0
  // Dimensionality bell curve: exp(-(s-0.35)^2 / (2*0.2^2))
  const dimensionality = Math.exp(-Math.pow(l1l2Score - 0.35, 2) / (2 * 0.04))
  // EPS = 0.5*L1L2 + 0.3*L1L3 + 0.2*L2L3 (simplified: L1L3/L2L3 need cross-axis)
  const overall = l1l2Score

  return success(nodeId, {
    out: {
      l1l2: l1l2Score,
      l1l3: 0,
      l2l3: 0,
      overall,
      dimensionality,
      pairs,
      dominant: { layer: "L1xL2", score: l1l2Score },
    },
  })
}

function executePressureCtrl(
  nodeId: string,
  data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const l3 = inputs.l3 as Record<string, number> | undefined
  const pressureLevel = Number(data.pressureLevel ?? 0.5)

  // L3의 emotionalArc (volatility 대체)로 decay 계산
  const volatility = l3 ? (l3.emotionalArc ?? 0.5) : 0.5
  const decayConstant = 0.7 - 0.6 * volatility

  return success(nodeId, {
    out: {
      baseline: clamp(pressureLevel),
      decayConstant: Math.round(decayConstant * 1000) / 1000,
      range: { min: 0, max: 1 },
      volatility,
      triggers: [],
    },
  })
}

function executeVFinal(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const l1 = inputs.l1 as Record<string, number> | undefined
  if (!l1) return error(nodeId, "L1 벡터가 필요합니다")

  const l2 = inputs.l2 as Record<string, number> | undefined
  const l3 = inputs.l3 as Record<string, number> | undefined
  const pressure = inputs.pressure as Record<string, unknown> | undefined
  const p = clamp(Number(pressure?.baseline ?? 0.1))
  const alpha = 0.6
  const beta = 0.4

  const L1_DIMS = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"] as const
  // L2→L1 투영 (간략화: 직접 매핑)
  const L2_TO_L1_MAP: Record<string, Record<string, number>> = {
    openness: { depth: 0.3, lens: 0.2, taste: 0.4, purpose: 0.1 },
    conscientiousness: { scope: 0.5, purpose: 0.3, lens: 0.2 },
    extraversion: { sociability: 0.6, stance: -0.2, scope: 0.2 },
    agreeableness: { stance: -0.4, sociability: 0.3, depth: -0.1, purpose: 0.2 },
    neuroticism: { depth: 0.2, stance: 0.2, taste: -0.1 },
  }
  // L3→L1 투영 (간략화)
  const L3_TO_L1_MAP: Record<string, Record<string, number>> = {
    conflictOrientation: { stance: 0.4, depth: 0.2, sociability: -0.2 },
    resolutionStyle: { lens: 0.3, purpose: 0.3, scope: 0.1 },
    narrativePace: { scope: 0.3, taste: 0.2, sociability: 0.1 },
    emotionalArc: { depth: 0.3, purpose: 0.2, taste: 0.1 },
  }

  function projectToL1(
    source: Record<string, number> | undefined,
    mapping: Record<string, Record<string, number>>
  ): number[] {
    const projected = new Array(7).fill(0.5)
    if (!source) return projected
    for (const [srcDim, weights] of Object.entries(mapping)) {
      const val = source[srcDim] ?? 0.5
      const delta = val - 0.5
      for (let i = 0; i < L1_DIMS.length; i++) {
        const w = weights[L1_DIMS[i]] ?? 0
        projected[i] += w * delta
      }
    }
    return projected.map((v) => clamp(v))
  }

  const l2Projected = projectToL1(l2, L2_TO_L1_MAP)
  const l3Projected = projectToL1(l3, L3_TO_L1_MAP)

  const vector = L1_DIMS.map((dim, i) => {
    const l1Val = l1[dim] ?? 0.5
    const blended = (1 - p) * l1Val + p * (alpha * l2Projected[i] + beta * l3Projected[i])
    return clamp(Math.round(blended * 1000) / 1000)
  })

  return success(nodeId, {
    out: {
      vector,
      pressure: p,
      layerContributions: {
        l1Weight: 1 - p,
        l2Weight: p * alpha,
        l3Weight: p * beta,
      },
      l2Projected,
      l3Projected,
    },
  })
}

function executeProjection(nodeId: string, data: Record<string, unknown>): NodeExecutionResult {
  const alpha = clamp(Number(data.alpha ?? 0.6))
  const beta = Math.round((1 - alpha) * 100) / 100

  return success(nodeId, {
    out: {
      alpha,
      beta,
      pressureThreshold: Number(data.pressureThreshold ?? 0.5),
      adaptabilityRate: Number(data.adaptabilityRate ?? 0.15),
    },
  })
}

// ═══════════════════════════════════════════════════════════════
// Control Flow Nodes (3)
// ═══════════════════════════════════════════════════════════════

function executeConditional(
  nodeId: string,
  data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const input = inputs.in
  if (input === undefined) return error(nodeId, "입력값이 필요합니다")

  const condData: ConditionalData = {
    conditionType: (data.conditionType as ConditionalData["conditionType"]) ?? "threshold",
    operator: (data.operator as ConditionalData["operator"]) ?? ">",
    threshold: Number(data.threshold ?? 0.5),
    rangeMin: data.rangeMin !== undefined ? Number(data.rangeMin) : undefined,
    rangeMax: data.rangeMax !== undefined ? Number(data.rangeMax) : undefined,
    enumValue: data.enumValue !== undefined ? String(data.enumValue) : undefined,
    fieldPath: data.fieldPath !== undefined ? String(data.fieldPath) : undefined,
  }

  const result = evaluateConditional(condData, input)

  return {
    nodeId,
    outputs: {
      [result.branchTaken]: result.value,
    },
    status: "success",
    branch: result.branchTaken,
  }
}

function executeSwitch(
  nodeId: string,
  data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const input = inputs.in
  if (input === undefined) return error(nodeId, "입력값이 필요합니다")

  const switchData: SwitchData = {
    switchMode: (data.switchMode as SwitchData["switchMode"]) ?? "threshold-band",
    bands: data.bands as SwitchData["bands"],
    enumCases: data.enumCases as SwitchData["enumCases"],
    defaultCaseId: String(data.defaultCaseId ?? "default"),
    fieldPath: data.fieldPath !== undefined ? String(data.fieldPath) : undefined,
  }

  const result = evaluateSwitch(switchData, input)

  // 각 활성 케이스 포트에 값 전달
  const outputs: Record<string, unknown> = {}
  for (const caseId of result.activeCases) {
    outputs[caseId] = input
  }

  return {
    nodeId,
    outputs,
    status: "success",
    activeCases: result.activeCases,
  }
}

function executeMerge(
  nodeId: string,
  data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const mergeData: MergeData = {
    mergeStrategy: (data.mergeStrategy as MergeData["mergeStrategy"]) ?? "first-active",
  }

  const result = evaluateMerge(mergeData, inputs)

  return success(nodeId, { merged: result.merged })
}

// ═══════════════════════════════════════════════════════════════
// Generation Nodes (7) — LLM 기반 (activity-gen 제외)
// ═══════════════════════════════════════════════════════════════

async function executeCharacterGen(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext
): Promise<NodeExecutionResult> {
  if (!ctx.llm) return error(nodeId, "LLM 어댑터가 필요합니다")

  const vfinal = inputs.vfinal
  const basic = inputs.basic
  const archetype = inputs.archetype
  if (!vfinal) return error(nodeId, "V_Final 입력이 필요합니다")
  if (!basic) return error(nodeId, "BasicInfo 입력이 필요합니다")

  const config = getLLMConfig("character-gen")
  const result = await ctx.llm.generate({
    model: config.model,
    systemPrompt: PROMPTS.CHARACTER_GEN.system,
    userPrompt: PROMPTS.CHARACTER_GEN.user(
      toPromptString(vfinal),
      toPromptString(basic),
      toPromptString(archetype)
    ),
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  })

  return success(nodeId, { out: result })
}

async function executeBackstoryGen(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext
): Promise<NodeExecutionResult> {
  if (!ctx.llm) return error(nodeId, "LLM 어댑터가 필요합니다")

  const l1 = inputs.l1
  if (!l1) return error(nodeId, "L1 벡터가 필요합니다")

  const config = getLLMConfig("backstory-gen")
  const result = await ctx.llm.generate({
    model: config.model,
    systemPrompt: PROMPTS.BACKSTORY_GEN.system,
    userPrompt: PROMPTS.BACKSTORY_GEN.user(
      toPromptString(l1),
      toPromptString(inputs.l2),
      toPromptString(inputs.l3),
      toPromptString(inputs.paradox)
    ),
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  })

  return success(nodeId, { out: result })
}

async function executeVoiceGen(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext
): Promise<NodeExecutionResult> {
  if (!ctx.llm) return error(nodeId, "LLM 어댑터가 필요합니다")

  const l1 = inputs.l1
  const character = inputs.character
  if (!l1) return error(nodeId, "L1 벡터가 필요합니다")
  if (!character) return error(nodeId, "캐릭터 데이터가 필요합니다")

  const config = getLLMConfig("voice-gen")
  const result = await ctx.llm.generate({
    model: config.model,
    systemPrompt: PROMPTS.VOICE_GEN.system,
    userPrompt: PROMPTS.VOICE_GEN.user(toPromptString(l1), toPromptString(character)),
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  })

  return success(nodeId, { out: result })
}

function executeActivityGen(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  // 규칙 기반: LLM 불필요
  const l1 = inputs.l1 as Record<string, number> | undefined
  if (!l1) return error(nodeId, "L1 벡터가 필요합니다")

  const sociability = l1.sociability ?? 0.5
  const stance = l1.stance ?? 0.5
  const depth = l1.depth ?? 0.5
  const scope = l1.scope ?? 0.5
  const purpose = l1.purpose ?? 0.5

  // 7개 활동 지표 계산
  const initiative = clamp(0.6 * sociability + 0.4 * stance)
  const expressiveness = clamp(0.5 * depth + 0.3 * scope + 0.2 * sociability)
  const interactivity = clamp(0.7 * sociability + 0.3 * purpose)
  const curiosity = clamp(0.6 * depth + 0.4 * scope)
  const consistency = clamp(0.5 * purpose + 0.3 * stance + 0.2 * depth)
  const adaptability = clamp(0.4 * sociability + 0.3 * scope + 0.3 * (1 - stance))
  const creativity = clamp(0.5 * depth + 0.3 * (1 - stance) + 0.2 * scope)

  // 활동 빈도 추론
  let postFrequency: string
  if (initiative < 0.3) postFrequency = "RARE"
  else if (initiative < 0.45) postFrequency = "OCCASIONAL"
  else if (initiative < 0.6) postFrequency = "MODERATE"
  else if (initiative < 0.8) postFrequency = "ACTIVE"
  else postFrequency = "HYPERACTIVE"

  return success(nodeId, {
    out: {
      metrics: {
        initiative: Math.round(initiative * 1000) / 1000,
        expressiveness: Math.round(expressiveness * 1000) / 1000,
        interactivity: Math.round(interactivity * 1000) / 1000,
        curiosity: Math.round(curiosity * 1000) / 1000,
        consistency: Math.round(consistency * 1000) / 1000,
        adaptability: Math.round(adaptability * 1000) / 1000,
        creativity: Math.round(creativity * 1000) / 1000,
      },
      postFrequency,
    },
  })
}

async function executeContentGen(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext
): Promise<NodeExecutionResult> {
  if (!ctx.llm) return error(nodeId, "LLM 어댑터가 필요합니다")

  const vfinal = inputs.vfinal
  const character = inputs.character
  if (!vfinal) return error(nodeId, "V_Final 입력이 필요합니다")
  if (!character) return error(nodeId, "캐릭터 데이터가 필요합니다")

  const config = getLLMConfig("content-gen")
  const result = await ctx.llm.generate({
    model: config.model,
    systemPrompt: PROMPTS.CONTENT_GEN.system,
    userPrompt: PROMPTS.CONTENT_GEN.user(toPromptString(vfinal), toPromptString(character)),
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  })

  return success(nodeId, { out: result })
}

async function executePressureGen(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext
): Promise<NodeExecutionResult> {
  if (!ctx.llm) return error(nodeId, "LLM 어댑터가 필요합니다")

  const l3 = inputs.l3
  if (!l3) return error(nodeId, "L3 벡터가 필요합니다")

  const config = getLLMConfig("pressure-gen")
  const result = await ctx.llm.generate({
    model: config.model,
    systemPrompt: PROMPTS.PRESSURE_GEN.system,
    userPrompt: PROMPTS.PRESSURE_GEN.user(toPromptString(l3), toPromptString(inputs.paradox)),
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  })

  return success(nodeId, { out: result })
}

async function executeZeitgeistGen(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext
): Promise<NodeExecutionResult> {
  if (!ctx.llm) return error(nodeId, "LLM 어댑터가 필요합니다")

  const basic = inputs.basic
  if (!basic) return error(nodeId, "BasicInfo가 필요합니다")

  const config = getLLMConfig("zeitgeist-gen")
  const result = await ctx.llm.generate({
    model: config.model,
    systemPrompt: PROMPTS.ZEITGEIST_GEN.system,
    userPrompt: PROMPTS.ZEITGEIST_GEN.user(toPromptString(basic)),
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  })

  return success(nodeId, { out: result })
}

// ═══════════════════════════════════════════════════════════════
// Assembly Nodes (2)
// ═══════════════════════════════════════════════════════════════

function executePromptBuilder(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const character = inputs.character as Record<string, unknown> | undefined
  if (!character) return error(nodeId, "캐릭터 데이터가 필요합니다")

  const voice = inputs.voice as Record<string, unknown> | undefined
  const backstory = inputs.backstory as Record<string, unknown> | undefined
  const pressure = inputs.pressure as Record<string, unknown> | undefined
  const zeitgeist = inputs.zeitgeist as Record<string, unknown> | undefined
  const content = inputs.content as Record<string, unknown> | undefined

  // 6개 섹션 조합
  const sections: string[] = []

  // 1. Identity
  sections.push(`[Identity]\n${toPromptString(character)}`)

  // 2. Voice
  if (voice) {
    sections.push(`[Voice]\n${toPromptString(voice)}`)
  }

  // 3. Content
  if (content) {
    sections.push(`[Content Style]\n${toPromptString(content)}`)
  }

  // 4. Pressure
  if (pressure) {
    sections.push(`[Pressure Context]\n${toPromptString(pressure)}`)
  }

  // 5. Backstory
  if (backstory) {
    sections.push(`[Backstory]\n${toPromptString(backstory)}`)
  }

  // 6. Zeitgeist
  if (zeitgeist) {
    sections.push(`[Zeitgeist]\n${toPromptString(zeitgeist)}`)
  }

  const systemPrompt = sections.join("\n\n")

  return success(nodeId, {
    out: {
      systemPrompt,
      sectionCount: sections.length,
      vectorContext: {
        hasBackstory: !!backstory,
        hasPressure: !!pressure,
        hasVoice: !!voice,
        hasZeitgeist: !!zeitgeist,
        hasContent: !!content,
      },
    },
  })
}

function executeInteractionRules(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const backstory = inputs.backstory as Record<string, unknown> | undefined
  const pressure = inputs.pressure as Record<string, unknown> | undefined
  const vfinal = inputs.vfinal as Record<string, unknown> | undefined

  // Init config
  const initConfig = {
    enabled: !!backstory,
    keywords: (backstory?.nlpKeywords as string[]) ?? [],
  }

  // Override config
  const overrideConfig = {
    enabled: !!pressure,
    triggers: (pressure?.situationalTriggers as unknown[]) ?? [],
    decayEnabled: true,
  }

  // Adapt config
  const adaptConfig = {
    enabled: !!vfinal,
    baseVector: vfinal?.vector ?? null,
    adaptabilityRate: 0.15,
    driftClamp: 0.3,
    momentumWindow: 3,
  }

  // Express config
  const expressConfig = {
    enabled: true,
    quirks: [],
  }

  return success(nodeId, {
    out: {
      init: initConfig,
      override: overrideConfig,
      adapt: adaptConfig,
      express: expressConfig,
    },
  })
}

// ═══════════════════════════════════════════════════════════════
// Output Nodes (4)
// ═══════════════════════════════════════════════════════════════

function executeConsistency(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const prompt = inputs.prompt as Record<string, unknown> | undefined
  if (!prompt) return error(nodeId, "PromptSet이 필요합니다")

  const character = inputs.character as Record<string, unknown> | undefined
  const vfinal = inputs.vfinal as Record<string, unknown> | undefined

  // 6개 카테고리 점수 계산
  const scores: Record<string, number> = {
    STRUCTURE: prompt.systemPrompt ? 1.0 : 0.5,
    L1_L2: character ? 0.85 : 0.7,
    L2_L3: vfinal ? 0.85 : 0.7,
    QUAL_QUANT: character && vfinal ? 0.9 : 0.7,
    CROSS_AXIS: 0.8,
    DYNAMIC: prompt.vectorContext ? 0.85 : 0.7,
  }

  // 가중 평균
  const weights = {
    STRUCTURE: 0.25,
    L1_L2: 0.2,
    L2_L3: 0.15,
    QUAL_QUANT: 0.1,
    CROSS_AXIS: 0.15,
    DYNAMIC: 0.15,
  }

  let total = 0
  let weightSum = 0
  for (const [cat, score] of Object.entries(scores)) {
    const w = weights[cat as keyof typeof weights] ?? 0.1
    total += w * score
    weightSum += w
  }
  const overallScore = weightSum > 0 ? Math.round((total / weightSum) * 1000) / 1000 : 0
  const valid = overallScore >= 0.7

  return success(nodeId, {
    out: {
      valid,
      overallScore,
      categoryScores: scores,
      issues: valid ? [] : [{ severity: "warning", message: "일관성 점수가 기준(0.7) 미만" }],
    },
  })
}

function executeFingerprint(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const l1 = inputs.l1 as Record<string, number> | undefined
  if (!l1) return error(nodeId, "L1 벡터가 필요합니다")

  const l2 = inputs.l2 as Record<string, number> | undefined
  const l3 = inputs.l3 as Record<string, number> | undefined

  // 레이더 차트 데이터
  const radarData: Array<{ axis: string; value: number; layer: string }> = []
  for (const [dim, val] of Object.entries(l1)) {
    radarData.push({ axis: dim, value: val as number, layer: "L1" })
  }
  if (l2) {
    for (const [dim, val] of Object.entries(l2)) {
      radarData.push({ axis: dim, value: val as number, layer: "L2" })
    }
  }
  if (l3) {
    for (const [dim, val] of Object.entries(l3)) {
      radarData.push({ axis: dim, value: val as number, layer: "L3" })
    }
  }

  // 2D 핑거프린트 해시 (벡터 값 기반 간단한 해시)
  const allValues = [
    ...Object.values(l1),
    ...(l2 ? Object.values(l2) : []),
    ...(l3 ? Object.values(l3) : []),
  ] as number[]
  const hash = allValues
    .map((v) =>
      Math.round(v * 100)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")

  return success(nodeId, {
    out: {
      radarData,
      hash,
      layerCount: 1 + (l2 ? 1 : 0) + (l3 ? 1 : 0),
      dimensionCount: radarData.length,
    },
  })
}

async function executeTestSim(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>,
  ctx: ExecutionContext
): Promise<NodeExecutionResult> {
  if (!ctx.llm) return error(nodeId, "LLM 어댑터가 필요합니다")

  const prompt = inputs.prompt as Record<string, unknown> | undefined
  const character = inputs.character
  if (!prompt) return error(nodeId, "PromptSet이 필요합니다")
  if (!character) return error(nodeId, "캐릭터 데이터가 필요합니다")

  // 기본 테스트 시나리오
  const scenarios = [
    "안녕하세요, 자기소개를 해주세요.",
    "최근에 본 영화 중 추천할 만한 것이 있나요?",
    "동의하지 않는 의견을 만났을 때 어떻게 반응하시나요?",
  ]

  const responses: Array<{ scenario: string; response: Record<string, unknown> }> = []
  let totalScore = 0

  const config = getLLMConfig("test-sim")
  for (const scenario of scenarios) {
    const result = await ctx.llm.generate({
      model: config.model,
      systemPrompt: PROMPTS.TEST_SIM.system,
      userPrompt: PROMPTS.TEST_SIM.user(
        toPromptString(prompt),
        toPromptString(character),
        scenario
      ),
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    })
    responses.push({ scenario, response: result })
    totalScore += Number(result.overallScore ?? 0.5)
  }

  const overallScore = responses.length > 0 ? totalScore / responses.length : 0

  return success(nodeId, {
    out: {
      responses,
      scenarioCount: scenarios.length,
      overallScore: Math.round(overallScore * 1000) / 1000,
    },
  })
}

function executeDeploy(
  nodeId: string,
  _data: Record<string, unknown>,
  inputs: Record<string, unknown>
): NodeExecutionResult {
  const prompt = inputs.prompt as Record<string, unknown> | undefined
  const validation = inputs.validation as Record<string, unknown> | undefined

  if (!prompt) return error(nodeId, "PromptSet이 필요합니다")
  if (!validation) return error(nodeId, "검증 결과가 필요합니다")

  if (!validation.valid) {
    return error(nodeId, "검증을 통과하지 못했습니다. 배포할 수 없습니다.")
  }

  const rules = inputs.rules as Record<string, unknown> | undefined
  const fingerprint = inputs.fingerprint as Record<string, unknown> | undefined

  return success(nodeId, {
    out: {
      deployed: true,
      timestamp: Date.now(),
      artifacts: {
        hasPrompt: true,
        hasRules: !!rules,
        hasFingerprint: !!fingerprint,
      },
    },
  })
}
