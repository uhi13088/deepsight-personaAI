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
      <body className="min-h-screen bg-white antialiased">
        <PWGradientDefs />
        {children}
      </body>
    </html>
  )
}
