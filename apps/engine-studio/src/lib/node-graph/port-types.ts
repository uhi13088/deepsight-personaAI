// ═══════════════════════════════════════════════════════════════
// 포트 타입 시스템
// T59-AC1: 21개 타입, 호환성 매트릭스
// ═══════════════════════════════════════════════════════════════

// ── 포트 타입 정의 (21종) ────────────────────────────────────

export type PortType =
  // Core Vector Types
  | "BasicInfoData"
  | "SocialPersonaVector"
  | "CoreTemperamentVector"
  | "NarrativeDriveVector"
  | "ArchetypeConfig"
  // Engine Output Types
  | "ParadoxResult"
  | "PressureConfig"
  | "VFinalResult"
  | "ProjectionConfig"
  // Generation Output Types
  | "CharacterData"
  | "BackstoryDimension"
  | "VoiceProfile"
  | "ActivityConfig"
  | "ContentSettings"
  | "PressureContext"
  | "ZeitgeistProfile"
  // Assembly Output Types
  | "PromptSet"
  | "InteractionRules"
  // Output/Validation Types
  | "ValidationResult"
  | "FingerprintProfile"
  | "TestResult"
  // Control Flow
  | "Any"

export const ALL_PORT_TYPES: PortType[] = [
  "BasicInfoData",
  "SocialPersonaVector",
  "CoreTemperamentVector",
  "NarrativeDriveVector",
  "ArchetypeConfig",
  "ParadoxResult",
  "PressureConfig",
  "VFinalResult",
  "ProjectionConfig",
  "CharacterData",
  "BackstoryDimension",
  "VoiceProfile",
  "ActivityConfig",
  "ContentSettings",
  "PressureContext",
  "ZeitgeistProfile",
  "PromptSet",
  "InteractionRules",
  "ValidationResult",
  "FingerprintProfile",
  "TestResult",
  "Any",
]

// ── 포트 카테고리 ────────────────────────────────────────────

export type PortCategory = "vector" | "engine" | "generation" | "assembly" | "output" | "control"

export const PORT_CATEGORIES: Record<PortType, PortCategory> = {
  BasicInfoData: "vector",
  SocialPersonaVector: "vector",
  CoreTemperamentVector: "vector",
  NarrativeDriveVector: "vector",
  ArchetypeConfig: "vector",
  ParadoxResult: "engine",
  PressureConfig: "engine",
  VFinalResult: "engine",
  ProjectionConfig: "engine",
  CharacterData: "generation",
  BackstoryDimension: "generation",
  VoiceProfile: "generation",
  ActivityConfig: "generation",
  ContentSettings: "generation",
  PressureContext: "generation",
  ZeitgeistProfile: "generation",
  PromptSet: "assembly",
  InteractionRules: "assembly",
  ValidationResult: "output",
  FingerprintProfile: "output",
  TestResult: "output",
  Any: "control",
}

// ── 호환성 매트릭스 ──────────────────────────────────────────
// 기본 규칙: 동일 타입만 연결 가능
// 특수 규칙 1: ArchetypeConfig → 벡터 타입 (L1/L2/L3)
// 특수 규칙 2: Any ↔ 모든 타입

const SPECIAL_COMPATIBILITY: Record<string, PortType[]> = {
  ArchetypeConfig: ["SocialPersonaVector", "CoreTemperamentVector", "NarrativeDriveVector"],
}

export function isPortCompatible(outputType: PortType, inputType: PortType): boolean {
  // 동일 타입
  if (outputType === inputType) return true

  // Any 타입: 모든 타입과 호환
  if (outputType === "Any" || inputType === "Any") return true

  // 특수 호환성 (output → input)
  const specialTargets = SPECIAL_COMPATIBILITY[outputType]
  if (specialTargets && specialTargets.includes(inputType)) return true

  return false
}

// ── 호환 가능한 타입 목록 ────────────────────────────────────

export function getCompatibleTypes(portType: PortType, direction: "input" | "output"): PortType[] {
  const compatible: PortType[] = []

  for (const candidate of ALL_PORT_TYPES) {
    if (direction === "output") {
      // 이 포트가 output일 때, 어떤 input 타입에 연결 가능한가
      if (isPortCompatible(portType, candidate)) compatible.push(candidate)
    } else {
      // 이 포트가 input일 때, 어떤 output 타입에서 올 수 있는가
      if (isPortCompatible(candidate, portType)) compatible.push(candidate)
    }
  }

  return compatible
}

// ── 포트 인터페이스 ──────────────────────────────────────────

export interface NodePort {
  id: string
  label: string
  type: PortType
  direction: "input" | "output"
  required: boolean
  multi: boolean // input only: 다중 연결 허용
}

// ── 포트 컬러 매핑 ──────────────────────────────────────────

export const PORT_COLORS: Record<PortCategory, string> = {
  vector: "#3b82f6", // blue
  engine: "#f59e0b", // amber
  generation: "#10b981", // emerald
  assembly: "#8b5cf6", // violet
  output: "#ef4444", // red
  control: "#6b7280", // gray
}

export function getPortColor(portType: PortType): string {
  return PORT_COLORS[PORT_CATEGORIES[portType]]
}
