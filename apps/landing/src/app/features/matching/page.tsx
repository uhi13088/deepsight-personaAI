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
  AudioWaveform,
  BookOpen,
  Gauge,
  Ratio,
} from "lucide-react"

export const metadata: Metadata = {
  title: "매칭 시스템 — Features",
  description:
    "취향 유사도, 심층 호환성, 의외의 발견을 결합한 3단계 매칭으로, 왜 이 페르소나가 추천됐는지 설명할 수 있는 투명한 추천.",
}

const PIPELINE_STEPS = [
  {
    step: "01",
    icon: Search,
    title: "프로필 분석",
    description: "사용자의 3-Layer 프로필(취향·성격·내면)을 분석하여 매칭 대상을 준비합니다.",
    output: "매칭 준비 완료된 통합 프로필",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "3단계 매칭",
    description:
      "3단계 매칭을 수행합니다. 1단계: 취향 유사도, 2단계: 성격 기질까지 고려한 심층 호환성, 3단계: 겉과 속의 모순에서 의외의 호환성을 발견합니다.",
    output: "단계별 매칭 점수",
  },
  {
    step: "03",
    icon: Zap,
    title: "심층 분석 + 호환성 발견",
    description:
      "겉과 속이 다른 사람끼리의 의외의 호환성을 감지하고, 취향과 성격 사이의 미묘한 연결 패턴을 분석하여 매칭 정밀도를 높입니다.",
    output: "최종 매칭 점수",
  },
  {
    step: "04",
    icon: GitBranch,
    title: "감성 보정 + 추천 생성",
    description:
      "매칭 점수에 표현 스타일 유사도와 서사적 공감도를 반영한 최종 점수로 피드를 구성하고, 매칭 근거와 함께 추천 이유를 설명합니다.",
    output: "추천 + 매칭 근거",
  },
]

const BONUS_FACTORS = [
  {
    factor: "의외의 호환성",
    description: "겉과 속이 다른 사람끼리에서 발견되는 의외로 잘 맞는 지점을 감지합니다",
    weight: "높음",
    type: "심층 매칭",
  },
  {
    factor: "심층 호환 패턴",
    description:
      "취향 패턴과 성격 기질의 조합에서 발견되는 심층 호환 패턴으로 매칭 정밀도를 높입니다",
    weight: "높음",
    type: "심층 매칭",
  },
  {
    factor: "세대/문화권 매칭",
    description: "같은 세대(Gen Z, Millennial 등), 같은 문화권의 페르소나에 가산점",
    weight: "중간",
    type: "기본 매칭",
  },
  {
    factor: "표현 온도",
    description: "따뜻한/냉철한 표현 스타일 선호도 반영",
    weight: "보조",
    type: "기본 매칭",
  },
]

const QUALITATIVE_FACTORS = [
  {
    icon: AudioWaveform,
    title: "표현 스타일 유사도",
    description:
      "페르소나가 자신을 표현하는 방식(톤, 어휘, 문체)과 사용자가 선호하는 표현 스타일이 얼마나 잘 맞는지 비교합니다.",
    detail: "최종 매칭 점수에 반영",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: BookOpen,
    title: "서사적 공감도",
    description:
      "페르소나가 이야기를 풀어가는 흐름과 사용자가 공감하는 서사 스타일이 얼마나 잘 어울리는지 측정합니다. 단순 수치 비교가 아닌 서사적 호환성을 평가합니다.",
    detail: "최종 매칭 점수에 반영",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Gauge,
    title: "스트레스 반응 호환성",
    description:
      "페르소나의 감정 역동성이 사용자의 소통 스타일과 어떻게 보완되는지 분석합니다. 감정 변동이 큰 페르소나와 안정적인 사용자의 보완적 매칭 등을 감지합니다.",
    detail: "심층 매칭에 반영",
    color: "from-amber-500 to-orange-500",
  },
]

const FEED_MIX_SEGMENTS = [
  {
    label: "팔로우 기반",
    percentage: 60,
    color: "bg-purple-500",
    description: "사용자가 직접 팔로우한 페르소나의 추천",
  },
  {
    label: "유사도 기반",
    percentage: 30,
    color: "bg-blue-500",
    description: "취향·성격·서사 호환성 종합 점수 기반 추천",
  },
  {
    label: "트렌딩",
    percentage: 10,
    color: "bg-pink-500",
    description: "전체 플랫폼에서 주목받는 콘텐츠/페르소나",
  },
]

const EXPLANATION_EXAMPLES = [
  {
    persona: "분석가 레오",
    similarity: "87%",
    reason:
      "당신과 콘텐츠를 깊이 파고드는 성향이 매우 비슷합니다. 특히 작품의 서사 구조를 분석하는 관점이 잘 맞아, 깊이 있는 리뷰와 해석을 제공해줄 수 있는 페르소나입니다.",
    dimensions: ["취향 유사도 87%", "심층 호환성 91%", "개방성 높음"],
  },
  {
    persona: "탐험가 루나",
    similarity: "72%",
    reason:
      "당신과 정반대처럼 보이지만, 의외로 잘 맞는 지점이 발견됐습니다. 새로운 것을 추구하는 성향과 감정의 변동성이 만나면 아직 발견하지 못한 콘텐츠 세계를 열어줄 수 있습니다.",
    dimensions: ["취향 유사도 72%", "의외의 호환성 88%", "변동성 높음"],
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
            취향 유사도, 심층 호환성, 의외의 발견 — 3단계 매칭을 결합하여, &lsquo;왜 이 페르소나가
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

      {/* 3-Step Matching */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              VECTOR MATCHING
            </div>
            <h2 className="text-3xl font-bold text-gray-900">3단계 매칭 시스템</h2>
            <p className="mt-4 text-gray-600">
              취향 유사도, 심층 호환성, 의외의 발견을 결합하여 정밀한 추천을 만듭니다.
            </p>
          </div>

          {/* Matching Steps */}
          <div className="mb-12 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-500">
                1단계
              </div>
              <div className="mb-2 text-lg font-bold text-gray-900">취향 유사도</div>
              <p className="text-sm text-gray-500">
                사용자와 페르소나의 콘텐츠 취향 프로필이 얼마나 비슷한지 측정합니다
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-pink-500">
                2단계
              </div>
              <div className="mb-2 text-lg font-bold text-gray-900">심층 호환성</div>
              <p className="text-sm text-gray-500">
                취향뿐 아니라 성격 기질까지 고려하여, 표면적으로 비슷하지만 실제로는 안 맞는 경우를
                걸러냅니다
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
                3단계
              </div>
              <div className="mb-2 text-lg font-bold text-gray-900">의외의 발견</div>
              <p className="text-sm text-gray-500">
                겉과 속의 모순에서 오히려 잘 맞는 의외의 호환성을 발견합니다. 다양한 관점을 만날
                기회를 제공합니다
              </p>
            </div>
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
                <div className="flex-shrink-0 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-600">
                  {bonus.weight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Qualitative Matching */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              QUALITATIVE MATCHING
            </div>
            <h2 className="text-3xl font-bold text-gray-900">숫자를 넘어선 감성 매칭</h2>
            <p className="mt-4 text-gray-600">
              수치 유사도만으로는 포착할 수 없는 표현 스타일, 서사적 공감, 감정 역동성까지 반영하여
              <br />
              최종 매칭 점수를 보정합니다.
            </p>
          </div>

          {/* Qualitative Factors */}
          <div className="mb-12 grid gap-6 md:grid-cols-3">
            {QUALITATIVE_FACTORS.map((factor) => (
              <div
                key={factor.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-lg"
              >
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${factor.color}`}
                >
                  <factor.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{factor.title}</h3>
                <p className="mb-4 text-sm text-gray-600">{factor.description}</p>
                <span className="inline-block rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                  {factor.detail}
                </span>
              </div>
            ))}
          </div>

          {/* Qualitative Bonus Description */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-600">
              감성 보정
            </div>
            <p className="mb-4 text-base text-gray-900">
              표현 스타일이 잘 맞는지, 서사적으로 공감할 수 있는지를 추가로 반영하여 최종 매칭
              점수를 보정합니다.
            </p>
            <div className="inline-flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600">
              <Ratio className="h-4 w-4 text-purple-500" />
              <span>숫자만으로는 포착할 수 없는 &lsquo;느낌&rsquo;까지 매칭에 반영합니다</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feed Mixing */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              FEED MIXING
            </div>
            <h2 className="text-3xl font-bold text-gray-900">피드 구성 알고리즘</h2>
            <p className="mt-4 text-gray-600">
              매칭 점수만으로 피드를 구성하지 않습니다. 팔로우, 유사도, 트렌딩을 혼합하여 균형 잡힌
              피드를 제공합니다.
            </p>
          </div>

          {/* Bar Visualization */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white p-8">
            <div className="mb-6 flex h-10 overflow-hidden rounded-full">
              {FEED_MIX_SEGMENTS.map((seg) => (
                <div
                  key={seg.label}
                  className={`${seg.color} flex items-center justify-center text-xs font-bold text-white`}
                  style={{ width: `${seg.percentage}%` }}
                >
                  {seg.percentage}%
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {FEED_MIX_SEGMENTS.map((seg) => (
                <div key={seg.label} className="flex items-start gap-3">
                  <div className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${seg.color}`} />
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {seg.label} ({seg.percentage}%)
                    </div>
                    <p className="text-xs text-gray-500">{seg.description}</p>
                  </div>
                </div>
              ))}
            </div>
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
                      className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-600"
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
                  <td className="px-6 py-4 text-gray-900">3단계 매칭 (유사도 → 호환성 → 발견)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">정성적 매칭</td>
                  <td className="px-6 py-4 text-gray-600">없음 (수치 유사도만 사용)</td>
                  <td className="px-6 py-4 text-gray-900">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" />
                      표현 스타일 + 서사 공감도 반영
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">추천 이유</td>
                  <td className="px-6 py-4 text-gray-600">블랙박스 (설명 불가)</td>
                  <td className="px-6 py-4 text-gray-900">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" />
                      매칭 근거를 자연어로 설명
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
