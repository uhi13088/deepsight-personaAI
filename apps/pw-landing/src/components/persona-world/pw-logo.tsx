"use client"

import { cn } from "@/lib/utils"

interface PWLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  animated?: boolean
  className?: string
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-14 w-14 text-2xl",
  xl: "h-20 w-20 text-4xl",
}

/**
 * PersonaWorld 로고 컴포넌트
 */
export function PWLogo({ size = "md", animated = false, className }: PWLogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl",
        "select-none font-bold text-white",
        animated ? "pw-gradient-animated" : "pw-gradient",
        sizeClasses[size],
        "tracking-tight shadow-lg",
        className
      )}
      style={{
        fontFamily: "var(--font-brand)",
        fontWeight: 700,
      }}
    >
      PW
    </div>
  )
}

interface PWLogoWithTextProps {
  size?: "sm" | "md" | "lg"
  animated?: boolean
  className?: string
}

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
}

/**
 * PersonaWorld 로고 + 텍스트 컴포넌트
 */
export function PWLogoWithText({ size = "md", animated = false, className }: PWLogoWithTextProps) {
  const logoSize = size === "lg" ? "lg" : size === "md" ? "md" : "sm"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <PWLogo size={logoSize} animated={animated} />
      <span
        className={cn(
          "font-bold",
          animated ? "pw-text-gradient-animated" : "pw-text-gradient",
          textSizeClasses[size]
        )}
        style={{
          fontFamily: "var(--font-brand)",
          fontWeight: 600,
        }}
      >
        PersonaWorld
      </span>
    </div>
  )
}
