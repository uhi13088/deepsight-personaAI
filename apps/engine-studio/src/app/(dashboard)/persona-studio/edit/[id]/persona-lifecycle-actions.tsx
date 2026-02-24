"use client"

import { useState, useMemo, useCallback } from "react"
import { AlertTriangle, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buildAllPrompts } from "@/lib/prompt-builder"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import type { PersonaData } from "./persona-metadata-form"

// ── Prompt Tab ──────────────────────────────────────────────

export function PromptTab({
  prompt,
  editable,
  onPromptChange,
}: {
  prompt: string
  editable: boolean
  onPromptChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">시스템 프롬프트</h3>
      {editable ? (
        <textarea
          className="border-border bg-background min-h-[300px] w-full rounded-lg border p-3 font-mono text-xs"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
        />
      ) : (
        <pre className="border-border bg-muted overflow-x-auto whitespace-pre-wrap rounded-lg border p-3 text-xs">
          {prompt}
        </pre>
      )}
    </div>
  )
}

// ── Preview Tab (인터랙티브 페르소나 플레이그라운드) ─────────

type PreviewPromptType = "review" | "post" | "comment" | "interaction"

const PREVIEW_LABELS: Record<PreviewPromptType, { label: string; scenario: string }> = {
  review: {
    label: "리뷰",
    scenario: "새로 출시된 무선 이어폰 제품에 대한 리뷰를 작성해주세요.",
  },
  post: {
    label: "포스트",
    scenario: "요즘 인상 깊게 본 콘텐츠에 대해 자유롭게 이야기해주세요.",
  },
  comment: {
    label: "댓글",
    scenario: "'이 영화는 역대 최고의 작품이다'라는 게시물에 댓글을 달아주세요.",
  },
  interaction: {
    label: "대화",
    scenario: "다른 사용자가 '요즘 뭐 재밌는거 있어요?'라고 물었습니다.",
  },
}

interface GeneratedResult {
  output: string
  type: PreviewPromptType
  inputTokens: number
  outputTokens: number
  model: string
}

export function PreviewTab({ data }: { data: PersonaData }) {
  const [activeType, setActiveType] = useState<PreviewPromptType>("review")
  const [customScenario, setCustomScenario] = useState("")
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<GeneratedResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)

  const l1 = data.vectors.l1 as SocialPersonaVector | null
  const l2 = data.vectors.l2 as CoreTemperamentVector | null
  const l3 = data.vectors.l3 as NarrativeDriveVector | null

  const prompts = useMemo(() => {
    if (!l1 || !l2 || !l3) return null
    try {
      return buildAllPrompts({
        name: data.name,
        role: data.role,
        expertise: data.expertise,
        l1,
        l2,
        l3,
      })
    } catch {
      return null
    }
  }, [data.name, data.role, data.expertise, l1, l2, l3])

  const behaviorSummary = useMemo(() => {
    if (!l1 || !l2) return null
    return generateBehaviorSummary(data.name, l1, l2, l3)
  }, [data.name, l1, l2, l3])

  const currentScenario = customScenario || PREVIEW_LABELS[activeType].scenario

  const handleGenerate = useCallback(async () => {
    if (generating || !currentScenario.trim()) return
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch(`/api/internal/personas/${data.id}/test-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          scenario: currentScenario.trim(),
        }),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error?.message ?? "생성에 실패했습니다.")
        return
      }

      setResults((prev) => [json.data as GeneratedResult, ...prev])
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setGenerating(false)
    }
  }, [generating, currentScenario, data.id, activeType])

  if (!l1 || !l2 || !l3) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        벡터 데이터가 없어 미리보기를 생성할 수 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="border-border rounded-lg border bg-emerald-500/5 p-4">
        <p className="mb-1 text-xs font-medium">페르소나 플레이그라운드</p>
        <p className="text-muted-foreground text-xs">
          시나리오를 입력하고 &quot;생성&quot;을 누르면 이 페르소나가 실제로 어떻게 응답하는지
          확인할 수 있습니다. 리뷰, 포스트, 댓글, 대화 등 다양한 상황을 테스트하세요.
        </p>
      </div>

      {/* 성격 요약 (접이식) */}
      {behaviorSummary && (
        <div className="border-border rounded-lg border p-4">
          <h4 className="mb-3 text-sm font-semibold">페르소나 성격 요약</h4>
          <div className="grid grid-cols-2 gap-3">
            {behaviorSummary.traits.map((trait) => (
              <div key={trait.label} className="flex items-start gap-2">
                <span className="mt-0.5 text-sm">{trait.icon}</span>
                <div>
                  <p className="text-xs font-medium">{trait.label}</p>
                  <p className="text-muted-foreground text-xs">{trait.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3">
            <p className="text-xs font-medium">예상 톤앤매너</p>
            <p className="text-muted-foreground mt-1 text-xs">{behaviorSummary.toneDescription}</p>
          </div>
        </div>
      )}

      {/* 유형 선택 + 시나리오 입력 + 생성 버튼 */}
      <div className="border-border rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2">
          {(Object.keys(PREVIEW_LABELS) as PreviewPromptType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setActiveType(type)
                setCustomScenario("")
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent"
              }`}
            >
              {PREVIEW_LABELS[type].label}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">시나리오</span>
            {customScenario && (
              <button
                onClick={() => setCustomScenario("")}
                className="text-muted-foreground text-xs hover:underline"
              >
                기본값 복원
              </button>
            )}
          </div>
          <textarea
            className="border-border bg-background w-full rounded-lg border p-3 text-xs"
            rows={3}
            value={currentScenario}
            onChange={(e) => setCustomScenario(e.target.value)}
            placeholder="시나리오를 입력하세요..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleGenerate()
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSystemPrompt((v) => !v)}
            className="text-muted-foreground flex items-center gap-1 text-xs hover:underline"
          >
            {showSystemPrompt ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            시스템 프롬프트 보기
          </button>

          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Send className="mr-1 h-3 w-3" />
                생성 (Ctrl+Enter)
              </>
            )}
          </Button>
        </div>

        {/* 시스템 프롬프트 (접이식) */}
        {showSystemPrompt && (
          <div className="border-border bg-muted/50 mt-3 max-h-48 overflow-y-auto rounded-lg border p-3">
            <pre className="whitespace-pre-wrap text-xs">
              {prompts?.[activeType] || data.basePrompt}
            </pre>
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* 생성 결과 목록 */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">생성 결과</h4>
          {results.map((result, idx) => (
            <div key={idx} className="border-border rounded-lg border">
              {/* 결과 헤더 */}
              <div className="flex items-center justify-between border-b px-4 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {PREVIEW_LABELS[result.type].label}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">{result.model}</span>
                </div>
                <span className="text-muted-foreground text-[10px]">
                  {result.inputTokens + result.outputTokens} tokens (in:{result.inputTokens} / out:
                  {result.outputTokens})
                </span>
              </div>
              {/* 결과 본문 */}
              <div className="p-4">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{result.output}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 결과가 없을 때 안내 */}
      {results.length === 0 && !generating && (
        <div className="text-muted-foreground py-8 text-center text-sm">
          시나리오를 입력하고 &quot;생성&quot; 버튼을 클릭하면
          <br />이 페르소나의 실제 응답을 확인할 수 있습니다.
        </div>
      )}
    </div>
  )
}

// ── Helper: Behavior Summary ────────────────────────────────

interface BehaviorTrait {
  icon: string
  label: string
  description: string
}

function generateBehaviorSummary(
  name: string,
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector | null
): { traits: BehaviorTrait[]; toneDescription: string } {
  const traits: BehaviorTrait[] = []

  if (l1.depth >= 0.65) {
    traits.push({
      icon: "🔍",
      label: "심층 분석",
      description: "표면을 넘어 깊이 있는 분석 제공",
    })
  } else if (l1.depth <= 0.35) {
    traits.push({ icon: "⚡", label: "직관적 반응", description: "빠르고 직감적인 판단" })
  }

  if (l1.lens >= 0.65) {
    traits.push({
      icon: "🧠",
      label: "논리 중심",
      description: "데이터와 근거 기반의 논리적 접근",
    })
  } else if (l1.lens <= 0.35) {
    traits.push({
      icon: "💗",
      label: "감성 중심",
      description: "공감과 감정적 공명을 우선시",
    })
  }

  if (l1.stance >= 0.65) {
    traits.push({
      icon: "⚔️",
      label: "비판적 시각",
      description: "날카로운 비판과 솔직한 평가",
    })
  } else if (l1.stance <= 0.35) {
    traits.push({
      icon: "🤝",
      label: "수용적 태도",
      description: "긍정적이고 포용적인 관점",
    })
  }

  if (l1.sociability >= 0.65 && l2.extraversion >= 0.6) {
    traits.push({
      icon: "🗣️",
      label: "활발한 소통",
      description: "적극적으로 대화에 참여하고 교류",
    })
  } else if (l1.sociability <= 0.35 && l2.extraversion <= 0.4) {
    traits.push({
      icon: "🔇",
      label: "독립적 활동",
      description: "혼자서 깊이 있는 콘텐츠 생산",
    })
  }

  if (l2.neuroticism >= 0.6 && l3?.volatility && l3.volatility >= 0.6) {
    traits.push({
      icon: "🌊",
      label: "감정적 변동성",
      description: "압력 상황에서 감정 반응이 크게 나타남",
    })
  } else if (l2.neuroticism <= 0.35) {
    traits.push({ icon: "🪨", label: "정서적 안정", description: "일관되고 안정적인 반응" })
  }

  if (l2.openness >= 0.65) {
    traits.push({
      icon: "🌈",
      label: "개방적 탐색",
      description: "새로운 관점과 실험적 시도에 열려있음",
    })
  }

  if (traits.length < 4 && l1.scope >= 0.65) {
    traits.push({
      icon: "📐",
      label: "세밀한 관찰",
      description: "디테일에 주목하며 꼼꼼한 분석",
    })
  }
  if (traits.length < 4 && l1.purpose >= 0.65) {
    traits.push({
      icon: "🎯",
      label: "의미 추구",
      description: "단순 오락보다 깊은 의미와 가치 중시",
    })
  }

  const toneElements: string[] = []
  if (l1.depth >= 0.6) toneElements.push("분석적")
  else toneElements.push("가볍고 직관적인")
  if (l1.lens >= 0.6) toneElements.push("논리적인")
  else if (l1.lens <= 0.4) toneElements.push("감성적인")
  if (l1.stance >= 0.6) toneElements.push("비판적인")
  else if (l1.stance <= 0.4) toneElements.push("수용적인")
  if (l2.agreeableness >= 0.6) toneElements.push("친절한")
  else if (l2.agreeableness <= 0.35) toneElements.push("날카로운")

  const toneDescription =
    `${name}은(는) ${toneElements.join(", ")} 톤으로 소통합니다. ` +
    `글의 길이는 ${l1.scope >= 0.6 ? "길고 상세한 편" : l1.scope <= 0.4 ? "짧고 간결한 편" : "적절한 수준"}이며, ` +
    `${l2.conscientiousness >= 0.6 ? "체계적이고 구조화된" : "자유로운"} 형식을 선호합니다.`

  return { traits: traits.slice(0, 6), toneDescription }
}

// ── Helper: Expected Behavior by Type ───────────────────────

interface ExpectedBehaviorItem {
  label: string
  description: string
  confidence: number
}

export function getExpectedBehavior(
  type: PreviewPromptType,
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector | null
): ExpectedBehaviorItem[] {
  const items: ExpectedBehaviorItem[] = []

  if (type === "review") {
    items.push({
      label: "분석 깊이",
      description:
        l1.depth >= 0.6
          ? "제품/콘텐츠의 본질적 가치와 구조를 분석하는 심층 리뷰"
          : "핵심 인상과 첫 느낌 위주의 간결한 리뷰",
      confidence: Math.abs(l1.depth - 0.5) * 2,
    })
    items.push({
      label: "평가 방식",
      description:
        l1.lens >= 0.6
          ? "스펙, 성능, 가성비 등 객관적 지표 중심 평가"
          : "감성적 경험, 분위기, 느낌 위주 서술",
      confidence: Math.abs(l1.lens - 0.5) * 2,
    })
    items.push({
      label: "비판 수위",
      description:
        l1.stance >= 0.6
          ? "단점을 솔직하게 지적하며, 과한 칭찬을 경계"
          : "장점을 부각하고 부드러운 어조로 아쉬운 점 언급",
      confidence: Math.abs(l1.stance - 0.5) * 2,
    })
    items.push({
      label: "리뷰 길이",
      description:
        l1.scope >= 0.6
          ? "카테고리별 상세 분석과 구체적 사례를 포함한 장문"
          : "핵심 포인트만 짚는 짧은 형태",
      confidence: Math.abs(l1.scope - 0.5) * 2,
    })
  }

  if (type === "post") {
    items.push({
      label: "주제 선택",
      description:
        l1.taste >= 0.6
          ? "트렌디하고 실험적인 주제, 새로운 발견 공유"
          : "검증된 클래식한 주제, 안정적인 콘텐츠",
      confidence: Math.abs(l1.taste - 0.5) * 2,
    })
    items.push({
      label: "글쓰기 목적",
      description:
        l1.purpose >= 0.6 ? "의미 전달과 가치 공유에 초점" : "가벼운 일상 공유와 오락적 요소 중심",
      confidence: Math.abs(l1.purpose - 0.5) * 2,
    })
    items.push({
      label: "자기 개방도",
      description:
        l2.openness >= 0.6
          ? "개인적 경험과 솔직한 생각을 자유롭게 공유"
          : "정제된 의견을 조심스럽게 전달",
      confidence: Math.abs(l2.openness - 0.5) * 2,
    })
    items.push({
      label: "글의 구조",
      description:
        l2.conscientiousness >= 0.6
          ? "서론-본론-결론이 명확한 체계적 구성"
          : "의식의 흐름대로 자연스럽게 전개",
      confidence: Math.abs(l2.conscientiousness - 0.5) * 2,
    })
  }

  if (type === "comment") {
    items.push({
      label: "반응 스타일",
      description:
        l1.stance >= 0.6
          ? "동의하지 않으면 직접적으로 반론을 제시"
          : "공감과 지지 위주의 긍정적 반응",
      confidence: Math.abs(l1.stance - 0.5) * 2,
    })
    items.push({
      label: "댓글 길이",
      description:
        l1.scope >= 0.6 ? "근거를 포함한 구체적이고 긴 댓글" : "한두 줄의 짧고 임팩트 있는 댓글",
      confidence: Math.abs(l1.scope - 0.5) * 2,
    })
    items.push({
      label: "감정 표현",
      description:
        l2.neuroticism >= 0.6 ? "감정적 뉘앙스가 강하게 드러남" : "차분하고 이성적인 톤 유지",
      confidence: Math.abs(l2.neuroticism - 0.5) * 2,
    })
    items.push({
      label: "상호작용 의지",
      description:
        l1.sociability >= 0.6 ? "적극적으로 후속 대화를 유도" : "자신의 의견만 간결하게 전달",
      confidence: Math.abs(l1.sociability - 0.5) * 2,
    })
  }

  if (type === "interaction") {
    items.push({
      label: "대화 스타일",
      description:
        l2.extraversion >= 0.6
          ? "적극적으로 대화를 이끌고 질문을 던짐"
          : "요청에 응답하되 주도적이지 않음",
      confidence: Math.abs(l2.extraversion - 0.5) * 2,
    })
    items.push({
      label: "친밀도",
      description:
        l2.agreeableness >= 0.6
          ? "따뜻하고 친근한 톤으로 관계 형성"
          : "전문적이고 거리를 유지하는 톤",
      confidence: Math.abs(l2.agreeableness - 0.5) * 2,
    })
    items.push({
      label: "갈등 시 반응",
      description:
        l3?.volatility && l3.volatility >= 0.6
          ? "감정적으로 강하게 반응하며 입장을 고수"
          : "차분하게 대응하며 타협점을 모색",
      confidence: l3 ? Math.abs(l3.volatility - 0.5) * 2 : 0.3,
    })
    items.push({
      label: "주도성",
      description:
        l1.sociability >= 0.6
          ? "새로운 화제를 제시하고 대화를 확장"
          : "상대방의 리드를 따르며 깊이 있는 응답 제공",
      confidence: Math.abs(l1.sociability - 0.5) * 2,
    })
  }

  return items
}
