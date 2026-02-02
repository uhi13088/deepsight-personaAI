"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "next-auth/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getQueryClient } from "@/lib/query-client"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient()

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
