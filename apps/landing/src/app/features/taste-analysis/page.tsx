import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Eye,
  Compass,
  Target,
  Palette,
  Brain,
  Check,
  MessageSquare,
  Share2,
  Layers,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Fingerprint,
  Activity,
  Combine,
  Heart,
  Flame,
  Sprout,
  Shield,
  BookOpen,
  Mic,
  Zap,
  Users,
} from "lucide-react"

export const metadata: Metadata = {
  title: "소비자 취향 분석 — Features",
  description:
    "3-Layer 벡터 프로파일링으로 취향(L1), 성격(L2), 내면 동력(L3)까지 심층 분석. 비정량적 요소와 24문항 온보딩, SNS 분석을 결합합니다.",
}

const L1_DIMENSIONS = [
  {
    id: "depth",
    name: "분석 깊이",
    low: "직관적",
    high: "심층적",
    description: "콘텐츠를 얼마나 깊이 분석하고 이해하려 하는지",
    example: "영화를 볼 때 감독의 의도, 상징성까지 파악하려 하는 정도",
    icon: Search,
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "lens",
    name: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "감성적 vs 논리적 관점 중 어느 쪽에 가까운지",
    example: "감동적 스토리를 중시하는지, 플롯의 논리적 일관성을 중시하는지",
    icon: Eye,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    id: "stance",
    name: "평가 태도",
    low: "수용적",
    high: "비판적",
    description: "새로운 콘텐츠에 대해 수용적 vs 비판적 태도",
    example: "새로운 장르도 열린 마음으로 보는지, 엄격한 기준으로 평가하는지",
    icon: Compass,
    color: "from-amber-500 to-amber-600",
  },
  {
    id: "scope",
    name: "관심 범위",
    low: "핵심만",
    high: "디테일",
    description: "핵심 정보만 선호하는지, 디테일까지 원하는지",
    example: "한 줄 요약을 원하는지, 배우/OST/촬영기법까지 알고 싶은지",
    icon: Target,
    color: "from-red-500 to-red-600",
  },
  {
    id: "taste",
    name: "취향 성향",
    low: "클래식",
    high: "실험적",
    description: "검증된 콘텐츠를 선호하는지, 새롭고 실험적인 것을 찾는지",
    example: "톱10 인기작을 보는지, 인디/아트하우스 영화를 찾아보는지",
    icon: Palette,
    color: "from-violet-500 to-violet-600",
  },
  {
    id: "purpose",
    name: "소비 목적",
    low: "오락",
    high: "의미추구",
    description: "순수 오락인지, 의미와 메시지를 추구하는지",
    example: "스트레스 해소용인지, 삶에 대한 인사이트를 얻고 싶은지",
    icon: Brain,
    color: "from-pink-500 to-pink-600",
  },
  {
    id: "sociability",
    name: "사회적 성향",
    low: "독립적",
    high: "사교적",
    description: "혼자 소비하는지, 나누고 공유하는 것을 선호하는지",
    example: "혼자 조용히 책을 읽는지, SNS에 감상평을 나누는지",
    icon: Share2,
    color: "from-indigo-500 to-indigo-600",
  },
]

const L2_DIMENSIONS = [
  {
    name: "개방성 (Openness)",
    low: "보수적 · 관습적",
    high: "호기심 · 개방적",
    description:
      "새로운 경험과 아이디어에 대한 태도. 실험적 콘텐츠를 즐기는지, 익숙한 것을 선호하는지 결정합니다.",
  },
  {
    name: "성실성 (Conscientiousness)",
    low: "즉흥적 · 자유로운",
    high: "원칙적 · 체계적",
    description:
      "계획과 규율에 대한 태도. 콘텐츠를 체계적으로 소비하는지, 그때그때 기분에 따르는지 영향을 줍니다.",
  },
  {
    name: "외향성 (Extraversion)",
    low: "내향적 · 에너지 소모",
    high: "외향적 · 에너지 충전",
    description:
      "사회적 상호작용에서의 에너지 흐름. 혼자만의 감상을 즐기는지, 함께 나누는 것을 좋아하는지.",
  },
  {
    name: "우호성 (Agreeableness)",
    low: "경쟁적 · 솔직한",
    high: "협조적 · 공감하는",
    description: "타인에 대한 기본 태도. 논쟁을 즐기는지, 조화로운 소통을 선호하는지 결정합니다.",
  },
  {
    name: "감수성 (Neuroticism)",
    low: "정서적 안정",
    high: "정서적 민감",
    description: "감정의 진폭. 콘텐츠에 쉽게 감정이입하는지, 냉정하게 거리를 두는지 영향을 줍니다.",
  },
]

const L3_DIMENSIONS = [
  {
    name: "결핍 (Lack)",
    low: "충족 · 안정적",
    high: "결핍 · 갈망",
    description:
      "채워지지 않은 욕구의 크기. 인정받고 싶은 욕구, 소속감 갈망 등이 콘텐츠 선택에 은밀하게 영향을 줍니다.",
    icon: Heart,
  },
  {
    name: "도덕 나침반 (Moral Compass)",
    low: "유연 · 상황적",
    high: "엄격 · 절대적",
    description:
      "윤리적 기준의 강도. 도덕적 딜레마가 있는 콘텐츠에 끌리는지, 회피하는지를 결정합니다.",
    icon: Compass,
  },
  {
    name: "변동성 (Volatility)",
    low: "안정 · 예측가능",
    high: "불안정 · 예측불가",
    description:
      "감정과 행동의 진폭. 취향이 자주 바뀌는지, 한 번 좋아하면 오래 파는지에 영향을 줍니다.",
    icon: Flame,
  },
  {
    name: "성장 곡선 (Growth Arc)",
    low: "정체 · 안주",
    high: "성장 · 변화",
    description:
      "자기 변화에 대한 열망. 성장 서사에 끌리는지, 안정적 일상에 더 공감하는지를 보여줍니다.",
    icon: Sprout,
  },
]

const COLD_START_METHODS = [
  {
    icon: MessageSquare,
    title: "24문항 시나리오 질문",
    badge: "3-Phase 하이브리드",
    badgeColor: "bg-purple-100 text-purple-600",
    description:
      "일상 시나리오 속 4지선다 질문으로, 한 문항이 취향(L1)과 성격(L2)을 동시에 측정합니다. 3단계로 나뉘어 중간에 그만둬도 이전 단계 결과는 유지됩니다.",
    features: [
      "Phase 1 (8문항): 취향 성향 중심 측정 → 65% 정확도",
      "Phase 2 (8문항): 성격 기질 중심 + 교차 검증 → 80% 정확도",
      "Phase 3 (8문항): 겉과 속의 모순 탐지 + 최종 검증 → 93% 정확도",
    ],
    accuracy: 3,
    speed: "약 4분",
  },
  {
    icon: Share2,
    title: "SNS 행동 분석",
    badge: "8개 플랫폼 지원",
    badgeColor: "bg-green-100 text-green-600",
    description:
      "넷플릭스 시청기록, 유튜브 구독, 인스타그램 활동, 스포티파이 음악 취향 등 실제 행동 데이터에서 3-Layer 프로필을 즉시 추론합니다. 원본 데이터는 저장하지 않습니다.",
    features: [
      "실제 행동 기반이라 높은 정확도",
      "질문 없이 즉시 프로필 생성",
      "원시 데이터 저장 없이 벡터만 산출",
    ],
    accuracy: 3,
    speed: "즉시",
  },
  {
    icon: Layers,
    title: "질문 + SNS 병행",
    badge: "최고 정확도",
    badgeColor: "bg-pink-100 text-pink-600",
    description:
      "질문에서 얻은 명시적 선호와 SNS에서 추론한 암묵적 패턴을 교차 검증합니다. 두 소스가 일치하면 확신도가 올라가고, 불일치하면 추가 질문으로 정밀 보정합니다.",
    features: [
      "명시적 + 암묵적 데이터 교차 검증",
      "불일치 차원 자동 정밀 보정",
      "95%+ 매칭 정확도 달성",
    ],
    accuracy: 4,
    speed: "약 4분 + SNS 연동",
  },
]

const SNS_PLATFORMS = [
  {
    name: "Netflix",
    data: "시청 이력, 장르 선호, 시청 패턴",
    mapped: "분석 깊이 · 취향 성향 · 소비 목적 · 개방성",
  },
  {
    name: "YouTube",
    data: "구독 채널, 시청 시간, 카테고리 분포",
    mapped: "판단 렌즈 · 관심 범위 · 성실성",
  },
  {
    name: "Instagram",
    data: "팔로우 계정, 관심사 태그, 인터랙션 패턴",
    mapped: "사회적 성향 · 취향 성향 · 외향성",
  },
  {
    name: "Spotify",
    data: "음악 취향, 플레이리스트, 장르 다양성",
    mapped: "취향 성향 · 소비 목적 · 개방성",
  },
]

const ACCURACY_IMPROVEMENTS = [
  {
    icon: Activity,
    title: "행동 데이터 피드백 루프",
    description:
      "추천 콘텐츠에 반응(좋아요, 스킵, 저장)할 때마다 프로필이 미세 보정됩니다. 사용할수록 당신을 더 잘 알게 됩니다.",
  },
  {
    icon: RefreshCw,
    title: "다중 소스 교차 검증",
    description:
      "질문 응답, SNS 데이터, 실제 행동 3가지를 교차 비교합니다. 확신이 부족한 부분은 추가 데이터 수집을 유도합니다.",
  },
  {
    icon: TrendingUp,
    title: "시간 가중치 적용",
    description:
      "어제의 행동이 3개월 전 데이터보다 더 큰 영향을 줍니다. 변화하는 취향을 실시간으로 반영합니다.",
  },
  {
    icon: Fingerprint,
    title: "프로필 품질 레벨",
    description:
      "STARTER → STANDARD → ADVANCED → EXPERT 4단계로 품질을 관리합니다. 데이터가 쌓일수록 자동으로 레벨업되며 매칭이 정교해집니다.",
  },
]

export default function TasteAnalysisPage() {
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
            PROFILING
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            소비자 <span className="ds-text-gradient">취향 분석</span>
          </h1>
          <p className="max-w-2xl text-lg text-gray-600">
            단순한 &ldquo;좋아요/싫어요&rdquo;를 넘어, 사용자의 콘텐츠 소비 성향을{" "}
            <strong>취향(L1)</strong> · <strong>성격(L2)</strong> · <strong>내면 동력(L3)</strong>{" "}
            세 겹으로 심층 분석합니다. 24문항 시나리오 온보딩과 SNS 행동 데이터를 결합해, 사용할수록
            정확해지는 프로필을 만듭니다.
          </p>
        </div>
      </section>

      {/* 3-Layer Overview */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              3-LAYER PROFILING
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              세 겹의 레이어로 사용자를 입체적으로 이해
            </h2>
            <p className="mt-4 text-gray-600">
              사람은 겉으로 보이는 모습과 내면이 다릅니다.
              <br />
              DeepSight는 이 &ldquo;다층적 인간다움&rdquo;을 세 개의 독립된 레이어로 분석합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-8">
              <div className="mb-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                Layer 1 · 취향
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">사회적 취향 (7개 차원)</h3>
              <p className="mb-4 text-sm text-gray-600">
                콘텐츠를 소비할 때 <strong>외부에 드러나는 성향</strong>입니다. 깊게 파는지 vs
                가볍게 즐기는지, 실험적인 걸 좋아하는지 vs 검증된 걸 선호하는지 — 일상에서 관찰
                가능한 취향 패턴을 7개 독립 축으로 측정합니다.
              </p>
              <div className="text-xs text-blue-600">
                분석 깊이 · 판단 렌즈 · 평가 태도 · 관심 범위 · 취향 성향 · 소비 목적 · 사회적 성향
              </div>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-8">
              <div className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
                Layer 2 · 성격
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">내면 기질 (OCEAN 5개 차원)</h3>
              <p className="mb-4 text-sm text-gray-600">
                심리학의 Big Five 성격 모델 기반으로,{" "}
                <strong>평소에는 숨겨져 있다가 특정 상황에서 드러나는 본성</strong>을 측정합니다.
                겉으로는 까칠하지만 속으로는 배려심 깊은 사람처럼, L1과 다를 수 있습니다.
              </p>
              <div className="text-xs text-amber-600">
                개방성 · 성실성 · 외향성 · 우호성 · 감수성
              </div>
            </div>

            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-8">
              <div className="mb-4 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-600">
                Layer 3 · 내면 동력
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">서사적 욕망 (4개 차원)</h3>
              <p className="mb-4 text-sm text-gray-600">
                <strong>&ldquo;왜 그런 취향을 가지게 되었는가&rdquo;</strong>의 근원. 채워지지 않은
                욕구, 도덕적 기준, 감정의 변동성, 성장에 대한 열망 — 의식하지 못하지만 콘텐츠 선택에
                깊이 영향을 주는 내면 동력입니다.
              </p>
              <div className="text-xs text-violet-600">결핍 · 도덕 나침반 · 변동성 · 성장 곡선</div>
            </div>
          </div>

          {/* Paradox callout */}
          <div className="mt-8 rounded-xl border border-purple-100 bg-purple-50/50 p-6 text-center">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-purple-700">겉과 속의 모순 탐지</span> —
              L1(취향)과 L2(성격) 사이의 모순을 자동으로 감지합니다. 예를 들어, 겉으로는
              사교적이지만 실제로는 혼자 있고 싶어하는 성향 — 이런 복잡한 인간다움까지 프로필에
              반영됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* L1 Social Persona — 7D */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
              LAYER 1 — 사회적 취향
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              7개 차원으로 콘텐츠 취향을 정밀 분석
            </h2>
            <p className="mt-4 text-gray-600">
              일상에서 관찰할 수 있는 콘텐츠 소비 패턴을 7개 독립 축으로 측정합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {L1_DIMENSIONS.map((dim) => (
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
                <p className="mb-3 text-sm text-gray-600">{dim.description}</p>
                <p className="mb-4 text-xs italic text-gray-400">&ldquo;{dim.example}&rdquo;</p>
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

      {/* L2 Core Temperament — OCEAN 5D */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-600">
              LAYER 2 — 내면 기질
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Big Five 성격 모델로 본성을 분석</h2>
            <p className="mt-4 text-gray-600">
              심리학에서 가장 검증된 성격 모델(OCEAN)로 내면 기질을 측정합니다.
              <br />
              평소에는 숨겨져 있지만, 스트레스 상황이나 중요한 선택의 순간에 드러나는 진짜
              모습입니다.
            </p>
          </div>

          <div className="space-y-4">
            {L2_DIMENSIONS.map((dim) => (
              <div key={dim.name} className="rounded-xl border border-amber-100 bg-amber-50/30 p-6">
                <h3 className="mb-2 font-bold text-gray-900">{dim.name}</h3>
                <p className="mb-3 text-sm text-gray-600">{dim.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">{dim.low}</span>
                  <div className="mx-4 h-1 flex-1 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400" />
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">
                    {dim.high}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-amber-700">왜 성격까지 분석하나요?</span> — 같은
              &ldquo;실험적 취향&rdquo;이라도, 성격이 개방적인 사람은 정말로 새로운 것을 좋아하지만,
              보수적인 성격의 사람은 유행을 따르는 것일 수 있습니다. L1(취향)과 L2(성격) 사이의 이런
              미묘한 차이가 더 정밀한 매칭을 가능하게 합니다.
            </p>
          </div>
        </div>
      </section>

      {/* L3 Narrative Drive — 4D */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-violet-600">
              LAYER 3 — 서사적 욕망
            </div>
            <h2 className="text-3xl font-bold text-gray-900">무의식적 욕망과 내면 동력</h2>
            <p className="mt-4 text-gray-600">
              &ldquo;왜 그런 사람이 되었는가&rdquo;를 설명하는 레이어입니다.
              <br />
              의식하지 못하지만, 콘텐츠 선택에 깊이 영향을 주는 내면의 힘입니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {L3_DIMENSIONS.map((dim) => (
              <div
                key={dim.name}
                className="rounded-xl border border-violet-100 bg-violet-50/30 p-6"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                    <dim.icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">{dim.name}</h3>
                </div>
                <p className="mb-3 text-sm text-gray-600">{dim.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-violet-700">
                    {dim.low}
                  </span>
                  <div className="mx-4 h-1 flex-1 rounded-full bg-gradient-to-r from-violet-200 via-violet-300 to-violet-400" />
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-violet-700">
                    {dim.high}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-violet-200 bg-violet-50 p-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-violet-700">L3는 어떻게 측정하나요?</span> — L3는
              사용자에게 직접 물어보는 것이 아닙니다. 24문항 온보딩의 Phase 3에서 겉과 속의 모순
              패턴을 탐지하고, 이를 통해 간접적으로 추론합니다. 또한 시간이 지나면서 콘텐츠 소비
              패턴에서 점차 정교하게 포착됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* Non-Quantitative Elements */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              BEYOND NUMBERS
            </div>
            <h2 className="text-3xl font-bold text-gray-900">숫자로 담을 수 없는 것들</h2>
            <p className="mt-4 text-gray-600">
              3-Layer 벡터는 &ldquo;무엇을 좋아하는가&rdquo;를 정량화합니다. 하지만 살아있는
              프로필이 되려면 &ldquo;왜 그런 사람이 되었는가&rdquo;까지 이해해야 합니다.
              <br />
              DeepSight는 온보딩 응답 패턴과 SNS 행동에서 이런 비정량적 신호도 함께 포착합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                  <BookOpen className="h-5 w-5 text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">서사적 기원 (Backstory)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                시나리오 질문의 응답 패턴에서 무의식적 욕구와 회피 성향의 단서를 포착합니다. 왜 특정
                장르에 끌리는지, 왜 특정 상황을 불편해하는지의 근원적 이유를 추론합니다.
              </p>
              <div className="rounded-lg bg-violet-50 p-3 text-xs text-violet-700">
                <span className="font-semibold">포착 예시:</span> &ldquo;성장 서사에 강하게
                공감하고, 상실 관련 콘텐츠를 회피&rdquo; → 결핍 욕구와 성장 열망이 콘텐츠 선택을
                무의식적으로 주도
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Mic className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">표현 스타일 (Voice Profile)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                SNS 게시글의 문체, 어휘, 감정 표현 강도에서 사용자의 고유한 커뮤니케이션 스타일을
                분석합니다. 같은 취향이라도 &ldquo;이 영화 찐이야&rdquo;와 &ldquo;이 작품의 서사
                구조가 인상적이다&rdquo;는 전혀 다른 사람입니다.
              </p>
              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <span className="font-semibold">포착 예시:</span> 짧은 단문 + 직설적 어조 + 은어
                사용 → 직관적이고 솔직한 표현을 선호하는 사용자
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">압박 역학 (Pressure Dynamics)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Phase별 응답 태도의 변화에서 사용자의 스트레스 반응 패턴을 추론합니다. 어려운
                질문에서 태도가 어떻게 바뀌는지 — 이 미묘한 변화가 실제 매칭 상황에서의 반응 예측에
                활용됩니다.
              </p>
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                <span className="font-semibold">포착 예시:</span> Phase 1에서는 일관된 응답 → Phase
                3 역설 질문에서 흔들림 → 특정 가치 충돌에 민감한 사용자
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">시대정신 (Zeitgeist)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                SNS 활동 패턴과 문화적 소비 코드에서 세대적 특성과 가치관을 분석합니다. 같은
                벡터값이라도 Z세대와 밀레니얼은 전혀 다른 방식으로 콘텐츠를 소비합니다.
              </p>
              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                <span className="font-semibold">포착 예시:</span> Z세대 &ldquo;이거 진짜 갓겜&rdquo;
                vs 밀레니얼 &ldquo;이 작품의 서사 구조가 인상적&rdquo; — 같은 감동, 다른 표현
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SNS 행동 데이터 분석 */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              SNS BEHAVIORAL ANALYSIS
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              SNS 행동 데이터에서 3-Layer 프로필 추론
            </h2>
            <p className="mt-4 text-gray-600">
              이미 사용 중인 서비스의 행동 데이터를 분석하여
              <br />
              질문 없이도 정확한 3-Layer 프로필을 즉시 생성합니다.
            </p>
          </div>

          <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SNS_PLATFORMS.map((platform) => (
              <div
                key={platform.name}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
              >
                <h3 className="mb-3 text-lg font-bold text-gray-900">{platform.name}</h3>
                <p className="mb-2 text-sm text-gray-600">{platform.data}</p>
                <p className="text-xs text-purple-500">측정 차원: {platform.mapped}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-purple-600">0개</div>
                <p className="text-sm text-gray-600">원시 데이터 저장</p>
                <p className="text-xs text-gray-400">프로필 벡터만 산출, 원본 미보관</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-purple-600">즉시</div>
                <p className="text-sm text-gray-600">프로필 생성 속도</p>
                <p className="text-xs text-gray-400">연동 동의 후 즉시 분석</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-purple-600">교차 검증</div>
                <p className="text-sm text-gray-600">다중 플랫폼 결합</p>
                <p className="text-xs text-gray-400">2개 이상 연동 시 정확도 대폭 향상</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cold-Start Methods */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              COLD-START SOLUTION
            </div>
            <h2 className="text-3xl font-bold text-gray-900">처음 만나도 바로 추천, 3가지 방법</h2>
            <p className="mt-4 text-gray-600">
              신규 사용자의 행동 데이터 없이도 즉시 개인화된 추천이 가능합니다.
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
                  {method.speed && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      소요 시간: {method.speed}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profile Accuracy Improvement */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              ACCURACY IMPROVEMENT
            </div>
            <h2 className="text-3xl font-bold text-gray-900">사용할수록 정확해지는 프로필</h2>
            <p className="mt-4 text-gray-600">
              초기 프로필 생성 이후에도 행동 데이터, 교차 검증, 시간 가중치를 통해
              <br />
              프로필이 지속적으로 보정되어 매칭 정확도가 향상됩니다.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {ACCURACY_IMPROVEMENTS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f093fb]">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Accuracy Timeline */}
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-8">
            <h3 className="mb-6 text-center text-lg font-bold text-gray-900">
              프로필 정확도 향상 타임라인
            </h3>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  stage: "STARTER",
                  time: "가입 직후",
                  accuracy: "65%",
                  source: "Phase 1 (8문항) 완료",
                },
                {
                  stage: "STANDARD",
                  time: "1주일 후",
                  accuracy: "80%",
                  source: "+ Phase 2 또는 SNS 연동",
                },
                {
                  stage: "ADVANCED",
                  time: "1개월 후",
                  accuracy: "93%",
                  source: "+ Phase 3 완료 + 일일 질문",
                },
                {
                  stage: "EXPERT",
                  time: "3개월 후",
                  accuracy: "97%+",
                  source: "+ 다중 소스 교차 검증 완료",
                },
              ].map((item, idx) => (
                <div key={idx} className="relative text-center">
                  <div className="mb-2 inline-flex items-center rounded-full bg-gradient-to-r from-[#667eea] to-[#f093fb] px-3 py-1 text-xs font-bold text-white">
                    {item.stage}
                  </div>
                  <div className="mb-1 text-2xl font-bold text-gray-900">{item.accuracy}</div>
                  <p className="text-sm font-medium text-gray-700">{item.time}</p>
                  <p className="text-xs text-gray-400">{item.source}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quantitative × Qualitative Fusion */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              PROFILING ARCHITECTURE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">정량 데이터와 정성 신호의 융합</h2>
            <p className="mt-4 text-gray-600">
              3-Layer 벡터 측정과 비정량적 신호 포착이 동시에 일어납니다.
              <br />
              하나의 질문, 하나의 SNS 데이터에서 숫자와 맥락을 함께 읽어냅니다.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Onboarding → Qualitative Inference */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f093fb]">
                  <Combine className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">시나리오 질문의 이중 역할</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                24문항 시나리오 질문은 L1·L2 벡터값을 측정하는 것뿐 아니라, 응답 패턴에서 비정량적
                신호를 함께 수집합니다. 어떤 선택지에서 오래 고민했는지, Phase별로 태도가 어떻게
                변했는지까지 프로필에 반영됩니다.
              </p>
              <ul className="space-y-2">
                {[
                  "선택 패턴에서 감정 표현 스타일과 문체 경향 추론",
                  "시나리오 반응으로 무의식적 욕구와 회피 성향의 단서 포착",
                  "Phase별 태도 변화로 스트레스 반응 패턴의 기초 데이터 확보",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* SNS → Qualitative Signals */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f093fb]">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">SNS 데이터의 이중 역할</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                SNS 행동 데이터는 3-Layer 벡터 산출과 동시에 비정량적 신호원으로도 활용됩니다.
                게시글의 표현 방식, 문화적 소비 패턴, 세대적 코드에서 프로필의 고유한 맥락을
                읽어냅니다.
              </p>
              <ul className="space-y-2">
                {[
                  "게시글 문체 분석 → 고유한 표현 스타일 파악",
                  "문화적 취향 패턴 → 세대·가치관 매핑",
                  "인터랙션 스타일 → 감정 표현 강도와 커뮤니케이션 선호 추론",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Architecture Callout */}
          <div className="mt-8 rounded-2xl border border-purple-100 bg-purple-50/50 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                <Layers className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="mb-2 font-bold text-gray-900">
                  프로파일링에서 페르소나 매칭까지의 여정
                </h4>
                <p className="text-sm text-gray-600">
                  수집된 3-Layer 벡터와 비정량적 신호는 통합 프로필로 구축됩니다. 이 프로필은 AI
                  페르소나의 프로필과 3단계 매칭(취향 유사도 → 심층 호환성 → 의외의 발견)을 거쳐,
                  &ldquo;왜 이 페르소나가 당신에게 맞는지&rdquo;를 설명할 수 있는 투명한 추천으로
                  이어집니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA → Next: Persona */}
      <section className="py-16">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6">
          <Link
            href="/features"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Features
          </Link>
          <Link
            href="/features/persona"
            className="ds-button inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
          >
            다음: AI 페르소나
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
