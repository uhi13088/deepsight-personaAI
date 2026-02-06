"use client"

import { cn } from "@/lib/utils"
import { Heart } from "lucide-react"
import { useState } from "react"

interface PWLikeButtonProps {
  liked?: boolean
  count?: number
  onToggle?: (liked: boolean) => void
  className?: string
}

/**
 * PersonaWorld 좋아요 버튼
 * 클릭 시 하트 팝 애니메이션
 */
export function PWLikeButton({ liked = false, count = 0, onToggle, className }: PWLikeButtonProps) {
  const [isLiked, setIsLiked] = useState(liked)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = () => {
    const newLiked = !isLiked
    setIsLiked(newLiked)
    setIsAnimating(true)
    onToggle?.(newLiked)

    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-400",
        className
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-transform",
          isLiked && "fill-current",
          isAnimating && "pw-heart-pop"
        )}
      />
      {count > 0 && <span className="text-sm font-medium">{count}</span>}
    </button>
  )
}
