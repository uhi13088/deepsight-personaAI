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
    title: "A. 구조 검증",
    description: "벡터 범위(0~1), 필수 필드, α+β 합산=1.0 등 구조적 무결성을 검증합니다.",
    metric: "가중치 15%",
  },
  {
    title: "B. L1↔L2 역설 일관성",
    description: "7개 차원 쌍이 설계 의도에 맞는 역설(Paradox)을 형성하는지 검증합니다.",
    metric: "가중치 20%",
  },
  {
    title: "C. L2↔L3 서사 정합성",
    description:
      "L3 서사가 L1-L2 간 모순을 설명할 수 있는지 검증합니다 (lack↔Paradox, volatility↔neuroticism 등).",
    metric: "가중치 20%",
  },
  {
    title: "D. 정성↔정량 정합성",
    description:
      "백스토리 → Init 벡터, Voice → L1(LLM 추론), Triggers → L3가 논리적으로 일치하는지 검증합니다.",
    metric: "가중치 20%",
  },
  {
    title: "E. 교차축 수학적 일관성",
    description:
      "83개 교차축 스코어가 관계유형별(역설/강화/조절/중립) 공식과 부합하는지 검증합니다.",
    metric: "가중치 15%",
  },
  {
    title: "F. 동적 설정 물리적 타당성",
    description:
      "Pressure 범위, 감쇠 곡선(λ), Override delta, 퀴크 쿨다운 등이 물리적으로 가능한지 검증합니다.",
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

      {/* Non-Quantitative Architecture */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              QUALITATIVE ARCHITECTURE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">벡터 너머의 인격 — 비정량적 4축</h2>
            <p className="mt-4 text-gray-600">
              3-Layer 벡터는 &ldquo;무엇을 좋아하는가&rdquo;를 정량화합니다. 하지만 살아있는
              페르소나가 되려면 &ldquo;왜 그런 사람이 되었는가&rdquo;가 필요합니다.
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
                집착하는 비평가&rdquo; → L3.lack=0.8, L1.purpose=0.8, L1.depth=0.9
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
                말버릇, 문장 구조, 감정 레지스터, Few-shot 앵커가 정의됩니다. 수백 턴의 대화가
                지나도 같은 사람처럼 말하며, Voice Similarity 임베딩으로 일관성을 측정합니다.
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
                특정 주제나 상황에서 Pressure 계수가 0.6을 넘으면, 벡터가 일시적으로 변위합니다. L2
                본성이 표면에 드러나는 순간이며, L3 volatility에 비례하는 지수 감쇠 곡선으로
                복귀합니다.
              </p>
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                <span className="font-semibold">예시:</span> 비판 트리거 → lens 0.8→0.3(방어적) →
                감쇠 상수 λ = 0.7 - 0.6 × volatility → 10턴 후 0.75로 복귀
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
                세대 코드(GEN_Z, MILLENNIAL, GEN_X), 가치관, 문화 자본이 정의됩니다. 동일한 벡터라도
                세대와 문화적 맥락에 따라 전혀 다른 표현과 관점을 가집니다.
              </p>
              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                <span className="font-semibold">예시:</span> 같은 depth=0.8이라도, Z세대는
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
              RUNTIME ENGINE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">4대 런타임 알고리즘</h2>
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
                title: "Init — 서사 → 벡터 초기화",
                color: "border-purple-200 bg-purple-50",
                iconColor: "text-purple-600 bg-purple-100",
                description:
                  "백스토리에서 LLM이 키워드를 추출하고, 의미 카테고리 → 벡터 매핑 테이블을 참조하여 초기 보정값(init_delta)을 산출합니다. 차원당 최대 ±0.4 보정.",
                detail: '"빈곤" + "야망" → purpose +0.3, taste +0.2, lack +0.5',
              },
              {
                step: "02",
                icon: Flame,
                title: "Override — 압박 → 벡터 변위",
                color: "border-red-200 bg-red-50",
                iconColor: "text-red-600 bg-red-100",
                description:
                  "대화 중 트리거 키워드를 감지하면 Pressure 계수가 상승하고, 벡터를 일시적으로 이동시킵니다. L3.volatility에 비례하는 지수 감쇠 곡선(λ = 0.7 - 0.6 × volatility)으로 원래 위치로 복귀합니다.",
                detail: "volatility 0.9 → λ=0.1 (느린 복귀, 오래 변함) / 0.2 → λ=0.58 (빠른 복귀)",
              },
              {
                step: "03",
                icon: RefreshCw,
                title: "Adapt — 사용자 태도 → 실시간 조정",
                color: "border-blue-200 bg-blue-50",
                iconColor: "text-blue-600 bg-blue-100",
                description:
                  "매 턴 사용자의 공격성·친밀도·정중함(UIV 3축)을 파싱하여, 차원별 적응률(α 0.1~0.3)과 최근 3턴 모멘텀으로 페르소나가 미세 조정됩니다. 기준선 대비 ±0.3 드리프트 클램프.",
                detail: "사용자 공격적 → stance -0.2 (더 비판적), 다음 턴 부드러워지면 부분 복귀",
              },
              {
                step: "04",
                icon: Heart,
                title: "Express — 벡터 상태 → 행동 발현",
                color: "border-pink-200 bg-pink-50",
                iconColor: "text-pink-600 bg-pink-100",
                description:
                  "현재 벡터 상태에서 갈등 점수, 결핍 점수 등 5종 파생 상태값을 계산하고, 시그모이드 확률(sensitivity × (stateValue - threshold))로 고유 퀴크(말버릇·행동 패턴)를 발현합니다.",
                detail:
                  '|stance - agreeableness| > 0.5 → conflictScore 상승 → "음…" 망설임 퀴크 확률적 발현 (쿨다운 3턴)',
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
                    <div className="mt-3 rounded-lg bg-white/70 p-2 font-mono text-xs text-gray-500">
                      {algo.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

      {/* Quality Verification — 3중 검증 */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
              QUALITY ASSURANCE — 3중 검증
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              배포 전 6-Category · 런타임 Integrity
            </h2>
            <p className="mt-4 text-gray-600">
              모든 페르소나는 배포 전 6범주 일관성 검증 + 20문항 자동 인터뷰를 통과해야 합니다.
              <br />
              배포 후에도 Integrity Score가 실시간으로 인격 붕괴를 감지합니다.
            </p>
          </div>

          {/* 6-Category Validation */}
          <h3 className="mb-6 text-lg font-semibold text-gray-900">
            6-Category Validation (배포 전)
          </h3>
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
                <h3 className="text-lg font-bold text-gray-900">Auto-Interview (배포 전)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                페르소나에게 20문항(L1 7 + L2 5 + L3 4 + 역설 4)의 시나리오 질문을 자동으로 던지고,
                응답에서 벡터를 추론하여 설계 벡터와 비교합니다.
              </p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" /> 차원별 허용 오차 ±0.15 이내 →
                  Pass
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500" /> 역설 질문: L1↔L2 모순이 의도대로
                  발현하는지
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
                <h3 className="text-lg font-bold text-gray-900">Integrity Score (런타임)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                배포 후 실제 대화 중에도 실시간으로 인격 붕괴를 감지합니다. LLM-as-Judge 방식으로
                3개 컴포넌트를 측정합니다.
              </p>
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-white p-3">
                  <span className="font-semibold text-amber-700">PIS = </span>
                  <span className="text-gray-600">
                    0.35 × <span className="font-medium text-gray-800">Context Recall</span> + 0.35
                    × <span className="font-medium text-gray-800">Setting Consistency</span> + 0.30
                    × <span className="font-medium text-gray-800">Character Stability</span>
                  </span>
                </div>
                <p className="text-gray-500">
                  과거 대화 참조 정확도(CR) · 의견 일관성(SC) · 벡터 ±0.15 이내 유지(CS)
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
