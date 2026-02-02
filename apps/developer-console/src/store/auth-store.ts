import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User, Organization, OrganizationMember } from "@/types"

interface AuthState {
  user: User | null
  organization: Organization | null
  organizations: Organization[]
  membership: OrganizationMember | null
  isLoading: boolean
  isAuthenticated: boolean

  // Actions
  setUser: (user: User | null) => void
  setOrganization: (organization: Organization | null) => void
  setOrganizations: (organizations: Organization[]) => void
  setMembership: (membership: OrganizationMember | null) => void
  setIsLoading: (isLoading: boolean) => void
  switchOrganization: (organizationId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      organizations: [],
      membership: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setOrganization: (organization) => set({ organization }),

      setOrganizations: (organizations) => set({ organizations }),

      setMembership: (membership) => set({ membership }),

      setIsLoading: (isLoading) => set({ isLoading }),

      switchOrganization: (organizationId) => {
        const { organizations } = get()
        const organization = organizations.find((org) => org.id === organizationId)
        if (organization) {
          set({ organization })
        }
      },

      logout: () =>
        set({
          user: null,
          organization: null,
          organizations: [],
          membership: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "deepsight-auth",
      partialize: (state) => ({
        organization: state.organization,
      }),
    }
  )
)
