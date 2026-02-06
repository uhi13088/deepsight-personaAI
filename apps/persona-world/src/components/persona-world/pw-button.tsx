"use client"

import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"
import { LucideIcon } from "lucide-react"

interface PWButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gradient" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  icon?: LucideIcon
  iconPosition?: "left" | "right"
}

/**
 * PersonaWorld 버튼 컴포넌트
 */
export const PWButton = forwardRef<HTMLButtonElement, PWButtonProps>(
  (
    {
      className,
      variant = "gradient",
      size = "md",
      icon: Icon,
      iconPosition = "right",
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-4 py-2 text-sm gap-1.5",
      md: "px-5 py-2.5 text-base gap-2",
      lg: "px-6 py-3 text-lg gap-2",
    }

    const iconSizes = {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-5 w-5",
    }

    const variantClasses = {
      gradient: "pw-button text-white font-semibold rounded-full",
      outline:
        "pw-border-gradient bg-white font-semibold rounded-full hover:shadow-md transition-all",
      ghost: "pw-text-gradient font-semibold hover:bg-gray-50 rounded-full transition-all",
    }

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {Icon && iconPosition === "left" && (
          <Icon
            className={iconSizes[size]}
            style={variant === "gradient" ? undefined : { stroke: "url(#pw-gradient)" }}
          />
        )}
        {children}
        {Icon && iconPosition === "right" && (
          <Icon
            className={iconSizes[size]}
            style={variant === "gradient" ? undefined : { stroke: "url(#pw-gradient)" }}
          />
        )}
      </button>
    )
  }
)

PWButton.displayName = "PWButton"
