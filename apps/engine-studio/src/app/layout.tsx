import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Engine Studio — DeepSight",
  description: "AI Persona Engine Management Studio",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body>{children}</body>
    </html>
  )
}
