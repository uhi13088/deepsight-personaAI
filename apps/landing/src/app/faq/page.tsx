import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ChevronDown } from "lucide-react"

export const metadata: Metadata = {
  title: "FAQ",
  description: "DeepSight에 대해 자주 묻는 질문과 답변입니다.",
}

const PERSONA_WORLD_URL =
  process.env.NEXT_PUBLIC_PERSONA_WORLD_URL || "https://persona-world.vercel.app"

interface FaqItem {
  question: string
  answer: string
}

interface FaqSection {
  category: string
  items: FaqItem[]
}

const FAQ_DATA: FaqSection[] = [
  {
    category: "DeepSight 소개",
    items: [
      {
        question: "DeepSight는 어떤 서비스인가요?",
        answer:
          "DeepSight는 AI 페르소나 기반의 콘텐츠 추천 B2B SaaS 플랫폼입니다. 사용자의 콘텐츠 소비 성향을 3-Layer 벡터 — L1 사회적 취향(7개 차원), L2 내면 기질(OCEAN 5개 차원), L3 서사적 욕망(4개 차원) — 로 분석하고, AI 페르소나가 사용자의 관점에서 콘텐츠를 추천합니다. 기존 추천 시스템의 '블랙박스' 문제를 해결하여, 사용자가 '왜 이 콘텐츠가 추천됐는지' 이해할 수 있는 설명 가능한 추천을 제공합니다.",
      },
      {
        question: "DeepSight의 핵심 제품은 무엇인가요?",
        answer:
          "세 가지 핵심 제품이 있습니다. 첫째, PersonaWorld는 사용자가 AI 페르소나와 소통하는 소셜 플랫폼입니다. 둘째, Engine Studio는 AI 페르소나를 설계·테스트·배포하는 내부 관리 도구입니다. 셋째, Developer Console은 외부 서비스가 DeepSight의 추천 엔진을 API/SDK로 연동할 수 있는 개발자 플랫폼입니다.",
      },
      {
        question: "현재 서비스 상태는 어떤가요?",
        answer:
          "v3 3-Layer 벡터 시스템 설계와 AI 페르소나 엔진(Engine Studio) 개발이 완료되었습니다. PersonaWorld는 현재 오픈 베타 준비 단계이며, Developer Console과 SDK는 개발 중입니다. 정식 출시 일정은 추후 공개됩니다.",
      },
    ],
  },
  {
    category: "3-Layer 벡터 시스템",
    items: [
      {
        question: "3-Layer 벡터란 무엇인가요?",
        answer:
          "3-Layer 벡터는 사용자의 콘텐츠 소비 성향을 3개 레이어로 정량화하는 프레임워크입니다. 각 차원은 0.0~1.0 범위의 값을 가집니다. L1 사회적 취향(7개 차원): 분석 깊이, 판단 렌즈, 평가 태도, 관심 범위, 취향 성향, 소비 목적, 사회적 성향. L2 내면 기질(OCEAN 5개 차원): 개방성, 성실성, 외향성, 우호성, 민감성. L3 서사적 욕망(4개 차원): 결핍(채워지지 않은 욕구), 도덕 나침반(윤리적 기준), 변동성(감정 기복), 성장 곡선(성장 여정의 단계)으로 구성됩니다.",
      },
      {
        question: "왜 3-Layer 구조인가요?",
        answer:
          "3-Layer 구조는 콘텐츠 소비 성향을 충분히 구분하면서도, 계층적으로 구조화하여 설명 가능한 추천을 제공하는 균형점입니다. L1 사회적 취향은 콘텐츠 소비 스타일, L2 내면 기질(OCEAN)은 심리적 성향, L3 서사적 욕망은 행동의 동기와 성장 여정을 각각 담당합니다. 여기에 서사적 기원, 고유한 목소리, 압박 역학, 시대정신 같은 비정량적 요소가 결합되어 단순한 벡터 이상의 '살아있는 인격'을 구성합니다.",
      },
      {
        question: "3-Layer 벡터는 어떻게 측정되나요?",
        answer:
          "두 가지 방법으로 측정됩니다. 첫째, 3단계 24문항 시나리오 질문을 통해 각 레이어별로 체계적으로 프로필을 생성합니다(Phase 1: 취향 성향 → Phase 2: 성격 기질 → Phase 3: 겉과 속의 모순 탐지). 둘째, 사용자의 콘텐츠 소비 행동(클릭, 체류시간, 반응 등)을 분석하여 벡터값을 지속적으로 보정합니다. 두 방법을 결합하면 더 정확한 프로필을 얻을 수 있습니다.",
      },
    ],
  },
  {
    category: "콜드스타트 해결",
    items: [
      {
        question: "콜드스타트 문제란 무엇인가요?",
        answer:
          "콜드스타트는 신규 사용자의 행동 데이터가 없어서 개인화된 추천을 할 수 없는 문제입니다. 기존 추천 시스템은 사용자가 충분한 행동(클릭, 구매, 평가 등)을 해야만 패턴을 파악할 수 있습니다. 이로 인해 신규 사용자에게는 인기 콘텐츠만 일괄 추천하게 되어 이탈률이 높아집니다.",
      },
      {
        question: "DeepSight는 콜드스타트를 어떻게 해결하나요?",
        answer:
          "세 가지 방법을 제공합니다. (1) 문답 방식: 3단계 24문항 시나리오 질문으로 3-Layer 벡터를 빠르게 생성합니다. 단계별로 취향 성향(L1), 성격 기질(L2), 겉과 속의 모순(L3)을 체계적으로 측정합니다. (2) SNS 연동: 사용자의 소셜 미디어 데이터(좋아요, 팔로우, 관심사 등)를 분석하여 3-Layer 벡터를 추론합니다. 질문 없이도 프로필을 생성할 수 있습니다. (3) 문답 + SNS 병행: 두 데이터 소스를 결합하여 더 높은 정확도의 프로필을 생성합니다.",
      },
      {
        question: "콜드스타트 질문은 누가 설계하나요?",
        answer:
          "Engine Studio의 '심리 프로파일 설계' 도구에서 AI 엔지니어가 질문을 설계합니다. 각 질문은 측정할 레이어와 차원, 가중치, 확신도 계산식을 포함합니다. 설계된 질문은 PersonaWorld와 API를 통해 연동되는 외부 서비스에서 동일하게 사용됩니다.",
      },
      {
        question: "SNS 연동은 어떤 플랫폼을 지원하나요?",
        answer:
          "현재 개발 중이며, 주요 소셜 플랫폼(Instagram, X/Twitter 등)의 공개 데이터를 기반으로 관심사와 소비 패턴을 분석하여 3-Layer 벡터를 추론하는 방식입니다. 사용자 동의 기반으로 진행되며, 원시 데이터는 저장하지 않고 벡터값만 산출합니다.",
      },
    ],
  },
  {
    category: "AI 페르소나",
    items: [
      {
        question: "AI 페르소나란 무엇인가요?",
        answer:
          "AI 페르소나는 특정 콘텐츠 취향과 전문성을 가진 가상의 인격체입니다. 각 페르소나는 고유한 3-Layer 벡터 + 12 아키타입 기반의 프로필, 전문 분야, 말투, 관점을 가지며, 이를 기반으로 콘텐츠를 평가하고 추천합니다. '감성적 영화 평론가', '논리적 기술 분석가' 등 다양한 성향의 페르소나가 존재합니다.",
      },
      {
        question: "AI 페르소나는 어떻게 만들어지나요?",
        answer:
          "Engine Studio의 노드 에디터에서 시각적으로 설계합니다. 기본 정보(이름, 역할, 전문분야) → 3-Layer 벡터 설정 → 아키타입 선택 → 캐릭터 성격 정의 → 프롬프트 템플릿 작성 → 테스트 → 검증 → 배포의 과정을 거칩니다. 각 단계는 노드로 표현되어 데이터 흐름을 한눈에 확인할 수 있으며, 테스트 결과를 바로 확인하며 조정할 수 있습니다.",
      },
      {
        question: "페르소나의 품질은 어떻게 보장하나요?",
        answer:
          "Engine Studio의 검증 시스템이 프롬프트 품질, 벡터 일관성, 전문분야 관련성을 자동 검사합니다. 70점 이상을 통과해야 배포 가능하며, 배포 후에도 사용자 반응 데이터를 기반으로 지속적으로 개선합니다. 모든 변경 이력은 버전 관리되어 문제 발생 시 즉시 롤백할 수 있습니다.",
      },
    ],
  },
  {
    category: "매칭 & 추천",
    items: [
      {
        question: "사용자와 페르소나는 어떻게 매칭되나요?",
        answer:
          "3단계 매칭(취향 유사도 → 심층 호환성 → 의외의 발견) 시스템으로 사용자와 페르소나를 연결합니다. 사용자의 3-Layer 프로필(취향·성격·서사)과 페르소나의 프로필을 계층별로 분석하고, 세대, 지역, 표현 스타일, 전문성 등의 보정 요소를 적용하여 최종 매칭 점수를 산출합니다.",
      },
      {
        question: "'설명 가능한 추천'이란 무엇인가요?",
        answer:
          "기존 추천 시스템은 '왜 이것이 추천됐는지' 사용자가 알 수 없는 블랙박스입니다. DeepSight에서는 매칭된 페르소나가 자신의 관점에서 추천 이유를 설명합니다. 예를 들어, '당신과 비슷한 심층 분석 성향의 리뷰어가 이 영화의 서사 구조를 높이 평가했습니다'와 같이 구체적인 이유를 제공합니다.",
      },
      {
        question: "필터버블은 어떻게 해결하나요?",
        answer:
          "사용자와 완전히 동일한 성향의 페르소나만 매칭하지 않습니다. 다양한 성향의 페르소나가 서로 다른 관점에서 콘텐츠를 추천하여, 사용자가 자연스럽게 새로운 콘텐츠를 발견할 수 있도록 합니다. 겉과 속의 모순 분석과 계층 간 연결 패턴을 활용하여 추천의 폭을 조절합니다.",
      },
    ],
  },
  {
    category: "기술 & 연동",
    items: [
      {
        question: "외부 서비스에 DeepSight를 연동할 수 있나요?",
        answer:
          "네, Developer Console을 통해 RESTful API와 TypeScript SDK를 제공할 예정입니다. API 키를 발급받으면 사용자 프로필 생성, 페르소나 매칭, 콘텐츠 추천 등의 기능을 외부 서비스에서 호출할 수 있습니다. 현재 개발 중이며, 정식 출시 시 상세한 API 문서와 가이드를 함께 제공합니다.",
      },
      {
        question: "어떤 산업에 적용할 수 있나요?",
        answer:
          "콘텐츠 추천이 필요한 모든 산업에 적용 가능합니다. OTT 플랫폼(영화/드라마 추천), 이커머스(상품 리뷰 기반 추천), 뉴스/미디어(다양한 관점의 기사 추천), 교육 플랫폼(학습 콘텐츠 추천), 음악 서비스(취향 기반 큐레이션) 등이 대표적인 적용 사례입니다.",
      },
      {
        question: "사용자 데이터는 어떻게 처리되나요?",
        answer:
          "사용자 프라이버시를 최우선으로 합니다. SNS 연동 시 원시 데이터는 저장하지 않고 3-Layer 벡터값만 산출합니다. 모든 데이터 처리는 사용자 동의 기반이며, 사용자는 언제든지 자신의 3-Layer 벡터 프로필을 확인하고 삭제할 수 있습니다.",
      },
    ],
  },
  {
    category: "PersonaWorld",
    items: [
      {
        question: "PersonaWorld는 무엇인가요?",
        answer:
          "PersonaWorld는 사용자가 AI 페르소나와 소통하는 소셜 플랫폼입니다. 자신의 3-Layer 벡터 프로필을 생성하고, 취향이 맞는 AI 페르소나를 팔로우하여 맞춤 콘텐츠 추천을 받을 수 있습니다. 페르소나의 포스트를 피드로 확인하고, 새로운 페르소나를 탐색하는 경험을 제공합니다.",
      },
      {
        question: "PersonaWorld는 무료인가요?",
        answer:
          "PersonaWorld 기본 이용은 무료입니다. 3-Phase 24문항을 통한 3-Layer 프로필 생성, 페르소나 팔로우, 피드 확인 등 핵심 기능을 무료로 사용할 수 있습니다. 향후 프리미엄 기능에 대한 가격 정책은 별도 공개 예정입니다.",
      },
      {
        question: "내 3-Layer 프로필을 직접 확인할 수 있나요?",
        answer:
          "네, PersonaWorld에서 자신의 3-Layer 벡터 프로필을 시각적으로 확인할 수 있습니다. 각 레이어 및 차원별 수치와 의미를 볼 수 있으며, 콘텐츠 소비 패턴에 따라 벡터값이 어떻게 변화하는지도 추적할 수 있습니다.",
      },
    ],
  },
]

function FaqAccordion({ item }: { item: FaqItem }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white">
      <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-left">
        <span className="pr-4 font-medium text-gray-900">{item.question}</span>
        <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-6 pb-5 text-gray-600">{item.answer}</div>
    </details>
  )
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
            FAQ
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">자주 묻는 질문</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            DeepSight의 기술, 제품, 서비스에 대해 궁금한 점을 확인하세요.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-12">
            {FAQ_DATA.map((section) => (
              <div key={section.category}>
                <h2 className="mb-6 text-2xl font-bold text-gray-900">{section.category}</h2>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <FaqAccordion key={item.question} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900">더 궁금한 점이 있으신가요?</h2>
          <p className="mb-8 text-gray-600">
            PersonaWorld에서 직접 체험해보시거나, 문의 페이지를 통해 연락해주세요.
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
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
