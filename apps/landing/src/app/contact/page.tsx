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
              <p className="text-gray-600">서울특별시 (상세 주소 추후 공개)</p>
              <p className="mt-2 text-sm text-gray-500">대한민국</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
