import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Code, Terminal, Key, BarChart3, Zap, BookOpen } from "lucide-react"

export const metadata: Metadata = {
  title: "Developer Console",
  description: "DeepSight API와 SDK로 당신의 서비스에 AI 페르소나 추천 시스템을 연동하세요.",
}

const DEVELOPER_CONSOLE_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_CONSOLE_URL || "https://developer-console.vercel.app"

export default function DeveloperConsolePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            <Code className="h-4 w-4" />
            For Developers
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            <span className="ds-text-gradient">API & SDK</span>로
            <br />
            추천 시스템 연동
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
            DeepSight의 6D 벡터 매칭 엔진을 당신의 서비스에 연동하세요. RESTful API와 SDK를 제공하여
            빠르게 통합할 수 있습니다.
          </p>
          <Link
            href={DEVELOPER_CONSOLE_URL}
            className="ds-button inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-white"
          >
            Developer Console 열기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* API Example */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-green-600">
                QUICK START
              </div>
              <h2 className="mb-6 text-3xl font-bold text-gray-900">간단한 연동</h2>
              <p className="mb-4 text-gray-600">
                API 키 하나로 DeepSight 추천 엔진을 연동할 수 있습니다. 사용자의 6D 벡터 프로필
                생성부터 페르소나 매칭까지, 모든 과정을 API로 제어하세요.
              </p>
              <ul className="space-y-3">
                {[
                  "RESTful API + TypeScript SDK",
                  "6D 벡터 프로필 생성 API",
                  "페르소나 매칭 & 추천 API",
                  "Webhook으로 실시간 이벤트 수신",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <Zap className="h-4 w-4 flex-shrink-0 text-green-500" />
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

// 사용자 6D 벡터 프로필 생성
const profile = await ds.profiles.create({
  answers: userAnswers
})

// 페르소나 매칭
const matches = await ds.match({
  profileId: profile.id,
  limit: 3
})

// 추천 콘텐츠 가져오기
const recommendations =
  await ds.recommend({
    personaId: matches[0].personaId,
    profileId: profile.id
  })`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900">개발자 도구</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Key,
                title: "API 키 관리",
                description:
                  "프로젝트별 API 키를 생성하고, 사용량을 모니터링하세요. Rate limiting과 보안 정책을 설정할 수 있습니다.",
              },
              {
                icon: Terminal,
                title: "인터랙티브 콘솔",
                description:
                  "Developer Console에서 API를 직접 테스트하세요. 요청과 응답을 실시간으로 확인할 수 있습니다.",
              },
              {
                icon: BookOpen,
                title: "문서 & 가이드",
                description:
                  "상세한 API 문서와 통합 가이드를 제공합니다. 빠르게 시작할 수 있는 샘플 코드와 튜토리얼도 준비되어 있습니다.",
              },
              {
                icon: BarChart3,
                title: "분석 대시보드",
                description: "API 사용량, 매칭 정확도, 사용자 만족도를 실시간으로 확인하세요.",
              },
              {
                icon: Code,
                title: "TypeScript SDK",
                description:
                  "타입 안전한 SDK로 개발 생산성을 높이세요. Next.js, React, Node.js 등 다양한 환경을 지원합니다.",
              },
              {
                icon: Zap,
                title: "빠른 응답",
                description:
                  "매칭 API의 빠른 응답 속도를 목표로 설계하고 있습니다. CDN 최적화로 글로벌 사용자에게 안정적인 서비스를 제공할 예정입니다.",
              },
            ].map((feature, idx) => (
              <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing hint */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900">곧 출시됩니다</h2>
          <p className="mb-8 text-gray-600">
            Developer Console과 SDK는 현재 개발 중입니다. 출시 시 가격 정책과 함께 상세한 API 문서를
            공개할 예정입니다.
          </p>
          <Link
            href={DEVELOPER_CONSOLE_URL}
            className="ds-button inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-white"
          >
            무료로 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
