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
  Brain,
  Target,
  Eye,
  Compass,
  Palette,
  Search,
  MousePointer,
  Clock,
  Star,
  Layers,
  MessageSquare,
  TrendingUp,
  Shield,
  Code,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ============================================
// 6D 벡터 차원 정의
// ============================================
const VECTOR_DIMENSIONS = [
  {
    id: "depth",
    name: "Depth",
    label: "분석 깊이",
    low: "직관적",
    high: "심층적",
    icon: Search,
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "lens",
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    icon: Eye,
    color: "from-purple-500 to-purple-600",
  },
  {
    id: "stance",
    name: "Stance",
    label: "평가 태도",
    low: "수용적",
    high: "비판적",
    icon: Compass,
    color: "from-orange-500 to-orange-600",
  },
  {
    id: "scope",
    name: "Scope",
    label: "관심 범위",
    low: "핵심만",
    high: "디테일",
    icon: Target,
    color: "from-green-500 to-green-600",
  },
  {
    id: "taste",
    name: "Taste",
    label: "취향 성향",
    low: "클래식",
    high: "실험적",
    icon: Palette,
    color: "from-pink-500 to-pink-600",
  },
  {
    id: "purpose",
    name: "Purpose",
    label: "소비 목적",
    low: "오락",
    high: "의미추구",
    icon: Brain,
    color: "from-indigo-500 to-indigo-600",
  },
]

// 플로팅 아이콘 위치
const FLOATING_ICONS = [
  { Icon: Brain, pos: "top-[10%] left-[8%]", delay: "0s", size: "w-14 h-14" },
  { Icon: Target, pos: "top-[15%] right-[12%]", delay: "0.5s", size: "w-12 h-12" },
  { Icon: Eye, pos: "top-[35%] left-[5%]", delay: "1s", size: "w-10 h-10" },
  { Icon: Palette, pos: "top-[30%] right-[8%]", delay: "1.5s", size: "w-16 h-16" },
  { Icon: Search, pos: "bottom-[35%] left-[10%]", delay: "2s", size: "w-12 h-12" },
  { Icon: Compass, pos: "bottom-[25%] right-[15%]", delay: "2.5s", size: "w-14 h-14" },
  { Icon: Sparkles, pos: "bottom-[15%] left-[15%]", delay: "0.3s", size: "w-10 h-10" },
  { Icon: Users, pos: "bottom-[20%] right-[5%]", delay: "0.8s", size: "w-11 h-11" },
]

// 예상 시나리오 메트릭
const METRICS = [
  { label: "추천 클릭률 향상", value: "+47%", icon: MousePointer },
  { label: "세션 체류시간", value: "+32%", icon: Clock },
  { label: "콜드스타트 해결", value: "4초", icon: Zap },
  { label: "추천 만족도", value: "4.7/5", icon: Star },
]

// 산업별 활용 사례
const USE_CASES = [
  {
    industry: "OTT 플랫폼",
    icon: "🎬",
    description: "취향 맞는 페르소나가 추천 이유와 함께 콘텐츠 큐레이션",
  },
  {
    industry: "이커머스",
    icon: "🛍️",
    description: "성향 맞는 리뷰어의 리뷰로 구매 결정 시간 단축",
  },
  {
    industry: "뉴스/미디어",
    icon: "📰",
    description: "필터버블 탈출, 다양한 관점의 기사 노출",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">DeepSight</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
              How it Works
            </a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
              Pricing
            </a>
          </div>
          <Button className="ds-button text-white">시작하기</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pb-20 pt-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                <Sparkles className="h-4 w-4" />
                AI 페르소나 기반 추천 시스템
              </div>
              <h1 className="text-5xl font-bold leading-tight tracking-tight text-gray-900 lg:text-6xl">
                <span className="ds-text-gradient">6D 벡터</span>로
                <br />
                사용자를 이해하다
              </h1>
              <p className="max-w-lg text-lg text-gray-600">
                기존 추천 시스템의 블랙박스를 열어, 사용자가 &ldquo;왜 이 콘텐츠가 추천됐는지&rdquo;
                명확히 알 수 있는 설명 가능한 AI 추천 엔진
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="ds-button gap-2 text-white">
                  무료로 시작하기
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  데모 보기
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Right: 3D Illustration */}
            <div className="relative flex h-[500px] items-center justify-center">
              {/* Animated Layers */}
              <div className="relative">
                {/* Base layer */}
                <div className="absolute -bottom-4 h-64 w-64 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 opacity-50" />
                {/* Middle layer */}
                <div
                  className="absolute -bottom-2 left-2 h-64 w-64 animate-pulse rounded-2xl border border-blue-200 bg-white shadow-lg"
                  style={{ animationDuration: "3s" }}
                />
                {/* Top card - 6D Vector Visual */}
                <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
                  <div className="mb-4 text-sm font-medium text-gray-500">User Vector Profile</div>
                  <div className="space-y-3">
                    {VECTOR_DIMENSIONS.slice(0, 4).map((dim, idx) => (
                      <div key={dim.id} className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${dim.color}`}
                        >
                          <dim.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{dim.low}</span>
                            <span>{dim.high}</span>
                          </div>
                          <div className="mt-1 h-2 w-48 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${dim.color}`}
                              style={{ width: `${30 + idx * 15}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                    <Check className="h-4 w-4" />
                    매칭 페르소나: 유나 (92%)
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -right-4 top-20 h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 opacity-20 blur-2xl" />
              <div className="absolute -left-8 bottom-20 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 opacity-20 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section - Split Layout */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left: Illustration */}
            <div className="relative flex items-center justify-center">
              <div className="relative">
                {/* Neon lines visualization */}
                <svg viewBox="0 0 300 300" className="h-80 w-80">
                  {/* Curved neon lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <path
                      key={i}
                      d={`M 50 ${150 + i * 20} Q 150 ${100 + i * 10} 250 ${150 + i * 20}`}
                      fill="none"
                      stroke={`url(#gradient-${i})`}
                      strokeWidth="3"
                      className="animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s`, animationDuration: "2s" }}
                    />
                  ))}
                  <defs>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <linearGradient
                        key={i}
                        id={`gradient-${i}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3 + i * 0.15} />
                        <stop offset="50%" stopColor="#7c3aed" stopOpacity={0.5 + i * 0.1} />
                        <stop offset="100%" stopColor="#db2777" stopOpacity={0.3 + i * 0.15} />
                      </linearGradient>
                    ))}
                  </defs>
                </svg>
                {/* 3D Platform */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="h-32 w-48 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl"
                    style={{
                      transform: "perspective(500px) rotateX(60deg)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="space-y-6">
              <div className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                THE PROBLEM
              </div>
              <h2 className="text-4xl font-bold text-gray-900">
                기존 추천 시스템,
                <br />
                무엇이 문제인가?
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: MessageSquare,
                    title: "블랙박스 추천",
                    desc: '"왜 이게 추천됐지?" 사용자는 이유를 모릅니다',
                  },
                  {
                    icon: Users,
                    title: "콜드스타트 문제",
                    desc: "신규 유저에겐 무의미한 인기 콘텐츠만 보여줍니다",
                  },
                  {
                    icon: TrendingUp,
                    title: "필터버블",
                    desc: "비슷한 콘텐츠만 반복, 새로운 발견이 없습니다",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                      <item.icon className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6D Vector Section - Dark with Floating Icons */}
      <section id="features" className="ds-dark-section relative overflow-hidden py-24">
        {/* Floating Icons */}
        {FLOATING_ICONS.map(({ Icon, pos, delay, size }, idx) => (
          <div
            key={idx}
            className={`absolute ${pos} ${size} flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm`}
            style={{
              animation: `float-${(idx % 3) + 1} ${6 + idx}s ease-in-out infinite`,
              animationDelay: delay,
            }}
          >
            <Icon className="h-1/2 w-1/2 text-white/60" />
          </div>
        ))}

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
            6D VECTOR SYSTEM
          </div>
          <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            6개 차원으로
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              취향을 정량화
            </span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-gray-400">
            단순한 좋아요/싫어요를 넘어, 사용자의 콘텐츠 소비 성향을 6개의 독립적인 차원으로
            분석합니다. 각 차원은 0.0 ~ 1.0 사이의 벡터값으로 표현됩니다.
          </p>

          {/* 6D Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {VECTOR_DIMENSIONS.map((dim) => (
              <div
                key={dim.id}
                className="ds-glass-card group rounded-2xl p-6 text-left transition-all hover:bg-white/10"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${dim.color}`}
                >
                  <dim.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-white">{dim.name}</h3>
                <p className="mb-3 text-sm text-gray-400">{dim.label}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{dim.low}</span>
                  <div className="mx-2 h-1 flex-1 rounded-full bg-gray-700">
                    <div className={`h-full w-1/2 rounded-full bg-gradient-to-r ${dim.color}`} />
                  </div>
                  <span>{dim.high}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works - Split Layout */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
              HOW IT WORKS
            </div>
            <h2 className="text-4xl font-bold text-gray-900">4단계 매칭 프로세스</h2>
          </div>

          {/* Step 1 - Left Image */}
          <div className="mb-24 grid items-center gap-12 lg:grid-cols-2">
            <div className="relative flex justify-center">
              <div className="ds-gradient-border">
                <div className="rounded-xl bg-white p-6">
                  <div className="mb-4 text-sm font-medium text-gray-500">Cold-Start Question</div>
                  <div className="space-y-3">
                    <p className="font-medium text-gray-900">리뷰를 읽을 때 선호하는 스타일은?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="rounded-lg border-2 border-blue-500 bg-blue-50 p-3 text-sm text-blue-700">
                        핵심만 간결하게
                      </button>
                      <button className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600 hover:border-gray-300">
                        디테일하고 자세하게
                      </button>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${i === 1 ? "bg-blue-500" : "bg-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                  1
                </div>
                <span className="text-sm font-medium text-blue-600">COLD-START</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900">4개의 간단한 질문</h3>
              <p className="text-gray-600">
                신규 사용자에게 4개의 A vs B 질문을 던집니다. 각 질문은 2개 차원을 동시에 측정하도록
                설계되어 <strong>4초 만에</strong> 6D 프로필을 생성합니다.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  질문당 2개 차원 동시 측정
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  확신도(Confidence) 함께 계산
                </li>
              </ul>
            </div>
          </div>

          {/* Step 2 - Right Image */}
          <div className="mb-24 grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 space-y-4 lg:order-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-600">
                  2
                </div>
                <span className="text-sm font-medium text-purple-600">VECTOR CALCULATION</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900">6D 벡터 정량화</h3>
              <p className="text-gray-600">
                답변을 분석하여 6개 차원에 대해 <strong>0.0 ~ 1.0</strong> 범위의 벡터값과 확신도를
                계산합니다. 확신도가 높은 차원은 매칭에서 더 큰 가중치를 받습니다.
              </p>
            </div>
            <div className="order-1 flex justify-center lg:order-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                <div className="mb-4 text-sm font-medium text-gray-500">Vector Result</div>
                {[
                  { name: "Lens", value: 0.35, conf: 0.9, label: "감성적 성향" },
                  { name: "Scope", value: 0.82, conf: 0.7, label: "디테일 선호" },
                  { name: "Depth", value: 0.65, conf: 0.85, label: "분석적" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <span className="font-mono text-sm font-medium">{item.name}</span>
                      <span className="ml-2 text-xs text-gray-500">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {item.value.toFixed(2)}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">conf: {item.conf}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 & 4 as cards */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Step 3 */}
            <div className="ds-gradient-border">
              <div className="h-full rounded-xl bg-white p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-600">
                    3
                  </div>
                  <span className="text-sm font-medium text-green-600">PERSONA MATCHING</span>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900">페르소나 매칭</h3>
                <p className="mb-4 text-gray-600">
                  24개 AI 페르소나와 코사인 유사도를 계산하고 보너스를 적용합니다.
                </p>
                <div className="space-y-2 rounded-lg bg-gray-50 p-4 font-mono text-sm">
                  <div className="text-gray-600">FinalScore =</div>
                  <div className="pl-4 text-gray-800">벡터 유사도 × 60%</div>
                  <div className="pl-4 text-gray-800">+ 세대 보너스 × 15%</div>
                  <div className="pl-4 text-gray-800">+ 지역 보너스 × 10%</div>
                  <div className="pl-4 text-gray-800">+ 표현 온도 × 10%</div>
                  <div className="pl-4 text-gray-800">+ 전문성 매칭 × 5%</div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="ds-gradient-border">
              <div className="h-full rounded-xl bg-white p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 font-bold text-pink-600">
                    4
                  </div>
                  <span className="text-sm font-medium text-pink-600">PERSONALIZED CURATION</span>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900">설명 가능한 추천</h3>
                <p className="mb-4 text-gray-600">
                  매칭된 페르소나가 자신의 관점에서 콘텐츠를 추천합니다.
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-lg">
                      😊
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">유나</div>
                      <div className="text-xs text-gray-500">감성파 리뷰어 · 92% 매칭</div>
                    </div>
                  </div>
                  <p className="text-sm italic text-gray-700">
                    &ldquo;이 영화의 마지막 장면에서 눈물이 났어요. 감정적인 공감을 좋아하시는
                    당신이라면 분명 좋아하실 거예요.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-blue-600">
            EXPECTED IMPACT
          </div>
          <h2 className="mb-4 text-center text-4xl font-bold text-gray-900">예상 시나리오</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            DeepSight 도입 시 예상되는 효과입니다. 실제 결과는 서비스 특성에 따라 다를 수 있습니다.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
                  <metric.icon className="h-7 w-7 text-white" />
                </div>
                <div className="ds-text-gradient mb-2 text-3xl font-bold">{metric.value}</div>
                <div className="text-sm text-gray-600">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
              USE CASES
            </div>
            <h2 className="text-4xl font-bold text-gray-900">다양한 산업에 적용</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {USE_CASES.map((useCase, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-xl"
              >
                <div className="mb-4 text-5xl">{useCase.icon}</div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">{useCase.industry}</h3>
                <p className="text-gray-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="ds-dark-section relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">지금 바로 시작하세요</h2>
          <p className="mb-8 text-lg text-gray-400">
            DeepSight로 사용자에게 &ldquo;왜&rdquo;를 설명할 수 있는 추천 시스템을 구축하세요.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" className="ds-button gap-2 text-white">
              무료 체험 시작
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              상담 예약
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
              PRICING
            </div>
            <h2 className="text-4xl font-bold text-gray-900">심플한 요금제</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Starter */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <h3 className="mb-2 text-xl font-bold text-gray-900">Starter</h3>
              <p className="mb-4 text-gray-600">소규모 서비스 시작</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₩99,000</span>
                <span className="text-gray-500">/월</span>
              </div>
              <ul className="mb-8 space-y-3">
                {["MAU 10,000까지", "6D 벡터 프로파일링", "24개 페르소나", "이메일 지원"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-600">
                      <Check className="h-5 w-5 text-green-500" />
                      {item}
                    </li>
                  )
                )}
              </ul>
              <Button variant="outline" className="w-full">
                시작하기
              </Button>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border-2 border-blue-500 bg-white p-8 shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-1 text-sm font-medium text-white">
                인기
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Pro</h3>
              <p className="mb-4 text-gray-600">성장하는 서비스</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₩299,000</span>
                <span className="text-gray-500">/월</span>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  "MAU 100,000까지",
                  "커스텀 페르소나",
                  "A/B 테스트",
                  "우선 지원",
                  "분석 대시보드",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-gray-600">
                    <Check className="h-5 w-5 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="ds-button w-full text-white">시작하기</Button>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <h3 className="mb-2 text-xl font-bold text-gray-900">Enterprise</h3>
              <p className="mb-4 text-gray-600">대규모 서비스</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">문의</span>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  "무제한 MAU",
                  "온프레미스 옵션",
                  "전담 매니저",
                  "SLA 보장",
                  "커스텀 인테그레이션",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-gray-600">
                    <Check className="h-5 w-5 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full">
                상담 요청
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">DeepSight</span>
            </div>
            <p className="text-sm text-gray-500">© 2024 DeepSight. AI 페르소나 기반 추천 시스템</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
