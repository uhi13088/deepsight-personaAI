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
} from "lucide-react"

export const metadata: Metadata = {
  title: "소비자 취향 분석 — Features",
  description:
    "3-Layer 16D 벡터 프로파일링, SNS 행동 데이터 분석, 3-Phase 24문항 온보딩으로 매칭 정확도를 지속 향상합니다.",
}

const VECTOR_DIMENSIONS = [
  {
    id: "depth",
    name: "Depth",
    label: "분석 깊이",
    low: "직관적",
    high: "심층적",
    description: "콘텐츠를 얼마나 깊이 분석하고 이해하려 하는지를 측정합니다.",
    example: "영화를 볼 때 감독의 의도, 상징성까지 파악하려 하는 정도",
    icon: Search,
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "lens",
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "감성적 vs 논리적 관점 중 어느 쪽에 가까운지 측정합니다.",
    example: "감동적 스토리를 중시하는지, 플롯의 논리적 일관성을 중시하는지",
    icon: Eye,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    id: "stance",
    name: "Stance",
    label: "평가 태도",
    low: "수용적",
    high: "비판적",
    description: "새로운 콘텐츠에 대해 수용적 vs 비판적 태도를 측정합니다.",
    example: "새로운 장르도 열린 마음으로 보는지, 엄격한 기준으로 평가하는지",
    icon: Compass,
    color: "from-amber-500 to-amber-600",
  },
  {
    id: "scope",
    name: "Scope",
    label: "관심 범위",
    low: "핵심만",
    high: "디테일",
    description: "핵심 정보만 선호하는지, 디테일한 정보까지 원하는지 측정합니다.",
    example: "한 줄 요약을 원하는지, 배우/OST/촬영기법까지 알고 싶은지",
    icon: Target,
    color: "from-red-500 to-red-600",
  },
  {
    id: "taste",
    name: "Taste",
    label: "취향 성향",
    low: "클래식",
    high: "실험적",
    description: "검증된 콘텐츠를 선호하는지, 새롭고 실험적인 것을 찾는지 측정합니다.",
    example: "톱10 인기작을 보는지, 인디/아트하우스 영화를 찾아보는지",
    icon: Palette,
    color: "from-violet-500 to-violet-600",
  },
  {
    id: "purpose",
    name: "Purpose",
    label: "소비 목적",
    low: "오락",
    high: "의미추구",
    description: "콘텐츠 소비 목적이 순수 오락인지, 의미와 메시지 추구인지 측정합니다.",
    example: "스트레스 해소용인지, 삶에 대한 인사이트를 얻고 싶은지",
    icon: Brain,
    color: "from-pink-500 to-pink-600",
  },
  {
    id: "sociability",
    name: "Sociability",
    label: "사회적 성향",
    low: "독립적",
    high: "사교적",
    description: "콘텐츠를 혼자 소비하는지, 함께 나누고 공유하는 것을 선호하는지 측정합니다.",
    example: "혼자 조용히 책을 읽는지, SNS에 감상평을 나누는지",
    icon: Share2,
    color: "from-indigo-500 to-indigo-600",
  },
]

const COLD_START_METHODS = [
  {
    icon: MessageSquare,
    title: "문답 방식",
    badge: "Quick Profile",
    badgeColor: "bg-purple-100 text-purple-600",
    description:
      "3-Phase 24문항 하이브리드 시나리오 질문으로 L1+L2 벡터를 동시 측정합니다. Phase별로 L1 주력, L2 주력, 교차 검증 구조로 약 4분 소요. 이탈 시 Phase 단위로 저장됩니다.",
    features: [
      "3-Phase 8+8+8 문항 (L1→L2→교차검증)",
      "하이브리드 시나리오: 4지선다 delta 적용",
      "이탈 시 Phase 단위 저장, 미완료만 리셋",
    ],
    accuracy: 2,
    speed: null,
  },
  {
    icon: Share2,
    title: "SNS 연동",
    badge: "Social Analysis",
    badgeColor: "bg-green-100 text-green-600",
    description:
      "8개 SNS 플랫폼의 행동 데이터를 2-Stage 최적화로 분석하여 3-Layer 벡터를 추론합니다. 실제 행동 데이터 기반이라 정확도가 높고, 질문 없이 즉시 프로필을 생성합니다.",
    features: [
      "실제 행동 데이터 기반 높은 정확도",
      "원시 데이터 저장 없이 벡터만 산출",
      "8개 플랫폼 지원 (Netflix, YouTube 등)",
    ],
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
    speed: null,
  },
]

const SNS_PLATFORMS = [
  {
    name: "Netflix",
    data: "시청 이력, 장르 선호, 시청 패턴",
    dimensions: "L1 depth · taste · purpose, L2 openness에 기여",
  },
  {
    name: "YouTube",
    data: "구독 채널, 시청 시간, 카테고리 분포",
    dimensions: "L1 lens · scope, L2 conscientiousness에 기여",
  },
  {
    name: "Instagram",
    data: "팔로우 계정, 관심사 태그, 인터랙션 패턴",
    dimensions: "L1 sociability · taste, L2 extraversion에 기여",
  },
  {
    name: "Spotify",
    data: "음악 취향, 플레이리스트, 장르 다양성",
    dimensions: "L1 taste · purpose, L2 openness에 기여",
  },
]

const ACCURACY_IMPROVEMENTS = [
  {
    icon: Activity,
    title: "행동 데이터 피드백 루프",
    description:
      "사용자가 추천 콘텐츠에 반응(좋아요, 스킵, 저장)할 때마다 3-Layer 벡터가 미세 보정됩니다. 사용할수록 프로필이 정교해집니다.",
  },
  {
    icon: RefreshCw,
    title: "다중 소스 교차 검증",
    description:
      "문답, SNS, 행동 데이터 3가지 소스를 교차 비교하여 각 차원의 확신도를 계산합니다. 확신도가 낮은 차원은 추가 데이터 수집을 유도합니다.",
  },
  {
    icon: TrendingUp,
    title: "시간 가중치 적용",
    description:
      "최근 행동에 더 높은 가중치를 적용하여 변화하는 취향을 실시간 반영합니다. 3개월 전 데이터보다 어제의 행동이 더 큰 영향을 미칩니다.",
  },
  {
    icon: Fingerprint,
    title: "프로필 품질 레벨",
    description:
      "STARTER → STANDARD → ADVANCED → EXPERT 4단계로 프로필 품질을 관리합니다. 데이터가 누적될수록 자동으로 레벨업되며 매칭 정확도가 향상됩니다.",
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
            3-Layer 벡터 시스템으로 사용자의 콘텐츠 소비 성향을 L1(7D) · L2(5D) · L3(4D) 총
            16차원으로 심층 분석합니다. 3-Phase 24문항 온보딩, SNS 행동 데이터, 누적 피드백을
            결합하여 사용할수록 정확해지는 프로필을 만듭니다.
          </p>
        </div>
      </section>

      {/* 6D Vector System */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              L1 SOCIAL PERSONA — 7D VECTOR
            </div>
            <h2 className="text-3xl font-bold text-gray-900">7개 차원으로 소비 성향을 정량화</h2>
            <p className="mt-4 text-gray-600">
              사용자의 콘텐츠 소비 성향을 L1 Social Persona 7개 독립 차원으로 분석합니다.
              <br />각 차원은 0.0~1.0 범위의 벡터값으로, 확신도와 함께 관리됩니다.
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
                <p className="mb-3 text-sm font-medium text-purple-600">{dim.label}</p>
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

      {/* SNS 행동 데이터 분석 */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              SNS BEHAVIORAL ANALYSIS
            </div>
            <h2 className="text-3xl font-bold text-gray-900">SNS 행동 데이터 기반 분석</h2>
            <p className="mt-4 text-gray-600">
              사용자가 이미 사용 중인 서비스의 행동 데이터를 분석하여
              <br />
              질문 없이도 정확한 3-Layer 벡터 프로필을 즉시 생성합니다.
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
                <p className="text-xs text-purple-500">{platform.dimensions}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-purple-600">0개</div>
                <p className="text-sm text-gray-600">원시 데이터 저장</p>
                <p className="text-xs text-gray-400">벡터값만 산출, 원본 미보관</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-purple-600">즉시</div>
                <p className="text-sm text-gray-600">프로필 생성 속도</p>
                <p className="text-xs text-gray-400">OAuth 동의 후 즉시 분석</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-purple-600">교차 검증</div>
                <p className="text-sm text-gray-600">다중 플랫폼 결합</p>
                <p className="text-xs text-gray-400">플랫폼 2개 이상 시 확신도 상승</p>
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
            <h2 className="text-3xl font-bold text-gray-900">콜드스타트, 3가지 방법으로 해결</h2>
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
                      속도: {method.speed}
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
                  accuracy: "60%",
                  source: "3-Phase 온보딩 (Phase 1)",
                },
                {
                  stage: "STANDARD",
                  time: "1주일 후",
                  accuracy: "75%",
                  source: "+SNS 연동 or 행동 데이터",
                },
                {
                  stage: "ADVANCED",
                  time: "1개월 후",
                  accuracy: "88%",
                  source: "+누적 피드백 + 데일리 마이크로 질문",
                },
                {
                  stage: "EXPERT",
                  time: "3개월 후",
                  accuracy: "95%+",
                  source: "+다중 소스 교차 검증 완료",
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
