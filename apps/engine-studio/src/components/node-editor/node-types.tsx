"use client"

// ═══════════════════════════════════════════════════════════════
// 25노드 타입별 UI
// T60-AC4: Input5 / Engine4 / Generation7 / Assembly2 / Output4 / ControlFlow3
// T128-AC1: 실행 결과 상태 배지 연결
// 인라인 편집: 벡터 슬라이더, 텍스트 입력, 수치 조정
// ═══════════════════════════════════════════════════════════════

import type { NodeProps } from "@xyflow/react"
import { useNodeEditorStore } from "@/stores/node-editor-store"
import { PersonaNodeWrapper } from "./persona-node-wrapper"

// ── 공통 타입 ────────────────────────────────────────────────

type PersonaNodeData = Record<string, unknown> & {
  label?: string
}

// ── 실행 결과 훅 ─────────────────────────────────────────────

function useNodeExecution(nodeId: string) {
  return useNodeEditorStore((s) => s.executionResults.get(nodeId))
}

// ── 인라인 편집 컴포넌트 ────────────────────────────────────

function InlineSlider({
  nodeId,
  label,
  field,
  value,
}: {
  nodeId: string
  label: string
  field: string
  value: number
}) {
  const updateNodeData = useNodeEditorStore((s) => s.updateNodeData)

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-[52px] shrink-0 truncate text-[10px]">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => updateNodeData(nodeId, { [field]: parseFloat(e.target.value) })}
        className="nodrag h-1 flex-1 cursor-pointer appearance-none rounded-full bg-gray-600 accent-blue-500 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
      />
      <span className="w-7 shrink-0 text-right font-mono text-[10px]">{value.toFixed(2)}</span>
    </div>
  )
}

function InlineTextInput({
  nodeId,
  field,
  value,
  placeholder,
}: {
  nodeId: string
  field: string
  value: string
  placeholder: string
}) {
  const updateNodeData = useNodeEditorStore((s) => s.updateNodeData)

  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => updateNodeData(nodeId, { [field]: e.target.value })}
      className="nodrag bg-background w-full rounded border px-1.5 py-0.5 text-[11px]"
    />
  )
}

function InlineNumberInput({
  nodeId,
  field,
  value,
  label,
  min,
  max,
  step,
}: {
  nodeId: string
  field: string
  value: number
  label: string
  min?: number
  max?: number
  step?: number
}) {
  const updateNodeData = useNodeEditorStore((s) => s.updateNodeData)

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground shrink-0 text-[10px]">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => updateNodeData(nodeId, { [field]: parseFloat(e.target.value) || 0 })}
        className="nodrag bg-background w-14 rounded border px-1.5 py-0.5 text-right text-[11px]"
      />
    </div>
  )
}

// ── Input Nodes ──────────────────────────────────────────────

export function BasicInfoNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="basic-info"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="space-y-1.5">
        <InlineTextInput
          nodeId={id}
          field="name"
          value={(d.name as string) || ""}
          placeholder="이름"
        />
        <div className="flex gap-1.5">
          <InlineNumberInput
            nodeId={id}
            field="age"
            value={(d.age as number) ?? 25}
            label="나이"
            min={1}
            max={100}
          />
        </div>
        <InlineTextInput
          nodeId={id}
          field="occupation"
          value={(d.occupation as string) || ""}
          placeholder="직업"
        />
      </div>
    </PersonaNodeWrapper>
  )
}

const L1_DIM_LABELS: Record<string, string> = {
  depth: "분석깊이",
  lens: "판단렌즈",
  stance: "평가태도",
  scope: "관심범위",
  taste: "취향성향",
  purpose: "소비목적",
  sociability: "사회성향",
}

export function L1VectorNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="l1-vector"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="space-y-0.5">
        {Object.entries(L1_DIM_LABELS).map(([key, label]) => (
          <InlineSlider
            key={key}
            nodeId={id}
            label={label}
            field={key}
            value={(d[key] as number) ?? 0.5}
          />
        ))}
      </div>
    </PersonaNodeWrapper>
  )
}

const L2_DIM_LABELS: Record<string, string> = {
  openness: "개방성",
  conscientiousness: "성실성",
  extraversion: "외향성",
  agreeableness: "우호성",
  neuroticism: "신경성",
}

export function L2VectorNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="l2-vector"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="space-y-0.5">
        {Object.entries(L2_DIM_LABELS).map(([key, label]) => (
          <InlineSlider
            key={key}
            nodeId={id}
            label={label}
            field={key}
            value={(d[key] as number) ?? 0.5}
          />
        ))}
      </div>
    </PersonaNodeWrapper>
  )
}

const L3_DIM_LABELS: Record<string, string> = {
  conflictOrientation: "갈등지향",
  resolutionStyle: "해결방식",
  narrativePace: "서사속도",
  emotionalArc: "감정궤적",
}

export function L3VectorNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="l3-vector"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="space-y-0.5">
        {Object.entries(L3_DIM_LABELS).map(([key, label]) => (
          <InlineSlider
            key={key}
            nodeId={id}
            label={label}
            field={key}
            value={(d[key] as number) ?? 0.5}
          />
        ))}
      </div>
    </PersonaNodeWrapper>
  )
}

export function ArchetypeSelectNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="archetype-select"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <InlineTextInput
        nodeId={id}
        field="archetypeId"
        value={(d.archetypeId as string) || ""}
        placeholder="아키타입 ID"
      />
    </PersonaNodeWrapper>
  )
}

// ── Engine Nodes ─────────────────────────────────────────────

export function ParadoxCalcNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="paradox-calc"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">L1 ↔ L2 패러독스</div>
    </PersonaNodeWrapper>
  )
}

export function PressureCtrlNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="pressure-ctrl"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <InlineSlider
        nodeId={id}
        label="압력"
        field="pressureLevel"
        value={(d.pressureLevel as number) ?? 0.5}
      />
    </PersonaNodeWrapper>
  )
}

export function VFinalNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="v-final"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">V_Final (7D)</div>
    </PersonaNodeWrapper>
  )
}

export function ProjectionNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="projection"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <InlineSlider
        nodeId={id}
        label="계수"
        field="coefficient"
        value={(d.coefficient as number) ?? 0.5}
      />
    </PersonaNodeWrapper>
  )
}

// ── Control Flow Nodes ───────────────────────────────────────

export function ConditionalNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="conditional"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="space-y-1">
        <div className="text-muted-foreground text-[10px]">
          {(d.conditionType as string) ?? "threshold"} {(d.operator as string) ?? ">"}{" "}
          {(d.threshold as number) ?? 0.5}
        </div>
        <InlineSlider
          nodeId={id}
          label="임계값"
          field="threshold"
          value={(d.threshold as number) ?? 0.5}
        />
      </div>
    </PersonaNodeWrapper>
  )
}

export function SwitchNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="switch"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">{(d.switchMode as string) ?? "threshold-band"}</div>
    </PersonaNodeWrapper>
  )
}

export function MergeNode({ id, data, selected }: NodeProps) {
  const d = data as PersonaNodeData
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="merge"
      nodeId={id}
      data={d}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">{(d.mergeStrategy as string) ?? "first-active"}</div>
    </PersonaNodeWrapper>
  )
}

// ── Generation Nodes ─────────────────────────────────────────

export function CharacterGenNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="character-gen"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">캐릭터 특성 생성</div>
    </PersonaNodeWrapper>
  )
}

export function BackstoryGenNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="backstory-gen"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">서사 생성</div>
    </PersonaNodeWrapper>
  )
}

export function VoiceGenNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="voice-gen"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">말투/톤 생성</div>
    </PersonaNodeWrapper>
  )
}

export function ActivityGenNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="activity-gen"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">활동 추론</div>
    </PersonaNodeWrapper>
  )
}

export function ContentGenNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="content-gen"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">콘텐츠 스타일</div>
    </PersonaNodeWrapper>
  )
}

export function PressureGenNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="pressure-gen"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">압력 컨텍스트</div>
    </PersonaNodeWrapper>
  )
}

export function ZeitgeistGenNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="zeitgeist-gen"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">시대상 프로필</div>
    </PersonaNodeWrapper>
  )
}

// ── Assembly Nodes ───────────────────────────────────────────

export function PromptBuilderNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="prompt-builder"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">프롬프트 종합</div>
    </PersonaNodeWrapper>
  )
}

export function InteractionRulesNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="interaction-rules"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">인터랙션 규칙</div>
    </PersonaNodeWrapper>
  )
}

// ── Output Nodes ─────────────────────────────────────────────

export function ConsistencyNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="consistency"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">일관성 검증</div>
    </PersonaNodeWrapper>
  )
}

export function FingerprintNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="fingerprint"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">컬러 핑거프린트</div>
    </PersonaNodeWrapper>
  )
}

export function TestSimNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="test-sim"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">테스트 실행</div>
    </PersonaNodeWrapper>
  )
}

export function DeployNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="deploy"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">배포 준비</div>
    </PersonaNodeWrapper>
  )
}

// ── 노드 타입 레지스트리 (ReactFlow용) ───────────────────────

export const NODE_TYPE_MAP: Record<string, React.ComponentType<NodeProps>> = {
  "basic-info": BasicInfoNode,
  "l1-vector": L1VectorNode,
  "l2-vector": L2VectorNode,
  "l3-vector": L3VectorNode,
  "archetype-select": ArchetypeSelectNode,
  "paradox-calc": ParadoxCalcNode,
  "pressure-ctrl": PressureCtrlNode,
  "v-final": VFinalNode,
  projection: ProjectionNode,
  conditional: ConditionalNode,
  switch: SwitchNode,
  merge: MergeNode,
  "character-gen": CharacterGenNode,
  "backstory-gen": BackstoryGenNode,
  "voice-gen": VoiceGenNode,
  "activity-gen": ActivityGenNode,
  "content-gen": ContentGenNode,
  "pressure-gen": PressureGenNode,
  "zeitgeist-gen": ZeitgeistGenNode,
  "prompt-builder": PromptBuilderNode,
  "interaction-rules": InteractionRulesNode,
  consistency: ConsistencyNode,
  fingerprint: FingerprintNode,
  "test-sim": TestSimNode,
  deploy: DeployNode,
}
