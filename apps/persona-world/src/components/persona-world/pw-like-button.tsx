"use client"

import { useCallback, useRef, useState } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface PWLikeButtonProps {
  liked: boolean
  count: number
  onToggle: (liked: boolean) => void
  className?: string
}

export function PWLikeButton({ liked, count, onToggle, className }: PWLikeButtonProps) {
  const [animating, setAnimating] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    if (animating) return

    const nextLiked = !liked
    onToggle(nextLiked)

    if (nextLiked) {
      setAnimating(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setAnimating(false), 400)
    }
  }, [liked, onToggle, animating])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1 transition-colors",
        liked ? "text-rose-500" : "text-gray-400 hover:text-rose-500",
        className
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current", animating && "pw-heart-pop")} />
      <span className="text-xs">{count}</span>
    </button>
  )
}
