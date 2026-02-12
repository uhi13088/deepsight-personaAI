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
    "3-Tier 매칭(Basic/Advanced/Exploration) 기반 벡터 매칭으로, 왜 이 페르소나가 추천했는지 설명할 수 있는 투명한 추천.",
}

const PIPELINE_STEPS = [
  {
    step: "01",
    icon: Search,
    title: "프로필 분석",
    description:
      "사용자의 3-Layer 벡터 프로필과 확신도(confidence)를 기반으로 매칭 대상 풀을 구성합니다. L1(7D), L2(OCEAN 5D), L3(4D) 각 레이어의 확신도에 따라 가중치를 부여합니다.",
    output: "가중치가 적용된 3-Layer 벡터(V_Final)",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "3-Tier 매칭",
    description:
      "3-Tier 매칭을 수행합니다. Basic: V_Final 코사인 유사도, Advanced: L1×L2 교차축 가중 매칭(83축), Exploration: L3 기반 Paradox 매칭으로 의외의 호환성을 발견합니다.",
    output: "Tier별 매칭 점수 (0.0~1.0)",
  },
  {
    step: "03",
    icon: Zap,
    title: "Paradox Score + 교차축 83축",
    description:
      "Paradox Score로 상반된 벡터 조합에서 의외의 호환성을 감지하고, L1×L2 교차축 83축 패턴으로 심층 매칭 정밀도를 높입니다.",
    output: "최종 매칭 점수",
  },
  {
    step: "04",
    icon: GitBranch,
    title: "정성적 보정 + 추천 생성",
    description:
      "3-Tier 매칭 점수에 정성적 보정(voice_match, narrative_match)을 적용한 최종 점수로 피드를 구성하고, 매칭 근거와 함께 추천 이유를 설명합니다.",
    output: "추천 + 매칭 근거 (정량+정성)",
  },
]

const BONUS_FACTORS = [
  {
    factor: "Paradox 호환성",
    description: "L3 Narrative Drive 기반으로 상반된 벡터에서 발견되는 의외의 호환성을 감지합니다",
    weight: "×1.2",
    type: "Exploration",
  },
  {
    factor: "교차축 패턴 (83축)",
    description: "L1(7D)×L2(5D) 교차 조합에서 발견되는 심층 패턴으로 매칭 정밀도를 높입니다",
    weight: "×1.15",
    type: "Advanced",
  },
  {
    factor: "세대/문화권 매칭",
    description: "같은 세대(Gen Z, Millennial 등), 같은 문화권의 페르소나에 가산점",
    weight: "+0.03~0.05",
    type: "필터",
  },
  {
    factor: "표현 온도",
    description: "따뜻한/냉철한 표현 스타일 선호도 반영",
    weight: "+0.02",
    type: "선택적",
  },
]

const QUALITATIVE_FACTORS = [
  {
    icon: AudioWaveform,
    title: "Voice Similarity",
    description:
      "벡터 유사도를 넘어, 페르소나가 자신을 표현하는 방식(톤, 어휘, 문체)과 사용자 선호 표현 스타일을 임베딩 기반으로 비교합니다.",
    detail: "voice_match 기여: ×0.05",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: BookOpen,
    title: "Narrative Compatibility",
    description:
      "L3 Narrative Drive의 서사 아크(story arc)가 사용자의 내러티브 욕구와 얼마나 공명하는지 측정합니다. 단순 벡터 거리가 아닌 서사적 호환성을 평가합니다.",
    detail: "narrative_match 기여: ×0.05",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Gauge,
    title: "Pressure Response Compatibility",
    description:
      "페르소나의 압력 역학(pressure dynamics)이 사용자의 인터랙션 스타일과 어떻게 보완되는지 분석합니다. 높은 Volatility 페르소나와 안정적 사용자의 보완적 매칭 등을 감지합니다.",
    detail: "Exploration Tier에 반영",
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
    description: "3-Tier 매칭 + 정성적 보정 점수 기반 추천",
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
      "Basic Tier에서 V_Final 유사도 0.87, Advanced Tier에서 Depth×Openness 교차축이 강하게 일치합니다. 콘텐츠의 서사 구조를 깊이 파고드는 관점이 잘 맞아, 깊이 있는 리뷰와 해석을 제공해줄 수 있는 페르소나입니다.",
    dimensions: ["Basic: V_Final 0.87", "Advanced: Depth×O 0.91", "L2 Openness 85%"],
  },
  {
    persona: "탐험가 루나",
    similarity: "72%",
    reason:
      "Exploration Tier에서 Paradox Score가 높게 나왔습니다. Novelty Seeking과 Volatility의 상반된 조합이 의외의 호환성을 만들어, 아직 발견하지 못한 콘텐츠를 추천받을 수 있습니다.",
    dimensions: ["Basic: V_Final 0.72", "Exploration: Paradox 0.88", "L3 Volatility 95%"],
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
            3-Tier 매칭(Basic V_Final 코사인, Advanced 교차축 가중, Exploration Paradox 매칭)을
            결합하여, &lsquo;왜 이 페르소나가 추천했는지&rsquo; 설명할 수 있는 투명한 추천을
            제공합니다.
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
            <h2 className="text-3xl font-bold text-gray-900">3-Tier 매칭 + Paradox Score</h2>
            <p className="mt-4 text-gray-600">
              Basic/Advanced/Exploration 3단계 매칭과 교차축 가중, Paradox Score를 결합합니다.
            </p>
          </div>

          {/* Formula */}
          <div className="mb-12 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-500">
                Basic Tier
              </div>
              <div className="mb-2 font-mono text-lg text-gray-900">
                S_basic = cosine_similarity(user_V_Final, persona_V_Final)
              </div>
              <p className="text-sm text-gray-500">V_Final: L1+L2+L3 가중 합산 벡터</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-pink-500">
                Advanced Tier
              </div>
              <div className="mb-2 font-mono text-lg text-gray-900">
                S_advanced = S_basic × cross_axis_weight(L1×L2, 83축)
              </div>
              <p className="text-sm text-gray-500">L1(7D)×L2(5D) 교차축 가중으로 심층 매칭</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
                Exploration Tier
              </div>
              <div className="mb-2 font-mono text-lg text-gray-900">
                S_explore = S_advanced + paradox_score(L3_user, L3_persona)
              </div>
              <p className="text-sm text-gray-500">
                L3 Narrative Drive 기반 Paradox 매칭으로 의외의 발견
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
                <div className="flex-shrink-0 rounded-lg bg-green-50 px-3 py-1.5 font-mono text-sm font-medium text-green-600">
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
            <h2 className="text-3xl font-bold text-gray-900">벡터를 넘어선 정성적 매칭</h2>
            <p className="mt-4 text-gray-600">
              벡터 유사도만으로는 포착할 수 없는 표현 스타일, 서사 공명, 압력 역학까지 반영하여
              <br />
              최종 매칭 점수에 정성적 보정(qualitative bonus ±0.1)을 적용합니다.
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
                <span className="inline-block rounded-lg bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-500">
                  {factor.detail}
                </span>
              </div>
            ))}
          </div>

          {/* Qualitative Bonus Formula */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-600">
              Qualitative Bonus
            </div>
            <div className="mb-2 font-mono text-lg text-gray-900">
              qualitative_bonus = voice_match × 0.05 + narrative_match × 0.05
            </div>
            <p className="mb-4 text-sm text-gray-500">
              범위: ±0.1 | 최종 매칭 점수에 가산/감산되어 정성적 호환성을 반영
            </p>
            <div className="inline-flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600">
              <Ratio className="h-4 w-4 text-purple-500" />
              <span>S_final = S_tier + qualitative_bonus</span>
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
                  <td className="px-6 py-4 text-gray-900">
                    3-Tier 매칭 (Basic/Advanced/Exploration)
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">정성적 매칭</td>
                  <td className="px-6 py-4 text-gray-600">없음 (수치 유사도만 사용)</td>
                  <td className="px-6 py-4 text-gray-900">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" />
                      Voice + Narrative 보정 (±0.1)
                    </span>
                  </td>
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
