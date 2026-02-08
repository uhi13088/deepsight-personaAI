import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Search,
  Eye,
  Compass,
  Target,
  Palette,
  Brain,
  Check,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Features",
  description: "DeepSight의 6D 벡터 시스템과 AI 페르소나 매칭 기술을 자세히 알아보세요.",
}

const VECTOR_DIMENSIONS = [
  {
    id: "depth",
    name: "Depth",
    label: "분석 깊이",
    low: "직관적",
    high: "심층적",
    description: "콘텐츠를 얼마나 깊이 분석하고 이해하려 하는지를 측정합니다.",
    icon: Search,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    id: "lens",
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "콘텐츠를 평가할 때 감성적 vs 논리적 관점 중 어느 쪽에 가까운지 측정합니다.",
    icon: Eye,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
  {
    id: "stance",
    name: "Stance",
    label: "평가 태도",
    low: "수용적",
    high: "비판적",
    description: "새로운 콘텐츠에 대해 수용적인 태도를 보이는지, 비판적으로 접근하는지 측정합니다.",
    icon: Compass,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
  },
  {
    id: "scope",
    name: "Scope",
    label: "관심 범위",
    low: "핵심만",
    high: "디테일",
    description: "핵심 정보만 선호하는지, 디테일한 정보까지 원하는지를 측정합니다.",
    icon: Target,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-600",
  },
  {
    id: "taste",
    name: "Taste",
    label: "취향 성향",
    low: "클래식",
    high: "실험적",
    description: "검증된 클래식 콘텐츠를 선호하는지, 새롭고 실험적인 것을 찾는지 측정합니다.",
    icon: Palette,
    color: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600",
  },
  {
    id: "purpose",
    name: "Purpose",
    label: "소비 목적",
    low: "오락",
    high: "의미추구",
    description: "콘텐츠 소비 목적이 순수 오락인지, 의미와 메시지 추구인지를 측정합니다.",
    icon: Brain,
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-600",
  },
]

const MATCHING_STEPS = [
  {
    step: 1,
    title: "Cold-Start 질문",
    label: "COLD-START",
    color: "bg-blue-100 text-blue-600",
    description:
      "4개의 A vs B 질문으로 사용자의 6D 프로필을 4초 만에 생성합니다. 각 질문은 2개 차원을 동시에 측정하도록 설계되었습니다.",
    features: ["질문당 2개 차원 동시 측정", "확신도(Confidence) 함께 계산", "4초 내 프로필 완성"],
  },
  {
    step: 2,
    title: "6D 벡터 정량화",
    label: "VECTOR CALCULATION",
    color: "bg-purple-100 text-purple-600",
    description:
      "답변을 분석하여 6개 차원에 대해 0.0~1.0 범위의 벡터값과 확신도를 계산합니다. 확신도가 높은 차원은 매칭에서 더 큰 가중치를 받습니다.",
    features: ["0.0 ~ 1.0 범위 벡터값", "차원별 확신도 계산", "가중 매칭 알고리즘"],
  },
  {
    step: 3,
    title: "페르소나 매칭",
    label: "PERSONA MATCHING",
    color: "bg-green-100 text-green-600",
    description:
      "AI 페르소나와 코사인 유사도를 계산하고, 세대/지역/표현온도/전문성 보너스를 적용하여 최적의 페르소나를 찾습니다.",
    features: [
      "코사인 유사도 기반 매칭",
      "다중 보너스 팩터 적용",
      "FinalScore = 벡터유사도×60% + 보너스×40%",
    ],
  },
  {
    step: 4,
    title: "설명 가능한 추천",
    label: "PERSONALIZED CURATION",
    color: "bg-pink-100 text-pink-600",
    description:
      '매칭된 페르소나가 자신의 관점에서 콘텐츠를 추천합니다. "왜 이 콘텐츠가 추천됐는지"를 사용자가 이해할 수 있습니다.',
    features: ["페르소나 관점 추천 이유 제공", "블랙박스 탈출", "사용자 신뢰도 향상"],
  },
]

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
            FEATURES
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            <span className="ds-text-gradient">6D 벡터</span>로 취향을 정량화
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            단순한 좋아요/싫어요를 넘어, 사용자의 콘텐츠 소비 성향을 6개의 독립적인 차원으로
            분석하고, AI 페르소나가 설명 가능한 추천을 제공합니다.
          </p>
        </div>
      </section>

      {/* 6D Vector Details */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900">6D 벡터 시스템</h2>
            <p className="mt-4 text-gray-600">
              각 차원은 0.0 ~ 1.0 사이의 독립적인 벡터값으로 표현됩니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VECTOR_DIMENSIONS.map((dim) => (
              <div
                key={dim.id}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
              >
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${dim.color}`}
                >
                  <dim.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-1 text-xl font-bold text-gray-900">{dim.name}</h3>
                <p className={`mb-3 text-sm font-medium ${dim.textColor}`}>{dim.label}</p>
                <p className="mb-4 text-sm text-gray-600">{dim.description}</p>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  <span>{dim.low}</span>
                  <div className="mx-2 h-1.5 flex-1 rounded-full bg-gray-200">
                    <div className={`h-full w-1/2 rounded-full bg-gradient-to-r ${dim.color}`} />
                  </div>
                  <span>{dim.high}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
              HOW IT WORKS
            </div>
            <h2 className="text-3xl font-bold text-gray-900">4단계 매칭 프로세스</h2>
          </div>

          <div className="space-y-8">
            {MATCHING_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${item.color}`}
                  >
                    {item.step}
                  </div>
                  <span className={`text-sm font-medium ${item.color.split(" ")[1]}`}>
                    {item.label}
                  </span>
                </div>
                <h3 className="mb-3 text-2xl font-bold text-gray-900">{item.title}</h3>
                <p className="mb-4 text-gray-600">{item.description}</p>
                <ul className="space-y-2">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Advantages */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900">왜 DeepSight인가?</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "4초 콜드스타트 해결",
                description:
                  "기존 협업 필터링은 수십 건의 행동 데이터가 필요하지만, DeepSight는 4개 질문으로 즉시 프로필을 생성합니다.",
              },
              {
                icon: Shield,
                title: "설명 가능한 추천",
                description:
                  "블랙박스 알고리즘 대신, 페르소나가 자신의 관점에서 추천 이유를 설명합니다. 사용자의 신뢰와 만족도가 향상됩니다.",
              },
              {
                icon: BarChart3,
                title: "필터버블 탈출",
                description:
                  "다양한 성향의 페르소나가 다른 관점의 콘텐츠를 소개하여, 사용자의 콘텐츠 소비 범위를 자연스럽게 넓혀줍니다.",
              },
            ].map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ds-dark-section py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white">직접 체험해보세요</h2>
          <p className="mb-8 text-gray-400">
            PersonaWorld에서 AI 페르소나와의 상호작용을 직접 경험해보세요.
          </p>
          <Link
            href={PERSONA_WORLD_URL}
            className="ds-button inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
          >
            PersonaWorld 체험하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
