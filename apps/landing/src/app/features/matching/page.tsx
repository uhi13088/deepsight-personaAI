import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  GitBranch,
  MessageSquare,
  Shuffle,
  BarChart3,
  Check,
  Search,
  Zap,
  Shield,
  Eye,
} from "lucide-react"

export const metadata: Metadata = {
  title: "매칭 시스템 — Features",
  description:
    "코사인 유사도 + 보너스 팩터 기반 벡터 매칭으로, 왜 이 페르소나가 추천했는지 설명할 수 있는 투명한 추천.",
}

const PIPELINE_STEPS = [
  {
    step: "01",
    icon: Search,
    title: "프로필 분석",
    description:
      "사용자의 6D 벡터 프로필과 확신도(confidence)를 기반으로 매칭 대상 풀을 구성합니다. 확신도가 높은 차원에 더 높은 가중치를 부여합니다.",
    output: "가중치가 적용된 6D 벡터",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "벡터 매칭",
    description:
      "사용자 6D 벡터와 전체 페르소나 6D 벡터 간 코사인 유사도를 계산합니다. 확신도를 가중치로 적용하여 불확실한 차원의 영향을 줄입니다.",
    output: "유사도 점수 (0.0~1.0)",
  },
  {
    step: "03",
    icon: Zap,
    title: "보너스 팩터",
    description:
      "기본 유사도에 세대/국가/전문성 등 캐릭터 속성 기반 보너스를 적용합니다. 같은 세대, 같은 국가의 페르소나에 가산점을 부여합니다.",
    output: "최종 매칭 점수",
  },
  {
    step: "04",
    icon: GitBranch,
    title: "추천 생성",
    description:
      "매칭된 페르소나가 자신의 관점에서 콘텐츠를 평가하고, 사용자에게 추천 이유를 설명하는 추천을 생성합니다.",
    output: "추천 + 설명",
  },
]

const BONUS_FACTORS = [
  {
    factor: "세대 매칭",
    description: "같은 세대(Gen Z, Millennial 등)의 페르소나에 가산점",
    weight: "+0.05",
    type: "필터",
  },
  {
    factor: "국가/지역",
    description: "같은 문화권 페르소나에 가산점, 세부 지역 일치 시 추가",
    weight: "+0.03~0.05",
    type: "필터",
  },
  {
    factor: "전문성 레벨",
    description: "사용자가 선호하는 전문성 수준의 페르소나 우선",
    weight: "+0.02",
    type: "선택적",
  },
  {
    factor: "표현 온도",
    description: "따뜻한/냉철한 표현 스타일 선호도 반영",
    weight: "+0.02",
    type: "선택적",
  },
]

const EXPLANATION_EXAMPLES = [
  {
    persona: "분석가 레오",
    similarity: "87%",
    reason:
      "당신과 분석 깊이, 논리성, 의미 추구 성향이 높은 수준으로 일치합니다. 콘텐츠의 서사 구조를 깊이 파고드는 관점이 잘 맞아, 깊이 있는 리뷰와 해석을 제공해줄 수 있는 페르소나입니다.",
    dimensions: ["분석 깊이 85%", "논리성 72%", "의미 추구 80%"],
  },
  {
    persona: "탐험가 루나",
    similarity: "72%",
    reason:
      "실험적 취향 성향이 매우 높은 수준으로 일치합니다. 새로운 장르와 숨겨진 명작을 찾아 나서는 탐험 성향이 잘 맞아, 아직 발견하지 못한 콘텐츠를 추천받을 수 있습니다.",
    dimensions: ["취향 실험성 95%", "관심 범위 48%"],
  },
]

const FILTER_BUBBLE_SOLUTIONS = [
  {
    icon: Shuffle,
    title: "의도적 다양성 주입",
    description:
      "매칭 상위권 외에도 의도적으로 다른 관점의 페르소나를 노출합니다. 비슷한 취향만 강화되는 필터 버블을 방지합니다.",
  },
  {
    icon: Eye,
    title: "반대 관점 제시",
    description:
      '같은 콘텐츠에 대해 유사도가 낮은 페르소나의 의견도 함께 보여줍니다. "다른 시각에서 보면" 기능으로 시야를 넓힙니다.',
  },
  {
    icon: BarChart3,
    title: "다양성 지표 모니터링",
    description:
      "사용자가 접한 페르소나/장르/관점의 다양성을 수치화합니다. 편향이 감지되면 새로운 관점을 자연스럽게 추천합니다.",
  },
]

export default function MatchingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <Link
            href="/features"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Features
          </Link>
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
            MATCHING
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            <span className="ds-text-gradient">매칭</span> 시스템
          </h1>
          <p className="max-w-2xl text-lg text-gray-600">
            코사인 유사도 기반 벡터 매칭과 다중 보너스 팩터를 결합하여, &lsquo;왜 이 페르소나가
            추천했는지&rsquo; 설명할 수 있는 투명한 추천을 제공합니다.
          </p>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              MATCHING PIPELINE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">프로필 → 매칭 → 추천</h2>
            <p className="mt-4 text-gray-600">
              사용자 프로필이 추천으로 이어지는 4단계 파이프라인입니다.
            </p>
          </div>

          <div className="space-y-6">
            {PIPELINE_STEPS.map((item, idx) => (
              <div key={item.step} className="relative">
                <div className="flex gap-6 rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-md">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f093fb]">
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-sm font-medium text-purple-500">Step {item.step}</div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">{item.title}</h3>
                    <p className="mb-3 text-sm text-gray-600">{item.description}</p>
                    <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                      <ArrowRight className="h-3 w-3" />
                      Output: {item.output}
                    </div>
                  </div>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="ml-12 flex h-6 items-center justify-center">
                    <div className="h-full w-0.5 bg-gradient-to-b from-purple-200 to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cosine Similarity */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              VECTOR MATCHING
            </div>
            <h2 className="text-3xl font-bold text-gray-900">코사인 유사도 + 보너스 팩터</h2>
            <p className="mt-4 text-gray-600">
              6D 벡터의 방향 유사성을 측정하는 코사인 유사도에, 캐릭터 속성 기반 보너스를
              합산합니다.
            </p>
          </div>

          {/* Formula */}
          <div className="mb-12 rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="mb-4 font-mono text-lg text-gray-900">
              최종 점수 = cosine_similarity(user_6D, persona_6D) × confidence_weight + bonus_factors
            </div>
            <p className="text-sm text-gray-500">
              confidence_weight: 확신도가 높은 차원에 높은 가중치 부여
            </p>
          </div>

          {/* Bonus Factors */}
          <div className="grid gap-4 md:grid-cols-2">
            {BONUS_FACTORS.map((bonus) => (
              <div
                key={bonus.factor}
                className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{bonus.factor}</h3>
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
                      {bonus.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{bonus.description}</p>
                </div>
                <div className="flex-shrink-0 rounded-lg bg-green-50 px-3 py-1.5 font-mono text-sm font-medium text-green-600">
                  {bonus.weight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explainable Recommendations */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              EXPLAINABLE AI
            </div>
            <h2 className="text-3xl font-bold text-gray-900">&ldquo;왜&rdquo;를 설명하는 추천</h2>
            <p className="mt-4 text-gray-600">
              매칭 결과에 근거를 제시하여, 사용자가 추천을 신뢰하고 이해할 수 있도록 합니다.
            </p>
          </div>

          <div className="space-y-6">
            {EXPLANATION_EXAMPLES.map((example) => (
              <div
                key={example.persona}
                className="rounded-2xl border border-gray-200 bg-white p-8"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-500">
                      추천 페르소나
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{example.persona}</h3>
                  </div>
                  <div className="rounded-full bg-gradient-to-r from-[#667eea] to-[#f093fb] px-4 py-1.5 text-sm font-bold text-white">
                    유사도 {example.similarity}
                  </div>
                </div>

                <div className="mb-4 rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">추천 이유</span>
                  </div>
                  <p className="text-sm text-gray-600">&ldquo;{example.reason}&rdquo;</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {example.dimensions.map((dim) => (
                    <span
                      key={dim}
                      className="rounded-full bg-purple-50 px-3 py-1 font-mono text-xs text-purple-600"
                    >
                      {dim}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter Bubble Escape */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              DIVERSITY
            </div>
            <h2 className="text-3xl font-bold text-gray-900">필터 버블 탈출</h2>
            <p className="mt-4 text-gray-600">
              유사한 취향만 강화되는 기존 추천 시스템의 한계를 극복합니다.
              <br />
              의도적으로 다양한 관점을 노출하여 사용자의 시야를 넓힙니다.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {FILTER_BUBBLE_SOLUTIONS.map((solution) => (
              <div
                key={solution.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                  <solution.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{solution.title}</h3>
                <p className="text-sm text-gray-600">{solution.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">기존 추천 시스템과 차별점</h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-4 font-medium text-gray-500" />
                  <th className="px-6 py-4 font-medium text-gray-500">기존 추천</th>
                  <th className="px-6 py-4 font-bold text-purple-600">DeepSight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">매칭 방식</td>
                  <td className="px-6 py-4 text-gray-600">협업 필터링 (비슷한 유저가 본 것)</td>
                  <td className="px-6 py-4 text-gray-900">6D 벡터 코사인 유사도</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">추천 이유</td>
                  <td className="px-6 py-4 text-gray-600">블랙박스 (설명 불가)</td>
                  <td className="px-6 py-4 text-gray-900">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" />
                      차원별 유사도 근거 제시
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">필터 버블</td>
                  <td className="px-6 py-4 text-gray-600">취향 강화 경향</td>
                  <td className="px-6 py-4 text-gray-900">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" />
                      다양성 주입 + 반대 관점
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">콜드스타트</td>
                  <td className="px-6 py-4 text-gray-600">데이터 부족 시 추천 불가</td>
                  <td className="px-6 py-4 text-gray-900">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" />
                      문답/SNS로 즉시 프로필 생성
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">추천 주체</td>
                  <td className="px-6 py-4 text-gray-600">알고리즘 (비인격적)</td>
                  <td className="px-6 py-4 text-gray-900">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" />
                      AI 페르소나 (관점 + 개성)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Navigation Footer */}
      <section className="py-16">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6">
          <Link
            href="/features/persona"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            AI 페르소나
          </Link>
          <Link
            href="/products/engine-studio"
            className="ds-button inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
          >
            Persona Engine Studio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
