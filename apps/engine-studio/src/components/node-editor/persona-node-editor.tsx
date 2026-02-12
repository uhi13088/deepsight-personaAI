"use client"

// ═══════════════════════════════════════════════════════════════
// 메인 노드 에디터 캔버스
// T60-AC2: DAG 레이아웃, 줌/팬, 드래그&드롭
// T128-AC1: executeGraph() 실제 연결
// T128-AC2: serializeGraph + localStorage 저장/로드
// T128-AC3: 실행 결과 패널 통합
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
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

// ── 메인 컴포넌트 ────────────────────────────────────────────

export function PersonaNodeEditor() {
  const store = useNodeEditorStore()
  const [executionResult, setExecutionResult] = useState<ExecutionEngineResult | null>(null)
  const [executeError, setExecuteError] = useState<string | null>(null)

  // ReactFlow 노드 — useState로 관리 (드래그 중 실시간 위치 반영)
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

  // 드래그 중 실시간 위치 업데이트
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRfNodes((prev) => applyNodeChanges(changes, prev))
  }, [])

  const rfEdges: Edge[] = useMemo(
    () =>
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
      })),
    [store.edges, store.activeEdges]
  )

  // 연결 검증 + 추가
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (!connection.sourceHandle || !connection.targetHandle) return

      // 포트 타입 호환성 검사
      const sourceDef = getNodeDefinition(
        store.nodes.find((n) => n.id === connection.source)?.type ?? ""
      )
      const targetDef = getNodeDefinition(
        store.nodes.find((n) => n.id === connection.target)?.type ?? ""
      )

      if (sourceDef && targetDef) {
        const sourcePort = sourceDef.outputs.find((p) => p.id === connection.sourceHandle)
        const targetPort = targetDef.inputs.find((p) => p.id === connection.targetHandle)

        if (sourcePort && targetPort) {
          if (!isPortCompatible(sourcePort.type as PortType, targetPort.type as PortType)) {
            return // 비호환 포트
          }
        }
      }

      // 순환 검사
      const graphState = store.getGraphState()
      if (wouldCreateCycle(graphState, connection.source, connection.target)) {
        return // 순환 방지
      }

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

  // 노드 선택
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      store.selectNode(node.id)
    },
    [store]
  )

  // 노드 위치 변경
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      store.updateNodePosition(node.id, node.position)
    },
    [store]
  )

  // 팔레트에서 노드 추가
  const handleAddNode = useCallback(
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

  // 드래그&드롭
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData("application/persona-node")
      if (!nodeType) return

      const position = {
        x: event.clientX - 300,
        y: event.clientY - 100,
      }
      handleAddNode(nodeType, position)
    },
    [handleAddNode]
  )

  // 프리셋 로드
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

  // 검증
  const handleValidate = useCallback(() => {
    const result = validateGraph(store.getGraphState())
    store.setValidationResult(result)
  }, [store])

  // ── T128-AC1: 실제 실행 엔진 연결 ──────────────────────────

  const handleExecute = useCallback(async () => {
    // 1. 실행 전 검증
    const validation = validateGraph(store.getGraphState())
    store.setValidationResult(validation)

    if (!validation.valid) {
      setExecuteError("그래프 검증 실패. 에러를 확인하세요.")
      return
    }

    // 2. 실행 상태 초기화
    store.clearExecutionResults()
    store.setExecuting(true)
    setExecutionResult(null)
    setExecuteError(null)

    try {
      // 3. DAG 실행
      const result = await executeGraph(store.getGraphState())

      // 4. 결과 반영 (isExecuting=false 자동 설정)
      store.setExecutionResults(result.state)
      setExecutionResult(result)
    } catch (err) {
      store.setExecuting(false)
      setExecuteError(err instanceof Error ? err.message : "실행 중 오류 발생")
    }
  }, [store])

  // ── T128-AC2: 저장/로드 ─────────────────────────────────────

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

  // 선택된 노드
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
        <NodePalette onAddNode={handleAddNode} />

        <div className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPE_MAP}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            onPaneClick={() => store.clearSelection()}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
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

      <EditorStatusBar validationResult={store.validationResult} zoom={store.zoom} />
    </div>
  )
}
