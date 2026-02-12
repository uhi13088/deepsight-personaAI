import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Layers,
  Sparkles,
  Cpu,
  Settings,
  GitBranch,
  Shield,
  BarChart3,
  Users,
  Fingerprint,
  Box,
  Workflow,
  Mic,
  BookOpen,
  Gauge,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Palette,
  Cog,
  Play,
  Target,
  Eye,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Persona Engine Studio",
  description:
    "DeepSight의 AI 페르소나가 설계되고, 검증되고, 배포되는 Persona Engine Studio를 소개합니다.",
}

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"

/* ── Stats ── */
const STATS = [
  { value: "25+", label: "노드 타입" },
  { value: "106D+", label: "벡터 차원" },
  { value: "12종", label: "아키타입 템플릿" },
  { value: "6단계", label: "품질 검증 카테고리" },
  { value: "83축", label: "교차 레이어 축" },
  { value: "70점+", label: "배포 최소 기준" },
]

/* ── Node Categories for Diagram ── */
const NODE_CATEGORIES = [
  {
    category: "Input",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    count: 5,
    nodes: ["basic-info", "l1-vector", "l2-vector", "l3-vector", "archetype-select"],
    description: "페르소나의 기본 정보와 3-Layer 벡터, 아키타입을 입력합니다.",
  },
  {
    category: "Engine",
    color: "bg-purple-500",
    textColor: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    count: 4,
    nodes: ["paradox-calc", "pressure-ctrl", "v-final", "projection"],
    description: "역설 계산, 압력 제어, 최종 벡터 합성 등 핵심 엔진 로직을 처리합니다.",
  },
  {
    category: "Generation",
    color: "bg-pink-500",
    textColor: "text-pink-700",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    count: 7,
    nodes: [
      "character-gen",
      "backstory-gen",
      "voice-gen",
      "activity-gen",
      "content-gen",
      "pressure-gen",
      "zeitgeist-gen",
    ],
    description:
      "성격, 배경 서사, 화법, 활동 패턴, 콘텐츠 성향, 압력 반응, 시대정신을 LLM으로 생성합니다.",
  },
  {
    category: "Assembly",
    color: "bg-amber-500",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    count: 2,
    nodes: ["prompt-builder", "interaction-rules"],
    description: "생성된 6가지 요소를 시스템 프롬프트와 상호작용 규칙으로 조립합니다.",
  },
  {
    category: "Output",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    count: 4,
    nodes: ["consistency", "fingerprint", "test-sim", "deploy"],
    description: "일관성 검증, P-inger Print 생성, 테스트 시뮬레이션, 배포를 수행합니다.",
  },
  {
    category: "Control Flow",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    count: 3,
    nodes: ["conditional", "switch", "merge"],
    description: "조건 분기, 스위치, 병합으로 파이프라인 흐름을 제어합니다.",
  },
]

/* ── Generation Pipeline ── */
const GENERATION_PIPELINE = [
  {
    step: 1,
    icon: Users,
    title: "아키타입 선택",
    description:
      "12가지 기본 아키타입 중 하나를 출발점으로 선택합니다. 각 아키타입에는 L1/L2/L3 프리셋 값이 포함되어 있습니다.",
    detail: "아이러니한 철학자, 상처받은 비평가, 사교적 내향인 등 12종",
    color: "from-blue-500 to-blue-600",
  },
  {
    step: 2,
    icon: Sparkles,
    title: "벡터 다양성 주입",
    description:
      "아키타입 프리셋에 무작위 변이를 주입하여 같은 아키타입에서도 개성 있는 페르소나를 만듭니다.",
    detail: "L1 7D + L2 5D + L3 4D = 16D 기본 벡터",
    color: "from-blue-500 to-purple-500",
  },
  {
    step: 3,
    icon: Target,
    title: "역설(Paradox) 설계",
    description:
      "L1(표면)과 L2(내면) 사이의 모순을 의도적으로 설계합니다. 이 '역설'이 페르소나에 깊이를 부여합니다.",
    detail: "EPS = 0.50×L1↔L2 + 0.30×L1↔L3 + 0.20×L2↔L3",
    color: "from-purple-500 to-purple-600",
  },
  {
    step: 4,
    icon: BookOpen,
    title: "서사 차원(L3) 생성",
    description:
      "결핍도, 도덕 나침반, 변동성, 성장 곡선 — 4가지 서사 동기를 생성하여 페르소나에 '이유'를 부여합니다.",
    detail: "왜 이런 취향인지, 왜 이렇게 행동하는지의 근거",
    color: "from-purple-500 to-pink-500",
  },
  {
    step: 5,
    icon: Mic,
    title: "정성적 차원 생성",
    description:
      "벡터를 기반으로 배경 서사, 화법, 압력 반응, 시대정신 등 비수치적 특성을 LLM이 자동 생성합니다.",
    detail: "6개 LLM 생성 노드 + 1개 규칙 기반 노드",
    color: "from-pink-500 to-pink-600",
  },
  {
    step: 6,
    icon: Shield,
    title: "6-Category 품질 검증",
    description:
      "구조, 역설, 레이어 정합성, 정성↔정량, 교차축, 동적 설정 — 6개 카테고리, 17개 항목으로 다단계 검증합니다.",
    detail: "70점 미만 시 배포 차단, 에러 0건 필수",
    color: "from-pink-500 to-red-500",
  },
  {
    step: 7,
    icon: GitBranch,
    title: "배포 & 모니터링",
    description:
      "검증을 통과한 페르소나만 PersonaWorld에 배포됩니다. 배포 후에도 런타임 무결성 점수로 지속 모니터링합니다.",
    detail: "ContextRecall 35% + SettingConsistency 35% + CharacterStability 30%",
    color: "from-red-500 to-red-600",
  },
]

/* ── 6-Category Validation ── */
const VALIDATION_CATEGORIES = [
  {
    id: "A",
    title: "구조 검증",
    weight: 15,
    items: 3,
    description: "필수 필드 존재, 값 범위 유효성, α+β=1.0 등 기본 구조 검증",
    color: "bg-blue-500",
  },
  {
    id: "B",
    title: "L1↔L2 역설 검증",
    weight: 20,
    items: 2,
    description: "7쌍 매핑 일관성, Paradox Score 범위 검증",
    color: "bg-purple-500",
  },
  {
    id: "C",
    title: "L2↔L3 정합성 검증",
    weight: 20,
    items: 4,
    description: "결핍↔역설점수, 변동성↔신경성, 범위↔개방성, 도덕↔우호성 관계 검증",
    color: "bg-pink-500",
  },
  {
    id: "D",
    title: "정성↔정량 검증",
    weight: 20,
    items: 3,
    description: "배경서사↔초기벡터, 화법↔L1, 트리거↔L3 정합성 검증",
    color: "bg-amber-500",
  },
  {
    id: "E",
    title: "교차축 일관성",
    weight: 15,
    items: 3,
    description: "83개 교차축 점수 범위, 관계 유형 분포, EPS 내부 일관성 검증",
    color: "bg-green-500",
  },
  {
    id: "F",
    title: "동적 설정 검증",
    weight: 10,
    items: 2,
    description: "압력 범위, 감쇠 설정 유효성 검증",
    color: "bg-gray-500",
  },
]

/* ── Capabilities ── */
const CAPABILITIES = [
  {
    icon: Layers,
    title: "비주얼 노드 에디터",
    description:
      "ComfyUI 스타일의 DAG(방향성 비순환 그래프) 기반 에디터입니다. 25개 이상의 노드를 드래그 앤 드롭으로 연결하여 데이터 흐름을 시각적으로 설계합니다. 19개 노드는 직접 편집 가능하고, 6개 노드는 자동 계산됩니다.",
    badge: "25+ Nodes",
  },
  {
    icon: Fingerprint,
    title: "P-inger Print 생성",
    description:
      "취향 벡터로부터 이중 색공간(CIELAB + OKLCH)을 사용해 2D 디지털 지문과 3D 유기적 형태를 자동 생성합니다. 충돌 감지 시스템으로 모든 페르소나가 고유한 비주얼 아이덴티티를 갖습니다.",
    badge: "Dual Color Space",
  },
  {
    icon: Eye,
    title: "다층 레이더 차트",
    description:
      "L1(사회적 취향 7D), L2(내면 기질 5D), L3(서사 동기 4D)를 하나의 레이더 차트에 겹쳐서 시각화합니다. 레이어 간 괴리(역설)가 한눈에 드러나는 직관적 인터페이스입니다.",
    badge: "3-Layer Overlay",
  },
  {
    icon: Gauge,
    title: "실시간 품질 대시보드",
    description:
      "6개 카테고리별 검증 점수, 에러/경고/정보 레벨 분류, 카테고리별 통과율을 실시간으로 확인합니다. 70점 미만이면 배포가 즉시 차단됩니다.",
    badge: "6-Category QA",
  },
  {
    icon: Users,
    title: "12 아키타입 & 다양성 관리",
    description:
      "12가지 역설 기반 아키타입을 출발점으로, 벡터 다양성 주입과 83개 교차축 패턴으로 개성 있는 페르소나를 대량 생산합니다. 전체 풀의 아키타입 분포와 벡터 다양성을 실시간 모니터링합니다.",
    badge: "83 Cross-Axes",
  },
  {
    icon: BarChart3,
    title: "성과 분석 & 지속 개선",
    description:
      "페르소나별 매칭 정확도, 사용자 만족도, 추천 수용률을 추적합니다. 런타임 무결성 점수(ContextRecall 35% + SettingConsistency 35% + CharacterStability 30%)로 배포 후에도 품질을 보장합니다.",
    badge: "Runtime Integrity",
  },
]

/* ── Access Roles ── */
const ACCESS_ROLES = [
  { role: "Admin", studio: "전체", algorithm: "전체", analytics: "전체" },
  { role: "Content Manager", studio: "전체", algorithm: "—", analytics: "조회" },
  { role: "AI Engineer", studio: "조회", algorithm: "전체", analytics: "전체" },
  { role: "Analyst", studio: "조회", algorithm: "조회", analytics: "전체" },
]

export default function EngineStudioPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="ds-dark-section relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
            <Layers className="h-4 w-4" />
            Persona Engine Studio
          </div>
          <h1 className="mb-6 text-5xl font-bold text-white">
            페르소나가
            <br />
            <span className="bg-gradient-to-r from-[#667eea] via-[#f093fb] to-[#f5576c] bg-clip-text text-transparent">
              만들어지는 곳
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            25개 이상의 노드를 시각적으로 연결하여 AI 페르소나를 설계하고, 6단계 품질 검증을 통과한
            페르소나만이 사용자를 만납니다. 106차원 이상의 벡터로 표현되는 진짜 개성.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mb-1 text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Node Editor Diagram ── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              VISUAL NODE EDITOR
            </div>
            <h2 className="text-3xl font-bold text-gray-900">25개 노드로 설계하는 페르소나</h2>
            <p className="mt-4 text-gray-600">
              6개 카테고리의 노드를 드래그 앤 드롭으로 연결합니다.
              <br />
              데이터가 Input에서 Output까지 흐르는 과정을 한눈에 확인할 수 있습니다.
            </p>
          </div>

          {/* Node Flow Diagram */}
          <div className="mb-12 overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 p-8">
            <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
              <Workflow className="h-4 w-4" />
              Node Editor — DAG Pipeline Overview
            </div>

            {/* Flow visualization */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-2">
              {NODE_CATEGORIES.map((cat, idx) => (
                <div key={cat.category} className="flex flex-1 items-start gap-2">
                  <div className={`rounded-xl border ${cat.borderColor} bg-gray-800 p-4`}>
                    <div className="mb-2 flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${cat.color}`} />
                      <span className="text-sm font-bold text-white">{cat.category}</span>
                      <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
                        {cat.count}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {cat.nodes.map((node) => (
                        <div
                          key={node}
                          className="rounded border border-gray-700 bg-gray-800/50 px-2 py-1 font-mono text-xs text-gray-400"
                        >
                          {node}
                        </div>
                      ))}
                    </div>
                  </div>
                  {idx < NODE_CATEGORIES.length - 1 && (
                    <div className="hidden items-center self-center text-gray-600 lg:flex">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 border-t border-gray-700 pt-4">
              <span className="text-xs text-gray-500">19개 편집 가능 노드</span>
              <span className="text-xs text-gray-500">|</span>
              <span className="text-xs text-gray-500">
                6개 자동 계산 노드 (paradox-calc, v-final, activity-gen, interaction-rules,
                consistency 등)
              </span>
            </div>
          </div>

          {/* Node Category Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {NODE_CATEGORIES.map((cat) => (
              <div
                key={cat.category}
                className={`rounded-xl border ${cat.borderColor} ${cat.bgColor} p-5`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${cat.color}`} />
                  <span className={`text-sm font-bold ${cat.textColor}`}>{cat.category}</span>
                  <span
                    className={`rounded-full ${cat.bgColor} border ${cat.borderColor} px-2 py-0.5 text-xs font-medium ${cat.textColor}`}
                  >
                    {cat.count}개
                  </span>
                </div>
                <p className="text-sm text-gray-600">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Generation Pipeline ── */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              CREATION PIPELINE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">7단계 페르소나 생성 파이프라인</h2>
            <p className="mt-4 text-gray-600">
              아키타입 선택부터 배포까지, 하나의 페르소나가 사용자를 만나기까지의 전체 과정입니다.
            </p>
          </div>

          {/* Pipeline Steps */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute bottom-0 left-7 top-0 hidden w-px bg-gradient-to-b from-blue-500 via-purple-500 to-red-500 md:block" />

            <div className="space-y-6">
              {GENERATION_PIPELINE.map((item) => (
                <div
                  key={item.step}
                  className="flex gap-6 rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-md md:ml-4"
                >
                  <div
                    className={`relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color}`}
                  >
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-500">
                        Step {item.step}
                      </span>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">{item.title}</h3>
                    <p className="mb-2 text-sm text-gray-600">{item.description}</p>
                    <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                      <Cog className="h-3 w-3" />
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6-Category Quality Validation ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              QUALITY ASSURANCE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">6-Category 품질 검증</h2>
            <p className="mt-4 text-gray-600">
              17개 검증 항목을 6개 카테고리로 분류하여 가중 평균을 산출합니다.
              <br />
              70점 미만 또는 에러 1건 이상이면 배포가 차단됩니다.
            </p>
          </div>

          {/* Formula */}
          <div className="mb-12 rounded-2xl border border-purple-200 bg-purple-50 p-6 text-center">
            <p className="mb-2 text-sm font-medium text-purple-600">Consistency Score 산출 공식</p>
            <p className="font-mono text-lg text-gray-900">
              Score = 0.15×A + 0.20×B + 0.20×C + 0.20×D + 0.15×E + 0.10×F
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                통과: 70점 이상 + 에러 0건
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                차단: 70점 미만 또는 에러 존재
              </span>
            </div>
          </div>

          {/* Validation Category Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {VALIDATION_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${cat.color} text-sm font-bold text-white`}
                    >
                      {cat.id}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{cat.title}</h3>
                      <span className="text-xs text-gray-500">{cat.items}개 항목</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{cat.weight}%</div>
                    <span className="text-xs text-gray-500">가중치</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{cat.description}</p>
              </div>
            ))}
          </div>

          {/* Validation Level Legend */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-gray-600">Error — 즉시 차단</span>
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-gray-600">Warning — 검토 필요</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">Info — 참고 사항</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Vector Architecture Diagram ── */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              VECTOR ARCHITECTURE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">106D+ 3-Layer 벡터 구조</h2>
            <p className="mt-4 text-gray-600">
              표면, 내면, 서사 — 3개 레이어의 직교 설계와 83개 교차축이 만드는 복합 개성
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* L1 */}
            <div className="rounded-2xl border-2 border-blue-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">
                  L1
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">사회적 취향</h3>
                  <span className="text-xs text-blue-600">Social Persona — 7D</span>
                </div>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                &quot;이 사람이 세상에 보여주는 모습&quot; — 콘텐츠 소비와 표현에서 드러나는 취향
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "분석 깊이(depth)",
                  "판단 렌즈(lens)",
                  "평가 태도(stance)",
                  "관심 범위(scope)",
                  "선호 경향(taste)",
                  "소비 목적(purpose)",
                  "사교 경향(sociability)",
                ].map((d) => (
                  <div key={d} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* L2 */}
            <div className="rounded-2xl border-2 border-purple-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500 text-sm font-bold text-white">
                  L2
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">내면 기질</h3>
                  <span className="text-xs text-purple-600">Core Temperament — 5D (OCEAN)</span>
                </div>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                &quot;진짜 그 사람의 성격&quot; — 심리학적으로 검증된 5대 성격 요인
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "개방성(openness)",
                  "성실성(conscientiousness)",
                  "외향성(extraversion)",
                  "우호성(agreeableness)",
                  "신경성(neuroticism)",
                ].map((d) => (
                  <div key={d} className="rounded bg-purple-50 px-2 py-1 text-xs text-purple-700">
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* L3 */}
            <div className="rounded-2xl border-2 border-pink-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500 text-sm font-bold text-white">
                  L3
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">서사 동기</h3>
                  <span className="text-xs text-pink-600">Narrative Drive — 4D</span>
                </div>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                &quot;왜 이런 사람이 되었는지&quot; — 행동과 취향의 내면적 동기
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "결핍도(lack)",
                  "도덕 나침반(moralCompass)",
                  "변동성(volatility)",
                  "성장 곡선(growthArc)",
                ].map((d) => (
                  <div key={d} className="rounded bg-pink-50 px-2 py-1 text-xs text-pink-700">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cross-Axis Summary */}
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-center font-bold text-gray-900">
              교차 레이어 축 (Cross-Layer Axes)
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-4 text-center">
                <div className="mb-1 text-2xl font-bold text-gray-900">35축</div>
                <p className="text-sm text-gray-600">L1 × L2</p>
                <p className="text-xs text-gray-500">표면↔내면 괴리 감지</p>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-pink-50 p-4 text-center">
                <div className="mb-1 text-2xl font-bold text-gray-900">28축</div>
                <p className="text-sm text-gray-600">L1 × L3</p>
                <p className="text-xs text-gray-500">취향↔서사 동기 연결</p>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4 text-center">
                <div className="mb-1 text-2xl font-bold text-gray-900">20축</div>
                <p className="text-sm text-gray-600">L2 × L3</p>
                <p className="text-xs text-gray-500">성격↔서사 정합성</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700">
                <span className="font-bold">Extended Paradox Score</span> = 0.50 × L1↔L2 + 0.30 ×
                L1↔L3 + 0.20 × L2↔L3
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              CAPABILITIES
            </div>
            <h2 className="text-3xl font-bold text-gray-900">핵심 기능</h2>
            <p className="mt-4 text-gray-600">
              Persona Engine Studio가 높은 품질의 페르소나를 제공하기 위해 수행하는 역할입니다.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((capability) => (
              <div
                key={capability.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                    <capability.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-600">
                    {capability.badge}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{capability.title}</h3>
                <p className="text-sm text-gray-600">{capability.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Access Control ── */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              ACCESS CONTROL
            </div>
            <h2 className="text-3xl font-bold text-gray-900">역할 기반 접근 제어</h2>
            <p className="mt-4 text-gray-600">
              Engine Studio는 DeepSight 내부 도구입니다. 역할에 따라 접근 범위가 다릅니다.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">역할</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Persona Studio
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Algorithm
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Analytics
                  </th>
                </tr>
              </thead>
              <tbody>
                {ACCESS_ROLES.map((item) => (
                  <tr key={item.role} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.role}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{item.studio}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {item.algorithm}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {item.analytics}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            외부 개발자는 Engine Studio에 직접 접근할 수 없으며, Developer Console API를 통해
            페르소나를 활용합니다.
          </p>
        </div>
      </section>

      {/* Trust message */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900">투명함이 신뢰를 만듭니다</h2>
          <p className="mb-8 text-gray-600">
            AI 페르소나가 어떻게 만들어지는지 공개하는 이유는, 사용자가 우리 시스템을 이해하고
            신뢰할 수 있기를 바라기 때문입니다. 25개 노드, 7단계 파이프라인, 6단계 검증 — 모든
            과정이 투명합니다. PersonaWorld에서 직접 페르소나를 만나보세요.
          </p>
          <Link
            href={PERSONA_WORLD_URL}
            className="ds-button inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-white"
          >
            PersonaWorld에서 만나보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
