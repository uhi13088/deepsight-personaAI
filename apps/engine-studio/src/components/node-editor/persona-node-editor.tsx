"use client"

import { useCallback, useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  BasicInfoNode,
  VectorNode,
  CharacterNode,
  PromptNode,
  TestNode,
  ValidationNode,
  DeployNode,
} from "./nodes"
import { usePersonaEditor } from "./use-persona-editor"

// ============================================
// 노드 타입 등록 (컴포넌트 외부에서 정의)
// ============================================

const nodeTypes: NodeTypes = {
  basicInfo: BasicInfoNode,
  vector: VectorNode,
  character: CharacterNode,
  prompt: PromptNode,
  test: TestNode,
  validation: ValidationNode,
  deploy: DeployNode,
}

// ============================================
// Props
// ============================================

interface PersonaNodeEditorProps {
  personaId?: string | null
}

// ============================================
// 메인 컴포넌트
// ============================================

export function PersonaNodeEditor({ personaId = null }: PersonaNodeEditorProps) {
  const router = useRouter()
  const { state, isLoading, buildNodes, edges: initialEdges } = usePersonaEditor(personaId)

  const builtNodes = buildNodes()
  const [nodes, , onNodesChange] = useNodesState(builtNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // 노드 데이터가 변경될 때 노드 위치는 유지하면서 데이터만 업데이트
  const mergedNodes = useMemo(() => {
    return nodes.map((node) => {
      const freshNode = builtNodes.find((n) => n.id === node.id)
      if (freshNode) {
        return {
          ...node,
          data: freshNode.data,
        }
      }
      return node
    })
  }, [nodes, builtNodes])

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // 위치 변경만 허용 (삭제 방지)
      const filtered = changes.filter((c) => c.type !== "remove")
      onNodesChange(filtered)
    },
    [onNodesChange]
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      // 에지 삭제 방지
      const filtered = changes.filter((c) => c.type !== "remove")
      onEdgesChange(filtered)
    },
    [onEdgesChange]
  )

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-gray-500">페르소나 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* 헤더 바 */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/personas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">{state.basicInfo.name || "새 페르소나"}</h1>
            <p className="text-xs text-gray-400">
              {personaId ? "편집 모드" : "생성 모드"} • 노드 에디터
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.isDirty && <span className="text-xs text-amber-500">• 저장되지 않은 변경</span>}
        </div>
      </div>

      {/* 캔버스 */}
      <div className="flex-1">
        <ReactFlow
          nodes={mergedNodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                basicInfo: "#3B82F6",
                vector: "#8B5CF6",
                character: "#EC4899",
                prompt: "#F59E0B",
                test: "#16A34A",
                validation: "#0D9488",
                deploy: "#4F46E5",
              }
              return colors[node.type || ""] || "#6B7280"
            }}
            maskColor="rgba(0,0,0,0.05)"
            className="!rounded-lg !border !border-gray-200"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
