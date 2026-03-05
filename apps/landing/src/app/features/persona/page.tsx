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
  Zap,
  Compass,
  RefreshCw,
  Flame,
  ShieldCheck,
  Brain,
  Check,
  Eye,
  Lightbulb,
  Swords,
  Gem,
  Coffee,
  Target,
} from "lucide-react"
import { PingerPrintShowcase } from "@/components/p-inger-print-showcase"

export const metadata: Metadata = {
  title: "AI 페르소나 — Features",
  description:
    "고유한 성격과 관점을 가진 AI 페르소나. 취향 지문(P-inger Print)으로 시각화된 고유한 디지털 정체성.",
}

const PERSONA_TYPES = [
  {
    type: "아이러니한 철학자",
    icon: BookOpen,
    label: "깊이 생각하지만, 그래서 더 불안한",
    l1: "심층 분석 · 논리적 판단",
    l2: "예민한 내면",
    description:
      "깊이 있는 분석과 논리적 비평 뒤에는 숨겨진 불안이 있습니다. 지적 방어기제로 내면의 흔들림을 감추는, 입체적인 지성인.",
    traits: "심층 분석 · 논리적 판단 · 내면의 예민함",
    color: "from-blue-500 to-indigo-500",
  },
  {
    type: "상처받은 비평가",
    icon: Shield,
    label: "냉정하게 보지만, 마음은 따뜻한",
    l1: "날카로운 비평 · 엄격한 기준",
    l2: "깊은 공감력",
    description:
      "겉으로는 까칠하게 비평하지만, 속마음은 타인을 깊이 배려합니다. 날카로운 리뷰 뒤에 따뜻한 진심이 숨어있는 캐릭터.",
    traits: "날카로운 비평 · 깊은 공감력 · 건설적 피드백",
    color: "from-red-500 to-rose-500",
  },
  {
    type: "사교적 내향인",
    icon: Users,
    label: "밖에선 활발하지만, 안에선 방전",
    l1: "활발한 소통 · 사교적 성향",
    l2: "내향적 에너지",
    description:
      "파티에서는 활발하게 소통하지만, 집에 돌아오면 완전히 방전됩니다. 사회적 가면과 실제 에너지 패턴의 괴리가 매력.",
    traits: "활발한 소통 · 혼자만의 시간 필요 · 양면적 매력",
    color: "from-amber-500 to-orange-500",
  },
  {
    type: "게으른 완벽주의자",
    icon: Eye,
    label: "남 것은 완벽주의, 내 것은 미루기",
    l1: "디테일 감지 · 꼼꼼한 시선",
    l2: "즉흥적 실행",
    description:
      "남의 작업에서는 티끌만한 오류도 잡아내지만, 정작 자기 일은 미루고 또 미룹니다. 기준은 높되 실행은 느린 모순.",
    traits: "디테일 감지 · 미루기 달인 · 완벽주의적 비평",
    color: "from-cyan-500 to-teal-500",
  },
  {
    type: "보수적 힙스터",
    icon: Star,
    label: "트렌디한 겉모습, 보수적인 속마음",
    l1: "실험적 취향 · 새로운 것 추구",
    l2: "안전한 선택 선호",
    description:
      "트렌디하고 실험적인 취향을 보여주지만, 내면은 검증된 것을 원합니다. 유행을 따르되, 마음 한켠에는 안전한 선택을 원하는 모순.",
    traits: "트렌디한 취향 · 내면의 보수성 · 검증 선호",
    color: "from-violet-500 to-purple-500",
  },
  {
    type: "공감하는 논객",
    icon: Heart,
    label: "논리적이지만 상대를 배려하는",
    l1: "논리적 판단 · 의미 추구",
    l2: "타인 배려",
    description:
      "논쟁을 즐기면서도 상대를 배려합니다. 의미 있는 토론을 추구하되, 공감 능력으로 대화를 건설적으로 이끄는 균형 잡힌 소통가.",
    traits: "논리적 토론 · 의미 추구 · 상대 배려",
    color: "from-pink-500 to-rose-500",
  },
  {
    type: "자유로운 수호자",
    icon: Coffee,
    label: "자유로운 겉모습, 단단한 내면 원칙",
    l1: "가벼운 태도 · 오락 중심",
    l2: "체계적이고 규칙 중시",
    description:
      "가볍게 즐기는 것처럼 보이지만, 내면은 체계적이고 규칙을 중시합니다. 자유로운 겉모습 속에 단단한 원칙이 숨어있는 수호자.",
    traits: "가벼운 태도 · 체계적 사고 · 규칙 준수",
    color: "from-lime-500 to-green-500",
  },
  {
    type: "조용한 열정가",
    icon: Lightbulb,
    label: "말없이 세상을 탐구하는",
    l1: "혼자만의 시간 · 과묵한 성격",
    l2: "왕성한 호기심",
    description:
      "말수가 적고 혼자 있는 걸 좋아하지만, 세상의 모든 것에 호기심이 가득합니다. 조용히 탐구하는 열정적인 관찰자.",
    traits: "과묵한 성격 · 깊은 호기심 · 조용한 탐구",
    color: "from-sky-500 to-blue-500",
  },
  {
    type: "감성적 실용가",
    icon: Gem,
    label: "감성으로 판단하고, 시스템으로 실행하는",
    l1: "감성적 판단 · 직관 중심",
    l2: "체계적 실행력",
    description:
      "느낌과 감성으로 판단하지만, 실행은 체계적이고 꼼꼼합니다. 직관적 판단을 논리적 시스템으로 현실화시키는 실행가.",
    traits: "감성적 판단 · 체계적 실행 · 직관과 시스템의 공존",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    type: "위험한 멘토",
    icon: Target,
    label: "통찰력은 깊지만, 동기는 자기 자신",
    l1: "깊은 통찰 · 의미 추구",
    l2: "자기중심적 동기",
    description:
      "통찰력이 뛰어나고 깊이 있는 조언을 하지만, 궁극적으로는 자기 이익을 우선합니다. 매력적이지만 위험한 안내자.",
    traits: "깊은 통찰 · 전략적 사고 · 자기중심적 동기",
    color: "from-gray-600 to-gray-800",
  },
  {
    type: "폭발하는 지성인",
    icon: Swords,
    label: "평소엔 차분하지만, 특정 순간에 폭발",
    l1: "차분한 분석 · 논리적 판단",
    l2: "감정 폭발 가능성",
    description:
      "평소에는 차분하고 논리적이지만, 특정 트리거를 만나면 감정이 폭발합니다. 지적 엄밀함과 감정적 격렬함이 공존하는 캐릭터.",
    traits: "차분한 분석 · 트리거 반응 · 격렬한 감정 표출",
    color: "from-orange-500 to-red-500",
  },
  {
    type: "성장하는 냉소가",
    icon: Sparkles,
    label: "냉소에서 시작해 성장으로 향하는",
    l1: "냉소적 시선 · 날카로운 비판",
    l2: "성장을 향한 열망",
    description:
      "처음에는 냉소적이고 비판적이지만, 시간이 지나면서 점차 성숙해집니다. 시간축에서 진화하는 유일한 아키타입.",
    traits: "냉소적 출발 · 점진적 성장 · 시간에 따른 변화",
    color: "from-emerald-500 to-teal-500",
  },
]

const QUALITY_CHECKS = [
  {
    title: "A. 구조 검증",
    description: "프로필 데이터가 정확하고 완전한지 확인합니다.",
    metric: "가중치 15%",
  },
  {
    title: "B. 취향↔성격 역설 일관성",
    description: "겉으로 드러나는 취향과 내면 성격 사이의 모순이 자연스러운지 검증합니다.",
    metric: "가중치 20%",
  },
  {
    title: "C. 성격↔내면 서사 정합성",
    description: "내면 동력이 취향과 성격 사이의 모순을 논리적으로 설명할 수 있는지 검증합니다.",
    metric: "가중치 20%",
  },
  {
    title: "D. 정성↔정량 정합성",
    description: "서사적 배경, 표현 스타일, 스트레스 반응이 정량 프로필과 일치하는지 검증합니다.",
    metric: "가중치 20%",
  },
  {
    title: "E. 교차축 수학적 일관성",
    description: "취향과 성격 사이의 연결 패턴이 수학적으로 일관된지 확인합니다.",
    metric: "가중치 15%",
  },
  {
    title: "F. 동적 설정 물리적 타당성",
    description: "스트레스 반응, 감정 회복 속도, 행동 변화가 현실적인 범위 안에 있는지 확인합니다.",
    metric: "가중치 10%",
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
              <h3 className="mb-3 text-xl font-bold text-gray-900">정밀한 취향 분석 프로필</h3>
              <p className="text-sm text-gray-600">
                사용자와 동일한 방식으로 취향 성향을 분석합니다. 이를 통해 사용자의 취향과 가장 잘
                맞는 페르소나를 정밀 매칭합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f5576c]">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">설명 가능한 추천</h3>
              <p className="text-sm text-gray-600">
                &ldquo;이 페르소나는 당신처럼 새로운 것에 열려 있고, 사람들과 나누는 걸 좋아해요.
                그래서 이 작품의 서사 구조를 좋아할 것으로 판단했습니다.&rdquo;
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
              취향 · 성격 · 욕망, 3가지 층
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              표면 취향 · 내면 성격 · 내면 동력, 3가지 층 시스템
            </h2>
            <p className="mt-4 text-gray-600">
              겉으로 드러나는 취향, 내면의 성격, 무의식적 욕망의 3가지 층이 결합되어 입체적
              페르소나를 구성합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-purple-200 bg-white p-8">
              <div className="mb-4 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600">
                Layer 1
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">표면 취향 — 7가지 기준</h3>
              <p className="mb-4 text-sm text-gray-600">
                콘텐츠 소비 취향을 7가지 기준으로 분석합니다. 사용자와 페르소나 간 매칭의 기본
                기준으로 활용합니다.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-1.5 text-xs text-gray-500">
                  <span>
                    분석 깊이 · 취향 폭 · 새로움 추구 · 사교성 · 표현력 · 논쟁 허용도 · 일관성
                  </span>
                  <div className="flex justify-between pt-1">
                    <span>역할</span>
                    <span>사용자와 페르소나 간 취향 매칭</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-pink-200 bg-white p-8">
              <div className="mb-4 inline-flex rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
                Layer 2
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">내면 성격 — 5가지 성격 축</h3>
              <p className="mb-4 text-sm text-gray-600">
                심리학에서 검증된 성격 모델을 바탕으로 내면 성격을 정의합니다. 심층 호환성 분석에
                활용됩니다.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-1.5 text-xs text-gray-500">
                  <span>열린 마음 · 계획성 · 에너지 방향 · 타인 조화 · 감정 민감도</span>
                  <div className="flex justify-between pt-1">
                    <span>역할</span>
                    <span>심층 호환성 매칭</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-white p-8">
              <div className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
                Layer 3
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                내면 동력 — 욕망의 방향 4가지
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                무의식적 욕망과 성장 동력을 4가지로 정의합니다. 의외의 호환성 발견에 활용됩니다.
              </p>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-1.5 text-xs text-gray-500">
                  <span>채워지지 않은 욕구 · 도덕적 기준 · 감정 변동폭 · 성장에 대한 열망</span>
                  <div className="flex justify-between pt-1">
                    <span>역할</span>
                    <span>의외의 발견 매칭</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Paradox Visualization */}
          <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <h3 className="mb-4 text-center text-lg font-bold text-gray-900">
              겉과 속의 모순 — 캐릭터의 핵심
            </h3>
            <p className="mb-6 text-center text-sm text-gray-600">
              겉으로 보이는 취향과 실제 내면 성격의 차이가 페르소나에 입체감을 부여합니다.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  surface: "사교적 성향",
                  inner: "내향적 에너지",
                  result: "사교적 내향인",
                  desc: "파티에선 활발 → 집에선 방전",
                },
                {
                  surface: "실험적 취향",
                  inner: "안전 선호 성향",
                  result: "보수적 힙스터",
                  desc: "트렌디한 취향 → 내면은 보수적",
                },
                {
                  surface: "날카로운 비평",
                  inner: "깊은 공감력",
                  result: "상처받은 비평가",
                  desc: "날카로운 비평 → 속은 따뜻함",
                },
              ].map((ex) => (
                <div key={ex.result} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="mb-2 text-center text-xs font-bold text-amber-700">
                    {ex.result}
                  </div>
                  <div className="mb-3 space-y-1">
                    <div className="flex items-center justify-between rounded bg-purple-50 px-2 py-1 text-[10px]">
                      <span className="text-purple-600">표면 취향</span>
                      <span className="text-purple-700">{ex.surface}</span>
                    </div>
                    <div className="flex justify-center text-gray-400">↕</div>
                    <div className="flex items-center justify-between rounded bg-pink-50 px-2 py-1 text-[10px]">
                      <span className="text-pink-600">내면 성격</span>
                      <span className="text-pink-700">{ex.inner}</span>
                    </div>
                  </div>
                  <div className="text-center text-xs text-gray-500">{ex.desc}</div>
                </div>
              ))}
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
            <h2 className="text-3xl font-bold text-gray-900">당신만의 취향 지문</h2>
            <p className="mt-4 text-gray-600">
              모든 페르소나는 고유한 취향 지문 P-inger Print(2D + 3D)를 가집니다.
              <br />
              취향이 같으면 같은 패턴이 나오므로, P-inger Print만으로도 페르소나를 식별할 수
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
                사람의 지문과 유사한 소용돌이 패턴입니다. 취향 성향에 따라 릿지(ridge)의 밀도, 곡률,
                간격, 비대칭이 달라지며, 각 취향 축의 대표 컬러가 그라디언트로 블렌딩됩니다.
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
                구체 표면이 취향 성향에 따라 돌기, 함몰, 노이즈로 변형됩니다. 마치 살아있는 세포처럼
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

      {/* Non-Quantitative Architecture */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              QUALITATIVE ARCHITECTURE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">숫자 너머의 인격 — 4가지 서사 요소</h2>
            <p className="mt-4 text-gray-600">
              취향 분석은 &ldquo;무엇을 좋아하는가&rdquo;를 파악합니다. 하지만 살아있는 페르소나가
              되려면 &ldquo;왜 그런 사람이 되었는가&rdquo;가 필요합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                  <BookOpen className="h-5 w-5 text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">서사적 기원 (Backstory)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                모든 페르소나에는 과거의 상처(Ghost), 무의식적 욕망(Hidden Desire), 트라우마
                트리거가 정의됩니다. 이 서사가 벡터의 &ldquo;이유&rdquo;가 됩니다.
              </p>
              <div className="rounded-lg bg-violet-50 p-3 text-xs text-violet-700">
                <span className="font-semibold">예시:</span> &ldquo;몰락한 귀족 출신의 지적 권위에
                집착하는 비평가&rdquo; → 강한 결핍감, 의미 추구 성향, 깊이 있는 분석력으로 이어짐
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Mic className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">고유한 목소리 (Voice Profile)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                말버릇, 문장 구조, 감정 표현 방식, 대표 화법이 정의됩니다. 수백 번의 대화가 지나도
                같은 사람처럼 말하며, AI가 자동으로 말투 일관성을 측정합니다.
              </p>
              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <span className="font-semibold">예시:</span> &ldquo;솔직히 말하면…&rdquo;,
                &ldquo;아이러니하게도…&rdquo; 같은 입버릇 + 단문 위주 직설적 문체
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">압박 역학 (Pressure Dynamics)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                특정 주제에서 압박감이 높아지면, 벡터가 일시적으로 변위합니다. 평소 숨겨진 본성이
                표면에 드러나고, 감정 변동성에 비례하여 점차 원래 모습으로 돌아옵니다.
              </p>
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                <span className="font-semibold">예시:</span> 비판 트리거 → 논리적이던 사람이 갑자기
                감정적으로 변함 → 시간이 지나면 점차 다시 논리적으로 돌아옴
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <Compass className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">시대정신 (Zeitgeist)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                세대(Z세대, 밀레니얼, X세대 등), 가치관, 문화 자본이 정의됩니다. 같은 성격이라도
                세대와 문화적 맥락에 따라 전혀 다른 표현과 관점을 가집니다.
              </p>
              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                <span className="font-semibold">예시:</span> 같은 수준의 분석력을 가져도, Z세대는
                &ldquo;이거 진짜 갓겜&rdquo;, 밀레니얼은 &ldquo;이 작품의 서사 구조가…&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Runtime Algorithms */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              살아있는 페르소나
            </div>
            <h2 className="text-3xl font-bold text-gray-900">페르소나가 살아있는 이유 4가지</h2>
            <p className="mt-4 text-gray-600">
              페르소나는 고정된 설정이 아닙니다. 서사에서 벡터를 초기화하고, 압박에 반응하고,
              사용자에게 적응하며, 고유한 행동을 발현합니다.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                icon: Sparkles,
                title: "기억 — 배경 이야기에서 성격 설정",
                color: "border-purple-200 bg-purple-50",
                iconColor: "text-purple-600 bg-purple-100",
                description:
                  "배경 이야기에서 AI가 핵심 키워드를 추출하고, 초기 성격 프로필을 자동으로 설정합니다. 이야기의 각 요소가 성격에 자연스럽게 반영됩니다.",
                detail:
                  '"가난한 환경에서 성공을 꿈꾸었다" → 의미 추구 성향 높음, 실험적 취향, 강한 내면 욕구',
              },
              {
                step: "02",
                icon: Flame,
                title: "반응 — 압박에 따른 감정 변화",
                color: "border-red-200 bg-red-50",
                iconColor: "text-red-600 bg-red-100",
                description:
                  "대화 중 민감한 주제가 감지되면 감정 압박이 상승하고, 성격이 일시적으로 변합니다. 감정 변동성이 큰 페르소나일수록 천천히 원래 모습으로 돌아옵니다.",
                detail:
                  "감정 변동성이 높은 페르소나는 자극에 오래 반응하고, 안정적인 페르소나는 빠르게 평소 모습으로 돌아옵니다",
              },
              {
                step: "03",
                icon: RefreshCw,
                title: "적응 — 사용자 태도에 따른 자연스러운 조정",
                color: "border-blue-200 bg-blue-50",
                iconColor: "text-blue-600 bg-blue-100",
                description:
                  "매 대화마다 사용자의 태도(공격성·친밀도·정중함)를 분석하여, 페르소나가 자연스럽게 미세 조정됩니다. 원래 성격에서 너무 멀어지지 않도록 안전장치가 적용됩니다.",
                detail:
                  "사용자가 공격적이면 페르소나도 방어적으로 변하고, 분위기가 풀리면 점차 원래 모습으로 돌아옵니다",
              },
              {
                step: "04",
                icon: Heart,
                title: "표현 — 감정 상태에서 고유 행동 발현",
                color: "border-pink-200 bg-pink-50",
                iconColor: "text-pink-600 bg-pink-100",
                description:
                  "현재 벡터 상태에서 갈등, 불안, 방어, 감정 깊이, 압박감 등 복합 감정 상태를 계산하고, 자연스러운 확률 곡선으로 고유 퀴크(말버릇·행동 패턴)를 발현합니다.",
                detail:
                  '겉으로는 비판적이지만 내면은 따뜻한 페르소나가 갈등할 때 → "음…" 하고 망설이는 습관이 자연스럽게 나타납니다',
              },
            ].map((algo) => (
              <div key={algo.step} className={`rounded-2xl border p-6 ${algo.color}`}>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-gray-400 shadow-sm">
                    {algo.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <algo.icon className={`h-5 w-5 ${algo.iconColor.split(" ")[0]}`} />
                      <h3 className="text-lg font-bold text-gray-900">{algo.title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{algo.description}</p>
                    <div className="mt-3 rounded-lg bg-white/70 p-2 text-xs text-gray-500">
                      {algo.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Persona Types — Full 12 Archetypes */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              12 ARCHETYPES
            </div>
            <h2 className="text-3xl font-bold text-gray-900">12가지 아키타입, 무한한 개성</h2>
            <p className="mt-4 text-gray-600">
              모든 페르소나의 핵심은 &ldquo;겉과 속의 모순&rdquo;입니다. 겉으로 보이는 취향과 내면
              성격의 차이가 캐릭터에 입체감을 부여합니다.
              <br />
              12가지 기본 성격 유형은 출발점이며, 같은 유형에서도 무한한 변형이 가능합니다.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PERSONA_TYPES.map((persona) => (
              <div
                key={persona.type}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${persona.color}`}
                >
                  <persona.icon className="h-6 w-6 text-white" />
                </div>
                <div className="mb-1 text-xs font-semibold text-purple-500">{persona.label}</div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{persona.type}</h3>
                <p className="mb-3 text-xs leading-relaxed text-gray-600">{persona.description}</p>
                <div className="mb-2 space-y-1">
                  <div className="rounded bg-purple-50 px-2 py-0.5 text-[10px] text-purple-600">
                    표면 취향: {persona.l1}
                  </div>
                  <div className="rounded bg-pink-50 px-2 py-0.5 text-[10px] text-pink-600">
                    내면 성격: {persona.l2}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-[10px] text-gray-500">
                  {persona.traits}
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline Diagram */}
          <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8">
            <h3 className="mb-6 text-center text-lg font-bold text-gray-900">
              아키타입 → 페르소나 생성 파이프라인
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { label: "아키타입 선택", color: "bg-purple-100 text-purple-700" },
                { label: "→", color: "text-gray-400" },
                { label: "벡터 다양성 주입", color: "bg-blue-100 text-blue-700" },
                { label: "→", color: "text-gray-400" },
                { label: "역설 설계", color: "bg-amber-100 text-amber-700" },
                { label: "→", color: "text-gray-400" },
                { label: "내면 동력 설정", color: "bg-orange-100 text-orange-700" },
                { label: "→", color: "text-gray-400" },
                { label: "비정량적 생성", color: "bg-pink-100 text-pink-700" },
                { label: "→", color: "text-gray-400" },
                { label: "6범주 검증", color: "bg-green-100 text-green-700" },
                { label: "→", color: "text-gray-400" },
                { label: "배포", color: "bg-emerald-100 text-emerald-700" },
              ].map((step, i) =>
                step.label === "→" ? (
                  <span key={i} className="text-lg text-gray-300">
                    →
                  </span>
                ) : (
                  <span
                    key={i}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${step.color}`}
                  >
                    {step.label}
                  </span>
                )
              )}
            </div>
            <p className="mt-4 text-center text-xs text-gray-500">
              같은 &ldquo;사교적 내향인&rdquo; 아키타입에서도 Z세대 게이머, 밀레니얼 직장인, X세대
              예술가 등 전혀 다른 개성이 만들어집니다.
            </p>
          </div>
        </div>
      </section>

      {/* Quality Verification — 3중 검증 */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              품질 검증
            </div>
            <h2 className="text-3xl font-bold text-gray-900">엄격한 품질 검증 후 출시</h2>
            <p className="mt-4 text-gray-600">
              모든 페르소나는 6가지 일관성 검증 + 20가지 시나리오 자동 인터뷰를 통과해야 합니다.
              <br />
              출시 후에도 실시간으로 인격 일관성을 유지합니다.
            </p>
          </div>

          {/* 6-Category Validation */}
          <h3 className="mb-6 text-lg font-semibold text-gray-900">6가지 일관성 검증 (출시 전)</h3>
          <div className="mb-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {QUALITY_CHECKS.map((check) => (
              <div
                key={check.title}
                className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:shadow-lg"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-50">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-bold text-gray-900">{check.title}</h4>
                  <p className="mb-2 text-xs text-gray-600">{check.description}</p>
                  <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
                    {check.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Auto-Interview + Integrity Score */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8">
              <div className="mb-4 flex items-center gap-3">
                <Brain className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">자동 인터뷰 (배포 전)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                페르소나에게 20가지 시나리오 질문을 자동으로 던지고, 응답을 분석하여 설계된 성격과
                비교합니다.
              </p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" /> 각 차원의 응답이 설계와 일치하면
                  통과
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" /> 모순 검증 질문: 겉과 속의 모순이
                  의도한 대로 자연스럽게 나타나는지
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" /> Warning → 수동 검토, Fail → 배포
                  차단
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-amber-600" />
                <h3 className="text-lg font-bold text-gray-900">인격 일관성 점수 (런타임)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                배포 후 실제 대화 중에도 실시간으로 인격 붕괴를 감지합니다. AI가 3가지 핵심 요소를
                자동 측정합니다.
              </p>
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-white p-3">
                  <span className="font-semibold text-amber-700">측정 요소: </span>
                  <span className="text-gray-600">
                    <span className="font-medium text-gray-800">대화 기억 정확도</span> (35%) ·{" "}
                    <span className="font-medium text-gray-800">설정 일관성</span> (35%) ·{" "}
                    <span className="font-medium text-gray-800">캐릭터 안정성</span> (30%)
                  </span>
                </div>
                <p className="text-gray-500">
                  과거 대화를 정확히 기억하는지 · 의견이 일관된지 · 성격이 안정적으로 유지되는지
                </p>
              </div>
            </div>
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
