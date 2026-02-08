import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Layers,
  Cpu,
  Settings,
  GitBranch,
  Shield,
  BarChart3,
  Sparkles,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Inside DeepSight",
  description: "DeepSight의 AI 페르소나가 어떻게 만들어지는지 Engine Studio의 내부를 공개합니다.",
}

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"

const PIPELINE_STEPS = [
  {
    step: 1,
    icon: Sparkles,
    title: "페르소나 설계",
    description:
      "전문 큐레이터가 페르소나의 성격, 전문 분야, 표현 스타일을 정의합니다. 6D 벡터 프로필을 설정하여 페르소나의 콘텐츠 취향을 정량화합니다.",
    color: "from-[#667eea] to-[#f093fb]",
  },
  {
    step: 2,
    icon: Cpu,
    title: "AI 프롬프트 엔지니어링",
    description:
      "각 페르소나의 성격과 관점을 AI가 일관되게 표현할 수 있도록 프롬프트 템플릿을 정교하게 설계합니다.",
    color: "from-[#f093fb] to-[#f5576c]",
  },
  {
    step: 3,
    icon: Settings,
    title: "벡터 튜닝 & 테스트",
    description:
      "인큐베이션 단계에서 페르소나의 6D 벡터를 조정하고, 다양한 콘텐츠에 대한 반응을 테스트합니다.",
    color: "from-green-500 to-green-600",
  },
  {
    step: 4,
    icon: GitBranch,
    title: "버전 관리 & 배포",
    description:
      "페르소나의 모든 변경 이력을 버전 관리하고, 테스트를 통과한 버전만 PersonaWorld에 배포합니다.",
    color: "from-orange-500 to-orange-600",
  },
]

const ENGINE_FEATURES = [
  {
    icon: Shield,
    title: "품질 관리 시스템",
    description:
      "AI 응답의 일관성, 성격 반영도, 전문성을 지속적으로 모니터링합니다. 품질 기준에 미달하면 자동으로 알림을 보냅니다.",
  },
  {
    icon: BarChart3,
    title: "실시간 분석 대시보드",
    description:
      "페르소나별 사용자 반응, 매칭 정확도, 만족도를 실시간으로 분석합니다. 데이터 기반으로 페르소나를 지속 개선합니다.",
  },
  {
    icon: GitBranch,
    title: "버전 히스토리",
    description:
      "페르소나의 성격, 벡터, 프롬프트 변경을 모두 추적합니다. 문제 발생 시 이전 버전으로 즉시 롤백할 수 있습니다.",
  },
]

export default function InsideDeepSightPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="ds-dark-section relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
            <Layers className="h-4 w-4" />
            Behind the Scenes
          </div>
          <h1 className="mb-6 text-5xl font-bold text-white">
            페르소나가
            <br />
            <span className="bg-gradient-to-r from-[#667eea] via-[#f093fb] to-[#22c55e] bg-clip-text text-transparent">
              만들어지는 곳
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            DeepSight의 Engine Studio에서 AI 페르소나가 어떻게 설계되고, 테스트되고, 배포되는지
            공개합니다. 우리는 투명한 프로세스로 높은 품질의 페르소나를 제공합니다.
          </p>
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
              하나의 페르소나가 사용자를 만나기까지의 과정입니다.
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

      {/* Engine Features */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              ENGINE STUDIO
            </div>
            <h2 className="text-3xl font-bold text-gray-900">내부 관리 시스템</h2>
            <p className="mt-4 text-gray-600">
              DeepSight 팀이 페르소나를 관리하는 데 사용하는 도구들입니다.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {ENGINE_FEATURES.map((feature, idx) => (
              <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#22c55e] to-[#eab308]">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
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
