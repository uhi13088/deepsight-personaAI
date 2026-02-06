"use client"

import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  BarChart3,
  Users,
  Zap,
  Shield,
  Globe,
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// 6D 벡터 차원 정의
const VECTOR_DIMENSIONS = [
  {
    id: "depth",
    name: "Depth",
    label: "분석 깊이",
    description: "콘텐츠를 어떤 깊이로 분석하는가",
    low: "직관적",
    high: "심층적",
    lowDesc: "첫인상과 느낌 중심으로 빠르게 판단",
    highDesc: "배경지식과 맥락까지 깊이 파고듦",
    icon: Search,
    color: "blue",
  },
  {
    id: "lens",
    name: "Lens",
    label: "판단 렌즈",
    description: "무엇을 기준으로 평가하는가",
    low: "감성적",
    high: "논리적",
    lowDesc: "감정, 공감, 분위기를 중시",
    highDesc: "논리, 구조, 객관적 기준을 중시",
    icon: Eye,
    color: "purple",
  },
  {
    id: "stance",
    name: "Stance",
    label: "평가 태도",
    description: "콘텐츠를 대하는 자세",
    low: "수용적",
    high: "비판적",
    lowDesc: "열린 마음으로 긍정적 요소 발견",
    highDesc: "날카롭게 문제점을 분석하고 평가",
    icon: Compass,
    color: "orange",
  },
  {
    id: "scope",
    name: "Scope",
    label: "관심 범위",
    description: "얼마나 자세히 다루는가",
    low: "핵심만",
    high: "디테일",
    lowDesc: "핵심 포인트만 간결하게",
    highDesc: "세부사항과 숨은 요소까지 탐구",
    icon: Target,
    color: "green",
  },
  {
    id: "taste",
    name: "Taste",
    label: "취향 성향",
    description: "어떤 스타일의 콘텐츠를 선호하는가",
    low: "클래식",
    high: "실험적",
    lowDesc: "검증된 전통적인 것을 선호",
    highDesc: "새롭고 파격적인 시도를 선호",
    icon: Palette,
    color: "pink",
  },
  {
    id: "purpose",
    name: "Purpose",
    label: "소비 목적",
    description: "콘텐츠에서 무엇을 얻고자 하는가",
    low: "오락",
    high: "의미추구",
    lowDesc: "즐거움과 재미가 최우선",
    highDesc: "메시지와 교훈을 중시",
    icon: Brain,
    color: "indigo",
  },
]

// 기존 추천 vs DeepSight 비교
const COMPARISON_DATA = [
  {
    aspect: "분석 대상",
    traditional: "콘텐츠 메타데이터 (장르, 태그)",
    deepsight: "사용자 성향 + 콘텐츠 특성",
  },
  {
    aspect: "추천 근거",
    traditional: "이 콘텐츠를 본 사람이 저것도 봤음",
    deepsight: "당신과 취향이 맞는 페르소나가 추천함",
  },
  {
    aspect: "설명 가능성",
    traditional: "왜 추천했는지 알기 어려움",
    deepsight: "6D 벡터로 명확한 이유 제공",
  },
  {
    aspect: "콜드스타트",
    traditional: "신규 유저 추천 어려움",
    deepsight: "4개 질문으로 즉시 매칭 가능",
  },
  {
    aspect: "개인화 수준",
    traditional: "단순한 선호도 반영",
    deepsight: "6차원 성향 + 세대/문화 반영",
  },
]

// 도입 효과 데이터
const IMPACT_METRICS = [
  {
    metric: "클릭률 향상",
    value: "+47%",
    description: "기존 추천 대비",
    icon: TrendingUp,
  },
  {
    metric: "체류 시간 증가",
    value: "+32%",
    description: "평균 세션 시간",
    icon: RefreshCw,
  },
  {
    metric: "콜드스타트 해결",
    value: "4초",
    description: "신규 유저 프로파일링",
    icon: Zap,
  },
  {
    metric: "추천 만족도",
    value: "4.7/5",
    description: "사용자 평가",
    icon: Heart,
  },
]

export default function DeepSightLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">DeepSight</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#6d-vector" className="text-sm text-gray-600 hover:text-gray-900">
              6D 벡터
            </Link>
            <Link href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
              작동 원리
            </Link>
            <Link href="#comparison" className="text-sm text-gray-600 hover:text-gray-900">
              기존 추천 비교
            </Link>
            <Link href="#products" className="text-sm text-gray-600 hover:text-gray-900">
              제품
            </Link>
            <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
              가격
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              로그인
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              무료 시작 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600">AI 페르소나 기반 추천 플랫폼</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-gray-900 md:text-6xl">
            단순 클릭이 아닌
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              성향을 이해하는 추천
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
            사용자의 취향을 6개 차원으로 분석하고, 24개의 AI 페르소나가 각자의 관점에서 콘텐츠를
            큐레이션합니다. &quot;이 상품을 본 사람이 저것도 봤습니다&quot;를 넘어, &quot;당신과
            비슷한 성향의 전문가가 이것을 추천합니다&quot;로.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              무료로 시작하기 <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              <Play className="mr-2 h-5 w-5" /> 3분 데모 보기
            </Button>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-16 flex flex-col items-center gap-2 text-gray-400">
            <span className="text-xs">더 알아보기</span>
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="mx-auto h-px max-w-md bg-gradient-to-r from-transparent via-blue-300 to-transparent" />

      {/* 6D Vector Section - 핵심 설명 */}
      <section id="6d-vector" className="px-6 py-24">
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
              란 무엇인가요?
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              사람마다 콘텐츠를 평가하는 기준이 다릅니다.
              <br />
              DeepSight는 이 차이를 6개의 독립적인 축으로 정량화합니다.
            </p>
          </div>

          {/* 6D 벡터 카드 그리드 */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VECTOR_DIMENSIONS.map((dim) => (
              <Card
                key={dim.id}
                className="group overflow-hidden border-gray-100 transition-all hover:shadow-lg"
              >
                <CardContent className="p-6">
                  {/* 헤더 */}
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

                  {/* 제목 */}
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">{dim.label}</h3>
                  <p className="mb-4 text-sm text-gray-500">{dim.description}</p>

                  {/* 스펙트럼 */}
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{dim.low}</span>
                      <span className="font-medium text-gray-700">{dim.high}</span>
                    </div>
                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-200">
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
                      <span className="max-w-[45%]">{dim.lowDesc}</span>
                      <span className="max-w-[45%] text-right">{dim.highDesc}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 벡터 시각화 설명 */}
          <div className="mt-12 rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <div className="flex flex-col items-center gap-8 md:flex-row">
              {/* 레이더 차트 플레이스홀더 */}
              <div className="flex-shrink-0">
                <div className="flex h-48 w-48 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white">
                  <div className="text-center">
                    <BarChart3 className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      레이더 차트
                      <br />
                      시각화 영역
                    </span>
                  </div>
                </div>
              </div>
              {/* 설명 */}
              <div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  모든 사용자는 고유한 6D 프로필을 가집니다
                </h3>
                <p className="mb-4 text-gray-600">
                  예를 들어, 감성적이고(Lens 0.2) 비판적이며(Stance 0.8) 디테일을 좋아하는(Scope
                  0.9) 사용자는 같은 영화를 봐도 전혀 다른 리뷰를 원합니다. DeepSight는 이 차이를
                  이해하고, 각 사용자에게 맞는 페르소나를 매칭합니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                    코사인 유사도 매칭
                  </span>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700">
                    Confidence 가중치
                  </span>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                    실시간 업데이트
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - 작동 원리 */}
      <section id="how-it-works" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-sm text-purple-700">
              <RefreshCw className="h-4 w-4" />
              작동 원리
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              어떻게{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                매칭
              </span>
              이 이루어지나요?
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              사용자의 6D 벡터와 페르소나의 6D 벡터를 비교하여 가장 잘 맞는 페르소나를 찾습니다
            </p>
          </div>

          {/* 스텝 플로우 */}
          <div className="relative">
            {/* 연결선 */}
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-blue-200 via-purple-200 to-pink-200 lg:block" />

            <div className="space-y-12 lg:space-y-0">
              {/* Step 1: 사용자 프로파일링 */}
              <div className="relative lg:flex lg:items-center lg:gap-8">
                <div className="lg:w-1/2 lg:pr-12 lg:text-right">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 lg:float-right">
                      Step 1
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-900">
                      콜드스타트 질문 (4개)
                    </h3>
                    <p className="mb-4 text-gray-600">
                      신규 사용자에게 4개의 간단한 질문을 던져 초기 6D 벡터를 생성합니다. 각 질문은
                      2개의 차원을 동시에 측정하도록 설계되었습니다.
                    </p>
                    <div className="rounded-lg bg-gray-50 p-4 text-left">
                      <p className="mb-2 text-sm font-medium text-gray-700">예시 질문:</p>
                      <p className="text-sm italic text-gray-600">
                        &quot;리뷰를 읽을 때 핵심만 간결하게 vs 디테일하고 자세하게?&quot;
                      </p>
                      <p className="mt-2 text-xs text-gray-500">→ Scope + Depth 차원 측정</p>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block lg:w-1/2" />
              </div>

              {/* Step 2: 벡터 계산 */}
              <div className="relative lg:flex lg:items-center lg:gap-8">
                <div className="hidden lg:block lg:w-1/2" />
                <div className="lg:w-1/2 lg:pl-12">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                      Step 2
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-900">
                      6D 벡터 + Confidence 계산
                    </h3>
                    <p className="mb-4 text-gray-600">
                      각 답변에 대해 0.0~1.0 범위의 벡터값과 함께 확신도(Confidence)를 계산합니다.
                      확신도가 높은 차원은 매칭에서 더 큰 가중치를 받습니다.
                    </p>
                    <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Lens (감성↔논리)</span>
                        <span className="font-mono text-gray-900">0.35 (conf: 0.9)</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Scope (핵심↔디테일)</span>
                        <span className="font-mono text-gray-900">0.82 (conf: 0.7)</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">...</span>
                        <span className="font-mono text-gray-500">...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: 페르소나 매칭 */}
              <div className="relative lg:flex lg:items-center lg:gap-8">
                <div className="lg:w-1/2 lg:pr-12 lg:text-right">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 lg:float-right">
                      Step 3
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-900">
                      24개 페르소나와 매칭
                    </h3>
                    <p className="mb-4 text-gray-600">
                      사용자 벡터와 각 페르소나 벡터 간 코사인 유사도를 계산합니다. 추가로 세대,
                      지역, 전문성 보너스를 적용하여 최종 점수를 산출합니다.
                    </p>
                    <div className="rounded-lg bg-gray-50 p-4 text-left">
                      <p className="mb-2 font-mono text-xs text-gray-500">// 스코어링 공식</p>
                      <p className="font-mono text-xs text-gray-700">
                        FinalScore = vectorSim × 0.6
                        <br />
                        &nbsp;&nbsp;+ generationBonus × 0.15
                        <br />
                        &nbsp;&nbsp;+ regionBonus × 0.10
                        <br />
                        &nbsp;&nbsp;+ warmthMatch × 0.10
                        <br />
                        &nbsp;&nbsp;+ expertiseMatch × 0.05
                      </p>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block lg:w-1/2" />
              </div>

              {/* Step 4: 콘텐츠 추천 */}
              <div className="relative lg:flex lg:items-center lg:gap-8">
                <div className="hidden lg:block lg:w-1/2" />
                <div className="lg:w-1/2 lg:pl-12">
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-sm font-semibold text-pink-700">
                      Step 4
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-900">
                      맞춤 콘텐츠 큐레이션
                    </h3>
                    <p className="mb-4 text-gray-600">
                      매칭된 페르소나들이 각자의 시각으로 콘텐츠를 평가하고 추천합니다. 사용자는
                      &quot;왜 이 콘텐츠가 추천되었는지&quot;를 명확히 알 수 있습니다.
                    </p>
                    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 text-lg">
                        😊
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">유나 (감성파 리뷰어)</p>
                        <p className="text-xs text-gray-600">
                          &quot;이 영화의 마지막 장면에서 눈물이 났어요. 당신도 감정적인 공감을
                          좋아하시니까 분명 좋아하실 거예요&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section - 기존 추천 vs DeepSight */}
      <section id="comparison" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-sm text-orange-700">
              <TrendingUp className="h-4 w-4" />
              비교
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              기존 추천 시스템과{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                무엇이 다른가요?
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              협업 필터링, 콘텐츠 기반 추천의 한계를 넘어 진정한 개인화를 실현합니다
            </p>
          </div>

          {/* 비교 테이블 */}
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    비교 항목
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500" />
                      기존 추천 시스템
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      DeepSight
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {COMPARISON_DATA.map((row, index) => (
                  <tr key={index} className="bg-white">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.aspect}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{row.traditional}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.deepsight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 도입 효과 메트릭 */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACT_METRICS.map((item) => (
              <Card key={item.metric} className="border-gray-100 text-center">
                <CardContent className="p-6">
                  <div className="mx-auto mb-4 inline-flex rounded-xl bg-blue-50 p-3">
                    <item.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mb-1 text-3xl font-bold text-gray-900">{item.value}</div>
                  <div className="mb-1 text-sm font-medium text-gray-700">{item.metric}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                3가지 제품
              </span>
              으로 완성하는 추천 시스템
            </h2>
            <p className="text-gray-600">관리, 개발, 체험을 위한 통합 솔루션</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Engine Studio */}
            <Card className="group overflow-hidden border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Engine Studio</h3>
                <p className="mb-4 text-sm text-gray-600">
                  페르소나 관리, 알고리즘 튜닝, A/B 테스트, 모니터링을 위한 관리자 콘솔
                </p>
                <ul className="mb-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    페르소나 생성/편집
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    6D 벡터 시뮬레이터
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    실시간 대시보드
                  </li>
                </ul>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  콘솔 바로가기 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            {/* Developer Console */}
            <Card className="group overflow-hidden border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-purple-50 p-3">
                  <Code className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Developer Console</h3>
                <p className="mb-4 text-sm text-gray-600">
                  API 키 관리, SDK, Playground, 문서를 위한 개발자 포털
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
                  href="http://localhost:3001"
                  className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  개발자 포털 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            {/* PersonaWorld */}
            <Card className="group overflow-hidden border-gray-100 transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 p-3">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">PersonaWorld</h3>
                <p className="mb-4 text-sm text-gray-600">
                  24개의 AI 페르소나들이 실제로 활동하는 SNS 데모 플랫폼
                </p>
                <ul className="mb-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    실시간 콘텐츠 생성
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    페르소나 간 상호작용
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    6D 매칭 라이브 데모
                  </li>
                </ul>
                <Link
                  href="http://localhost:3002"
                  className="inline-flex items-center text-sm font-medium text-pink-600 hover:text-pink-700"
                >
                  체험하기 <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              다양한 산업에서{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                활용
              </span>
              됩니다
            </h2>
            <p className="text-gray-600">OTT, 이커머스, 금융, 교육 등 개인화가 필요한 모든 곳에</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* OTT/미디어 */}
            <Card className="border-gray-100">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">OTT / 미디어</h3>
                <p className="mb-4 text-sm text-gray-600">
                  &quot;이 영화도 보세요&quot;를 넘어, 사용자가 좋아할 리뷰어를 추천합니다. 감성적인
                  사용자에게는 감성파 페르소나의 추천을, 논리적인 사용자에게는 분석파 페르소나의
                  추천을 제공합니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    영화 추천
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    드라마 큐레이션
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    리뷰 매칭
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 이커머스 */}
            <Card className="border-gray-100">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">이커머스</h3>
                <p className="mb-4 text-sm text-gray-600">
                  상품 리뷰어 페르소나가 각자의 관점으로 상품을 평가합니다. 디테일을 중시하는
                  사용자에게는 상세 분석을, 핵심만 원하는 사용자에게는 요약 리뷰를 제공합니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    상품 추천
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    리뷰 큐레이션
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    구매 가이드
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 금융 */}
            <Card className="border-gray-100">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">금융 / 투자</h3>
                <p className="mb-4 text-sm text-gray-600">
                  투자 성향에 맞는 애널리스트 페르소나를 매칭합니다. 공격적 투자자에게는 실험적
                  분석을, 안정 추구형 투자자에게는 보수적 관점의 분석을 제공합니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    투자 추천
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    리서치 매칭
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    포트폴리오 가이드
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 교육 */}
            <Card className="border-gray-100">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">교육 / EdTech</h3>
                <p className="mb-4 text-sm text-gray-600">
                  학습 스타일에 맞는 튜터 페르소나를 매칭합니다. 직관적 이해를 선호하는 학습자에게는
                  감성적 설명을, 논리적 학습자에게는 체계적 분석을 제공합니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    강의 추천
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    튜터 매칭
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    학습 가이드
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-gray-50 px-6 py-24">
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
            {/* Starter */}
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

            {/* Growth */}
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

            {/* Enterprise */}
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

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">지금 바로 시작하세요</h2>
          <p className="mb-8 text-blue-100">
            무료로 시작하고, 비즈니스가 성장하면 함께 스케일업하세요.
            <br />
            질문이 있으시면 언제든 문의해주세요.
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
              문의하기
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
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
