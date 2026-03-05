import type { Metadata } from "next"
import Link from "next/link"
import {
  Check,
  ArrowRight,
  Sparkles,
  Building2,
  Rocket,
  Minus,
  Zap,
  Users,
  Clock,
  Shield,
  Key,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Pricing — DeepSight",
  description:
    "DeepSight의 요금제를 확인하세요. Starter $199부터, 모든 플랜에 3단계 매칭과 동일한 페르소나 품질이 포함됩니다.",
}

const PLANS = [
  {
    name: "Starter",
    icon: Sparkles,
    subtitle: "소규모 서비스에 적합",
    price: "$199",
    annualPrice: "$159",
    priceNote: "/월",
    color: "border-gray-200",
    highlight: false,
    specs: {
      personas: "50개",
      apiCalls: "50만/월",
      rateLimit: "100/분",
      apiKeys: "5개",
      teamMembers: "3명",
      support: "셀프서비스",
      sla: "99.5%",
      webhook: true,
      sso: false,
      ipWhitelist: false,
    },
    cta: "시작하기",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  },
  {
    name: "Pro",
    icon: Rocket,
    subtitle: "성장하는 플랫폼에 최적",
    price: "$499",
    annualPrice: "$399",
    priceNote: "/월",
    color: "border-purple-400 ring-2 ring-purple-100",
    highlight: true,
    specs: {
      personas: "100개",
      apiCalls: "100만/월",
      rateLimit: "500/분",
      apiKeys: "10개",
      teamMembers: "5명",
      support: "셀프서비스",
      sla: "99.5%",
      webhook: true,
      sso: false,
      ipWhitelist: false,
    },
    cta: "시작하기",
    ctaStyle: "ds-button text-white",
  },
  {
    name: "Max",
    icon: Zap,
    subtitle: "대규모 트래픽 처리",
    price: "$1,499",
    annualPrice: "$1,199",
    priceNote: "/월",
    color: "border-gray-200",
    highlight: false,
    specs: {
      personas: "350개",
      apiCalls: "300만/월",
      rateLimit: "1,000/분",
      apiKeys: "20개",
      teamMembers: "10명",
      support: "우선 이메일",
      sla: "99.9%",
      webhook: true,
      sso: false,
      ipWhitelist: false,
    },
    cta: "시작하기",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  },
]

const OVERAGE_PRICING = [
  { plan: "Starter", apiOverage: "$0.001 / call", personaOverage: "$2.50 / 개 / 월" },
  { plan: "Pro", apiOverage: "$0.001 / call", personaOverage: "$2.50 / 개 / 월" },
  { plan: "Max", apiOverage: "$0.0008 / call", personaOverage: "$2.00 / 개 / 월" },
]

const FAQS = [
  {
    q: "모든 플랜에서 매칭 품질이 동일한가요?",
    a: "네, 모든 플랜에서 동일한 품질의 페르소나와 3단계 매칭(취향 유사도 → 심층 호환성 → 의외의 발견)을 제공합니다. 플랜 간 차이는 사용량(월 추천 요청 수, 페르소나 수, 팀원 수)뿐입니다.",
  },
  {
    q: "월 추천 요청 수를 초과하면 어떻게 되나요?",
    a: "서비스가 즉시 중단되지 않습니다. 초과분에 대해 종량제로 과금되며(Starter/Pro: $0.001/건, Max: $0.0008/건), 사전에 알림을 보내드립니다. 필요시 언제든 플랜을 업그레이드할 수 있습니다.",
  },
  {
    q: "연간 결제 시 혜택이 있나요?",
    a: "네, 연간 결제 시 20% 할인이 적용됩니다 (Starter $159/월, Pro $399/월, Max $1,199/월). 추가로 Starter 플랜에도 우선 이메일 지원이 제공되며, 결제 기간 동안 가격 인상이 면제됩니다.",
  },
  {
    q: "Enterprise 플랜은 어떻게 신청하나요?",
    a: "Enterprise 문의 버튼을 통해 연락해주시면, 요구사항에 맞는 맞춤 견적(800~5,000+ 페르소나, 전담 매니저, SSO, IP 화이트리스트, 온프레미스 옵션 등)을 제안드립니다.",
  },
  {
    q: "기존 추천 시스템과 병행할 수 있나요?",
    a: "네, DeepSight는 독립 REST API로 제공되므로 기존 시스템과 병행 운영이 가능합니다. A/B 테스트를 통해 점진적으로 도입할 수 있습니다.",
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
            모든 플랜에 동일한 페르소나 품질과 3단계 매칭이 포함됩니다.
            <br />
            플랜 간 차이는 사용량(월 추천 요청 수, 페르소나 수)뿐입니다.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm text-green-700">
            <Sparkles className="h-4 w-4" />
            연간 결제 시 20% 할인
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-sm text-gray-500">{plan.priceNote}</span>
                  </div>
                  <p className="mt-1 text-xs text-green-600">연간 결제 시 {plan.annualPrice}/월</p>
                </div>

                {/* Key Specs */}
                <div className="mb-6 space-y-3 border-t border-gray-100 pt-6">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Users className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    <span className="text-gray-600">활성 페르소나</span>
                    <span className="ml-auto font-semibold text-gray-900">
                      {plan.specs.personas}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Zap className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    <span className="text-gray-600">월 추천 요청 수</span>
                    <span className="ml-auto font-semibold text-gray-900">
                      {plan.specs.apiCalls}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    <span className="text-gray-600">분당 요청 제한</span>
                    <span className="ml-auto font-semibold text-gray-900">
                      {plan.specs.rateLimit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Key className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    <span className="text-gray-600">API 키</span>
                    <span className="ml-auto font-semibold text-gray-900">
                      {plan.specs.apiKeys}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Users className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    <span className="text-gray-600">팀원</span>
                    <span className="ml-auto font-semibold text-gray-900">
                      {plan.specs.teamMembers}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Shield className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    <span className="text-gray-600">SLA</span>
                    <span className="ml-auto font-semibold text-gray-900">{plan.specs.sla}</span>
                  </div>
                </div>

                {/* Additional features */}
                <div className="mb-6 space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    실시간 이벤트 연동
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {plan.specs.sso ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <Minus className="h-4 w-4 flex-shrink-0 text-gray-300" />
                    )}
                    <span className={plan.specs.sso ? "" : "text-gray-400"}>SSO (SAML/OIDC)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {plan.specs.ipWhitelist ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <Minus className="h-4 w-4 flex-shrink-0 text-gray-300" />
                    )}
                    <span className={plan.specs.ipWhitelist ? "" : "text-gray-400"}>
                      IP 화이트리스트
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">지원: {plan.specs.support}</div>
                </div>

                <Link
                  href="/contact"
                  className={`block w-full rounded-lg px-6 py-3 text-center text-sm font-medium transition-colors ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Enterprise Banner */}
          <div className="mt-12 rounded-2xl border-2 border-gray-800 bg-gray-900 p-8 text-center">
            <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between md:text-left">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#667eea] to-[#f093fb]">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Enterprise</h3>
                  <p className="text-sm text-gray-400">
                    800~5,000+ 페르소나 · 전담 매니저 · SSO · IP 화이트리스트 · 온프레미스 옵션
                  </p>
                </div>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Enterprise 문의
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* All plans include */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">모든 플랜에 포함된 핵심 기능</h2>
            <p className="mt-4 text-gray-600">
              플랜 간 페르소나 품질 차이는 없습니다. 동일한 매칭 엔진과 동일한 품질을 보장합니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "3단계 매칭 전체 포함",
                desc: "취향 유사도(1단계) · 심층 호환성(2단계) · 의외의 발견(3단계) 모두 사용 가능",
              },
              {
                title: "동일한 페르소나 품질",
                desc: "모든 플랜에서 동일한 취향 분석 품질. 서사·음성·감정 표현까지 동일하게 제공",
              },
              {
                title: "설명 가능한 추천",
                desc: "'왜 이 콘텐츠인지' 매칭 근거를 자연어로 투명하게 설명",
              },
              {
                title: "빠른 응답 속도",
                desc: "동일 콘텐츠 추천 결과를 자동으로 재사용하여 빠른 응답 속도를 유지합니다.",
              },
              {
                title: "실시간 연동 + 개발자 도구 (SDK)",
                desc: "실시간 이벤트 알림과 상세한 API 문서로 빠르고 쉬운 연동",
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

      {/* Overage Pricing */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">초과 요금</h2>
            <p className="mt-4 text-gray-600">
              포함량을 초과해도 서비스가 중단되지 않습니다. 초과분에 대해 종량제로 과금됩니다.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-4 font-medium text-gray-500">플랜</th>
                  <th className="px-6 py-4 font-medium text-gray-500">매칭 API 초과</th>
                  <th className="px-6 py-4 font-medium text-gray-500">추가 페르소나</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {OVERAGE_PRICING.map((row) => (
                  <tr key={row.plan}>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.plan}</td>
                    <td className="px-6 py-4 text-gray-600">{row.apiOverage}</td>
                    <td className="px-6 py-4 text-gray-600">{row.personaOverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-24">
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
            Starter $199/월부터 시작할 수 있습니다. 연간 결제 시 20% 할인.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="ds-button inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
            >
              시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-600 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              Enterprise 문의
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
