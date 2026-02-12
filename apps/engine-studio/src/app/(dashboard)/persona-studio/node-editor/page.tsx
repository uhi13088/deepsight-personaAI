"use client"

// ═══════════════════════════════════════════════════════════════
// 노드 에디터 전용 페이지
// T128-AC4: ComfyUI 스타일 페르소나 생성/수정
// ?preset=standard → 프리셋 로드
// ?personaId=xxx → 저장된 그래프 로드
// ═══════════════════════════════════════════════════════════════

import { Suspense, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { PersonaNodeEditor } from "@/components/node-editor/persona-node-editor"
import { useNodeEditorStore } from "@/stores/node-editor-store"
import { getPreset } from "@/constants/flow-presets"
import { fromJSON, deserializeGraph } from "@/lib/node-graph/serializer"

function NodeEditorContent() {
  const searchParams = useSearchParams()
  const store = useNodeEditorStore()
  const initialized = useRef(false)

  // 초기 로드: 프리셋 또는 저장된 그래프
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const presetId = searchParams.get("preset")
    const personaId = searchParams.get("personaId")

    // personaId가 있으면 localStorage에서 저장된 그래프 로드 시도
    if (personaId) {
      store.setPersonaId(personaId)
      const saved = localStorage.getItem(`node-graph-${personaId}`)
      if (saved) {
        try {
          const serialized = fromJSON(saved)
          const graph = deserializeGraph(serialized)
          store.loadGraph(graph)
          store.setPresetId(serialized.metadata.presetId ?? null)
          return
        } catch {
          // 파싱 실패 시 프리셋으로 폴백
        }
      }
    }

    // 프리셋 로드 (기본: standard)
    const targetPreset = presetId ?? "standard"
    const preset = getPreset(targetPreset)
    if (preset) {
      const graph = preset.build()
      store.loadGraph(graph)
      store.setPresetId(targetPreset)
    }

    if (personaId) {
      store.setPersonaId(personaId)
    }
  }, [searchParams, store])

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <Header title="Node Editor" description="ComfyUI 스타일 노드 기반 페르소나 생성" />
      <div className="flex-1 overflow-hidden">
        <PersonaNodeEditor />
      </div>
    </div>
  )
}

export default function NodeEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      }
    >
      <NodeEditorContent />
    </Suspense>
  )
}
