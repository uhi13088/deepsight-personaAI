// ═══════════════════════════════════════════════════════════════
// 노드 에디터 Zustand 스토어
// T60-AC1: 노드/엣지 상태, 실행 상태, 선택
// ═══════════════════════════════════════════════════════════════

import { create } from "zustand"
import type { NodeInstance, EdgeInstance, GraphState } from "@/lib/node-graph/topological-sort"
import type { NodeExecutionResult, ExecutionState } from "@/lib/node-graph/dag-engine"
import type { ValidationResult as GraphValidationResult } from "@/lib/node-graph/graph-validator"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface NodeEditorState {
  // 그래프 상태
  nodes: NodeInstance[]
  edges: EdgeInstance[]

  // 선택 상태
  selectedNodeId: string | null
  selectedEdgeId: string | null

  // 실행 상태
  isExecuting: boolean
  executionResults: Map<string, NodeExecutionResult>
  activeEdges: Set<string>

  // 검증 상태
  validationResult: GraphValidationResult | null

  // UI 상태
  isDirty: boolean
  zoom: number
  panOffset: { x: number; y: number }

  // 메타데이터
  personaId: string | null
  presetId: string | null
}

export interface NodeEditorActions {
  // 노드 CRUD
  addNode: (node: NodeInstance) => void
  removeNode: (nodeId: string) => void
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void

  // 엣지 CRUD
  addEdge: (edge: EdgeInstance) => void
  removeEdge: (edgeId: string) => void

  // 선택
  selectNode: (nodeId: string | null) => void
  selectEdge: (edgeId: string | null) => void
  clearSelection: () => void

  // 실행
  setExecuting: (executing: boolean) => void
  setExecutionResults: (state: ExecutionState) => void
  clearExecutionResults: () => void

  // 검증
  setValidationResult: (result: GraphValidationResult | null) => void

  // 그래프 전체
  loadGraph: (graph: GraphState) => void
  resetGraph: () => void
  getGraphState: () => GraphState

  // 메타데이터
  setPersonaId: (id: string | null) => void
  setPresetId: (id: string | null) => void

  // UI
  setZoom: (zoom: number) => void
  setPanOffset: (offset: { x: number; y: number }) => void
  markClean: () => void
}

export type NodeEditorStore = NodeEditorState & NodeEditorActions

// ── 초기 상태 ────────────────────────────────────────────────

const INITIAL_STATE: NodeEditorState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isExecuting: false,
  executionResults: new Map(),
  activeEdges: new Set(),
  validationResult: null,
  isDirty: false,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  personaId: null,
  presetId: null,
}

// ── 스토어 생성 ──────────────────────────────────────────────

export const useNodeEditorStore = create<NodeEditorStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── 노드 CRUD ────────────────────────────────────────────

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    })),

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      isDirty: true,
    })),

  updateNodePosition: (nodeId, position) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      isDirty: true,
    })),

  // ── 엣지 CRUD ────────────────────────────────────────────

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
      isDirty: true,
    })),

  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      isDirty: true,
    })),

  // ── 선택 ─────────────────────────────────────────────────

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),

  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

  // ── 실행 ─────────────────────────────────────────────────

  setExecuting: (executing) => set({ isExecuting: executing }),

  setExecutionResults: (execState) =>
    set({
      executionResults: execState.results,
      activeEdges: execState.activeEdges,
      isExecuting: false,
    }),

  clearExecutionResults: () =>
    set({
      executionResults: new Map(),
      activeEdges: new Set(),
    }),

  // ── 검증 ─────────────────────────────────────────────────

  setValidationResult: (result) => set({ validationResult: result }),

  // ── 그래프 전체 ──────────────────────────────────────────

  loadGraph: (graph) =>
    set({
      nodes: graph.nodes,
      edges: graph.edges,
      selectedNodeId: null,
      selectedEdgeId: null,
      executionResults: new Map(),
      activeEdges: new Set(),
      validationResult: null,
      isDirty: false,
    }),

  resetGraph: () => set(INITIAL_STATE),

  getGraphState: () => ({
    nodes: get().nodes,
    edges: get().edges,
  }),

  // ── 메타데이터 ───────────────────────────────────────────

  setPersonaId: (id) => set({ personaId: id }),
  setPresetId: (id) => set({ presetId: id }),

  // ── UI ────────────────────────────────────────────────────

  setZoom: (zoom) => set({ zoom }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  markClean: () => set({ isDirty: false }),
}))
