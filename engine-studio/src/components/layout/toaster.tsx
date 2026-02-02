"use client"

import { useUIStore } from "@/stores/ui-store"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const TOAST_VARIANTS = {
  success: "success" as const,
  error: "destructive" as const,
  warning: "warning" as const,
  info: "info" as const,
}

export function Toaster() {
  const { toasts, removeToast } = useUIStore()

  return (
    <ToastProvider>
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type]
        const variant = TOAST_VARIANTS[toast.type]

        return (
          <Toast
            key={toast.id}
            variant={variant}
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id)
            }}
          >
            <div className="flex gap-3">
              <Icon className="h-5 w-5 mt-0.5" />
              <div className="flex-1">
                <ToastTitle>{toast.title}</ToastTitle>
                {toast.message && (
                  <ToastDescription>{toast.message}</ToastDescription>
                )}
              </div>
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
