import { create } from "zustand"

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Theme
  theme: "light" | "dark" | "system"
  setTheme: (theme: "light" | "dark" | "system") => void

  // Modal
  activeModal: string | null
  modalData: Record<string, unknown> | null
  openModal: (modalId: string, data?: Record<string, unknown>) => void
  closeModal: () => void

  // Toast notifications
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
  clearToasts: () => void

  // Loading states
  globalLoading: boolean
  setGlobalLoading: (loading: boolean) => void

  // Breadcrumb
  breadcrumbs: Breadcrumb[]
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void
}

interface Toast {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message?: string
  duration?: number
}

interface Breadcrumb {
  label: string
  href?: string
}

export const useUIStore = create<UIState>((set, get) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Theme
  theme: "system",
  setTheme: (theme) => set({ theme }),

  // Modal
  activeModal: null,
  modalData: null,
  openModal: (modalId, data = {}) => set({ activeModal: modalId, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Toast
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    // Auto remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),

  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  // Breadcrumb
  breadcrumbs: [],
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
}))

// Helper hooks
export function useToast() {
  const { addToast, removeToast, clearToasts } = useUIStore()

  return {
    toast: addToast,
    success: (title: string, message?: string) =>
      addToast({ type: "success", title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: "error", title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: "warning", title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: "info", title, message }),
    remove: removeToast,
    clear: clearToasts,
  }
}

export function useModal() {
  const { activeModal, modalData, openModal, closeModal } = useUIStore()

  return {
    isOpen: (modalId: string) => activeModal === modalId,
    data: modalData,
    open: openModal,
    close: closeModal,
  }
}
