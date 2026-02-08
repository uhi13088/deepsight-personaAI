"use client"

import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  BarChart3,
  Users,
  Zap,
  Check,
  Brain,
  Target,
  Eye,
  Compass,
  Palette,
  Search,
  MousePointer,
  Clock,
  Star,
  MessageSquare,
  TrendingUp,
  Code,
} from "lucide-react"
import { HeroOrbital } from "@/components/home/hero-orbital"

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"
const DEVELOPER_CONSOLE_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_CONSOLE_URL || "https://developer-console.vercel.app"

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

const METRICS = [
  { label: "추천 클릭률 향상", value: "+47%", icon: MousePointer },
  { label: "세션 체류시간", value: "+32%", icon: Clock },
  { label: "콜드스타트 해결", value: "4초", icon: Zap },
  { label: "추천 만족도", value: "4.7/5", icon: Star },
]

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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-20 pt-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm text-purple-700">
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
                <Link
                  href={PERSONA_WORLD_URL}
                  className="ds-button inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
                >
                  PersonaWorld 체험하기
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={DEVELOPER_CONSOLE_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Code className="h-4 w-4" />
                  API 연동하기
                </Link>
              </div>
            </div>

            {/* Right: Orbital Animation */}
            <HeroOrbital dimensions={VECTOR_DIMENSIONS} />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 300 300" className="h-80 w-80">
                {[0, 1, 2, 3, 4].map((i) => (
                  <path
                    key={i}
                    d={`M 50 ${150 + i * 20} Q 150 ${100 + i * 10} 250 ${150 + i * 20}`}
                    fill="none"
                    stroke={`url(#home-gradient-${i})`}
                    strokeWidth="3"
                    className="ds-pulse"
                    style={{ animationDelay: `${i * 0.2}s`, animationDuration: "2s" }}
                  />
                ))}
                <defs>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <linearGradient
                      key={i}
                      id={`home-gradient-${i}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#667eea" stopOpacity={0.3 + i * 0.15} />
                      <stop offset="50%" stopColor="#f093fb" stopOpacity={0.5 + i * 0.1} />
                      <stop offset="100%" stopColor="#f5576c" stopOpacity={0.3 + i * 0.15} />
                    </linearGradient>
                  ))}
                </defs>
              </svg>
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

            <div className="space-y-6">
              <div className="text-sm font-semibold uppercase tracking-wider text-purple-600">
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

      {/* 6D Vector Section */}
      <section className="ds-dark-section relative overflow-hidden py-24">
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-400">
            6D VECTOR SYSTEM
          </div>
          <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            6개 차원으로
            <br />
            <span className="bg-gradient-to-r from-[#667eea] via-[#22c55e] to-[#eab308] bg-clip-text text-transparent">
              취향을 정량화
            </span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-gray-400">
            단순한 좋아요/싫어요를 넘어, 사용자의 콘텐츠 소비 성향을 6개의 독립적인 차원으로
            분석합니다.
          </p>

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

          <div className="mt-12">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
            >
              자세히 알아보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-purple-600">
            EXPECTED IMPACT
          </div>
          <h2 className="mb-4 text-center text-4xl font-bold text-gray-900">예상 시나리오</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            DeepSight 도입 시 예상되는 효과입니다.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#22c55e] to-[#eab308]">
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
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
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

      {/* CTA */}
      <section className="ds-dark-section relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">지금 바로 시작하세요</h2>
          <p className="mb-8 text-lg text-gray-400">
            DeepSight로 사용자에게 &ldquo;왜&rdquo;를 설명할 수 있는 추천 시스템을 구축하세요.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href={PERSONA_WORLD_URL}
              className="ds-button inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
            >
              PersonaWorld 체험하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/products/developer-console"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-600 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              <Code className="h-4 w-4" />
              API 연동하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
