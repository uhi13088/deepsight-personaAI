import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsOfServicePage() {
  return (
    <div className="bg-muted/30 min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-3 w-3" />
          돌아가기
        </Link>

        <h1 className="mb-6 text-2xl font-bold">서비스 이용약관</h1>

        <div className="prose prose-sm dark:prose-invert space-y-4">
          <p className="text-muted-foreground">
            본 약관은 DeepSight 개발자 콘솔 서비스 이용에 관한 기본적인 사항을 규정합니다.
          </p>

          <h2 className="text-lg font-semibold">1. 서비스 개요</h2>
          <p className="text-muted-foreground">
            DeepSight는 AI 페르소나 기반 콘텐츠 추천 B2B SaaS 플랫폼입니다. 개발자 콘솔을 통해 API
            키 관리, 사용량 모니터링 등을 제공합니다.
          </p>

          <h2 className="text-lg font-semibold">2. 이용자의 의무</h2>
          <p className="text-muted-foreground">
            이용자는 서비스를 정상적인 목적으로 사용해야 하며, API 키를 안전하게 관리할 책임이
            있습니다.
          </p>

          <h2 className="text-lg font-semibold">3. 서비스 제한</h2>
          <p className="text-muted-foreground">
            약관 위반 시 사전 통보 없이 서비스 이용이 제한될 수 있습니다.
          </p>

          <h2 className="text-lg font-semibold">4. 면책</h2>
          <p className="text-muted-foreground">
            천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
