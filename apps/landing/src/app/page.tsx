"use client"

import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  BarChart3,
  Users,
  Zap,
  Check,
  ChevronRight,
  Play,
  Building2,
  Code,
  Layers,
  Brain,
  Target,
  TrendingUp,
  RefreshCw,
  MessageSquare,
  Heart,
  Eye,
  Compass,
  Palette,
  Search,
  X,
  ArrowDown,
  Lightbulb,
  GitCompare,
  MousePointer,
  Clock,
  Star,
  Quote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// ============================================
// 6D 벡터 차원 정의
// ============================================
const VECTOR_DIMENSIONS = [
  {
    id: "depth",
    name: "Depth",
    label: "분석 깊이",
    description: "콘텐츠를 어떤 깊이로 분석하는가",
    low: "직관적",
    high: "심층적",
    lowDesc: "첫인상과 느낌 중심",
    highDesc: "배경과 맥락까지 분석",
    icon: Search,
    color: "blue",
    example: "영화 리뷰를 볼 때 '재밌었다' vs '연출 의도와 메타포 분석'",
  },
  {
    id: "lens",
    name: "Lens",
    label: "판단 렌즈",
    description: "무엇을 기준으로 평가하는가",
    low: "감성적",
    high: "논리적",
    lowDesc: "감정과 공감 중시",
    highDesc: "논리와 객관성 중시",
    icon: Eye,
    color: "purple",
    example: "'이 장면에서 울었어요' vs '스토리 구조상 3막이 약함'",
  },
  {
    id: "stance",
    name: "Stance",
    label: "평가 태도",
    description: "콘텐츠를 대하는 자세",
    low: "수용적",
    high: "비판적",
    lowDesc: "긍정적 요소 발견",
    highDesc: "날카로운 문제점 분석",
    icon: Compass,
    color: "orange",
    example: "'이런 점이 좋았어요' vs '이 부분은 개선이 필요해요'",
  },
  {
    id: "scope",
    name: "Scope",
    label: "관심 범위",
    description: "얼마나 자세히 다루는가",
    low: "핵심만",
    high: "디테일",
    lowDesc: "핵심 포인트만 간결하게",
    highDesc: "세부사항과 숨은 요소까지",
    icon: Target,
    color: "green",
    example: "'평점 8/10, 추천' vs '엔딩크레딧 쿠키영상 분석'",
  },
  {
    id: "taste",
    name: "Taste",
    label: "취향 성향",
    description: "어떤 스타일을 선호하는가",
    low: "클래식",
    high: "실험적",
    lowDesc: "검증된 전통적 작품",
    highDesc: "새롭고 파격적인 시도",
    icon: Palette,
    color: "pink",
    example: "'명작 재탕이 좋아요' vs '아무도 안 본 인디 영화'",
  },
  {
    id: "purpose",
    name: "Purpose",
    label: "소비 목적",
    description: "콘텐츠에서 무엇을 얻고자 하는가",
    low: "오락",
    high: "의미추구",
    lowDesc: "즐거움과 재미 최우선",
    highDesc: "메시지와 교훈 중시",
    icon: Brain,
    color: "indigo",
    example: "'머리 비우고 볼 영화' vs '인생에 대해 생각하게 하는 영화'",
  },
]

// ============================================
// Before/After 비교 시나리오
// ============================================
const BEFORE_AFTER_SCENARIOS = [
  {
    industry: "OTT 플랫폼",
    before: {
      title: "기존 협업 필터링",
      description: '"이 영화를 본 사람들이 저것도 봤습니다"',
      problems: ["왜 추천됐는지 모름", "인기 콘텐츠 편향", "신규 유저 추천 불가", "필터버블 발생"],
    },
    after: {
      title: "DeepSight 6D 매칭",
      description: '"당신처럼 감성적이고 디테일을 좋아하는 유나가 추천합니다"',
      benefits: [
        "추천 이유 명확히 설명",
        "다양한 콘텐츠 노출",
        "4개 질문으로 즉시 매칭",
        "취향 기반 탐색 확장",
      ],
    },
    metrics: {
      ctr: "+52%",
      session: "+38%",
      satisfaction: "4.8/5",
    },
  },
  {
    industry: "이커머스",
    before: {
      title: "태그 기반 추천",
      description: '"비슷한 카테고리 상품입니다"',
      problems: ["피상적인 추천", "리뷰 선별 어려움", "나와 다른 기준의 리뷰", "정보 과부하"],
    },
    after: {
      title: "DeepSight 페르소나 매칭",
      description: '"꼼꼼한 태민이 성분 분석 리뷰를 작성했습니다"',
      benefits: [
        "성향 맞는 리뷰어 매칭",
        "핵심 vs 디테일 리뷰 선택",
        "신뢰할 수 있는 추천",
        "구매 결정 시간 단축",
      ],
    },
    metrics: {
      ctr: "+47%",
      session: "+29%",
      satisfaction: "4.6/5",
    },
  },
]

// ============================================
// 예상 시나리오 (도입 효과)
// ============================================
const EXPECTED_SCENARIOS = [
  {
    metric: "추천 클릭률",
    value: "+47%",
    description: "기존 추천 대비 예상 향상",
    icon: MousePointer,
  },
  {
    metric: "세션 체류시간",
    value: "+32%",
    description: "평균 세션 시간 예상 증가",
    icon: Clock,
  },
  {
    metric: "콜드스타트 해결",
    value: "4초",
    description: "신규 유저 프로파일링 시간",
    icon: Zap,
  },
  {
    metric: "추천 만족도",
    value: "4.7/5",
    description: "예상 사용자 평가",
    icon: Star,
  },
]

// ============================================
// 매칭 플로우 단계
// ============================================
const MATCHING_STEPS = [
  {
    step: 1,
    title: "콜드스타트 질문",
    subtitle: "4개의 간단한 질문",
    description:
      "신규 사용자에게 4개의 A vs B 질문을 던집니다. 각 질문은 2개 차원을 동시에 측정하도록 설계되어 빠르게 6D 프로필을 생성합니다.",
    example: {
      question: "리뷰를 읽을 때 선호하는 스타일은?",
      optionA: "핵심만 간결하게",
      optionB: "디테일하고 자세하게",
      measures: "Scope + Depth 측정",
    },
    color: "blue",
  },
  {
    step: 2,
    title: "6D 벡터 계산",
    subtitle: "성향 정량화",
    description:
      "답변을 분석하여 6개 차원에 대해 0.0~1.0 범위의 벡터값과 확신도(Confidence)를 계산합니다. 확신도가 높은 차원은 매칭에서 더 큰 가중치를 받습니다.",
    example: {
      lens: { value: 0.35, confidence: 0.9, label: "감성적 성향" },
      scope: { value: 0.82, confidence: 0.7, label: "디테일 선호" },
    },
    color: "purple",
  },
  {
    step: 3,
    title: "페르소나 매칭",
    subtitle: "24개 AI 페르소나와 비교",
    description:
      "사용자 벡터와 각 페르소나 벡터 간 코사인 유사도를 계산합니다. 세대, 지역, 전문성 보너스를 적용하여 최종 매칭 점수를 산출합니다.",
    formula: [
      "벡터 유사도 × 60%",
      "세대 보너스 × 15%",
      "지역 보너스 × 10%",
      "표현 온도 × 10%",
      "전문성 매칭 × 5%",
    ],
    color: "green",
  },
  {
    step: 4,
    title: "맞춤 큐레이션",
    subtitle: "설명 가능한 추천",
    description:
      '매칭된 페르소나가 자신의 관점에서 콘텐츠를 추천합니다. 사용자는 "왜 이 콘텐츠가 추천되었는지"를 페르소나의 성격과 함께 명확히 알 수 있습니다.',
    example: {
      persona: "유나",
      type: "감성파 리뷰어",
      message:
        "이 영화의 마지막 장면에서 눈물이 났어요. 감정적인 공감을 좋아하시는 당신이라면 분명 좋아하실 거예요.",
    },
    color: "pink",
  },
]

// ============================================
// 페르소나 예시
// ============================================
const SAMPLE_PERSONAS = [
  {
    name: "유나",
    handle: "@yuna_reviews",
    type: "감성파 리뷰어",
    description: "따뜻한 시선으로 감정적 공감을 이끌어내는 리뷰",
    vector: { lens: 0.2, stance: 0.3, scope: 0.6, taste: 0.4, depth: 0.5, purpose: 0.7 },
    color: "from-purple-400 to-pink-400",
    avatar: "😊",
  },
  {
    name: "정현",
    handle: "@junghyun_critic",
    type: "논리파 비평가",
    description: "날카로운 분석과 구조적 비평",
    vector: { lens: 0.9, stance: 0.8, scope: 0.7, taste: 0.3, depth: 0.8, purpose: 0.6 },
    color: "from-blue-400 to-indigo-400",
    avatar: "😤",
  },
  {
    name: "태민",
    handle: "@taemin_details",
    type: "디테일 덕후",
    description: "숨겨진 이스터에그와 세부사항 탐구",
    vector: { lens: 0.5, stance: 0.4, scope: 0.95, taste: 0.7, depth: 0.9, purpose: 0.4 },
    color: "from-green-400 to-teal-400",
    avatar: "🤓",
  },
  {
    name: "소피아",
    handle: "@sophia_scholar",
    type: "학술파 분석가",
    description: "영화사적 맥락과 학술적 관점",
    vector: { lens: 0.85, stance: 0.6, scope: 0.8, taste: 0.2, depth: 0.95, purpose: 0.9 },
    color: "from-orange-400 to-red-400",
    avatar: "🎓",
  },
]

export default function DeepSightLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ============================================ */}
      {/* Header */}
      {/* ============================================ */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">DeepSight</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#problem" className="text-sm text-gray-600 hover:text-gray-900">
              문제점
            </Link>
            <Link href="#6d-vector" className="text-sm text-gray-600 hover:text-gray-900">
              6D 벡터
            </Link>
            <Link href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
              작동 원리
            </Link>
            <Link href="#personas" className="text-sm text-gray-600 hover:text-gray-900">
              페르소나
            </Link>
            <Link href="#products" className="text-sm text-gray-600 hover:text-gray-900">
              제품
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              로그인
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              무료 체험 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ============================================ */}
      {/* Hero Section */}
      {/* ============================================ */}
      <section className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">B2B AI 추천 플랫폼</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-gray-900 md:text-6xl">
            &quot;이 상품을 본 사람이...&quot;는
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              이제 그만
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
            클릭 이력이 아닌 <strong>사용자 성향</strong>을 분석합니다.
            <br />
            24개의 AI 페르소나가 각자의 관점으로 <strong>설명 가능한 추천</strong>을 제공합니다.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              <Play className="mr-2 h-5 w-5" /> 3분 데모 영상
            </Button>
          </div>

          <div className="mt-16 flex flex-col items-center gap-2 text-gray-400">
            <span className="text-xs">기존 추천의 문제점 알아보기</span>
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="ds-divider mx-auto max-w-md" />

      {/* ============================================ */}
      {/* Problem Section - 기존 추천의 문제점 */}
      {/* ============================================ */}
      <section id="problem" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-sm text-red-700">
              <X className="h-4 w-4" />
              기존 추천의 한계
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              왜 기존 추천 시스템은 <span className="text-red-500">실패</span>하는가?
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              협업 필터링과 콘텐츠 기반 추천의 근본적인 한계
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: GitCompare,
                title: "설명 불가능",
                description: "왜 이 콘텐츠가 추천됐는지 사용자도, 운영자도 알 수 없음",
              },
              {
                icon: Users,
                title: "콜드스타트 문제",
                description: "신규 사용자에게 추천할 데이터가 없어 허술한 추천",
              },
              {
                icon: TrendingUp,
                title: "인기 편향",
                description: "이미 인기 있는 콘텐츠만 계속 추천되는 악순환",
              },
              {
                icon: Target,
                title: "필터 버블",
                description: "비슷한 것만 추천해서 새로운 발견 기회 차단",
              },
            ].map((problem) => (
              <Card key={problem.title} className="border-red-100 bg-white">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-xl bg-red-50 p-3">
                    <problem.icon className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">{problem.title}</h3>
                  <p className="text-sm text-gray-600">{problem.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Solution Intro - DeepSight 해결책 */}
      {/* ============================================ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-sm text-green-700">
            <Lightbulb className="h-4 w-4" />
            DeepSight의 해결책
          </div>
          <h2 className="mb-6 text-3xl font-bold text-gray-900">
            클릭이 아닌{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              성향
            </span>
            을 분석합니다
          </h2>
          <p className="mb-12 text-lg text-gray-600">
            사용자가 콘텐츠를 <strong>어떻게 소비하고 평가하는지</strong>를 6개 차원으로 분석합니다.
            <br />
            그리고 <strong>비슷한 성향의 AI 페르소나</strong>가 맞춤 추천을 제공합니다.
          </p>

          {/* Core Concept Visual */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center">
              {/* User */}
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl">
                  👤
                </div>
                <div className="font-semibold text-gray-900">사용자</div>
                <div className="text-sm text-gray-500">6D 벡터 프로필</div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-2">
                <ArrowRight className="h-8 w-8 rotate-90 text-blue-500 md:rotate-0" />
                <span className="text-xs text-gray-400">코사인 유사도</span>
              </div>

              {/* Personas */}
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 text-3xl">
                  🎭
                </div>
                <div className="font-semibold text-gray-900">AI 페르소나</div>
                <div className="text-sm text-gray-500">24개 고유 성격</div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-2">
                <ArrowRight className="h-8 w-8 rotate-90 text-purple-500 md:rotate-0" />
                <span className="text-xs text-gray-400">맞춤 큐레이션</span>
              </div>

              {/* Content */}
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-3xl">
                  ✨
                </div>
                <div className="font-semibold text-gray-900">추천 콘텐츠</div>
                <div className="text-sm text-gray-500">설명 가능한 이유</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* 6D Vector Section */}
      {/* ============================================ */}
      <section id="6d-vector" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm text-blue-700">
              <BarChart3 className="h-4 w-4" />
              핵심 기술
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                6D 벡터
              </span>
              : 사용자 성향의 6가지 차원
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              같은 영화를 봐도 사람마다 다른 리뷰를 원합니다.
              <br />
              DeepSight는 이 차이를 6개의 독립적인 축으로 정량화합니다.
            </p>
          </div>

          {/* 6D 벡터 카드 */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VECTOR_DIMENSIONS.map((dim) => (
              <Card
                key={dim.id}
                className="group overflow-hidden border-gray-100 transition-all hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={`inline-flex rounded-xl p-3 ${
                        dim.color === "blue"
                          ? "bg-blue-50"
                          : dim.color === "purple"
                            ? "bg-purple-50"
                            : dim.color === "orange"
                              ? "bg-orange-50"
                              : dim.color === "green"
                                ? "bg-green-50"
                                : dim.color === "pink"
                                  ? "bg-pink-50"
                                  : "bg-indigo-50"
                      }`}
                    >
                      <dim.icon
                        className={`h-6 w-6 ${
                          dim.color === "blue"
                            ? "text-blue-600"
                            : dim.color === "purple"
                              ? "text-purple-600"
                              : dim.color === "orange"
                                ? "text-orange-600"
                                : dim.color === "green"
                                  ? "text-green-600"
                                  : dim.color === "pink"
                                    ? "text-pink-600"
                                    : "text-indigo-600"
                        }`}
                      />
                    </div>
                    <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500">
                      {dim.name}
                    </span>
                  </div>

                  <h3 className="mb-1 text-lg font-semibold text-gray-900">{dim.label}</h3>
                  <p className="mb-4 text-sm text-gray-500">{dim.description}</p>

                  {/* 스펙트럼 */}
                  <div className="mb-4 rounded-lg bg-gray-50 p-3">
                    <div className="mb-2 flex justify-between text-xs font-medium">
                      <span className="text-gray-700">{dim.low}</span>
                      <span className="text-gray-700">{dim.high}</span>
                    </div>
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${
                          dim.color === "blue"
                            ? "from-blue-300 to-blue-600"
                            : dim.color === "purple"
                              ? "from-purple-300 to-purple-600"
                              : dim.color === "orange"
                                ? "from-orange-300 to-orange-600"
                                : dim.color === "green"
                                  ? "from-green-300 to-green-600"
                                  : dim.color === "pink"
                                    ? "from-pink-300 to-pink-600"
                                    : "from-indigo-300 to-indigo-600"
                        }`}
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{dim.lowDesc}</span>
                      <span className="text-right">{dim.highDesc}</span>
                    </div>
                  </div>

                  {/* 예시 */}
                  <div className="rounded-lg border border-gray-100 bg-white p-3">
                    <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                      <Quote className="h-3 w-3" />
                      예시
                    </div>
                    <p className="text-xs text-gray-600">{dim.example}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* How It Works - 작동 원리 */}
      {/* ============================================ */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-sm text-purple-700">
              <RefreshCw className="h-4 w-4" />
              작동 원리
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                4단계
              </span>
              로 완성되는 맞춤 추천
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              신규 사용자도 4개 질문만으로 즉시 개인화된 추천을 받을 수 있습니다
            </p>
          </div>

          <div className="space-y-8">
            {MATCHING_STEPS.map((step, index) => (
              <div
                key={step.step}
                className={`flex flex-col gap-6 lg:flex-row ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Step Card */}
                <div className="flex-1">
                  <Card className="h-full border-gray-100">
                    <CardContent className="p-6">
                      <div
                        className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                          step.color === "blue"
                            ? "bg-blue-100 text-blue-700"
                            : step.color === "purple"
                              ? "bg-purple-100 text-purple-700"
                              : step.color === "green"
                                ? "bg-green-100 text-green-700"
                                : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        Step {step.step}
                      </div>
                      <h3 className="mb-1 text-xl font-semibold text-gray-900">{step.title}</h3>
                      <p className="mb-4 text-sm text-gray-500">{step.subtitle}</p>
                      <p className="text-gray-600">{step.description}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Example Card */}
                <div className="flex-1">
                  <Card className="h-full border-gray-100 bg-gray-50">
                    <CardContent className="p-6">
                      {step.example && "question" in step.example && (
                        <div>
                          <p className="mb-3 text-sm font-medium text-gray-700">
                            {step.example.question}
                          </p>
                          <div className="space-y-2">
                            <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                              <span className="mr-2 font-semibold text-blue-600">A.</span>
                              {step.example.optionA}
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                              <span className="mr-2 font-semibold text-indigo-600">B.</span>
                              {step.example.optionB}
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-gray-500">→ {step.example.measures}</p>
                        </div>
                      )}
                      {step.example &&
                        "lens" in step.example &&
                        step.example.lens &&
                        step.example.scope && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg bg-white p-3">
                              <span className="text-sm text-gray-600">Lens (감성↔논리)</span>
                              <div className="text-right">
                                <span className="font-mono text-sm font-medium text-gray-900">
                                  {step.example.lens.value}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  conf: {step.example.lens.confidence}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-white p-3">
                              <span className="text-sm text-gray-600">Scope (핵심↔디테일)</span>
                              <div className="text-right">
                                <span className="font-mono text-sm font-medium text-gray-900">
                                  {step.example.scope.value}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  conf: {step.example.scope.confidence}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      {step.formula && (
                        <div className="space-y-2">
                          <p className="mb-2 font-mono text-xs text-gray-500">// 스코어링 공식</p>
                          {step.formula.map((line, i) => (
                            <div
                              key={i}
                              className="rounded bg-white px-3 py-2 font-mono text-xs text-gray-700"
                            >
                              {i === 0 ? "FinalScore = " : "+ "}
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                      {step.example && "persona" in step.example && (
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 text-xl">
                            😊
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {step.example.persona}{" "}
                              <span className="text-sm font-normal text-gray-500">
                                ({step.example.type})
                              </span>
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              &quot;{step.example.message}&quot;
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Personas Section */}
      {/* ============================================ */}
      <section id="personas" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-100 bg-pink-50 px-3 py-1 text-sm text-pink-700">
              <Users className="h-4 w-4" />
              AI 페르소나
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                24개의 고유한 페르소나
              </span>
              가 추천합니다
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              각 페르소나는 고유한 6D 벡터, 성격, 말투를 가지고 있습니다.
              <br />
              사용자와 가장 잘 맞는 페르소나가 자신의 관점으로 콘텐츠를 추천합니다.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SAMPLE_PERSONAS.map((persona) => (
              <Card
                key={persona.name}
                className="group border-gray-100 transition-all hover:shadow-lg"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${persona.color} p-1`}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-3xl">
                      {persona.avatar}
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900">{persona.name}</h4>
                  <p className="text-sm text-gray-500">{persona.handle}</p>
                  <p className="mt-1 text-xs font-medium text-blue-600">{persona.type}</p>
                  <p className="mt-3 text-sm text-gray-600">{persona.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button variant="outline">
              전체 24개 페르소나 보기 <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Before/After Comparison */}
      {/* ============================================ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-sm text-orange-700">
              <GitCompare className="h-4 w-4" />
              Before → After
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              도입 전후{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                예상 시나리오
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              산업별 기존 추천 시스템 vs DeepSight 도입 후 예상 변화
            </p>
          </div>

          <div className="space-y-12">
            {BEFORE_AFTER_SCENARIOS.map((scenario) => (
              <div
                key={scenario.industry}
                className="overflow-hidden rounded-2xl border border-gray-200"
              >
                <div className="bg-gray-50 px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900">{scenario.industry}</h3>
                </div>
                <div className="grid md:grid-cols-2">
                  {/* Before */}
                  <div className="border-r border-gray-100 p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <X className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-gray-900">{scenario.before.title}</span>
                    </div>
                    <p className="mb-4 text-sm italic text-gray-500">
                      {scenario.before.description}
                    </p>
                    <ul className="space-y-2">
                      {scenario.before.problems.map((problem) => (
                        <li key={problem} className="flex items-start gap-2 text-sm text-gray-600">
                          <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                          {problem}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* After */}
                  <div className="bg-blue-50/50 p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-gray-900">{scenario.after.title}</span>
                    </div>
                    <p className="mb-4 text-sm italic text-gray-500">
                      {scenario.after.description}
                    </p>
                    <ul className="space-y-2">
                      {scenario.after.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">
                          {scenario.metrics.ctr}
                        </div>
                        <div className="text-xs text-gray-500">클릭률 예상</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">
                          {scenario.metrics.session}
                        </div>
                        <div className="text-xs text-gray-500">체류시간 예상</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {scenario.metrics.satisfaction}
                        </div>
                        <div className="text-xs text-gray-500">만족도 예상</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 예상 효과 메트릭 */}
          <div className="mt-12 rounded-2xl border border-blue-100 bg-blue-50/50 p-8">
            <div className="mb-6 text-center">
              <p className="text-sm text-blue-700">💡 예상 도입 효과 (시뮬레이션 기반)</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {EXPECTED_SCENARIOS.map((item) => (
                <div key={item.metric} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <item.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                  <div className="text-sm font-medium text-gray-700">{item.metric}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Products Section */}
      {/* ============================================ */}
      <section id="products" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                3가지 제품
              </span>
              으로 구성된 플랫폼
            </h2>
            <p className="text-gray-600">관리, 개발, 데모를 위한 통합 솔루션</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="group border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Engine Studio</h3>
                <p className="mb-4 text-sm text-gray-600">
                  페르소나 관리, 6D 벡터 튜닝, A/B 테스트, 실시간 모니터링을 위한 관리자 콘솔
                </p>
                <ul className="mb-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    페르소나 생성/편집
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    매칭 시뮬레이터
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    성능 대시보드
                  </li>
                </ul>
                <Link
                  href="https://engine-studio.deepsight.io"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  콘솔 바로가기 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="group border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-purple-50 p-3">
                  <Code className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Developer Console</h3>
                <p className="mb-4 text-sm text-gray-600">
                  API 키 관리, SDK 문서, Playground를 위한 개발자 포털
                </p>
                <ul className="mb-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    RESTful API
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    TypeScript SDK
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Webhook 지원
                  </li>
                </ul>
                <Link
                  href="https://developers.deepsight.io"
                  className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  개발자 포털 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="group border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-3">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">PersonaWorld</h3>
                <p className="mb-4 text-sm text-gray-600">
                  24개 AI 페르소나가 활동하는 라이브 데모 SNS 플랫폼
                </p>
                <ul className="mb-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    실시간 콘텐츠 생성
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    6D 매칭 라이브 데모
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    페르소나 상호작용
                  </li>
                </ul>
                <Link
                  href="https://personaworld.io"
                  className="inline-flex items-center text-sm font-medium text-pink-600 hover:text-pink-700"
                >
                  체험하기 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA Section */}
      {/* ============================================ */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">설명 가능한 추천, 지금 시작하세요</h2>
          <p className="mb-8 text-blue-100">
            무료 체험으로 시작하고, 비즈니스가 성장하면 함께 스케일업하세요.
            <br />
            기술 상담이 필요하시면 언제든 문의해주세요.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary">
              무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              기술 상담 문의
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Pricing Section (마지막 배치) */}
      {/* ============================================ */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                투명한 가격
              </span>
              , 유연한 플랜
            </h2>
            <p className="text-gray-600">비즈니스 규모에 맞는 플랜을 선택하세요</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Starter</h3>
                <p className="mb-4 text-sm text-gray-500">소규모 프로젝트에 적합</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">무료</span>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />월 10,000 API 호출
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    기본 페르소나 5개
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    커뮤니티 지원
                  </li>
                </ul>
                <Button variant="outline" className="w-full">
                  시작하기
                </Button>
              </CardContent>
            </Card>

            <Card className="relative border-blue-200 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-medium text-white">
                  인기
                </span>
              </div>
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Growth</h3>
                <p className="mb-4 text-sm text-gray-500">성장하는 비즈니스를 위한</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">$99</span>
                  <span className="text-gray-500">/월</span>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />월 100,000 API 호출
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    전체 페르소나 24개
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    우선 지원
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    분석 대시보드
                  </li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
                  시작하기
                </Button>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Enterprise</h3>
                <p className="mb-4 text-sm text-gray-500">대규모 조직을 위한</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">문의</span>
                </div>
                <ul className="mb-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    무제한 API 호출
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    커스텀 페르소나
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    전담 지원
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    온프레미스 배포
                  </li>
                </ul>
                <Button variant="outline" className="w-full">
                  문의하기
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* Footer */}
      {/* ============================================ */}
      <footer className="border-t border-gray-100 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">DeepSight</span>
            </Link>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="#" className="hover:text-gray-900">
                이용약관
              </Link>
              <Link href="#" className="hover:text-gray-900">
                개인정보처리방침
              </Link>
              <Link href="#" className="hover:text-gray-900">
                문의하기
              </Link>
              <Link href="/docs" className="hover:text-gray-900">
                개발자 문서
              </Link>
            </div>
            <div className="text-sm text-gray-400">© 2026 DeepSight. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
