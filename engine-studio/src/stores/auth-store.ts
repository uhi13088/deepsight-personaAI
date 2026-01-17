import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User, UserRole } from "@/types"

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  hasPermission: (requiredRoles: UserRole[]) => boolean
  logout: () => void
}

// 역할별 권한 매트릭스
const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 4,
  AI_ENGINEER: 3,
  CONTENT_MANAGER: 2,
  ANALYST: 1,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ isLoading: loading }),

      hasPermission: (requiredRoles) => {
        const { user } = get()
        if (!user) return false
        return requiredRoles.includes(user.role)
      },

      logout: () => set({ user: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }),
    }
  )
)

// 권한 체크 헬퍼 함수
export function canAccessPersonaStudio(role: UserRole): boolean {
  return ["ADMIN", "CONTENT_MANAGER", "ANALYST"].includes(role)
}

export function canEditPersona(role: UserRole): boolean {
  return ["ADMIN", "CONTENT_MANAGER"].includes(role)
}

export function canAccessUserInsight(role: UserRole): boolean {
  return ["ADMIN", "AI_ENGINEER", "ANALYST"].includes(role)
}

export function canEditUserInsight(role: UserRole): boolean {
  return ["ADMIN", "AI_ENGINEER"].includes(role)
}

export function canAccessMatchingLab(role: UserRole): boolean {
  return ["ADMIN", "AI_ENGINEER", "ANALYST"].includes(role)
}

export function canEditMatchingLab(role: UserRole): boolean {
  return ["ADMIN", "AI_ENGINEER"].includes(role)
}

export function canAccessSystemIntegration(role: UserRole): boolean {
  return ["ADMIN", "AI_ENGINEER", "ANALYST"].includes(role)
}

export function canDeploySystem(role: UserRole): boolean {
  return ["ADMIN", "AI_ENGINEER"].includes(role)
}

export function canAccessOperations(role: UserRole): boolean {
  return ["ADMIN", "AI_ENGINEER", "ANALYST"].includes(role)
}

export function canManageOperations(role: UserRole): boolean {
  return ["ADMIN", "AI_ENGINEER"].includes(role)
}

export function canAccessGlobalConfig(role: UserRole): boolean {
  return role === "ADMIN"
}

export function canAccessTeamManagement(role: UserRole): boolean {
  return role === "ADMIN"
}
