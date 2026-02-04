"use client"

import * as React from "react"
import { useUIStore } from "@/store/ui-store"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore()

  React.useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = (isDark: boolean) => {
      root.classList.remove("light", "dark")
      root.classList.add(isDark ? "dark" : "light")
    }

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      applyTheme(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener("change", handler)
      return () => mediaQuery.removeEventListener("change", handler)
    } else {
      applyTheme(theme === "dark")
    }
  }, [theme])

  return <>{children}</>
}
