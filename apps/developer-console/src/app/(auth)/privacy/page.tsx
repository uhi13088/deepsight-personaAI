import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
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

        <h1 className="mb-6 text-2xl font-bold">개인정보 처리방침</h1>

        <div className="prose prose-sm dark:prose-invert space-y-4">
          <p className="text-muted-foreground">
            DeepSight는 사용자의 개인정보를 중요하게 생각하며, 관련 법령에 따라 적법하게 처리합니다.
          </p>

          <h2 className="text-lg font-semibold">1. 수집하는 개인정보</h2>
          <p className="text-muted-foreground">
            서비스 이용을 위해 이메일, 이름, 프로필 이미지(OAuth 연동 시)를 수집합니다.
          </p>

          <h2 className="text-lg font-semibold">2. 개인정보의 이용 목적</h2>
          <p className="text-muted-foreground">
            수집된 정보는 서비스 제공, 계정 관리, 보안 강화 목적으로만 사용됩니다.
          </p>

          <h2 className="text-lg font-semibold">3. 개인정보의 보관 및 파기</h2>
          <p className="text-muted-foreground">
            회원 탈퇴 시 관련 정보는 즉시 파기되며, 법령에 따라 보관이 필요한 경우 해당 기간 동안
            별도 보관 후 파기합니다.
          </p>

          <h2 className="text-lg font-semibold">4. 문의</h2>
          <p className="text-muted-foreground">개인정보 관련 문의는 관리자에게 연락해주세요.</p>
        </div>
      </div>
    </div>
  )
}
