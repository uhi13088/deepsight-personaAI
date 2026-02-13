"use client"

// ═══════════════════════════════════════════════════════════════
// 메인 노드 에디터 캔버스
// T60-AC2: DAG 레이아웃, 줌/팬, 드래그&드롭
// T128-AC1: executeGraph() 실제 연결
// T128-AC2: serializeGraph + localStorage 저장/로드
// T128-AC3: 실행 결과 패널 통합
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { useNodeEditorStore } from "@/stores/node-editor-store"
import { getNodeDefinition } from "@/lib/node-graph/node-registry"
import { isPortCompatible } from "@/lib/node-graph/port-types"
import type { PortType } from "@/lib/node-graph/port-types"
import { wouldCreateCycle } from "@/lib/node-graph/topological-sort"
import { validateGraph } from "@/lib/node-graph/graph-validator"
import { executeGraph } from "@/lib/node-graph/execution-engine"
import type { ExecutionEngineResult } from "@/lib/node-graph/execution-engine"
import { serializeGraph, toJSON } from "@/lib/node-graph/serializer"
import { getPreset } from "@/constants/flow-presets"

import { NODE_TYPE_MAP } from "./node-types"
import { NodePalette } from "./node-palette"
import { NodeSettingsPanel } from "./node-settings-panel"
import { EditorToolbar } from "./editor-toolbar"
import { EditorStatusBar } from "./editor-status-bar"
import { ExecutionResultsPanel } from "./execution-results-panel"

// ── 외부 래퍼 (ReactFlowProvider 필수) ──────────────────────

export function PersonaNodeEditor() {
  return (
    <ReactFlowProvider>
      <PersonaNodeEditorInner />
    </ReactFlowProvider>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────

function PersonaNodeEditorInner() {
  const store = useNodeEditorStore()
  const { screenToFlowPosition } = useReactFlow()
  const canvasRef = useRef<HTMLDivElement>(null)
  const handleExecuteRef = useRef<() => void>(() => {})
  const [executionResult, setExecutionResult] = useState<ExecutionEngineResult | null>(null)
  const [executeError, setExecuteError] = useState<string | null>(null)
  const [showValidationPanel, setShowValidationPanel] = useState(false)

  // ── ReactFlow 노드 — useState로 관리 (드래그 중 실시간 위치 반영) ──

  const [rfNodes, setRfNodes] = useState<Node[]>([])

  useEffect(() => {
    setRfNodes(
      store.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        selected: n.id === store.selectedNodeId,
      }))
    )
  }, [store.nodes, store.selectedNodeId])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "remove") {
          store.removeNode(change.id)
        }
      }
      setRfNodes((prev) => applyNodeChanges(changes, prev))
    },
    [store]
  )

  // ── ReactFlow 엣지 — useState로 관리 (선택/삭제 지원) ──

  const [rfEdges, setRfEdges] = useState<Edge[]>([])

  useEffect(() => {
    setRfEdges(
      store.edges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        sourceHandle: e.sourcePortId,
        target: e.targetNodeId,
        targetHandle: e.targetPortId,
        animated: store.activeEdges.has(e.id),
        style: {
          stroke: store.activeEdges.has(e.id) ? "#10b981" : "#94a3b8",
          strokeWidth: store.activeEdges.has(e.id) ? 2 : 1,
        },
      }))
    )
  }, [store.edges, store.activeEdges])

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === "remove") {
          store.removeEdge(change.id)
        }
      }
      setRfEdges((prev) => applyEdgeChanges(changes, prev))
    },
    [store]
  )

  // ── 연결 검증 (시각 피드백용) ──────────────────────────────

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.source || !connection.target) return false
      if (!connection.sourceHandle || !connection.targetHandle) return false
      if (connection.source === connection.target) return false

      const sourceDef = getNodeDefinition(
        store.nodes.find((n) => n.id === connection.source)?.type ?? ""
      )
      const targetDef = getNodeDefinition(
        store.nodes.find((n) => n.id === connection.target)?.type ?? ""
      )
      if (!sourceDef || !targetDef) return false

      const sourcePort = sourceDef.outputs.find((p) => p.id === connection.sourceHandle)
      const targetPort = targetDef.inputs.find((p) => p.id === connection.targetHandle)
      if (!sourcePort || !targetPort) return false

      if (!isPortCompatible(sourcePort.type as PortType, targetPort.type as PortType)) return false

      const graphState = store.getGraphState()
      if (wouldCreateCycle(graphState, connection.source, connection.target)) return false

      return true
    },
    [store]
  )

  // ── 연결 확정 ─────────────────────────────────────────────

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (!connection.sourceHandle || !connection.targetHandle) return

      const edgeId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      store.addEdge({
        id: edgeId,
        sourceNodeId: connection.source,
        sourcePortId: connection.sourceHandle,
        targetNodeId: connection.target,
        targetPortId: connection.targetHandle,
      })
    },
    [store]
  )

  // ── 노드/엣지 선택 ────────────────────────────────────────

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      store.selectNode(node.id)
    },
    [store]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      store.selectEdge(edge.id)
    },
    [store]
  )

  // ── 노드 위치 변경 ────────────────────────────────────────

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      store.updateNodePosition(node.id, node.position)
    },
    [store]
  )

  // ── 노드 추가 (공통) ──────────────────────────────────────

  const addNode = useCallback(
    (nodeType: string, position: { x: number; y: number }) => {
      const def = getNodeDefinition(nodeType)
      if (!def) return

      const nodeId = `${nodeType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      store.addNode({
        id: nodeId,
        type: nodeType,
        position,
        data: { ...def.defaultData },
      })
    },
    [store]
  )

  // ── 팔레트 클릭 → 뷰포트 중앙에 추가 ─────────────────────

  const handleAddNodeFromPalette = useCallback(
    (nodeType: string) => {
      let position = { x: 400, y: 300 }
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        position = screenToFlowPosition({
          x: rect.left + rect.width / 2 + Math.random() * 60 - 30,
          y: rect.top + rect.height / 2 + Math.random() * 60 - 30,
        })
      }
      addNode(nodeType, position)
    },
    [addNode, screenToFlowPosition]
  )

  // ── 드래그&드롭 → 드롭 지점에 추가 ───────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData("application/persona-node")
      if (!nodeType) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNode(nodeType, position)
    },
    [addNode, screenToFlowPosition]
  )

  // ── 프리셋 로드 ───────────────────────────────────────────

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const preset = getPreset(presetId)
      if (!preset) return
      const graph = preset.build()
      store.loadGraph(graph)
      store.setPresetId(presetId)
      setExecutionResult(null)
      setExecuteError(null)
    },
    [store]
  )

  // ── 검증 ──────────────────────────────────────────────────

  const handleValidate = useCallback(() => {
    const result = validateGraph(store.getGraphState())
    store.setValidationResult(result)
    if (!result.valid) {
      setShowValidationPanel(true)
    }
  }, [store])

  // ── 자동 검증: 그래프 변경 시 300ms 디바운스 ──────────────

  useEffect(() => {
    if (store.nodes.length === 0) return
    const timer = setTimeout(() => {
      const result = validateGraph({ nodes: store.nodes, edges: store.edges })
      store.setValidationResult(result)
    }, 300)
    return () => clearTimeout(timer)
  }, [store.nodes, store.edges, store])

  // ── 키보드 단축키: Ctrl+Enter → 실행 ─────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        if (!store.isExecuting && store.nodes.length > 0) {
          handleExecuteRef.current()
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [store.isExecuting, store.nodes.length])

  // ── T128-AC1: 실제 실행 엔진 연결 ────────────────────────

  const handleExecute = useCallback(async () => {
    const validation = validateGraph(store.getGraphState())
    store.setValidationResult(validation)

    if (!validation.valid) {
      setExecuteError("그래프 검증 실패. 하단 에러 목록을 확인하세요.")
      setShowValidationPanel(true)
      return
    }

    store.clearExecutionResults()
    store.setExecuting(true)
    setExecutionResult(null)
    setExecuteError(null)

    try {
      const result = await executeGraph(store.getGraphState())
      store.setExecutionResults(result.state)
      setExecutionResult(result)
    } catch (err) {
      store.setExecuting(false)
      setExecuteError(err instanceof Error ? err.message : "실행 중 오류 발생")
    }
  }, [store])

  // ref를 최신 handleExecute로 갱신 (키보드 단축키에서 사용)
  handleExecuteRef.current = handleExecute

  // ── T128-AC2: 저장/로드 ───────────────────────────────────

  const handleSave = useCallback(() => {
    const graphState = store.getGraphState()
    if (graphState.nodes.length === 0) return

    const personaId = store.personaId ?? "draft"
    const serialized = serializeGraph(graphState, personaId, {
      presetId: store.presetId ?? undefined,
    })
    localStorage.setItem(`node-graph-${personaId}`, toJSON(serialized))
    store.markClean()
  }, [store])

  // ── 선택된 노드 ──────────────────────────────────────────

  const selectedNode = store.nodes.find((n) => n.id === store.selectedNodeId)

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar
        onLoadPreset={handleLoadPreset}
        onValidate={handleValidate}
        onExecute={handleExecute}
        onSave={handleSave}
        isExecuting={store.isExecuting}
        isDirty={store.isDirty}
        nodeCount={store.nodes.length}
        edgeCount={store.edges.length}
      />

      {/* 실행 에러 표시 */}
      {executeError && (
        <div className="flex items-center justify-between border-b bg-red-500/10 px-4 py-1.5 text-xs text-red-400">
          <span>{executeError}</span>
          <button onClick={() => setExecuteError(null)} className="text-red-400 hover:text-red-300">
            닫기
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <NodePalette onAddNode={handleAddNodeFromPalette} />

        <div ref={canvasRef} className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPE_MAP}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDragStop={onNodeDragStop}
            onPaneClick={() => store.clearSelection()}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap zoomable pannable />
          </ReactFlow>
        </div>

        {selectedNode && (
          <NodeSettingsPanel
            nodeId={selectedNode.id}
            nodeType={selectedNode.type}
            data={selectedNode.data}
            onUpdateData={(data) => store.updateNodeData(selectedNode.id, data)}
            onDelete={() => store.removeNode(selectedNode.id)}
          />
        )}
      </div>

      {/* T128-AC3: 실행 결과 패널 */}
      {executionResult && (
        <ExecutionResultsPanel
          result={executionResult}
          onClose={() => setExecutionResult(null)}
          onNodeClick={(nodeId) => store.selectNode(nodeId)}
        />
      )}

      <EditorStatusBar
        validationResult={store.validationResult}
        zoom={store.zoom}
        onNodeClick={(nodeId) => store.selectNode(nodeId)}
        forceOpen={showValidationPanel}
      />
    </div>
  )
}
