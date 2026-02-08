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
  MessageSquare,
  Share2,
  Layers,
  Users,
  Sparkles,
  Settings,
  GitBranch,
  Play,
  CheckCircle,
  Rocket,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Features",
  description:
    "DeepSight의 6D 벡터, 콜드스타트 해결, AI 페르소나, 매칭 엔진 기술을 자세히 알아보세요.",
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
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
  {
    id: "lens",
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "감성적 vs 논리적 관점 중 어느 쪽에 가까운지 측정합니다.",
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
    description: "새로운 콘텐츠에 대해 수용적 vs 비판적 태도를 측정합니다.",
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
    description: "핵심 정보만 선호하는지, 디테일한 정보까지 원하는지 측정합니다.",
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
    description: "검증된 콘텐츠를 선호하는지, 새롭고 실험적인 것을 찾는지 측정합니다.",
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
    description: "콘텐츠 소비 목적이 순수 오락인지, 의미와 메시지 추구인지 측정합니다.",
    icon: Brain,
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-600",
  },
]

const COLD_START_METHODS = [
  {
    icon: MessageSquare,
    title: "문답 방식",
    badge: "Quick Profile",
    badgeColor: "bg-purple-100 text-purple-600",
    description:
      "A vs B 선택형 질문으로 6D 벡터를 빠르게 생성합니다. 각 질문이 2개 차원을 동시에 측정하도록 설계되어, 적은 질문으로 전체 프로필을 구성합니다.",
    features: [
      "질문당 2개 차원 동시 측정",
      "확신도(Confidence) 함께 계산",
      "사용자 직접 참여로 높은 정확도",
    ],
    accuracy: 3,
    speed: "빠름",
  },
  {
    icon: Share2,
    title: "SNS 연동",
    badge: "Social Analysis",
    badgeColor: "bg-green-100 text-green-600",
    description:
      "소셜 미디어 데이터(팔로우, 관심사, 소비 패턴)를 분석하여 6D 벡터를 추론합니다. 질문에 답하지 않아도 프로필을 생성할 수 있어 온보딩 마찰을 최소화합니다.",
    features: ["질문 없이 프로필 생성", "원시 데이터 저장 없이 벡터만 산출", "사용자 동의 기반"],
    accuracy: 3,
    speed: "즉시",
  },
  {
    icon: Layers,
    title: "문답 + SNS 병행",
    badge: "Hybrid",
    badgeColor: "bg-pink-100 text-pink-600",
    description:
      "문답에서 얻은 명시적 선호와 SNS에서 추론한 암묵적 패턴을 결합합니다. 두 데이터 소스를 교차 검증하여 가장 높은 정확도의 프로필을 생성합니다.",
    features: ["명시적 + 암묵적 데이터 결합", "교차 검증으로 확신도 향상", "최고 매칭 정확도"],
    accuracy: 4,
    speed: "빠름",
  },
]

const PERSONA_PIPELINE = [
  {
    icon: Sparkles,
    title: "기본 정보 & 벡터 설정",
    description: "이름, 역할, 전문분야를 정의하고 6D 벡터 프로필을 설정합니다.",
  },
  {
    icon: Settings,
    title: "캐릭터 & 프롬프트 설계",
    description: "성격, 말투, 행동 지침을 정의하고 AI 프롬프트 템플릿을 작성합니다.",
  },
  {
    icon: Play,
    title: "테스트 & 검증",
    description: "다양한 콘텐츠에 대한 응답을 테스트하고 품질 검증(70점 이상)을 통과합니다.",
  },
  {
    icon: Rocket,
    title: "배포 & 버전 관리",
    description: "PersonaWorld에 배포하고, 모든 변경 이력을 추적하여 롤백을 지원합니다.",
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
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
            FEATURES
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            DeepSight의 <span className="ds-text-gradient">핵심 기술</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            6D 벡터 시스템, 콜드스타트 해결, AI 페르소나, 설명 가능한 매칭 엔진. 네 가지 기술이
            결합되어 사용자가 &lsquo;왜&rsquo;를 이해할 수 있는 추천을 만듭니다.
          </p>
        </div>
      </section>

      {/* 6D Vector System */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              6D VECTOR SYSTEM
            </div>
            <h2 className="text-3xl font-bold text-gray-900">6개 차원으로 취향을 정량화</h2>
            <p className="mt-4 text-gray-600">
              사용자의 콘텐츠 소비 성향을 6개의 독립적인 차원으로 분석합니다. 각 차원은 0.0~1.0
              범위의 벡터값으로 표현됩니다.
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

      {/* Cold-Start */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              COLD-START SOLUTION
            </div>
            <h2 className="text-3xl font-bold text-gray-900">콜드스타트, 3가지 방법으로 해결</h2>
            <p className="mt-4 text-gray-600">
              신규 사용자의 행동 데이터 없이도 즉시 개인화된 추천이 가능합니다.
              <br />
              문답, SNS 연동, 또는 두 가지를 병행하여 6D 프로필을 생성합니다.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {COLD_START_METHODS.map((method) => (
              <div
                key={method.title}
                className="relative flex flex-col rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-lg"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f093fb]">
                    <method.icon className="h-6 w-6 text-white" />
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${method.badgeColor}`}
                  >
                    {method.badge}
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-bold text-gray-900">{method.title}</h3>
                <p className="mb-5 flex-1 text-sm text-gray-600">{method.description}</p>

                <ul className="mb-5 space-y-2">
                  {method.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">정확도</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-2 rounded-full ${
                            i < method.accuracy
                              ? "bg-gradient-to-r from-[#667eea] to-[#f093fb]"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    속도: {method.speed}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-purple-100 bg-purple-50/50 p-8 text-center">
            <p className="text-sm text-gray-600">
              콜드스타트 질문은 Engine Studio의 심리 프로파일 설계 도구에서 관리됩니다.
              <br />
              설계된 질문 세트는 PersonaWorld와 API 연동 서비스에서 동일하게 사용됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* AI Persona System */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              AI PERSONA SYSTEM
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              AI 페르소나: 취향을 가진 가상의 존재
            </h2>
            <p className="mt-4 text-gray-600">
              단순한 알고리즘이 아닌, 고유한 성격과 관점을 가진 AI 페르소나가
              <br />
              사용자의 관점에서 콘텐츠를 추천합니다.
            </p>
          </div>

          <div className="mb-16 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "다양한 페르소나",
                description:
                  "감성적 영화 리뷰어, 논리적 기술 분석가, 트렌드 탐험가 등 다양한 성향의 페르소나가 각자의 시각으로 콘텐츠를 평가합니다.",
              },
              {
                icon: Shield,
                title: "품질 검증 시스템",
                description:
                  "프롬프트 품질, 벡터 일관성, 전문분야 관련성을 자동 검사합니다. 70점 이상을 통과해야 배포되며, 지속적으로 모니터링됩니다.",
              },
              {
                icon: GitBranch,
                title: "버전 관리",
                description:
                  "모든 변경 이력을 추적하며, 문제 발생 시 이전 버전으로 즉시 롤백할 수 있습니다. 페르소나의 성장 과정을 투명하게 관리합니다.",
              },
            ].map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
            <h3 className="mb-6 text-center text-lg font-bold text-gray-900">
              노드 에디터 기반 제작 파이프라인
            </h3>
            <div className="grid gap-4 md:grid-cols-4">
              {PERSONA_PIPELINE.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <step.icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="mb-1 text-sm font-semibold text-gray-900">{step.title}</h4>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Matching Engine */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              MATCHING ENGINE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">설명 가능한 매칭 엔진</h2>
            <p className="mt-4 text-gray-600">
              코사인 유사도 기반 벡터 매칭과 다중 보너스 팩터를 결합하여,
              <br />
              &lsquo;왜 이 페르소나가 매칭됐는지&rsquo; 설명할 수 있는 투명한 추천을 제공합니다.
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: 1,
                icon: CheckCircle,
                label: "PROFILE",
                title: "6D 벡터 프로필 생성",
                color: "bg-purple-100 text-purple-600",
                description:
                  "콜드스타트(문답/SNS/병행)로 생성된 사용자 프로필. 각 차원의 확신도가 함께 계산되어 매칭 가중치에 반영됩니다.",
                features: [
                  "6개 차원 × 벡터값 + 확신도",
                  "행동 데이터로 지속 보정",
                  "사용자가 직접 프로필 확인 가능",
                ],
              },
              {
                step: 2,
                icon: Users,
                label: "MATCHING",
                title: "페르소나 매칭",
                color: "bg-green-100 text-green-600",
                description:
                  "사용자와 페르소나 간 코사인 유사도를 계산하고, 세대/지역/표현온도/전문성 보너스를 적용합니다. 다양성 팩터로 필터버블도 방지합니다.",
                features: [
                  "코사인 유사도 기반 벡터 매칭",
                  "다중 보너스 팩터 적용",
                  "다양성 팩터(Diversity Factor) 포함",
                ],
              },
              {
                step: 3,
                icon: MessageSquare,
                label: "RECOMMENDATION",
                title: "설명 가능한 추천",
                color: "bg-pink-100 text-pink-600",
                description:
                  "매칭된 페르소나가 자신의 관점에서 콘텐츠를 추천하고 이유를 설명합니다. 블랙박스가 아닌, 사용자가 이해할 수 있는 투명한 추천입니다.",
                features: [
                  "페르소나 관점의 추천 이유 제공",
                  "어떤 벡터 차원에서 유사한지 시각화",
                  "사용자 신뢰도 및 만족도 향상",
                ],
              },
            ].map((item) => (
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
                title: "즉시 콜드스타트 해결",
                description:
                  "기존 협업 필터링은 수십 건의 행동 데이터가 필요하지만, DeepSight는 문답이나 SNS 연동으로 즉시 프로필을 생성합니다.",
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
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
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
