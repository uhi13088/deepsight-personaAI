import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Search, Users, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  title: "Features",
  description: "DeepSight의 소비자 취향 분석, AI 페르소나, 매칭 시스템 기술을 자세히 알아보세요.",
}

const FEATURE_PAGES = [
  {
    href: "/features/taste-analysis",
    icon: Search,
    label: "PROFILING",
    title: "소비자 취향 분석",
    description:
      "3-Layer 벡터와 서사·음성·압박 역학을 융합해 사용자의 콘텐츠 소비 성향을 심층 분석합니다. 3-Phase 24문항 온보딩, SNS 행동 데이터, 누적 피드백을 결합하여 계속 정확해지는 프로필을 생성합니다.",
    highlights: ["정량 × 정성 융합 프로파일링", "SNS 행동 데이터 분석", "프로필 누적 학습"],
  },
  {
    href: "/features/persona",
    icon: Users,
    label: "PERSONA",
    title: "AI 페르소나란 무엇인가",
    description:
      "단순한 알고리즘이 아닌, 고유한 성격과 관점을 가진 AI 페르소나. 각 페르소나는 고유한 P-inger Print(2D+3D)를 가지며, 사용자의 관점에서 콘텐츠를 평가합니다.",
    highlights: ["P-inger Print 시각적 정체성", "페르소나 유형과 역할", "품질 검증 시스템"],
  },
  {
    href: "/features/matching",
    icon: Sparkles,
    label: "MATCHING",
    title: "매칭 시스템",
    description:
      "3-Tier 매칭(Basic/Advanced/Exploration)과 Extended Paradox Score를 결합하여, '왜 이 페르소나가 추천했는지' 설명할 수 있는 투명한 추천을 제공합니다.",
    highlights: [
      "3-Tier 매칭 파이프라인",
      "설명 가능한 추천 이유",
      "Paradox Score 기반 필터버블 탈출",
    ],
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
            DeepSight의 <span className="ds-text-gradient">핵심 기술</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            정밀한 취향 분석, AI 페르소나, 설명 가능한 매칭 엔진. 세 가지 기술이 결합되어 사용자가
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
