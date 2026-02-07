import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "DeepSight - AI 페르소나 기반 6D 벡터 추천 플랫폼",
  description:
    "사용자 성향을 6차원으로 분석하고 24개의 AI 페르소나가 맞춤 콘텐츠를 큐레이션합니다. 기존 협업 필터링을 넘어서는 설명 가능한 추천 시스템.",
  keywords: ["AI 추천", "페르소나", "6D 벡터", "개인화", "콘텐츠 큐레이션", "B2B SaaS"],
  openGraph: {
    title: "DeepSight - AI 페르소나 기반 6D 벡터 추천 플랫폼",
    description:
      "사용자 성향을 6차원으로 분석하고 24개의 AI 페르소나가 맞춤 콘텐츠를 큐레이션합니다.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  )
}
