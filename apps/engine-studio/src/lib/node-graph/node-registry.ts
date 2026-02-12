// ═══════════════════════════════════════════════════════════════
// 노드 레지스트리
// T59-AC2: 카테고리 7종, 25노드 등록
// ═══════════════════════════════════════════════════════════════

import type { NodePort, PortType } from "./port-types"

// ── 타입 정의 ─────────────────────────────────────────────────

export type NodeCategory =
  | "input"
  | "engine"
  | "control-flow"
  | "generation"
  | "assembly"
  | "output"

export type EvaluationStrategy = "eager" | "lazy" | "manual"

export interface NodeDefinition {
  type: string
  category: NodeCategory
  label: string
  description: string
  inputs: NodePort[]
  outputs: NodePort[]
  evaluationStrategy: EvaluationStrategy
  defaultData: Record<string, unknown>
}

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  input: "입력",
  engine: "엔진",
  "control-flow": "제어 흐름",
  generation: "생성",
  assembly: "조합",
  output: "출력",
}

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  input: "#3b82f6",
  engine: "#f59e0b",
  "control-flow": "#6b7280",
  generation: "#10b981",
  assembly: "#8b5cf6",
  output: "#ef4444",
}

// ── 헬퍼: 포트 생성 ──────────────────────────────────────────

function inPort(
  id: string,
  label: string,
  type: PortType,
  required = true,
  multi = false
): NodePort {
  return { id, label, type, direction: "input", required, multi }
}

function outPort(id: string, label: string, type: PortType): NodePort {
  return { id, label, type, direction: "output", required: false, multi: false }
}

// ── Input Nodes (5) ──────────────────────────────────────────

const INPUT_NODES: NodeDefinition[] = [
  {
    type: "basic-info",
    category: "input",
    label: "기본 정보",
    description: "페르소나 기본 정보 입력 (이름, 나이, 직업 등)",
    inputs: [],
    outputs: [outPort("out", "BasicInfo", "BasicInfoData")],
    evaluationStrategy: "eager",
    defaultData: { name: "", age: 25, occupation: "" },
  },
  {
    type: "l1-vector",
    category: "input",
    label: "L1 소셜 벡터",
    description: "L1 Social Persona Vector (7D) 입력",
    inputs: [],
    outputs: [outPort("out", "L1 Vector", "SocialPersonaVector")],
    evaluationStrategy: "eager",
    defaultData: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    },
  },
  {
    type: "l2-vector",
    category: "input",
    label: "L2 기질 벡터",
    description: "L2 Core Temperament / OCEAN (5D) 입력",
    inputs: [],
    outputs: [outPort("out", "L2 Vector", "CoreTemperamentVector")],
    evaluationStrategy: "eager",
    defaultData: {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    },
  },
  {
    type: "l3-vector",
    category: "input",
    label: "L3 내러티브 벡터",
    description: "L3 Narrative Drive (4D) 입력",
    inputs: [],
    outputs: [outPort("out", "L3 Vector", "NarrativeDriveVector")],
    evaluationStrategy: "eager",
    defaultData: {
      conflictOrientation: 0.5,
      resolutionStyle: 0.5,
      narrativePace: 0.5,
      emotionalArc: 0.5,
    },
  },
  {
    type: "archetype-select",
    category: "input",
    label: "아키타입 선택",
    description: "사전 정의된 아키타입 템플릿 선택",
    inputs: [],
    outputs: [outPort("out", "Archetype", "ArchetypeConfig")],
    evaluationStrategy: "eager",
    defaultData: { archetypeId: "" },
  },
]

// ── Engine Nodes (4) ─────────────────────────────────────────

const ENGINE_NODES: NodeDefinition[] = [
  {
    type: "paradox-calc",
    category: "engine",
    label: "패러독스 계산기",
    description: "L1↔L2 패러독스 계산",
    inputs: [
      inPort("l1", "L1 Vector", "SocialPersonaVector"),
      inPort("l2", "L2 Vector", "CoreTemperamentVector"),
    ],
    outputs: [outPort("out", "Paradox", "ParadoxResult")],
    evaluationStrategy: "eager",
    defaultData: {},
  },
  {
    type: "pressure-ctrl",
    category: "engine",
    label: "압력 컨트롤러",
    description: "L3 기반 압력/역동성 제어",
    inputs: [
      inPort("l3", "L3 Vector", "NarrativeDriveVector"),
      inPort("config", "DynamicsConfig", "PressureConfig", false),
    ],
    outputs: [outPort("out", "Pressure", "PressureConfig")],
    evaluationStrategy: "eager",
    defaultData: { pressureLevel: 0.5 },
  },
  {
    type: "v-final",
    category: "engine",
    label: "V_Final 엔진",
    description: "최종 벡터 계산 (L1+L2+L3+P+Dynamics)",
    inputs: [
      inPort("l1", "L1 Vector", "SocialPersonaVector"),
      inPort("l2", "L2 Vector", "CoreTemperamentVector", false),
      inPort("l3", "L3 Vector", "NarrativeDriveVector", false),
      inPort("paradox", "Paradox", "ParadoxResult", false),
      inPort("pressure", "Pressure", "PressureConfig", false),
    ],
    outputs: [outPort("out", "V_Final", "VFinalResult")],
    evaluationStrategy: "eager",
    defaultData: {},
  },
  {
    type: "projection",
    category: "engine",
    label: "프로젝션 설정",
    description: "프로젝션 계수 설정",
    inputs: [inPort("config", "DynamicsConfig", "PressureConfig", false)],
    outputs: [outPort("out", "Projection", "ProjectionConfig")],
    evaluationStrategy: "eager",
    defaultData: {},
  },
]

// ── Control Flow Nodes (3) ───────────────────────────────────

const CONTROL_FLOW_NODES: NodeDefinition[] = [
  {
    type: "conditional",
    category: "control-flow",
    label: "조건 분기",
    description: "조건에 따라 True/False 분기",
    inputs: [inPort("in", "Input", "Any")],
    outputs: [outPort("true", "True", "Any"), outPort("false", "False", "Any")],
    evaluationStrategy: "eager",
    defaultData: {
      conditionType: "threshold",
      operator: ">",
      threshold: 0.5,
    },
  },
  {
    type: "switch",
    category: "control-flow",
    label: "스위치",
    description: "값에 따른 다중 분기",
    inputs: [inPort("in", "Input", "Any")],
    outputs: [outPort("default", "Default", "Any")],
    evaluationStrategy: "eager",
    defaultData: {
      switchMode: "threshold-band",
      bands: [],
      defaultCaseId: "default",
    },
  },
  {
    type: "merge",
    category: "control-flow",
    label: "병합",
    description: "여러 분기를 하나로 병합",
    inputs: [inPort("in", "Input", "Any", true, true)],
    outputs: [outPort("merged", "Merged", "Any")],
    evaluationStrategy: "eager",
    defaultData: { mergeStrategy: "first-active" },
  },
]

// ── Generation Nodes (7) ─────────────────────────────────────

const GENERATION_NODES: NodeDefinition[] = [
  {
    type: "character-gen",
    category: "generation",
    label: "캐릭터 생성",
    description: "V_Final 기반 캐릭터 특성 생성",
    inputs: [
      inPort("vfinal", "V_Final", "VFinalResult"),
      inPort("basic", "BasicInfo", "BasicInfoData"),
      inPort("archetype", "Archetype", "ArchetypeConfig", false),
    ],
    outputs: [outPort("out", "Character", "CharacterData")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
  {
    type: "backstory-gen",
    category: "generation",
    label: "백스토리 생성",
    description: "L1/L2/L3/Paradox 기반 서사 생성",
    inputs: [
      inPort("l1", "L1 Vector", "SocialPersonaVector"),
      inPort("l2", "L2 Vector", "CoreTemperamentVector", false),
      inPort("l3", "L3 Vector", "NarrativeDriveVector", false),
      inPort("paradox", "Paradox", "ParadoxResult", false),
    ],
    outputs: [outPort("out", "Backstory", "BackstoryDimension")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
  {
    type: "voice-gen",
    category: "generation",
    label: "보이스 생성",
    description: "L1+캐릭터 기반 말투/톤 생성",
    inputs: [
      inPort("l1", "L1 Vector", "SocialPersonaVector"),
      inPort("character", "Character", "CharacterData"),
    ],
    outputs: [outPort("out", "Voice", "VoiceProfile")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
  {
    type: "activity-gen",
    category: "generation",
    label: "활동 추론",
    description: "L1+캐릭터 기반 활동 추론",
    inputs: [
      inPort("l1", "L1 Vector", "SocialPersonaVector"),
      inPort("character", "Character", "CharacterData"),
    ],
    outputs: [outPort("out", "Activity", "ActivityConfig")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
  {
    type: "content-gen",
    category: "generation",
    label: "콘텐츠 스타일",
    description: "V_Final+캐릭터 기반 콘텐츠 설정",
    inputs: [
      inPort("vfinal", "V_Final", "VFinalResult"),
      inPort("character", "Character", "CharacterData"),
    ],
    outputs: [outPort("out", "Content", "ContentSettings")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
  {
    type: "pressure-gen",
    category: "generation",
    label: "압력 컨텍스트",
    description: "L3+Paradox 기반 압력 컨텍스트 생성",
    inputs: [
      inPort("l3", "L3 Vector", "NarrativeDriveVector"),
      inPort("paradox", "Paradox", "ParadoxResult", false),
    ],
    outputs: [outPort("out", "PressureCtx", "PressureContext")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
  {
    type: "zeitgeist-gen",
    category: "generation",
    label: "시대상 프로필",
    description: "BasicInfo 기반 문화 시대상 생성",
    inputs: [inPort("basic", "BasicInfo", "BasicInfoData")],
    outputs: [outPort("out", "Zeitgeist", "ZeitgeistProfile")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
]

// ── Assembly Nodes (2) ───────────────────────────────────────

const ASSEMBLY_NODES: NodeDefinition[] = [
  {
    type: "prompt-builder",
    category: "assembly",
    label: "프롬프트 빌더",
    description: "모든 생성 결과를 종합하여 프롬프트 생성",
    inputs: [
      inPort("character", "Character", "CharacterData"),
      inPort("voice", "Voice", "VoiceProfile", false),
      inPort("backstory", "Backstory", "BackstoryDimension", false),
      inPort("pressure", "Pressure", "PressureContext", false),
      inPort("zeitgeist", "Zeitgeist", "ZeitgeistProfile", false),
      inPort("content", "Content", "ContentSettings", false),
    ],
    outputs: [outPort("out", "PromptSet", "PromptSet")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
  {
    type: "interaction-rules",
    category: "assembly",
    label: "인터랙션 규칙",
    description: "Backstory+Pressure+V_Final 기반 규칙 생성",
    inputs: [
      inPort("backstory", "Backstory", "BackstoryDimension", false),
      inPort("pressure", "Pressure", "PressureContext", false),
      inPort("vfinal", "V_Final", "VFinalResult", false),
    ],
    outputs: [outPort("out", "Rules", "InteractionRules")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
]

// ── Output Nodes (4) ─────────────────────────────────────────

const OUTPUT_NODES: NodeDefinition[] = [
  {
    type: "consistency",
    category: "output",
    label: "일관성 검증",
    description: "전체 데이터 일관성 검증",
    inputs: [
      inPort("prompt", "PromptSet", "PromptSet"),
      inPort("character", "Character", "CharacterData", false),
      inPort("vfinal", "V_Final", "VFinalResult", false),
    ],
    outputs: [outPort("out", "Result", "ValidationResult")],
    evaluationStrategy: "eager",
    defaultData: {},
  },
  {
    type: "fingerprint",
    category: "output",
    label: "핑거프린트",
    description: "L1/L2/L3 기반 컬러 핑거프린트 생성",
    inputs: [
      inPort("l1", "L1 Vector", "SocialPersonaVector"),
      inPort("l2", "L2 Vector", "CoreTemperamentVector", false),
      inPort("l3", "L3 Vector", "NarrativeDriveVector", false),
      inPort("paradox", "Paradox", "ParadoxResult", false),
    ],
    outputs: [outPort("out", "Fingerprint", "FingerprintProfile")],
    evaluationStrategy: "eager",
    defaultData: {},
  },
  {
    type: "test-sim",
    category: "output",
    label: "테스트 시뮬레이션",
    description: "프롬프트+캐릭터 테스트 실행",
    inputs: [
      inPort("prompt", "PromptSet", "PromptSet"),
      inPort("character", "Character", "CharacterData"),
    ],
    outputs: [outPort("out", "TestResult", "TestResult")],
    evaluationStrategy: "manual",
    defaultData: {},
  },
  {
    type: "deploy",
    category: "output",
    label: "배포",
    description: "페르소나 배포",
    inputs: [
      inPort("prompt", "PromptSet", "PromptSet"),
      inPort("validation", "Validation", "ValidationResult"),
      inPort("rules", "Rules", "InteractionRules", false),
      inPort("fingerprint", "Fingerprint", "FingerprintProfile", false),
    ],
    outputs: [],
    evaluationStrategy: "manual",
    defaultData: {},
  },
]

// ── 레지스트리 ───────────────────────────────────────────────

const ALL_DEFINITIONS: NodeDefinition[] = [
  ...INPUT_NODES,
  ...ENGINE_NODES,
  ...CONTROL_FLOW_NODES,
  ...GENERATION_NODES,
  ...ASSEMBLY_NODES,
  ...OUTPUT_NODES,
]

const REGISTRY_MAP = new Map<string, NodeDefinition>()
for (const def of ALL_DEFINITIONS) {
  REGISTRY_MAP.set(def.type, def)
}

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return REGISTRY_MAP.get(type)
}

export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return ALL_DEFINITIONS.filter((d) => d.category === category)
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  return [...ALL_DEFINITIONS]
}

export function getNodeCategories(): NodeCategory[] {
  return ["input", "engine", "control-flow", "generation", "assembly", "output"]
}
