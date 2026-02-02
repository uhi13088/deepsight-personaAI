import type { Metadata } from "next"
import "./globals.css"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "DeepSight Developer Console",
  description: "AI-powered persona matching API platform for developers",
  keywords: ["API", "AI", "Persona", "Matching", "Developer", "Console"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={cn("bg-background min-h-screen font-sans antialiased")}>{children}</body>
    </html>
  )
}
