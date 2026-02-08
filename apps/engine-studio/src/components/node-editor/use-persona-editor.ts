"use client"

import { useState, useCallback, useEffect } from "react"
import type { Node, Edge } from "@xyflow/react"
import { toast } from "sonner"
import { personaService } from "@/services/persona-service"
import type { PersonaRole, PersonaStatus, Vector6D } from "@/types"
import type {
  PersonaEditorState,
  TestResult,
  ValidationResult,
  BasicInfoNodeData,
  VectorNodeData,
  CharacterNodeData,
  PromptNodeData,
  TestNodeData,
  ValidationNodeData,
  DeployNodeData,
} from "./types"
import { NODE_TYPES } from "./types"

// ============================================
// 기본값
// ============================================

const DEFAULT_VECTOR: Vector6D = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
}

const DEFAULT_STATE: PersonaEditorState = {
  personaId: null,
  basicInfo: {
    name: "",
    role: "REVIEWER",
    expertise: [],
    description: "",
    status: "DRAFT",
    visibility: "PRIVATE",
  },
  vector: { ...DEFAULT_VECTOR },
  character: {
    warmth: 0.5,
    speechPatterns: [],
    quirks: [],
    background: "",
    favoriteGenres: [],
    dislikedGenres: [],
  },
  prompt: {
    systemPrompt: "",
    exampleResponses: [],
    restrictions: [],
  },
  testHistory: [],
  validationResult: null,
  versions: [],
  qualityScore: 0,
  isDirty: false,
}

// ============================================
// 노드 초기 위치
// ============================================

const NODE_POSITIONS = {
  [NODE_TYPES.BASIC_INFO]: { x: 0, y: 0 },
  [NODE_TYPES.VECTOR]: { x: 400, y: -50 },
  [NODE_TYPES.CHARACTER]: { x: 400, y: 350 },
  [NODE_TYPES.PROMPT]: { x: 800, y: 100 },
  [NODE_TYPES.TEST]: { x: 1200, y: -50 },
  [NODE_TYPES.VALIDATION]: { x: 1200, y: 350 },
  [NODE_TYPES.DEPLOY]: { x: 1600, y: 150 },
}

// ============================================
// 에지 정의
// ============================================

const INITIAL_EDGES: Edge[] = [
  {
    id: "e-basic-vector",
    source: NODE_TYPES.BASIC_INFO,
    target: NODE_TYPES.VECTOR,
    animated: true,
    style: { stroke: "#8B5CF6" },
  },
  {
    id: "e-basic-character",
    source: NODE_TYPES.BASIC_INFO,
    target: NODE_TYPES.CHARACTER,
    animated: true,
    style: { stroke: "#EC4899" },
  },
  {
    id: "e-vector-prompt",
    source: NODE_TYPES.VECTOR,
    target: NODE_TYPES.PROMPT,
    animated: true,
    style: { stroke: "#F59E0B" },
  },
  {
    id: "e-character-prompt",
    source: NODE_TYPES.CHARACTER,
    target: NODE_TYPES.PROMPT,
    animated: true,
    style: { stroke: "#F59E0B" },
  },
  {
    id: "e-prompt-test",
    source: NODE_TYPES.PROMPT,
    target: NODE_TYPES.TEST,
    animated: true,
    style: { stroke: "#16A34A" },
  },
  {
    id: "e-prompt-validation",
    source: NODE_TYPES.PROMPT,
    target: NODE_TYPES.VALIDATION,
    animated: true,
    style: { stroke: "#0D9488" },
  },
  {
    id: "e-test-deploy",
    source: NODE_TYPES.TEST,
    target: NODE_TYPES.DEPLOY,
    animated: true,
    style: { stroke: "#4F46E5" },
  },
  {
    id: "e-validation-deploy",
    source: NODE_TYPES.VALIDATION,
    target: NODE_TYPES.DEPLOY,
    animated: true,
    style: { stroke: "#4F46E5" },
  },
]

// ============================================
// Hook
// ============================================

export function usePersonaEditor(personaId: string | null) {
  const [state, setState] = useState<PersonaEditorState>(DEFAULT_STATE)
  const [isLoading, setIsLoading] = useState(!!personaId)
  const [isTesting, setIsTesting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // ============================================
  // 데이터 로드
  // ============================================

  const loadPersona = useCallback(async () => {
    if (!personaId) return

    setIsLoading(true)
    try {
      const apiData = await personaService.getPersonaById(personaId)
      setState((prev) => ({
        ...prev,
        personaId,
        basicInfo: {
          name: apiData.name,
          role: (apiData.role as PersonaRole) || "REVIEWER",
          expertise: apiData.expertise || [],
          description: apiData.description || "",
          status: (apiData.status as PersonaStatus) || "DRAFT",
          visibility:
            ((apiData as unknown as Record<string, unknown>).visibility as string) || "PRIVATE",
        },
        vector: apiData.vector || { ...DEFAULT_VECTOR },
        prompt: {
          systemPrompt: apiData.promptTemplate || "",
          exampleResponses: [],
          restrictions: [],
        },
        versions: (apiData.versions || []).map((v, idx) => ({
          version: `${v.version}.0`,
          date:
            v.createdAt instanceof Date
              ? v.createdAt.toISOString().split("T")[0]
              : String(v.createdAt).split("T")[0],
          changes: idx === 0 ? "최신 벡터" : `벡터 버전 ${v.version}`,
        })),
        qualityScore: apiData.qualityScore ?? 0,
        isDirty: false,
      }))
    } catch (err) {
      console.error("Failed to load persona:", err)
      toast.error("페르소나를 불러올 수 없습니다")
    } finally {
      setIsLoading(false)
    }
  }, [personaId])

  useEffect(() => {
    if (personaId) {
      loadPersona()
    }
  }, [personaId, loadPersona])

  // ============================================
  // 필드 변경 핸들러
  // ============================================

  const updateBasicInfo = useCallback((field: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, [field]: value },
      isDirty: true,
    }))
  }, [])

  const updateVector = useCallback((key: string, value: number) => {
    setState((prev) => ({
      ...prev,
      vector: { ...prev.vector, [key]: value },
      isDirty: true,
    }))
  }, [])

  const updateCharacter = useCallback((field: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      character: { ...prev.character, [field]: value },
      isDirty: true,
    }))
  }, [])

  const updatePrompt = useCallback((field: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      prompt: { ...prev.prompt, [field]: value },
      isDirty: true,
    }))
  }, [])

  // ============================================
  // 프롬프트 자동 생성
  // ============================================

  const autoGeneratePrompt = useCallback(() => {
    const { basicInfo, vector } = state
    const generated = `# 역할 정의
당신은 "${basicInfo.name}"입니다. ${basicInfo.role} 역할을 수행합니다.
전문 분야: ${basicInfo.expertise.join(", ")}

# 성향 가이드
- 분석 깊이: ${(vector.depth * 100).toFixed(0)}% ${vector.depth > 0.5 ? "심층적" : "직관적"}
- 판단 렌즈: ${(vector.lens * 100).toFixed(0)}% ${vector.lens > 0.5 ? "논리적" : "감성적"}
- 평가 태도: ${(vector.stance * 100).toFixed(0)}% ${vector.stance > 0.5 ? "비판적" : "수용적"}
- 관심 범위: ${(vector.scope * 100).toFixed(0)}% ${vector.scope > 0.5 ? "디테일" : "핵심만"}
- 취향 성향: ${(vector.taste * 100).toFixed(0)}% ${vector.taste > 0.5 ? "실험적" : "클래식"}
- 소비 목적: ${(vector.purpose * 100).toFixed(0)}% ${vector.purpose > 0.5 ? "의미추구" : "오락"}

# 행동 지침
1. ${vector.lens > 0.5 ? "논리적 근거를 제시" : "감성적 표현을 사용"}하세요.
2. ${vector.scope > 0.5 ? "세부 요소를 분석" : "핵심 정보를 간략히 전달"}하세요.
3. ${vector.stance > 0.5 ? "아쉬운 점도 솔직하게 말하되 건설적으로" : "긍정적인 면을 부각"}하세요.

# 금기사항
- 비속어, 혐오 표현 절대 금지
- 정치적/종교적 편향 금지
- 스포일러 주의`

    setState((prev) => ({
      ...prev,
      prompt: { ...prev.prompt, systemPrompt: generated },
      isDirty: true,
    }))
    toast.success("벡터 기반으로 프롬프트가 생성되었습니다")
  }, [state])

  // ============================================
  // 테스트 실행
  // ============================================

  const runTest = useCallback(
    async (content: string, description: string) => {
      const targetId = state.personaId
      if (!targetId) {
        toast.error("먼저 페르소나를 저장해주세요")
        return
      }

      setIsTesting(true)
      try {
        const result = await personaService.testPersona({
          personaId: targetId,
          contentTitle: content,
          contentDescription: description,
        })

        const testResult: TestResult = {
          id: `test-${Date.now()}`,
          content,
          response: result.response,
          scores: {
            vectorAlignment: result.scores.vectorAlignment / 100,
            toneMatch: result.scores.toneMatch / 100,
            reasoningQuality: result.scores.reasoningQuality / 100,
          },
          timestamp: new Date().toISOString(),
        }

        setState((prev) => ({
          ...prev,
          testHistory: [testResult, ...prev.testHistory],
        }))

        toast.success("테스트 완료")
      } catch (err) {
        console.error("Test error:", err)
        toast.error("테스트 실행에 실패했습니다")
      } finally {
        setIsTesting(false)
      }
    },
    [state.personaId]
  )

  // ============================================
  // 검증 실행
  // ============================================

  const runValidation = useCallback(async () => {
    const targetId = state.personaId
    if (!targetId) {
      toast.error("먼저 페르소나를 저장해주세요")
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch(`/api/personas/${targetId}/validate`, {
        method: "POST",
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || "검증 실패")
      }

      const vResult: ValidationResult = {
        overallScore: data.data.overallScore,
        passed: data.data.passed,
        breakdown: data.data.breakdown,
        allIssues: data.data.allIssues || [],
      }

      setState((prev) => ({
        ...prev,
        validationResult: vResult,
        qualityScore: vResult.overallScore,
      }))

      if (vResult.passed) {
        toast.success(`검증 통과! 점수: ${vResult.overallScore}점`)
      } else {
        toast.warning(`검증 미통과. 점수: ${vResult.overallScore}점`)
      }
    } catch (err) {
      console.error("Validation error:", err)
      toast.error(err instanceof Error ? err.message : "검증에 실패했습니다")
    } finally {
      setIsValidating(false)
    }
  }, [state.personaId])

  // ============================================
  // 저장
  // ============================================

  const save = useCallback(async () => {
    setIsSaving(true)
    try {
      if (state.personaId) {
        // 업데이트
        await personaService.updatePersona(state.personaId, {
          name: state.basicInfo.name,
          role: state.basicInfo.role,
          description: state.basicInfo.description || undefined,
          status: state.basicInfo.status,
          expertise: state.basicInfo.expertise,
          vector: state.vector,
          promptTemplate: state.prompt.systemPrompt,
        })
        toast.success("페르소나가 저장되었습니다")
        setState((prev) => ({ ...prev, isDirty: false }))
      } else {
        // 새 생성
        const newPersona = await personaService.createPersona({
          name: state.basicInfo.name,
          role: state.basicInfo.role,
          expertise: state.basicInfo.expertise,
          description: state.basicInfo.description || undefined,
          vector: state.vector,
          promptTemplate: state.prompt.systemPrompt,
        })
        setState((prev) => ({
          ...prev,
          personaId: newPersona.id,
          isDirty: false,
        }))
        toast.success("페르소나가 생성되었습니다")
        return newPersona.id
      }
    } catch (err) {
      console.error("Save error:", err)
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다")
    } finally {
      setIsSaving(false)
    }
  }, [state])

  // ============================================
  // 상태 변경
  // ============================================

  const updateStatus = useCallback((status: PersonaStatus) => {
    setState((prev) => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, status },
      isDirty: true,
    }))
  }, [])

  // ============================================
  // 노드/에지 생성
  // ============================================

  const buildNodes = useCallback((): Node[] => {
    const basicInfoData: BasicInfoNodeData = {
      ...state.basicInfo,
      onChange: updateBasicInfo,
    }

    const vectorData: VectorNodeData = {
      vector: state.vector,
      onChange: updateVector,
    }

    const characterData: CharacterNodeData = {
      ...state.character,
      onChange: updateCharacter,
    }

    const promptData: PromptNodeData = {
      ...state.prompt,
      onChange: updatePrompt,
      onAutoGenerate: autoGeneratePrompt,
    }

    const testData: TestNodeData = {
      personaId: state.personaId || "",
      testHistory: state.testHistory,
      isRunning: isTesting,
      onRunTest: runTest,
    }

    const validationData: ValidationNodeData = {
      qualityScore: state.qualityScore,
      validationResult: state.validationResult,
      isValidating,
      onValidate: runValidation,
    }

    const deployData: DeployNodeData = {
      status: state.basicInfo.status,
      versions: state.versions,
      onStatusChange: updateStatus,
      onSave: save,
      isSaving,
    }

    return [
      {
        id: NODE_TYPES.BASIC_INFO,
        type: NODE_TYPES.BASIC_INFO,
        position: NODE_POSITIONS[NODE_TYPES.BASIC_INFO],
        data: basicInfoData,
      },
      {
        id: NODE_TYPES.VECTOR,
        type: NODE_TYPES.VECTOR,
        position: NODE_POSITIONS[NODE_TYPES.VECTOR],
        data: vectorData,
      },
      {
        id: NODE_TYPES.CHARACTER,
        type: NODE_TYPES.CHARACTER,
        position: NODE_POSITIONS[NODE_TYPES.CHARACTER],
        data: characterData,
      },
      {
        id: NODE_TYPES.PROMPT,
        type: NODE_TYPES.PROMPT,
        position: NODE_POSITIONS[NODE_TYPES.PROMPT],
        data: promptData,
      },
      {
        id: NODE_TYPES.TEST,
        type: NODE_TYPES.TEST,
        position: NODE_POSITIONS[NODE_TYPES.TEST],
        data: testData,
      },
      {
        id: NODE_TYPES.VALIDATION,
        type: NODE_TYPES.VALIDATION,
        position: NODE_POSITIONS[NODE_TYPES.VALIDATION],
        data: validationData,
      },
      {
        id: NODE_TYPES.DEPLOY,
        type: NODE_TYPES.DEPLOY,
        position: NODE_POSITIONS[NODE_TYPES.DEPLOY],
        data: deployData,
      },
    ]
  }, [
    state,
    isTesting,
    isValidating,
    isSaving,
    updateBasicInfo,
    updateVector,
    updateCharacter,
    updatePrompt,
    autoGeneratePrompt,
    runTest,
    runValidation,
    updateStatus,
    save,
  ])

  const edges = INITIAL_EDGES

  return {
    state,
    isLoading,
    isSaving,
    buildNodes,
    edges,
    save,
    loadPersona,
  }
}
