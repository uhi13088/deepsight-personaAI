"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  Users,
  Check,
  Brain,
  Compass,
  Search,
  MousePointer,
  Clock,
  Star,
  MessageSquare,
  TrendingUp,
  Code,
  Heart,
  Flame,
  Sprout,
  BookOpen,
  Mic,
  Zap,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import { HeroOrbital } from "@/components/home/hero-orbital"

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"
const DEVELOPER_CONSOLE_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_CONSOLE_URL || "https://developer-console.vercel.app"

// v3 3-Layer 대표 차원 (HeroOrbital용: inner 3 + middle 3)
const HERO_DIMENSIONS = [
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
    id: "openness",
    name: "Openness",
    label: "개방성",
    low: "보수적",
    high: "개방적",
    icon: Compass,
    color: "from-orange-500 to-orange-600",
  },
  {
    id: "lack",
    name: "Lack",
    label: "결핍",
    low: "충족",
    high: "결핍",
    icon: Heart,
    color: "from-violet-500 to-violet-600",
  },
  {
    id: "sociability",
    name: "Sociability",
    label: "사회적 성향",
    low: "독립적",
    high: "사교적",
    icon: Users,
    color: "from-indigo-500 to-indigo-600",
  },
  {
    id: "neuroticism",
    name: "Neuroticism",
    label: "신경성",
    low: "안정적",
    high: "민감한",
    icon: Flame,
    color: "from-amber-500 to-amber-600",
  },
  {
    id: "growthArc",
    name: "Growth Arc",
    label: "성장 곡선",
    low: "정체",
    high: "변화",
    icon: Sprout,
    color: "from-purple-500 to-purple-600",
  },
]

// 3-Layer 구조 카드
const LAYERS = [
  {
    id: "L1",
    name: "L1: Social Persona",
    subtitle: "가면 — 외부에 보이는 소비 성향",
    dimensions: "7D",
    items: ["Depth", "Lens", "Stance", "Scope", "Taste", "Purpose", "Sociability"],
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "L2",
    name: "L2: Core Temperament",
    subtitle: "본성 — OCEAN Big Five 심리 모델",
    dimensions: "5D",
    items: ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"],
    color: "from-amber-500 to-amber-600",
  },
  {
    id: "L3",
    name: "L3: Narrative Drive",
    subtitle: "욕망 — 캐릭터 아크 기반 내면 동력",
    dimensions: "4D",
    items: ["Lack", "Moral Compass", "Volatility", "Growth Arc"],
    color: "from-violet-500 to-violet-600",
  },
]

const ENGINE_STUDIO_URL = process.env.NEXT_PUBLIC_ENGINE_STUDIO_URL || "http://localhost:3000"

const METRICS = [
  { label: "페르소나 엔진", value: "3-Layer", icon: MousePointer },
  { label: "활동 페르소나", value: "—", icon: Users, dynamic: true },
  { label: "추천 이유 설명", value: "투명", icon: Clock },
  { label: "필터버블 탈출", value: "다관점", icon: Star },
]

const USE_CASES = [
  {
    industry: "OTT 플랫폼",
    icon: "🎬",
    description:
      "3-Layer 벡터로 분석된 취향 프로필과 Paradox Score 기반으로 페르소나가 추천 이유와 함께 콘텐츠 큐레이션",
  },
  {
    industry: "이커머스",
    icon: "🛍️",
    description: "교차축 83축 분석으로 성향이 일치하는 리뷰어의 리뷰를 노출, 구매 결정 시간 단축",
  },
  {
    industry: "뉴스/미디어",
    icon: "📰",
    description:
      "Extended Paradox Score로 필터버블 탈출, 3-Tier 매칭이 다양한 관점의 기사를 자동 노출",
  },
]

export default function HomePage() {
  const [personaCount, setPersonaCount] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${ENGINE_STUDIO_URL}/api/public/personas?limit=1`)
      .then((res) => res.json())
      .then((json: { success: boolean; data: { total: number } }) => {
        if (json.success) setPersonaCount(json.data.total)
      })
      .catch(() => {
        /* API 연결 실패 시 무시 */
      })
  }, [])

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
                <span className="ds-text-gradient">3-Layer 벡터</span>로
                <br />
                사용자를 심층 이해하다
              </h1>
              <p className="max-w-lg text-lg text-gray-600">
                가면(L1) · 본성(L2) · 욕망(L3), 세 겹의 벡터로 사용자의 성향을 심층 분석하고 AI
                페르소나가 &ldquo;왜 이 콘텐츠가 추천됐는지&rdquo; 명확히 설명하는 투명한 추천 엔진
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
            <HeroOrbital dimensions={HERO_DIMENSIONS} />
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

      {/* 3-Layer Vector Section */}
      <section className="ds-dark-section relative overflow-hidden py-24">
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-400">
            3-LAYER VECTOR SYSTEM
          </div>
          <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            세 겹의 레이어로
            <br />
            <span className="bg-gradient-to-r from-[#667eea] via-[#f093fb] to-[#f5576c] bg-clip-text text-transparent">
              취향을 심층 정량화
            </span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-gray-400">
            단순한 좋아요/싫어요를 넘어, 사용자의 콘텐츠 소비 성향을 가면(L1) · 본성(L2) · 욕망(L3)
            세 겹의 벡터로 정량화하고, 서사·음성·압박 역학을 융합합니다.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {LAYERS.map((layer) => (
              <div
                key={layer.id}
                className="ds-glass-card group rounded-2xl p-6 text-left transition-all hover:bg-white/10"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${layer.color}`}
                  >
                    <span className="text-sm font-bold text-white">{layer.dimensions}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{layer.name}</h3>
                    <p className="text-xs text-gray-400">{layer.subtitle}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {layer.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="h-3.5 w-3.5 text-gray-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-gray-700 bg-white/5 p-4">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-purple-400">Extended Paradox Score</span> — L1↔L2,
              L1↔L3, L2↔L3 간 모순을 가중 합산하여 사용자의 &quot;복잡한 인간다움&quot;을
              정량화합니다. 83개 교차축이 레이어 간 역설·강화·조절 패턴을 분석합니다.
            </p>
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

      {/* Qualitative Architecture — 비정량적 요소 + 런타임 알고리즘 */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-purple-600">
            BEYOND VECTORS
          </div>
          <h2 className="mb-4 text-center text-4xl font-bold text-gray-900">숫자 너머의 인격</h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-gray-600">
            벡터만으로는 페르소나가 아닙니다. DeepSight는 서사적 기원, 고유한 목소리, 압박 역학,
            시대정신까지 비정량적 요소를 융합해 &quot;살아 있는&quot; AI 인격을 만듭니다.
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* 비정량적 4요소 */}
            <div className="space-y-4">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">
                페르소나를 구성하는 4가지 비정량적 축
              </h3>
              {[
                {
                  icon: BookOpen,
                  title: "서사적 기원 (Backstory)",
                  desc: "과거의 상처(Ghost), 무의식적 욕망, 트라우마 트리거 — 벡터의 '이유'를 서사로 정의합니다.",
                  color: "text-violet-600 bg-violet-50",
                },
                {
                  icon: Mic,
                  title: "고유한 목소리 (Voice Profile)",
                  desc: "말버릇, 문장 구조, 감정 레지스터, Few-shot 앵커 — 수백 턴이 지나도 같은 사람처럼 말합니다.",
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  icon: Zap,
                  title: "압박 역학 (Pressure Dynamics)",
                  desc: "특정 주제/상황에서 벡터가 일시적으로 변하고, 지수 감쇠 곡선으로 복귀합니다. L2 본성이 표면에 드러나는 순간.",
                  color: "text-amber-600 bg-amber-50",
                },
                {
                  icon: Compass,
                  title: "시대정신 (Zeitgeist)",
                  desc: "세대 코드, 가치관, 문화 자본 — 같은 벡터라도 밀레니얼과 Z세대는 다르게 표현합니다.",
                  color: "text-emerald-600 bg-emerald-50",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.color}`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 4대 런타임 알고리즘 */}
            <div className="space-y-4">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">
                실시간으로 작동하는 4대 알고리즘
              </h3>
              {[
                {
                  icon: Sparkles,
                  step: "01",
                  title: "Init — 서사 → 벡터 초기화",
                  desc: "백스토리에서 키워드를 추출하고, 의미 카테고리→벡터 매핑 테이블로 초기 벡터 보정값(delta)을 산출합니다.",
                  color: "text-purple-600 border-purple-200 bg-purple-50",
                },
                {
                  icon: Flame,
                  step: "02",
                  title: "Override — 압박 → 벡터 변위",
                  desc: "트리거 키워드 감지 시 벡터를 일시 이동시키고, L3 volatility에 비례하는 지수 감쇠 곡선으로 복귀합니다.",
                  color: "text-red-600 border-red-200 bg-red-50",
                },
                {
                  icon: RefreshCw,
                  step: "03",
                  title: "Adapt — 사용자 태도 → 실시간 조정",
                  desc: "매 턴 사용자의 공격성·친밀도·정중함을 파싱하여, 차원별 적응률(α)과 모멘텀으로 페르소나가 미세 조정됩니다.",
                  color: "text-blue-600 border-blue-200 bg-blue-50",
                },
                {
                  icon: Heart,
                  step: "04",
                  title: "Express — 벡터 상태 → 행동 발현",
                  desc: "갈등 점수, 결핍 점수 등 파생 상태값에서 시그모이드 확률로 고유 퀴크(말버릇·행동 패턴)가 발현됩니다.",
                  color: "text-pink-600 border-pink-200 bg-pink-50",
                },
              ].map((item) => (
                <div key={item.step} className={`flex gap-4 rounded-xl border p-4 ${item.color}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white font-bold text-gray-400 shadow-sm">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="font-semibold text-gray-900">품질 보증 3중 검증</p>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Auto-Interview</span> 20문항 자동
                  인터뷰로 벡터↔응답 일관성 검증 ·{" "}
                  <span className="font-medium text-gray-700">6-Category Validation</span>{" "}
                  구조·L1↔L2·L2↔L3·정성↔정량·교차축·동적 설정 6범주 검증 ·{" "}
                  <span className="font-medium text-gray-700">Integrity Score</span> 런타임 대화 중
                  인격 붕괴 감지 (Context Recall × Setting Consistency × Character Stability)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/features/persona"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-500"
            >
              페르소나 아키텍처 자세히 보기
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
          <h2 className="mb-4 text-center text-4xl font-bold text-gray-900">핵심 가치</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            DeepSight가 기존 추천 시스템과 다른 점입니다.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                  <metric.icon className="h-7 w-7 text-white" />
                </div>
                <div className="ds-text-gradient mb-2 text-3xl font-bold">
                  {"dynamic" in metric && metric.dynamic
                    ? personaCount !== null
                      ? `${personaCount}명`
                      : "—"
                    : metric.value}
                </div>
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
