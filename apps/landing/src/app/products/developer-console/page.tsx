import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Code,
  Terminal,
  Key,
  BarChart3,
  Zap,
  BookOpen,
  Users,
  Search,
  MessageSquare,
  Star,
  Bell,
  Shield,
  Clock,
  Globe,
  CheckCircle2,
  Layers,
  Sparkles,
  Target,
  Activity,
  ArrowDown,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Developer Console",
  description:
    "DeepSight의 AI 페르소나를 API로 연동하세요. 콘텐츠 추천, 평가, 유저 프로파일링을 당신의 서비스에.",
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@deepsight.ai"

/* ── API Features ── */
const API_FEATURES = [
  {
    icon: Search,
    title: "페르소나 카탈로그",
    badge: "Catalog API",
    endpoints: ["GET /v1/personas", "GET /v1/personas/{id}", "POST /v1/personas/filter"],
    description:
      "DeepSight에 등록된 AI 페르소나를 검색하고 조회합니다. 역할, 전문분야, 3-Layer 벡터 성향으로 필터링하여 서비스에 맞는 페르소나를 선택하세요. Enterprise 플랜에서는 L1/L2/L3 벡터 범위로 고급 필터링도 가능합니다.",
    example: "OTT 서비스가 '영화 전문 리뷰어' 페르소나를 검색",
  },
  {
    icon: Users,
    title: "유저 프로파일링",
    badge: "Profiling API",
    endpoints: ["POST /v1/onboarding/questions", "POST /v1/profiles/create"],
    description:
      "Quick(12문항, 1.5분) / Standard(30문항, 4분) / Deep(60문항, 8분) 3가지 온보딩 모드로 자사 유저의 3-Layer 프로필을 생성합니다. SNS 연동 분석도 지원하여, 신규 유저에게도 즉시 개인화된 경험을 제공할 수 있습니다.",
    example: "웹소설 플랫폼이 신규 가입자의 취향을 즉시 파악",
  },
  {
    icon: Zap,
    title: "유저-페르소나 매칭",
    badge: "Matching API",
    endpoints: ["POST /v1/match"],
    description:
      "유저의 3-Layer 프로필과 페르소나 프로필 간 3-Tier 매칭 (Basic → Advanced → Exploration)으로 최적의 페르소나를 매칭합니다. 모든 플랜에서 106D+ 전체 차원 연산을 지원하며, 다양성 보정으로 필터버블도 방지합니다.",
    example: "음악 앱이 각 유저에게 맞춤 큐레이터 페르소나를 배정",
  },
  {
    icon: MessageSquare,
    title: "콘텐츠 추천",
    badge: "Recommendation API",
    endpoints: ["POST /v1/recommend"],
    description:
      "매칭된 페르소나가 유저의 성향에 맞는 콘텐츠를 추천하고, 추천 이유를 함께 설명합니다. '왜 이 콘텐츠인지' 사용자가 이해할 수 있는 투명한 추천입니다.",
    example: "'감성 시네필이 추천하는 이번 주 영화 TOP 5'",
  },
  {
    icon: Star,
    title: "콘텐츠 평가",
    badge: "Evaluation API",
    endpoints: ["POST /v1/evaluate"],
    description:
      "페르소나의 관점에서 특정 콘텐츠를 리뷰하고 분석합니다. 자사 콘텐츠에 AI 기반의 다양한 관점 리뷰를 자동으로 생성할 수 있습니다.",
    example: "출판사가 신간 도서에 페르소나별 AI 리뷰를 자동 부착",
  },
  {
    icon: Activity,
    title: "피드백 수집",
    badge: "Feedback API",
    endpoints: ["POST /v1/feedback"],
    description:
      "유저의 매칭/추천 피드백(LIKE, DISLIKE, REPORT)을 수집합니다. 수집된 피드백은 매칭 알고리즘 개선에 자동으로 반영됩니다.",
    example: "유저가 추천받은 페르소나에 좋아요/싫어요 피드백 전송",
  },
]

/* ── Matching Tiers ── */
const MATCHING_TIERS = [
  {
    tier: "Basic",
    strategy: "106D+ 유사도 기반 매칭",
    latency: "~5ms",
    description: "안정적인 추천. 좋아하는 것과 비슷한 콘텐츠를 매칭합니다.",
    color: "border-blue-200 bg-blue-50",
    textColor: "text-blue-700",
  },
  {
    tier: "Advanced",
    strategy: "106D+ 심층 호환성 + Extended Paradox Score",
    latency: "~10ms",
    description: "깊이 매칭. 역설 호환성까지 고려한 심층 연결입니다.",
    color: "border-purple-200 bg-purple-50",
    textColor: "text-purple-700",
  },
  {
    tier: "Exploration",
    strategy: "106D+ 다양성 극대화 + 자동 보정",
    latency: "~50ms",
    description: "새로운 발견. 필터버블을 방지하며 의외의 매칭을 제공합니다.",
    color: "border-pink-200 bg-pink-50",
    textColor: "text-pink-700",
    isDefault: true,
  },
]

/* ── Onboarding Modes (API) ── */
const ONBOARDING_MODES = [
  {
    mode: "Quick",
    questions: 12,
    duration: "1.5분",
    initialAccuracy: "50-55%",
    targetAccuracy: "90% @ Day 90",
    recommended: true,
    description: "빠른 시작 + 행동 학습. 가장 높은 완료율.",
  },
  {
    mode: "Standard",
    questions: 30,
    duration: "4분",
    initialAccuracy: "60-68%",
    targetAccuracy: "90% @ Day 45",
    recommended: false,
    description: "균형 잡힌 초기 정확도와 완료율.",
  },
  {
    mode: "Deep",
    questions: 60,
    duration: "8분",
    initialAccuracy: "70-78%",
    targetAccuracy: "90% @ Day 30",
    recommended: false,
    description: "정밀 분석을 원하는 유저를 위한 심층 모드.",
  },
]

/* ── Pricing Plans ── */
const PRICING_PLANS = [
  {
    name: "Starter",
    price: 199,
    annualPrice: 159,
    personas: "50",
    apiCalls: "500K/월",
    rateLimit: "100/분",
    apiKeys: 5,
    teamMembers: 3,
    sla: "99.5%",
    support: "셀프서비스",
    features: ["Webhook", "모든 매칭 Tier"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: 499,
    annualPrice: 399,
    personas: "100",
    apiCalls: "1M/월",
    rateLimit: "500/분",
    apiKeys: 10,
    teamMembers: 5,
    sla: "99.5%",
    support: "셀프서비스",
    features: ["Webhook", "모든 매칭 Tier"],
    highlighted: true,
  },
  {
    name: "Max",
    price: 1499,
    annualPrice: 1199,
    personas: "350",
    apiCalls: "3M/월",
    rateLimit: "1,000/분",
    apiKeys: 20,
    teamMembers: 10,
    sla: "99.9%",
    support: "우선 이메일",
    features: ["Webhook", "모든 매칭 Tier"],
    highlighted: false,
  },
]

const ENTERPRISE_PLANS = [
  {
    name: "Ent. Starter",
    price: "$3,500",
    personas: "800",
    apiCalls: "5M",
    rateLimit: "2,000/분",
    sla: "99.9%",
  },
  {
    name: "Ent. Growth",
    price: "$5,000",
    personas: "1,500",
    apiCalls: "10M",
    rateLimit: "5,000/분",
    sla: "99.95%",
  },
  {
    name: "Ent. Scale",
    price: "$15,000",
    personas: "5,000+",
    apiCalls: "15M",
    rateLimit: "협의",
    sla: "99.99%",
  },
]

/* ── Dev Tools ── */
const DEV_TOOLS = [
  {
    icon: Key,
    title: "API 키 관리",
    description:
      "프로젝트별 API 키 발급 (Test/Live 환경 분리), 엔드포인트별 권한 설정, 자동/수동 키 순환, IP 화이트리스트(Enterprise), 활동 추적과 이상 징후 알림.",
  },
  {
    icon: Terminal,
    title: "인터랙티브 콘솔",
    description:
      "브라우저에서 API를 직접 테스트하고 요청/응답을 실시간 확인합니다. 모든 엔드포인트에 대한 Playground를 제공합니다.",
  },
  {
    icon: BookOpen,
    title: "문서 & SDK",
    description:
      "Python, Node.js, Ruby, Java, Go 5개 언어 공식 SDK. 자동 재시도, 레이트 리밋 처리, 타입 안전성, 에러 핸들링이 내장되어 있습니다.",
  },
  {
    icon: BarChart3,
    title: "분석 대시보드",
    description:
      "API 호출량, 성공률, P95 응답시간, 비용 추적을 실시간으로 확인합니다. 커스텀 위젯과 시간 필터, 5초 주기 실시간 모니터링을 제공합니다.",
  },
  {
    icon: Bell,
    title: "알림 센터",
    description:
      "사용량 80%/100% 도달, 에러율 급등(>5%), 보안 이상 징후, 결제 실패 시 이메일/Slack/Webhook으로 실시간 알림을 받습니다.",
  },
  {
    icon: Shield,
    title: "보안 & 인증",
    description:
      "Bearer 토큰 인증, SSO(SAML 2.0/OIDC, Enterprise), IP 화이트리스트, 키 순환(30/60/90일), 레이트 리밋 헤더(X-RateLimit-*)를 지원합니다.",
  },
]

export default function DeveloperConsolePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="ds-dark-section relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
            <Code className="h-4 w-4" />
            Developer Console
          </div>
          <h1 className="mb-6 text-5xl font-bold text-white">
            DeepSight의{" "}
            <span className="bg-gradient-to-r from-[#667eea] via-[#f093fb] to-[#f5576c] bg-clip-text text-transparent">
              AI 페르소나
            </span>
            를
            <br />
            당신의 서비스에
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            RESTful API와 5개 언어 SDK로 연동하세요. 유저 프로파일링, 페르소나 매칭, 콘텐츠 추천까지
            — 검증된 106D+ 추천 시스템을 직접 구축할 필요 없이 바로 사용할 수 있습니다.
          </p>
        </div>
      </section>

      {/* ── Integration Flow Diagram ── */}
      <section className="border-b border-gray-100 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              INTEGRATION FLOW
            </div>
            <h2 className="text-2xl font-bold text-gray-900">5단계 통합 파이프라인</h2>
          </div>

          <div className="flex flex-col items-center gap-3 md:flex-row md:gap-2">
            {[
              { step: "1", label: "페르소나 검색", sub: "Catalog API", icon: Search },
              { step: "2", label: "유저 프로파일링", sub: "Profiling API", icon: Users },
              { step: "3", label: "매칭", sub: "Matching API", icon: Zap },
              { step: "4", label: "추천", sub: "Recommendation API", icon: MessageSquare },
              { step: "5", label: "피드백", sub: "Feedback API", icon: Activity },
            ].map((item, idx) => (
              <div key={item.step} className="flex items-center gap-2">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#667eea] to-[#f093fb]">
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{item.label}</div>
                    <div className="text-xs text-purple-600">{item.sub}</div>
                  </div>
                </div>
                {idx < 4 && <ArrowRight className="hidden h-4 w-4 text-gray-300 md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core APIs ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              CORE APIs
            </div>
            <h2 className="text-3xl font-bold text-gray-900">6가지 API 엔드포인트</h2>
            <p className="mt-4 text-gray-600">
              DeepSight 팀이 Engine Studio에서 설계하고 검증한 AI 페르소나를
              <br />
              API 하나로 당신의 서비스에 연동할 수 있습니다.
            </p>
          </div>

          <div className="space-y-6">
            {API_FEATURES.map((api) => (
              <div
                key={api.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-md"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="flex-1">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                        <api.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{api.title}</h3>
                        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-600">
                          {api.badge}
                        </span>
                      </div>
                    </div>
                    <p className="mb-3 text-gray-600">{api.description}</p>

                    {/* Endpoints */}
                    <div className="mb-3 flex flex-wrap gap-2">
                      {api.endpoints.map((ep) => (
                        <code
                          key={ep}
                          className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700"
                        >
                          {ep}
                        </code>
                      ))}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">활용 예시:</span>
                      {api.example}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3-Tier Matching ── */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              MATCHING TIERS
            </div>
            <h2 className="text-3xl font-bold text-gray-900">3-Tier 매칭 전략</h2>
            <p className="mt-4 text-gray-600">
              모든 플랜에서 3가지 매칭 Tier를 모두 사용할 수 있습니다.
              <br />
              전략만 다를 뿐, 모두 106D+ 전체 차원을 사용합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {MATCHING_TIERS.map((t) => (
              <div key={t.tier} className={`rounded-2xl border-2 ${t.color} p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className={`text-lg font-bold ${t.textColor}`}>{t.tier}</h3>
                  {t.isDefault && (
                    <span className="rounded-full bg-pink-200 px-2 py-0.5 text-xs font-medium text-pink-700">
                      Default
                    </span>
                  )}
                </div>
                <p className="mb-4 text-sm text-gray-600">{t.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">전략</span>
                    <span className="font-medium text-gray-900">{t.strategy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">응답 속도</span>
                    <span className="font-mono font-medium text-gray-900">{t.latency}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Smart Caching + Prompt Caching (반복 페르소나 시스템 프롬프트 90% 비용 절감)
            </div>
          </div>
        </div>
      </section>

      {/* ── Onboarding Modes ── */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              ONBOARDING MODES
            </div>
            <h2 className="text-3xl font-bold text-gray-900">3가지 온보딩 모드</h2>
            <p className="mt-4 text-gray-600">
              서비스에 맞는 온보딩 깊이를 선택하세요. 모든 모드에서 행동 학습을 통해 90% 정확도에
              수렴합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {ONBOARDING_MODES.map((m) => (
              <div
                key={m.mode}
                className={`rounded-2xl border ${m.recommended ? "border-2 border-purple-300 shadow-md" : "border-gray-200"} bg-white p-6`}
              >
                {m.recommended && (
                  <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-600">
                    <Star className="h-3 w-3" />
                    권장
                  </div>
                )}
                <h3 className="mb-1 text-xl font-bold text-gray-900">{m.mode}</h3>
                <p className="mb-4 text-sm text-gray-500">{m.description}</p>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">질문 수</span>
                    <span className="font-bold text-gray-900">{m.questions}문항</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">소요 시간</span>
                    <span className="font-medium text-gray-900">{m.duration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">초기 정확도</span>
                    <span className="font-medium text-gray-900">{m.initialAccuracy}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">90% 도달</span>
                    <span className="font-medium text-purple-600">{m.targetAccuracy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Code Example ── */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
                QUICK START
              </div>
              <h2 className="mb-6 text-3xl font-bold text-gray-900">간단한 연동</h2>
              <p className="mb-4 text-gray-600">
                API 키 하나로 DeepSight의 AI 페르소나를 당신의 서비스에 연동할 수 있습니다. Python,
                Node.js, Ruby, Java, Go SDK를 지원합니다.
              </p>
              <ul className="space-y-3">
                {[
                  "RESTful API + 5개 언어 공식 SDK",
                  "Bearer 토큰 인증 (Test/Live 키 분리)",
                  "유저 프로파일링 → 매칭 → 추천 파이프라인",
                  "추천 이유까지 포함된 응답",
                  "자동 재시도 + 레이트 리밋 처리 내장",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <Zap className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Code Block */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-xl">
              <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-gray-400">example.ts</span>
              </div>
              <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-gray-300">
                <code>{`import { DeepSight } from '@deepsight/sdk'

const ds = new DeepSight({
  apiKey: process.env.DEEPSIGHT_API_KEY
})

// 1. 영화 전문 페르소나 검색
const personas = await ds.personas.list({
  expertise: '영화',
  role: 'REVIEWER'
})

// 2. 온보딩 질문 가져오기 (Quick 12문항)
const questions = await ds.onboarding.getQuestions({
  mode: 'quick'  // 'quick' | 'standard' | 'deep'
})

// 3. 유저 응답으로 3-Layer 프로필 생성
const profile = await ds.profiles.create({
  answers: userAnswers  // 유저가 응답한 결과
})

// 4. 유저에게 맞는 페르소나 매칭
const matches = await ds.match({
  profileId: profile.id,
  tier: 'exploration'  // basic | advanced | exploration
})
// → latency: ~50ms, 106D+ 전체 연산

// 5. 페르소나가 추천 + 이유 설명
const recs = await ds.recommend({
  personaId: matches[0].id,
  profileId: profile.id
})
// → { title: "기생충",
//     reason: "서사 구조가 탄탄하고..." }`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              PRICING
            </div>
            <h2 className="text-3xl font-bold text-gray-900">요금제</h2>
            <p className="mt-4 text-gray-600">
              모든 플랜에서 3가지 매칭 Tier를 모두 사용할 수 있습니다. 연간 결제 시 20% 할인.
            </p>
          </div>

          {/* Standard Plans */}
          <div className="mb-12 grid gap-6 md:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border ${plan.highlighted ? "border-2 border-purple-300 shadow-lg" : "border-gray-200"} bg-white p-8`}
              >
                {plan.highlighted && (
                  <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-600">
                    인기
                  </div>
                )}
                <h3 className="mb-2 text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">/월</span>
                </div>
                <p className="mb-6 text-sm text-gray-500">
                  연간 결제 시{" "}
                  <span className="font-bold text-purple-600">${plan.annualPrice}/월</span>
                </p>

                <div className="space-y-3 border-t border-gray-100 pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">페르소나</span>
                    <span className="font-medium text-gray-900">{plan.personas}개</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">API 호출</span>
                    <span className="font-medium text-gray-900">{plan.apiCalls}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rate Limit</span>
                    <span className="font-mono font-medium text-gray-900">{plan.rateLimit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">API 키</span>
                    <span className="font-medium text-gray-900">{plan.apiKeys}개</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">팀 멤버</span>
                    <span className="font-medium text-gray-900">{plan.teamMembers}명</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SLA</span>
                    <span className="font-medium text-gray-900">{plan.sla}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">지원</span>
                    <span className="font-medium text-gray-900">{plan.support}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
            <div className="mb-6 text-center">
              <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
              <p className="mt-2 text-sm text-gray-600">
                SSO(SAML 2.0/OIDC), IP 화이트리스트, 전담 매니저, On-Premise 협의가 포함됩니다.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {ENTERPRISE_PLANS.map((ep) => (
                <div key={ep.name} className="rounded-xl border border-gray-200 bg-white p-5">
                  <h4 className="mb-2 font-bold text-gray-900">{ep.name}</h4>
                  <div className="mb-3 text-2xl font-bold text-gray-900">
                    {ep.price}
                    <span className="text-sm font-normal text-gray-500">/월</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">페르소나</span>
                      <span className="font-medium">{ep.personas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">API 호출</span>
                      <span className="font-medium">{ep.apiCalls}/월</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rate Limit</span>
                      <span className="font-mono font-medium">{ep.rateLimit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SLA</span>
                      <span className="font-medium">{ep.sla}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Link
                href={`mailto:${CONTACT_EMAIL}?subject=Enterprise 요금제 문의`}
                className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Enterprise 문의하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dev Tools ── */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              DEVELOPER TOOLS
            </div>
            <h2 className="text-3xl font-bold text-gray-900">개발자 도구</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {DEV_TOOLS.map((tool) => (
              <div key={tool.title} className="rounded-2xl border border-gray-200 bg-white p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                  <tool.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{tool.title}</h3>
                <p className="text-sm text-gray-600">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Error Handling ── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900">에러 처리</h2>
            <p className="mt-2 text-sm text-gray-600">
              표준화된 에러 응답으로 안정적인 연동을 보장합니다.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">코드</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">HTTP</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">설명</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">대응</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "UNAUTHORIZED", http: "401", desc: "잘못된 API 키", action: "인증 확인" },
                  { code: "FORBIDDEN", http: "403", desc: "권한 없음", action: "키 권한 확인" },
                  {
                    code: "INVALID_REQUEST",
                    http: "400",
                    desc: "요청 형식 오류",
                    action: "요청 검증",
                  },
                  {
                    code: "RATE_LIMITED",
                    http: "429",
                    desc: "Rate Limit 초과",
                    action: "재시도 (SDK 자동)",
                  },
                  {
                    code: "QUOTA_EXCEEDED",
                    http: "429",
                    desc: "월간 쿼타 초과",
                    action: "플랜 업그레이드",
                  },
                  {
                    code: "SERVER_ERROR",
                    http: "500",
                    desc: "서버 오류",
                    action: "재시도 또는 문의",
                  },
                ].map((err) => (
                  <tr key={err.code} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-6 py-3 font-mono text-xs text-red-600">{err.code}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{err.http}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{err.desc}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{err.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Response Format */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-900">
            <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-2">
              <span className="text-xs text-gray-400">에러 응답 형식</span>
            </div>
            <pre className="p-4 text-sm text-gray-300">
              <code>{`{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "retry_after": 60
  }
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ds-dark-section py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white">곧 출시됩니다</h2>
          <p className="mb-8 text-gray-400">
            Developer Console과 SDK는 현재 개발 중입니다. 출시 시 가격 정책과 함께 상세한 API 문서를
            공개할 예정입니다. 연간 결제 20% 할인은 출시 후 바로 적용됩니다.
          </p>
          <Link
            href={`mailto:${CONTACT_EMAIL}?subject=Developer Console 출시 알림 신청`}
            className="ds-button inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-white"
          >
            <Bell className="h-4 w-4" />
            출시 알림 받기
          </Link>
        </div>
      </section>
    </div>
  )
}
