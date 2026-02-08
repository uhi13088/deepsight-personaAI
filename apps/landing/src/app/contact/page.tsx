import type { Metadata } from "next"
import { Mail, MessageSquare, MapPin } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact",
  description: "DeepSight 팀에 문의하세요. 기술 상담, 제휴 제안, 일반 문의를 환영합니다.",
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@deepsight.ai"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
            CONTACT
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">문의하기</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            DeepSight에 대해 궁금한 점이 있으시거나, 제휴를 원하시면 아래 채널을 통해 연락해주세요.
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50">
                <Mail className="h-7 w-7 text-[#667eea]" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">이메일</h3>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#667eea] hover:text-purple-700">
                {CONTACT_EMAIL}
              </a>
              <p className="mt-2 text-sm text-gray-500">일반 문의, 기술 상담</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50">
                <MessageSquare className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">제휴 문의</h3>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=제휴 문의`}
                className="text-purple-600 hover:text-purple-700"
              >
                제휴 제안하기
              </a>
              <p className="mt-2 text-sm text-gray-500">API 연동, 비즈니스 협력</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-50">
                <MapPin className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">오피스</h3>
              <p className="text-gray-600">서울특별시</p>
              <p className="mt-2 text-sm text-gray-500">대한민국</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-24">
            <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">자주 묻는 질문</h2>
            <div className="space-y-4">
              {[
                {
                  q: "DeepSight는 어떤 서비스인가요?",
                  a: "DeepSight는 AI 페르소나 기반 6D 벡터 추천 시스템입니다. 사용자의 콘텐츠 소비 성향을 6개 차원으로 분석하고, AI 페르소나가 설명 가능한 추천을 제공합니다.",
                },
                {
                  q: "PersonaWorld는 무료인가요?",
                  a: "PersonaWorld의 기본 기능은 무료로 이용할 수 있습니다. AI 페르소나와의 소통, 콘텐츠 탐색, 6D 벡터 프로필 확인 등을 무료로 체험해보세요.",
                },
                {
                  q: "API 연동은 어떻게 하나요?",
                  a: "Developer Console에서 API 키를 발급받고, SDK를 설치하면 바로 연동이 가능합니다. 자세한 내용은 Developer Console 페이지를 참고하세요.",
                },
                {
                  q: "데이터는 안전한가요?",
                  a: "사용자 데이터는 암호화되어 안전하게 저장됩니다. 6D 벡터 프로필은 개인정보가 아닌 콘텐츠 성향 데이터로, 사용자가 직접 확인하고 관리할 수 있습니다.",
                },
              ].map((faq, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="mb-2 font-bold text-gray-900">{faq.q}</h3>
                  <p className="text-sm text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
