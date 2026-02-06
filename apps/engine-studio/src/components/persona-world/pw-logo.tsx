"use client"

import { cn } from "@/lib/utils"

interface PWLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  animated?: boolean
  className?: string
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-xl",
  xl: "w-20 h-20 text-3xl",
}

/**
 * PersonaWorld 로고 컴포넌트
 * 인스타그램 스타일의 그라데이션 배경 + 흰색 둥근 폰트
 */
export function PWLogo({ size = "md", animated = false, className }: PWLogoProps) {
  return (
    <div
      className={cn(
        // 기본 스타일
        "flex items-center justify-center rounded-xl",
        "select-none font-bold text-white",
        // 그라데이션 배경
        animated ? "pw-gradient-animated" : "pw-gradient",
        // 사이즈
        sizeClasses[size],
        // 둥근 폰트 스타일 (letter-spacing으로 여유감)
        "tracking-tight",
        // 그림자 효과
        "shadow-lg",
        className
      )}
      style={{
        fontFamily: "'Nunito', 'Quicksand', 'Poppins', sans-serif",
        fontWeight: 800,
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
          fontFamily: "'Nunito', 'Quicksand', 'Poppins', sans-serif",
          fontWeight: 700,
        }}
      >
        PersonaWorld
      </span>
    </div>
  )
}
