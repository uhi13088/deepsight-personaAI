import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Layers } from "lucide-react"

export const metadata: Metadata = {
  title: "About",
  description: "DeepSight는 AI 페르소나 기반 6D 벡터 추천 시스템을 만드는 팀입니다.",
}

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"

const MILESTONES = [
  {
    phase: "Phase 1",
    title: "6D 벡터 시스템 설계",
    description: "콘텐츠 소비 성향을 6개의 독립적 차원으로 분석하는 프레임워크 구축",
    status: "완료",
  },
  {
    phase: "Phase 2",
    title: "AI 페르소나 엔진",
    description: "Engine Studio를 통한 AI 페르소나 생성, 관리, 버전 관리 시스템 개발",
    status: "완료",
  },
  {
    phase: "Phase 3",
    title: "PersonaWorld 오픈 베타",
    description: "사용자가 AI 페르소나와 직접 소통하는 소셜 플랫폼 런칭",
    status: "진행중",
  },
  {
    phase: "Phase 4",
    title: "Developer Console & SDK",
    description: "외부 서비스가 DeepSight 추천 엔진을 API로 연동할 수 있는 플랫폼",
    status: "개발중",
  },
]

const VALUES = [
  {
    title: "설명 가능한 AI",
    description:
      "추천 시스템의 블랙박스를 열어, 사용자가 '왜 이것이 추천됐는지' 이해할 수 있도록 합니다.",
  },
  {
    title: "사용자 주권",
    description:
      "데이터는 사용자의 것입니다. 6D 벡터를 통해 자신의 콘텐츠 소비 성향을 직접 확인하고 이해할 수 있습니다.",
  },
  {
    title: "다양성 존중",
    description:
      "필터버블을 탈출합니다. 다양한 페르소나가 서로 다른 관점을 제시하여 콘텐츠 소비의 폭을 넓혀줍니다.",
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600">
              <Layers className="h-9 w-9 text-white" />
            </div>
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            추천의 <span className="ds-text-gradient">블랙박스</span>를 엽니다
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            DeepSight는 AI 페르소나 기반 6D 벡터 추천 시스템을 개발하는 팀입니다. 기존 추천 시스템의
            한계를 넘어, 사용자가 &ldquo;왜&rdquo;를 이해할 수 있는 설명 가능한 추천 기술을
            만듭니다.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
                OUR MISSION
              </div>
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                콘텐츠 추천을
                <br />
                사용자가 이해하는 세상
              </h2>
              <p className="mb-4 text-gray-600">
                오늘날 대부분의 추천 시스템은 블랙박스입니다. 사용자는 왜 특정 콘텐츠가 추천됐는지
                알 수 없고, 알고리즘은 비슷한 콘텐츠만 반복 추천합니다.
              </p>
              <p className="text-gray-600">
                DeepSight는 이 문제를 해결합니다. 6D 벡터로 사용자의 취향을 정량화하고, AI
                페르소나가 자신의 관점에서 추천 이유를 설명합니다. 사용자는 자신의 성향을 이해하고,
                새로운 콘텐츠를 발견할 수 있습니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {VALUES.map((value, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border border-gray-200 bg-white p-6 ${idx === 2 ? "col-span-2" : ""}`}
                >
                  <h3 className="mb-2 font-bold text-gray-900">{value.title}</h3>
                  <p className="text-sm text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
              ROADMAP
            </div>
            <h2 className="text-3xl font-bold text-gray-900">개발 로드맵</h2>
          </div>

          <div className="space-y-6">
            {MILESTONES.map((milestone, idx) => (
              <div key={idx} className="flex gap-6 rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      milestone.status === "완료"
                        ? "bg-green-100 text-green-600"
                        : milestone.status === "진행중"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {idx < MILESTONES.length - 1 && <div className="mt-2 h-full w-0.5 bg-gray-200" />}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">{milestone.phase}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        milestone.status === "완료"
                          ? "bg-green-100 text-green-700"
                          : milestone.status === "진행중"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {milestone.status}
                    </span>
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-gray-900">{milestone.title}</h3>
                  <p className="text-sm text-gray-600">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900">함께 만들어가요</h2>
          <p className="mb-8 text-gray-600">
            DeepSight의 여정에 함께하세요. PersonaWorld에서 AI 페르소나를 직접 만나보세요.
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
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
