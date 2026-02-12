"use client"

// ═══════════════════════════════════════════════════════════════
// 메인 노드 에디터 캔버스
// T60-AC2: DAG 레이아웃, 줌/팬, 드래그&드롭
// ═══════════════════════════════════════════════════════════════

import { useCallback, useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { useNodeEditorStore } from "@/stores/node-editor-store"
import { getNodeDefinition } from "@/lib/node-graph/node-registry"
import { isPortCompatible } from "@/lib/node-graph/port-types"
import type { PortType } from "@/lib/node-graph/port-types"
import { wouldCreateCycle } from "@/lib/node-graph/topological-sort"
import { validateGraph } from "@/lib/node-graph/graph-validator"
import { getPreset } from "@/constants/flow-presets"

import { NODE_TYPE_MAP } from "./node-types"
import { NodePalette } from "./node-palette"
import { NodeSettingsPanel } from "./node-settings-panel"
import { EditorToolbar } from "./editor-toolbar"
import { EditorStatusBar } from "./editor-status-bar"

// ── 메인 컴포넌트 ────────────────────────────────────────────

export function PersonaNodeEditor() {
  const store = useNodeEditorStore()

  // ReactFlow 노드/엣지 변환
  const rfNodes: Node[] = useMemo(
    () =>
      store.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        selected: n.id === store.selectedNodeId,
      })),
    [store.nodes, store.selectedNodeId]
  )

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
    },
    [store]
  )

  // 검증
  const handleValidate = useCallback(() => {
    const result = validateGraph(store.getGraphState())
    store.setValidationResult(result)
  }, [store])

  // 실행 (placeholder)
  const handleExecute = useCallback(() => {
    store.setExecuting(true)
    // 실제 실행은 T61에서 구현
    setTimeout(() => store.setExecuting(false), 1000)
  }, [store])

  // 저장 (placeholder)
  const handleSave = useCallback(() => {
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

      <div className="flex flex-1 overflow-hidden">
        <NodePalette onAddNode={handleAddNode} />

        <div className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPE_MAP}
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

      <EditorStatusBar validationResult={store.validationResult} zoom={store.zoom} />
    </div>
  )
}
