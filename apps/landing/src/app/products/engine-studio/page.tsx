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
} from "lucide-react"

export const metadata: Metadata = {
  title: "Persona Engine Studio",
  description:
    "DeepSight의 AI 페르소나가 설계되고, 검증되고, 배포되는 Persona Engine Studio를 소개합니다.",
}

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"

const PIPELINE_STEPS = [
  {
    step: 1,
    icon: Sparkles,
    title: "페르소나 설계",
    description:
      "노드 에디터에서 데이터 흐름을 한눈에 보며 시각적으로 설계합니다. 12가지 아키타입 중 하나를 출발점으로 선택하고, 3-Layer 벡터와 캐릭터 속성을 조합하여 고유한 관점과 성격을 정의합니다.",
    color: "from-[#667eea] to-[#f093fb]",
  },
  {
    step: 2,
    icon: Cpu,
    title: "AI 튜닝",
    description:
      "설계된 성격과 관점을 AI가 자연스럽게 표현할 수 있도록 최적화합니다. 벡터 기반 자동 생성 후 품질을 조정합니다.",
    color: "from-[#f093fb] to-[#f5576c]",
  },
  {
    step: 3,
    icon: Settings,
    title: "테스트 & 검증",
    description:
      "다양한 콘텐츠에 대해 일관된 관점을 유지하는지, 3-Layer 벡터 + 6-Category 일관성 검증을 통해 다단계 품질 검증을 실시합니다.",
    color: "from-[#667eea] to-[#f5576c]",
  },
  {
    step: 4,
    icon: GitBranch,
    title: "배포 & 운영",
    description:
      "검증을 통과한 페르소나만 PersonaWorld에 배포됩니다. 배포 후에도 사용자 피드백을 기반으로 지속 개선합니다.",
    color: "from-[#f093fb] to-[#667eea]",
  },
]

const CAPABILITIES = [
  {
    icon: Layers,
    title: "노드 에디터",
    description:
      "드래그 앤 드롭으로 페르소나를 설계하는 시각적 에디터입니다. 성격, 관점, 서사, 목소리 등 각 요소를 노드로 연결하여 데이터 흐름을 한눈에 확인하며 조합합니다.",
  },
  {
    icon: Fingerprint,
    title: "P-inger Print 생성",
    description:
      "취향 벡터로부터 2D 디지털 지문과 3D 유기적 형태를 자동 생성합니다. 각 페르소나를 시각적으로 식별할 수 있는 고유한 비주얼 아이덴티티입니다.",
  },
  {
    icon: Shield,
    title: "품질 관리",
    description:
      "성격 일관성, 3-Layer 벡터 반영도, 차별화, 안전성 네 가지 기준으로 품질을 관리합니다. 70점 미만이면 배포가 차단됩니다.",
  },
  {
    icon: BarChart3,
    title: "성과 분석",
    description:
      "페르소나별 매칭 정확도, 사용자 만족도, 추천 수용률을 분석합니다. 데이터에 기반하여 페르소나를 지속적으로 개선합니다.",
  },
  {
    icon: Users,
    title: "12 아키타입 & 다양성 관리",
    description:
      "12가지 기본 아키타입을 출발점으로, 벡터 다양성 주입과 정성적 차원 생성을 거쳐 개성 있는 페르소나를 대량 생산합니다. 전체 풀의 균형도 실시간 모니터링합니다.",
  },
]

const STATS = [
  { value: "12종", label: "기본 아키타입 템플릿" },
  { value: "4단계", label: "품질 검증 프로세스" },
  { value: "70점+", label: "배포 최소 품질 기준" },
  { value: "실시간", label: "성과 모니터링" },
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
            Persona Engine Studio에서 AI 페르소나가 설계되고, 테스트되고, 배포됩니다. 엄격한 품질
            검증을 통과한 페르소나만이 사용자를 만납니다.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mb-1 text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              CREATION PIPELINE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">페르소나 제작 파이프라인</h2>
            <p className="mt-4 text-gray-600">
              하나의 페르소나가 사용자를 만나기까지의 4단계 프로세스입니다.
            </p>
          </div>

          <div className="space-y-6">
            {PIPELINE_STEPS.map((item) => (
              <div
                key={item.step}
                className="flex gap-6 rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-md"
              >
                <div
                  className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color}`}
                >
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-gray-500">Step {item.step}</div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="bg-gray-50 py-24">
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

          <div className="grid gap-8 md:grid-cols-2">
            {CAPABILITIES.map((capability) => (
              <div
                key={capability.title}
                className="rounded-2xl border border-gray-200 bg-white p-8"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                  <capability.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{capability.title}</h3>
                <p className="text-gray-600">{capability.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust message */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900">투명함이 신뢰를 만듭니다</h2>
          <p className="mb-8 text-gray-600">
            AI 페르소나가 어떻게 만들어지는지 공개하는 이유는, 사용자가 우리 시스템을 이해하고
            신뢰할 수 있기를 바라기 때문입니다. PersonaWorld에서 직접 페르소나를 만나보세요.
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
