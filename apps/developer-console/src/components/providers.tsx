"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      {children}
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  )
}
