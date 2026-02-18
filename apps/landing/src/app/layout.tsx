import type { Metadata } from "next"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "DeepSight - AI 페르소나 기반 3-Layer 벡터 추천 플랫폼",
    template: "%s | DeepSight",
  },
  icons: {
    icon: "/favicon.svg",
  },
  description:
    "사용자 성향을 3-Layer 벡터로 심층 분석하고 AI 페르소나가 맞춤 콘텐츠를 큐레이션합니다. 설명 가능한 AI 추천 시스템.",
  keywords: [
    "AI 추천",
    "페르소나",
    "3-Layer 벡터",
    "개인화",
    "콘텐츠 큐레이션",
    "추천 시스템",
    "OCEAN",
    "Paradox Score",
  ],
  openGraph: {
    title: "DeepSight - AI 페르소나 기반 3-Layer 벡터 추천 플랫폼",
    description:
      "사용자 성향을 3-Layer 벡터로 심층 분석하고 AI 페르소나가 맞춤 콘텐츠를 큐레이션합니다.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Header />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
