import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Fingerprint,
  Shield,
  Star,
  Sparkles,
  BookOpen,
  Mic,
  Heart,
} from "lucide-react"
import { PingerPrintShowcase } from "@/components/p-inger-print-showcase"

export const metadata: Metadata = {
  title: "AI 페르소나 — Features",
  description:
    "고유한 6D 성격과 관점을 가진 AI 페르소나. P-inger Print(2D+3D)로 시각화된 디지털 정체성.",
}

const PERSONA_TYPES = [
  {
    type: "Casual",
    icon: Heart,
    label: "일반 시청자",
    description:
      "편하게 즐기고, 감정에 솔직한 반응을 보여줍니다. 어렵지 않은 추천을 원하는 사용자와 매칭됩니다.",
    traits: "낮은 depth, 낮은 lens, 낮은 stance",
    color: "from-pink-500 to-rose-500",
  },
  {
    type: "Enthusiast",
    icon: Star,
    label: "열정적 팬",
    description:
      "좋아하는 장르에 깊이 빠져들고, 관련 정보를 적극적으로 탐색합니다. 특정 분야의 깊은 추천을 제공합니다.",
    traits: "높은 scope, 높은 taste, 중간 depth",
    color: "from-amber-500 to-orange-500",
  },
  {
    type: "Expert",
    icon: BookOpen,
    label: "전문가",
    description: "해당 분야의 맥락과 배경을 이해하고 전문적 관점에서 콘텐츠를 평가합니다.",
    traits: "높은 depth, 높은 lens, 높은 scope",
    color: "from-blue-500 to-indigo-500",
  },
  {
    type: "Critic",
    icon: Mic,
    label: "비평가",
    description: "작품의 예술적 가치, 사회적 메시지, 기술적 완성도를 종합적으로 분석합니다.",
    traits: "높은 depth, 높은 stance, 높은 purpose",
    color: "from-violet-500 to-purple-500",
  },
]

const QUALITY_CHECKS = [
  {
    title: "성격 일관성 검증",
    description: "동일한 콘텐츠에 대해 반복 질의 시 일관된 관점을 유지하는지 테스트합니다.",
    metric: "일관성 점수 70점 이상",
  },
  {
    title: "6D 벡터 반영도",
    description: "응답이 설정된 6D 벡터값에 부합하는지 자동으로 검증합니다.",
    metric: "벡터 정합성 80% 이상",
  },
  {
    title: "차별화 검증",
    description: "서로 다른 페르소나가 실제로 다른 관점을 제공하는지 비교 검증합니다.",
    metric: "페르소나간 차이 점수",
  },
  {
    title: "유해성 필터",
    description: "부적절하거나 편향된 응답을 생성하지 않는지 안전성을 검증합니다.",
    metric: "안전성 점수 95점 이상",
  },
]

export default function PersonaPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <Link
            href="/features"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Features
          </Link>
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
            PERSONA
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            AI <span className="ds-text-gradient">페르소나</span>란 무엇인가
          </h1>
          <p className="max-w-2xl text-lg text-gray-600">
            단순한 추천 알고리즘이 아닌, 고유한 성격과 관점을 가진 AI 페르소나. 각 페르소나는
            자신만의 P-inger Print를 가지며, 사용자의 관점에서 콘텐츠를 평가합니다.
          </p>
        </div>
      </section>

      {/* What is a Persona */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              CONCEPT
            </div>
            <h2 className="text-3xl font-bold text-gray-900">알고리즘이 아닌, 관점을 가진 존재</h2>
            <p className="mt-4 text-gray-600">
              기존 추천 시스템은 &ldquo;비슷한 사용자가 본 콘텐츠&rdquo;를 추천합니다.
              <br />
              DeepSight의 페르소나는 &ldquo;이 관점을 가진 존재가 왜 이 작품을 추천하는지&rdquo;를
              설명합니다.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f093fb]">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">고유한 성격</h3>
              <p className="text-sm text-gray-600">
                각 페르소나는 이름, 말투, 관심사, 전문 분야를 가진 하나의 캐릭터입니다. 기계적
                응답이 아닌, 개성 있는 관점을 제공합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#f093fb] to-[#f5576c]">
                <Fingerprint className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">6D 벡터 프로필</h3>
              <p className="text-sm text-gray-600">
                사용자와 동일한 6D 벡터로 성향을 정량화합니다. 이를 통해 사용자의 취향과 가장 잘
                맞는 페르소나를 정밀 매칭합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f5576c]">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">설명 가능한 추천</h3>
              <p className="text-sm text-gray-600">
                &ldquo;이 페르소나는 당신과 depth 0.85, lens 0.72로 유사하여, 이 작품의 서사 구조를
                좋아할 것으로 판단했습니다.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Layer System */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              2-LAYER SYSTEM
            </div>
            <h2 className="text-3xl font-bold text-gray-900">벡터 + 캐릭터, 2계층 시스템</h2>
            <p className="mt-4 text-gray-600">
              정밀한 매칭을 위한 6D 벡터 레이어와, 사람처럼 느껴지는 캐릭터 레이어가 결합됩니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-purple-200 bg-white p-8">
              <div className="mb-4 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600">
                Layer 1
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">6D 벡터 시스템</h3>
              <p className="mb-4 text-sm text-gray-600">
                콘텐츠 평가 성향을 6개 차원으로 정량화합니다. 사용자와 페르소나 간 코사인 유사도를
                계산하여 매칭에 활용합니다.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>depth, lens, stance, scope, taste, purpose</span>
                  </div>
                  <div className="flex justify-between">
                    <span>범위</span>
                    <span className="font-mono">0.0 ~ 1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>용도</span>
                    <span>유저↔페르소나 유사도 매칭</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-pink-200 bg-white p-8">
              <div className="mb-4 inline-flex rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
                Layer 2
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">캐릭터 속성</h3>
              <p className="mb-4 text-sm text-gray-600">
                이름, 성격, 말투, 전문 분야 등 캐릭터 고유의 개성을 정의합니다. 일부 속성은 매칭
                필터로 활용됩니다.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>기본 정보</span>
                    <span>이름, 한줄 소개, 프로필</span>
                  </div>
                  <div className="flex justify-between">
                    <span>성격/스타일</span>
                    <span>표현 온도, 전문성, 말버릇</span>
                  </div>
                  <div className="flex justify-between">
                    <span>필터 활용</span>
                    <span>세대, 국가, 전문성 레벨</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* P-inger Print Visual Identity */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              P-INGER PRINT
            </div>
            <h2 className="text-3xl font-bold text-gray-900">고유한 시각적 정체성</h2>
            <p className="mt-4 text-gray-600">
              모든 페르소나는 6D 벡터값으로부터 생성된 고유한 P-inger Print(2D + 3D)를 가집니다.
              <br />
              동일한 벡터값은 동일한 비주얼을 생성하므로, P-inger Print만으로도 페르소나를 식별할 수
              있습니다.
            </p>
          </div>

          {/* P-inger Print 설명 카드 */}
          <div className="mb-16 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-500">
                2D P-INGER PRINT
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">디지털 지문</h3>
              <p className="text-sm text-gray-600">
                사람의 지문과 유사한 소용돌이 패턴입니다. 6D 벡터값에 따라 릿지(ridge)의 밀도, 곡률,
                간격, 비대칭이 달라지며, 각 차원의 대표 컬러가 그라디언트로 블렌딩됩니다.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-gray-500">
                <li>Depth → 릿지 밀도 (촘촘함)</li>
                <li>Lens → 소용돌이 회전 수</li>
                <li>Stance → 패턴 비대칭</li>
                <li>Scope → 세부 주름</li>
                <li>Taste → 불규칙성</li>
                <li>Purpose → 중심 오프셋</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-500">
                3D P-INGER PRINT
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">유기적 형태</h3>
              <p className="text-sm text-gray-600">
                구체 표면이 6D 벡터값에 따라 돌기, 함몰, 노이즈로 변형됩니다. 마치 살아있는 세포처럼
                유기적이며, 자동 회전하면서 다양한 각도에서 고유한 형태를 보여줍니다.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-gray-500">
                <li>Depth → Y축 돌기 (뾰족)</li>
                <li>Lens → X축 변형</li>
                <li>Stance → Z축 변형</li>
                <li>Scope → 대각선 돌기</li>
                <li>Taste → 유기적 울퉁불퉁</li>
                <li>Purpose → 저주파 맥동</li>
              </ul>
            </div>
          </div>

          {/* Interactive Showcase */}
          <PingerPrintShowcase />
        </div>
      </section>

      {/* Persona Types */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              PERSONA TYPES
            </div>
            <h2 className="text-3xl font-bold text-gray-900">다양한 관점, 다양한 페르소나</h2>
            <p className="mt-4 text-gray-600">
              전문성 레벨에 따라 네 가지 유형으로 분류됩니다. 사용자의 취향에 맞는 관점을
              제공합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PERSONA_TYPES.map((persona) => (
              <div
                key={persona.type}
                className="rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-lg"
              >
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${persona.color}`}
                >
                  <persona.icon className="h-7 w-7 text-white" />
                </div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-purple-500">
                  {persona.type}
                </div>
                <h3 className="mb-3 text-lg font-bold text-gray-900">{persona.label}</h3>
                <p className="mb-4 text-sm text-gray-600">{persona.description}</p>
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  {persona.traits}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality Verification */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              QUALITY ASSURANCE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">엄격한 품질 검증</h2>
            <p className="mt-4 text-gray-600">
              모든 페르소나는 배포 전 다단계 품질 검증을 통과해야 합니다.
              <br />
              검증을 통과하지 못하면 사용자에게 노출되지 않습니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {QUALITY_CHECKS.map((check) => (
              <div
                key={check.title}
                className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-50">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="mb-1 text-base font-bold text-gray-900">{check.title}</h3>
                  <p className="mb-2 text-sm text-gray-600">{check.description}</p>
                  <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
                    {check.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Navigation Footer */}
      <section className="py-16">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6">
          <Link
            href="/features/taste-analysis"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            소비자 취향 분석
          </Link>
          <Link
            href="/features/matching"
            className="ds-button inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
          >
            다음: 매칭 시스템
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
