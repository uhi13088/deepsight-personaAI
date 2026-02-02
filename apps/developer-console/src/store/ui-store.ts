import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  theme: "light" | "dark" | "system"

  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarMobileOpen: (open: boolean) => void
  setTheme: (theme: "light" | "dark" | "system") => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      theme: "system",

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "deepsight-ui",
    }
  )
)
