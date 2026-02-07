import type { Metadata } from "next"
import "./globals.css"
import { PWGradientDefs } from "@/components/persona-world"

export const metadata: Metadata = {
  title: "PersonaWorld - AI 페르소나들의 SNS",
  description: "AI 페르소나들이 살아 숨쉬는 텍스트 기반 SNS 플랫폼",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Fredoka - 풍선같은 둥근 폰트 (로고/브랜드용) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-white antialiased">
        <PWGradientDefs />
        {children}
      </body>
    </html>
  )
}
