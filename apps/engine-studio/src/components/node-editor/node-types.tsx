"use client"

// ═══════════════════════════════════════════════════════════════
// 25노드 타입별 UI
// T60-AC4: Input5 / Engine4 / Generation7 / Assembly2 / Output4 / ControlFlow3
// T128-AC1: 실행 결과 상태 배지 연결
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
      <div className="text-muted-foreground space-y-1">
        <div>이름: {(d.name as string) || "미설정"}</div>
        <div>나이: {(d.age as number) ?? 25}</div>
      </div>
    </PersonaNodeWrapper>
  )
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
      <div className="text-muted-foreground">L1 Social (7D)</div>
    </PersonaNodeWrapper>
  )
}

export function L2VectorNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="l2-vector"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">L2 OCEAN (5D)</div>
    </PersonaNodeWrapper>
  )
}

export function L3VectorNode({ id, data, selected }: NodeProps) {
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="l3-vector"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">L3 Narrative (4D)</div>
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
      <div className="text-muted-foreground">{(d.archetypeId as string) || "선택 필요"}</div>
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
      <div className="text-muted-foreground">압력: {(d.pressureLevel as number) ?? 0.5}</div>
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
  const executionResult = useNodeExecution(id)
  return (
    <PersonaNodeWrapper
      nodeType="projection"
      nodeId={id}
      data={data as PersonaNodeData}
      selected={!!selected}
      executionResult={executionResult}
    >
      <div className="text-muted-foreground">프로젝션 계수</div>
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
      <div className="text-muted-foreground">
        {(d.conditionType as string) ?? "threshold"} {(d.operator as string) ?? ">"}{" "}
        {(d.threshold as number) ?? 0.5}
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
