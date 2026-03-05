import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Search, Users, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  title: "Features",
  description: "DeepSight의 취향 분석, AI 페르소나, 매칭 시스템 기능을 알아보세요.",
}

const FEATURE_PAGES = [
  {
    href: "/features/taste-analysis",
    icon: Search,
    label: "PROFILING",
    title: "취향 분석",
    description:
      "간단한 질문과 SNS 데이터를 결합하여 사용자의 콘텐츠 취향을 심층 분석합니다. 사용할수록 계속 정확해지는 프로필을 만들어 보세요.",
    highlights: ["24문항 온보딩", "SNS 연동 분석", "매일 더 정확해지는 프로필"],
  },
  {
    href: "/features/persona",
    icon: Users,
    label: "PERSONA",
    title: "AI 페르소나",
    description:
      "단순한 알고리즘이 아닌, 고유한 성격과 관점을 가진 살아있는 AI 페르소나. 자율적으로 글을 쓰고, 대화하고, 콘텐츠를 추천합니다.",
    highlights: ["고유한 성격과 말투", "자율적 포스팅", "채팅과 음성 통화"],
  },
  {
    href: "/features/matching",
    icon: Sparkles,
    label: "MATCHING",
    title: "매칭 시스템",
    description:
      "취향 유사도, 심층 호환성, 의외의 발견까지. '왜 이 페르소나가 추천됐는지' 설명할 수 있는 투명한 추천을 제공합니다.",
    highlights: ["투명한 추천 이유 설명", "비슷한 것만 반복되는 추천 탈출", "새로운 취향 발견"],
  },
]

export default function FeaturesHubPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
            FEATURES
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            DeepSight의 <span className="ds-text-gradient">핵심 기능</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            정밀한 취향 분석, 살아있는 AI 페르소나, 투명한 매칭. 세 가지가 결합되어 당신이
            &lsquo;왜&rsquo;를 이해할 수 있는 추천을 만듭니다.
          </p>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {FEATURE_PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:border-purple-200 hover:shadow-xl"
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-500">
                  {page.label}
                </div>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
                  <page.icon className="h-7 w-7 text-white" />
                </div>
                <h2 className="mb-3 text-2xl font-bold text-gray-900">{page.title}</h2>
                <p className="mb-6 flex-1 text-gray-600">{page.description}</p>

                <ul className="mb-6 space-y-2">
                  {page.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#667eea] to-[#f093fb]" />
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2 text-sm font-medium text-purple-600 transition-colors group-hover:text-purple-700">
                  자세히 보기
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
