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
} from "lucide-react"

export const metadata: Metadata = {
  title: "Developer Console",
  description:
    "DeepSight의 AI 페르소나를 API로 연동하세요. 콘텐츠 추천, 평가, 유저 프로파일링을 당신의 서비스에.",
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@deepsight.ai"

const API_FEATURES = [
  {
    icon: Search,
    title: "페르소나 카탈로그",
    badge: "Catalog API",
    description:
      "DeepSight에 등록된 AI 페르소나를 검색하고 조회합니다. 역할, 전문분야, 3-Layer 벡터 성향으로 필터링하여 서비스에 맞는 페르소나를 선택하세요.",
    example: "OTT 서비스가 '영화 전문 리뷰어' 페르소나를 검색",
  },
  {
    icon: Users,
    title: "유저 프로파일링",
    badge: "Profiling API",
    description:
      "Quick(12문항, 1.5분) / Standard(30문항, 4분) / Deep(60문항, 8분) 3가지 온보딩 모드로 자사 유저의 3-Layer 프로필을 생성합니다. SNS 연동 분석도 지원하여, 신규 유저에게도 즉시 개인화된 경험을 제공할 수 있습니다.",
    example: "웹소설 플랫폼이 신규 가입자의 취향을 즉시 파악",
  },
  {
    icon: Zap,
    title: "유저-페르소나 매칭",
    badge: "Matching API",
    description:
      "유저의 3-Layer 프로필과 페르소나 프로필 간 3단계 매칭 (취향 유사도 → 심층 호환성 → 의외의 발견)으로 최적의 페르소나를 매칭합니다. 다양성 보정을 포함하여 필터버블도 방지합니다.",
    example: "음악 앱이 각 유저에게 맞춤 큐레이터 페르소나를 배정",
  },
  {
    icon: MessageSquare,
    title: "콘텐츠 추천",
    badge: "Recommendation API",
    description:
      "매칭된 페르소나가 유저의 성향에 맞는 콘텐츠를 추천하고, 추천 이유를 함께 설명합니다. '왜 이 콘텐츠인지' 사용자가 이해할 수 있는 투명한 추천입니다.",
    example: "'감성 시네필이 추천하는 이번 주 영화 TOP 5'",
  },
  {
    icon: Star,
    title: "콘텐츠 평가",
    badge: "Evaluation API",
    description:
      "페르소나의 관점에서 특정 콘텐츠를 리뷰하고 분석합니다. 자사 콘텐츠에 AI 기반의 다양한 관점 리뷰를 자동으로 생성할 수 있습니다.",
    example: "출판사가 신간 도서에 페르소나별 AI 리뷰를 자동 부착",
  },
]

const DEV_TOOLS = [
  {
    icon: Key,
    title: "API 키 관리",
    description: "프로젝트별 API 키 발급, 사용량 모니터링, Rate limiting 설정",
  },
  {
    icon: Terminal,
    title: "인터랙티브 콘솔",
    description: "브라우저에서 API를 직접 테스트하고 요청/응답을 실시간 확인",
  },
  {
    icon: BookOpen,
    title: "문서 & SDK",
    description: "상세 API 문서, TypeScript SDK, 샘플 코드와 통합 가이드 제공",
  },
  {
    icon: BarChart3,
    title: "분석 대시보드",
    description: "API 호출량, 매칭 정확도, 유저 만족도 지표를 실시간 확인",
  },
]

export default function DeveloperConsolePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm text-purple-700">
            <Code className="h-4 w-4" />
            For Developers
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            DeepSight의 <span className="ds-text-gradient">AI 페르소나</span>를
            <br />
            당신의 서비스에
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
            DeepSight가 만든 AI 페르소나를 API로 연동하세요. 콘텐츠 추천, 유저 프로파일링, 페르소나
            매칭까지 — 검증된 추천 시스템을 직접 구축할 필요 없이 바로 사용할 수 있습니다.
          </p>
        </div>
      </section>

      {/* Core APIs */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              CORE APIs
            </div>
            <h2 className="text-3xl font-bold text-gray-900">페르소나를 활용하는 5가지 API</h2>
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

      {/* Code Example */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
                QUICK START
              </div>
              <h2 className="mb-6 text-3xl font-bold text-gray-900">간단한 연동</h2>
              <p className="mb-4 text-gray-600">
                API 키 하나로 DeepSight의 AI 페르소나를 당신의 서비스에 연동할 수 있습니다. 페르소나
                검색부터 콘텐츠 추천까지, 모든 과정을 SDK로 제어하세요.
              </p>
              <ul className="space-y-3">
                {[
                  "RESTful API + TypeScript SDK",
                  "페르소나 카탈로그 검색 & 조회",
                  "유저 프로파일링 → 매칭 → 추천 파이프라인",
                  "추천 이유까지 포함된 응답",
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
  tier: 'advanced'  // basic | advanced | exploration
})

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

      {/* Dev Tools */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900">개발자 도구</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {DEV_TOOLS.map((tool, idx) => (
              <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                  <tool.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{tool.title}</h3>
                <p className="text-gray-600">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ds-dark-section py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white">곧 출시됩니다</h2>
          <p className="mb-8 text-gray-400">
            Developer Console과 SDK는 현재 개발 중입니다. 출시 시 가격 정책과 함께 상세한 API 문서를
            공개할 예정입니다.
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
