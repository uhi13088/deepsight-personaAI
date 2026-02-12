import type { Metadata } from "next"
import Link from "next/link"
import { Check, ArrowRight, Sparkles, Building2, Rocket } from "lucide-react"

export const metadata: Metadata = {
  title: "Pricing — DeepSight",
  description:
    "DeepSight의 요금제를 확인하세요. 스타터부터 엔터프라이즈까지, 규모에 맞는 AI 페르소나 추천 시스템을 도입하세요.",
}

const PLANS = [
  {
    name: "Starter",
    icon: Sparkles,
    subtitle: "소규모 서비스에 적합",
    price: "문의",
    priceNote: "월간 API 호출량 기준",
    color: "border-blue-200",
    highlight: false,
    features: [
      "월 10,000 API 호출",
      "3-Layer 프로파일링 (L1+L2+L3)",
      "3단계 매칭 (취향 유사도 → 심층 호환성 → 의외의 발견)",
      "기본 페르소나 라이브러리 (10종)",
      "설명 가능한 추천 이유 제공",
      "TypeScript SDK",
      "이메일 지원",
    ],
    cta: "시작하기",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  },
  {
    name: "Growth",
    icon: Rocket,
    subtitle: "성장하는 플랫폼에 최적",
    price: "문의",
    priceNote: "월간 API 호출량 기준",
    color: "border-purple-400 ring-2 ring-purple-100",
    highlight: true,
    features: [
      "월 100,000 API 호출",
      "3-Layer 프로파일링 + 비정량적 요소 분석",
      "3단계 매칭 + 감성 보정 (표현 스타일·서사 공감도)",
      "커스텀 페르소나 생성 (무제한)",
      "6범주 품질 검증 + 자동 인터뷰",
      "인격 일관성 실시간 모니터링",
      "SNS 연동 분석 (8개 플랫폼)",
      "3-Phase 온보딩 시스템",
      "피드 구성 알고리즘 커스터마이징",
      "필터버블 탈출 다양성 주입",
      "전담 슬랙 채널 지원",
    ],
    cta: "문의하기",
    ctaStyle: "ds-button text-white",
  },
  {
    name: "Enterprise",
    icon: Building2,
    subtitle: "대규모 플랫폼을 위한 맞춤형",
    price: "맞춤 견적",
    priceNote: "사용량과 요구사항에 따라 산정",
    color: "border-gray-300",
    highlight: false,
    features: [
      "무제한 API 호출",
      "Growth 플랜의 모든 기능",
      "전용 인프라 (Dedicated Instance)",
      "맞춤 페르소나 엔진 튜닝",
      "화이트라벨 지원",
      "SLA 99.9% 보장",
      "전담 엔지니어 배정",
      "온프레미스 배포 옵션",
      "커스텀 API 엔드포인트",
    ],
    cta: "영업팀 연락",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  },
]

const FAQS = [
  {
    q: "무료 체험이 가능한가요?",
    a: "네, Starter 플랜은 14일간 무료로 체험할 수 있습니다. 신용카드 없이 시작할 수 있으며, 체험 기간 동안 모든 기본 기능을 사용할 수 있습니다.",
  },
  {
    q: "API 호출량이 초과되면 어떻게 되나요?",
    a: "서비스가 즉시 중단되지 않습니다. 초과량에 대해 종량제로 과금되며, 사전에 알림을 보내드립니다. 필요시 언제든 플랜을 업그레이드할 수 있습니다.",
  },
  {
    q: "기존 추천 시스템과 병행할 수 있나요?",
    a: "네, DeepSight는 독립 API로 제공되므로 기존 시스템과 병행 운영이 가능합니다. A/B 테스트를 통해 점진적으로 도입할 수 있습니다.",
  },
  {
    q: "커스텀 페르소나는 어떻게 만드나요?",
    a: "Persona Engine Studio에서 페르소나의 배경 이야기, 성격 프로필, 말투 등을 설정하면 AI가 자동으로 3-Layer 프로필을 생성합니다. 6범주 품질 검증과 자동 인터뷰를 통과한 페르소나만 배포됩니다.",
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
            PRICING
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            규모에 맞는 <span className="ds-text-gradient">요금제</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            소규모 테스트부터 대규모 플랫폼까지, 필요에 맞는 플랜을 선택하세요.
            <br />
            모든 플랜에 3-Layer 프로파일링과 설명 가능한 추천이 포함됩니다.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border bg-white p-8 ${plan.color} ${
                  plan.highlight ? "shadow-xl" : "shadow-sm"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#667eea] to-[#f093fb] px-4 py-1 text-xs font-bold text-white">
                    가장 인기
                  </div>
                )}

                <div className="mb-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        plan.highlight
                          ? "bg-gradient-to-br from-[#667eea] to-[#f093fb]"
                          : "bg-gray-100"
                      }`}
                    >
                      <plan.icon
                        className={`h-6 w-6 ${plan.highlight ? "text-white" : "text-gray-600"}`}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-xs text-gray-500">{plan.subtitle}</p>
                    </div>
                  </div>
                  <div className="mb-1 text-3xl font-bold text-gray-900">{plan.price}</div>
                  <p className="text-xs text-gray-400">{plan.priceNote}</p>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                          plan.highlight ? "text-purple-500" : "text-green-500"
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contact"
                  className={`block w-full rounded-lg px-6 py-3 text-center text-sm font-medium transition-colors ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison summary */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">모든 플랜에 포함된 핵심 기능</h2>
            <p className="mt-4 text-gray-600">
              어떤 플랜을 선택하든, DeepSight의 핵심 가치는 동일합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "3-Layer 프로파일링",
                desc: "취향(L1) · 성격(L2) · 서사(L3) 세 겹의 프로필로 사용자를 심층 분석",
              },
              {
                title: "설명 가능한 추천",
                desc: "'왜 이 콘텐츠인지' 매칭 근거를 자연어로 투명하게 설명",
              },
              {
                title: "3단계 매칭",
                desc: "취향 유사도 → 심층 호환성 → 의외의 발견, 단계적으로 정밀한 매칭",
              },
              {
                title: "콜드스타트 해결",
                desc: "문답 온보딩 + SNS 분석으로 신규 사용자도 즉시 프로필 생성",
              },
              {
                title: "필터버블 탈출",
                desc: "의도적 다양성 주입으로 비슷한 콘텐츠만 반복되는 문제 해결",
              },
              {
                title: "RESTful API + SDK",
                desc: "TypeScript SDK와 상세한 API 문서로 빠르고 쉬운 연동",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-2 font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">자주 묻는 질문</h2>
          </div>

          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-2 font-bold text-gray-900">{faq.q}</h3>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ds-dark-section relative overflow-hidden py-24">
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">지금 바로 시작하세요</h2>
          <p className="mb-8 text-lg text-gray-400">
            14일 무료 체험으로 DeepSight의 AI 페르소나 추천 시스템을 직접 경험해보세요.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="ds-button inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
            >
              무료 체험 시작
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-600 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              영업팀에 문의
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
