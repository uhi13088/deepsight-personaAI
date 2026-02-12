import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Layers, Quote } from "lucide-react"

export const metadata: Metadata = {
  title: "About",
  description: "DeepSight는 AI 페르소나 기반 3-Layer 벡터 추천 시스템을 만드는 팀입니다.",
}

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"

const TEAM_STORIES = [
  {
    name: "민준",
    role: "Founder",
    avatar: "from-[#667eea] to-[#f093fb]",
    quote:
      "넷플릭스를 켜면 항상 뭘 봐야 할지 모르겠어요. 드라마를 좋아하는데, 추천받아서 봤다가 취향 안 맞으면 시간이 너무 아까워요. 소설이나 웹툰도 마찬가지고요. 내 시간은 한정되어 있으니까... 나와 완전히 똑같은 도플갱어 AI가 먼저 보고 알려주면 좋겠다고 생각했어요. 실패하지 않을, 검증된 콘텐츠만 소비하고 싶었거든요. 그게 AI 페르소나의 시작이었습니다.",
    highlight: "실패 없는 콘텐츠 소비",
  },
  {
    name: "서연",
    role: "Product Designer",
    avatar: "from-[#f093fb] to-[#f5576c]",
    quote:
      "웹소설을 매일 읽는데, 신작이 하루에도 수십 편씩 쏟아져요. 10화까지 읽었는데 취향 아닌 걸 알았을 때... 그 허탈함이란. 누군가 미리 읽고 '이건 너한테 맞아'라고 알려주는 친구가 있으면 좋겠다는 생각을 늘 했어요. 그 친구가 AI라면, 수백 편을 동시에 읽어줄 수 있잖아요.",
    highlight: "콘텐츠 홍수 속 길잡이",
  },
  {
    name: "현우",
    role: "AI Engineer",
    avatar: "from-[#667eea] to-[#f5576c]",
    quote:
      "음악 앱 플레이리스트가 점점 비슷해지는 게 느껴졌어요. 제가 좋아하는 장르만 계속 틀어주니까, 한 달이 지나면 이미 다 아는 노래뿐이더라고요. 새로운 음악을 발견하는 즐거움이 사라진 거예요. 필터버블을 깨면서도 내 취향을 존중하는 추천, 그게 가능해야 한다고 생각했습니다.",
    highlight: "필터버블 없는 발견의 즐거움",
  },
  {
    name: "지은",
    role: "Data Analyst",
    avatar: "from-[#f5576c] to-[#667eea]",
    quote:
      "퇴근하면 시간이 2~3시간밖에 없어요. 영화 한 편을 볼까, 드라마 한 편을 볼까 고민하다가 결국 유튜브 숏츠만 보고 자는 날이 많았어요. 선택이 두려운 거예요, 실패하면 오늘 밤이 통째로 날아가니까. 내 취향을 정확히 아는 AI가 '오늘은 이거 봐'라고 딱 한 마디 해주면... 그게 얼마나 편할까요.",
    highlight: "한정된 시간, 확실한 선택",
  },
]

const MILESTONES = [
  {
    phase: "Phase 1",
    title: "v3 3-Layer 벡터 시스템 설계",
    description: "콘텐츠 소비 성향을 3-Layer 벡터 + 서사·음성 프로파일로 분석하는 프레임워크 구축",
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
      "데이터는 사용자의 것입니다. 3-Layer 벡터를 통해 자신의 콘텐츠 소비 성향을 직접 확인하고 이해할 수 있습니다.",
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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#667eea] via-[#f093fb] to-[#f5576c]">
              <Layers className="h-9 w-9 text-white" />
            </div>
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            추천의 <span className="ds-text-gradient">블랙박스</span>를 엽니다
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            DeepSight는 AI 페르소나 기반 3-Layer 벡터 추천 시스템을 개발하는 팀입니다. 기존 추천
            시스템의 한계를 넘어, 사용자가 &ldquo;왜&rdquo;를 이해할 수 있는 설명 가능한 추천 기술을
            만듭니다.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              OUR STORY
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">우리가 시작한 이유</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              DeepSight 팀은 모두 같은 불편함을 겪고 있었습니다. 콘텐츠는 넘쳐나는데, 정작 나에게
              맞는 콘텐츠를 찾는 건 너무 어렵다는 것. 실패할 때마다 아까운 건 시간이었습니다.
            </p>
          </div>

          <div className="space-y-6">
            {TEAM_STORIES.map((story, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-md"
              >
                <Quote className="absolute right-8 top-8 h-8 w-8 text-gray-100" />
                <div className="mb-4 flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${story.avatar} text-sm font-bold text-white`}
                  >
                    {story.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{story.name}</div>
                    <div className="text-sm text-gray-500">{story.role}</div>
                  </div>
                  <div className="ml-auto rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-600">
                    {story.highlight}
                  </div>
                </div>
                <p className="leading-relaxed text-gray-600">&ldquo;{story.quote}&rdquo;</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-gradient-to-r from-[#667eea]/5 via-[#f093fb]/5 to-[#f5576c]/5 p-8 text-center">
            <p className="text-lg font-medium text-gray-900">
              이 경험들이 모여 하나의 질문이 되었습니다.
            </p>
            <p className="mt-2 text-2xl font-bold">
              <span className="ds-text-gradient">
                &ldquo;나와 똑같은 취향의 AI가 먼저 보고 알려주면?&rdquo;
              </span>
            </p>
            <p className="mt-4 text-gray-600">
              그래서 우리는 AI 페르소나를 만들기 시작했습니다. 사용자의 취향을 3-Layer 벡터로
              정량화하고, 서사와 음성까지 입혀 살아 숨 쉬는 도플갱어 AI가 수백 개의 콘텐츠를 미리
              소비한 뒤, 검증된 추천만 전달하는 시스템. 그것이 DeepSight입니다.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
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
                DeepSight는 이 문제를 해결합니다. 3-Layer 벡터로 사용자의 취향을 정량화하고, AI
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
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
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
                          ? "bg-purple-100 text-purple-600"
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
                            ? "bg-purple-100 text-purple-700"
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
