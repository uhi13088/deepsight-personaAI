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
    "고유한 3-Layer AI 성격과 관점을 가진 AI 페르소나. P-inger Print(2D+3D)로 시각화된 디지털 정체성.",
}

const PERSONA_TYPES = [
  {
    type: "Sage",
    icon: BookOpen,
    label: "현자",
    description:
      "깊은 통찰과 분석으로 콘텐츠의 숨겨진 의미를 발견합니다. 높은 Openness와 Depth로 사려 깊은 추천을 제공합니다.",
    traits: "높은 Openness, 높은 Depth, 높은 Moral Compass",
    color: "from-blue-500 to-indigo-500",
  },
  {
    type: "Explorer",
    icon: Star,
    label: "탐험가",
    description:
      "새로운 장르와 숨겨진 명작을 찾아 나섭니다. 높은 Novelty Seeking과 Sociability로 경계를 넘는 추천을 제공합니다.",
    traits: "높은 Novelty Seeking, 높은 Sociability, 높은 Volatility",
    color: "from-amber-500 to-orange-500",
  },
  {
    type: "Rebel",
    icon: Mic,
    label: "반항아",
    description:
      "주류에 반기를 들고 독립적 관점으로 콘텐츠를 평가합니다. 높은 Controversy Tolerance와 낮은 Agreeableness가 특징입니다.",
    traits: "높은 Controversy Tolerance, 낮은 Agreeableness, 높은 Lack",
    color: "from-red-500 to-rose-500",
  },
  {
    type: "Curator",
    icon: Heart,
    label: "큐레이터",
    description:
      "세련된 취향으로 정제된 추천을 제공합니다. 높은 Conscientiousness와 Expressiveness로 일관된 품질을 보장합니다.",
    traits: "높은 Conscientiousness, 높은 Expressiveness, 높은 Growth Arc",
    color: "from-violet-500 to-purple-500",
  },
  {
    type: "Empath",
    icon: Heart,
    label: "공감자",
    description:
      "감정적 공명을 중시하며, 사용자의 현재 기분과 상황에 맞는 콘텐츠를 추천합니다. 높은 Agreeableness와 Neuroticism이 특징입니다.",
    traits: "높은 Agreeableness, 높은 Neuroticism, 높은 Expressiveness",
    color: "from-pink-500 to-rose-500",
  },
  {
    type: "Maverick",
    icon: Sparkles,
    label: "이단아",
    description:
      "예측 불가한 조합으로 의외의 발견을 제공합니다. 높은 Volatility와 Novelty Seeking이 Paradox 매칭의 핵심입니다.",
    traits: "높은 Volatility, 높은 Novelty Seeking, 낮은 Conscientiousness",
    color: "from-emerald-500 to-teal-500",
  },
]

const QUALITY_CHECKS = [
  {
    title: "성격 일관성 검증",
    description: "동일한 콘텐츠에 대해 반복 질의 시 일관된 관점을 유지하는지 테스트합니다.",
    metric: "일관성 점수 70점 이상",
  },
  {
    title: "3-Layer 벡터 정합성",
    description: "응답이 설정된 3-Layer 벡터값에 부합하는지 자동으로 검증합니다.",
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
              <h3 className="mb-3 text-xl font-bold text-gray-900">3-Layer 벡터 프로필</h3>
              <p className="text-sm text-gray-600">
                사용자와 동일한 3-Layer 벡터로 성향을 정량화합니다. 이를 통해 사용자의 취향과 가장
                잘 맞는 페르소나를 정밀 매칭합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f5576c]">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">설명 가능한 추천</h3>
              <p className="text-sm text-gray-600">
                &ldquo;이 페르소나는 당신과 Openness 0.85, Sociability 0.72로 유사하여, 이 작품의
                서사 구조를 좋아할 것으로 판단했습니다.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Layer System */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              3-LAYER SYSTEM
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Social + Core + Narrative, 3계층 시스템
            </h2>
            <p className="mt-4 text-gray-600">
              사회적 취향(L1), 내면 기질(L2), 서사 욕망(L3)의 3계층이 결합되어 입체적 페르소나를
              구성합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-purple-200 bg-white p-8">
              <div className="mb-4 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600">
                Layer 1
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">L1: Social Persona (7D)</h3>
              <p className="mb-4 text-sm text-gray-600">
                콘텐츠 소비 취향을 7개 차원으로 정량화합니다. 사용자와 페르소나 간 3-Tier 매칭의
                기본 축으로 활용합니다.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>
                      Depth, Breadth, Novelty Seeking, Sociability, Expressiveness, Controversy
                      Tolerance, Consistency
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>범위</span>
                    <span className="font-mono">0.0 ~ 1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>용도</span>
                    <span>유저↔페르소나 V_Final 매칭</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-pink-200 bg-white p-8">
              <div className="mb-4 inline-flex rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
                Layer 2
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                L2: Core Temperament (OCEAN 5D)
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                Big Five 성격 모델 기반으로 내면 기질을 정의합니다. 교차축 가중 매칭(Advanced
                Tier)에 활용됩니다.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>OCEAN</span>
                    <span>O, C, E, A, N</span>
                  </div>
                  <div className="flex justify-between">
                    <span>범위</span>
                    <span className="font-mono">0.0 ~ 1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>용도</span>
                    <span>교차축 가중 + Advanced 매칭</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-white p-8">
              <div className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
                Layer 3
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">L3: Narrative Drive (4D)</h3>
              <p className="mb-4 text-sm text-gray-600">
                서사 속 욕망과 성장 동력을 4개 차원으로 정의합니다. Paradox 매칭(Exploration Tier)의
                핵심 축입니다.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>
                      Lack(결핍), Moral Compass(도덕 나침반), Volatility(변동성), Growth Arc(성장
                      곡선)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>범위</span>
                    <span className="font-mono">0.0 ~ 1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>용도</span>
                    <span>Paradox Score + Exploration 매칭</span>
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
              모든 페르소나는 L1 벡터값으로부터 생성된 고유한 P-inger Print(2D + 3D)를 가집니다.
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
                사람의 지문과 유사한 소용돌이 패턴입니다. L1 벡터값에 따라 릿지(ridge)의 밀도, 곡률,
                간격, 비대칭이 달라지며, 각 차원의 대표 컬러가 그라디언트로 블렌딩됩니다.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-gray-500">
                <li>Depth → 릿지 밀도 (촘촘함)</li>
                <li>Breadth → 소용돌이 회전 수</li>
                <li>Novelty Seeking → 패턴 비대칭</li>
                <li>Sociability → 소용돌이 방향</li>
                <li>Expressiveness → 세부 주름</li>
                <li>Controversy Tolerance → 불규칙성</li>
                <li>Consistency → 중심 오프셋</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-500">
                3D P-INGER PRINT
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">유기적 형태</h3>
              <p className="text-sm text-gray-600">
                구체 표면이 L1 벡터값에 따라 돌기, 함몰, 노이즈로 변형됩니다. 마치 살아있는 세포처럼
                유기적이며, 자동 회전하면서 다양한 각도에서 고유한 형태를 보여줍니다.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-gray-500">
                <li>Depth → Y축 돌기 (뾰족)</li>
                <li>Breadth → X축 변형</li>
                <li>Novelty Seeking → Z축 변형</li>
                <li>Sociability → 대각선 돌기</li>
                <li>Expressiveness → 유기적 울퉁불퉁</li>
                <li>Controversy Tolerance → 저주파 맥동</li>
                <li>Consistency → 표면 매끄러움</li>
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
              3-Layer 벡터 조합에 따라 다양한 아키타입으로 분류됩니다. 사용자의 취향에 맞는 관점을
              제공합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
