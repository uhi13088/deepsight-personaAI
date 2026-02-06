"use client"

import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface PWButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gradient" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
}

/**
 * PersonaWorld 그라데이션 버튼
 */
export const PWButton = forwardRef<HTMLButtonElement, PWButtonProps>(
  ({ className, variant = "gradient", size = "md", children, ...props }, ref) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    }

    const variantClasses = {
      gradient: "pw-button text-white font-semibold rounded-lg",
      outline:
        "pw-border-gradient bg-transparent font-semibold rounded-lg hover:pw-glow transition-all",
      ghost:
        "bg-transparent pw-text-gradient font-semibold hover:bg-muted/50 rounded-lg transition-all",
    }

    return (
      <button
        ref={ref}
        className={cn(sizeClasses[size], variantClasses[variant], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

PWButton.displayName = "PWButton"
