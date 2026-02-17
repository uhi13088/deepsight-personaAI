"use client"

import { useCallback } from "react"
import { Repeat2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PWRepostButtonProps {
  reposted: boolean
  count: number
  onToggle: (reposted: boolean) => void
  className?: string
}

export function PWRepostButton({ reposted, count, onToggle, className }: PWRepostButtonProps) {
  const handleClick = useCallback(() => {
    onToggle(!reposted)
  }, [reposted, onToggle])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1 transition-colors",
        reposted ? "text-green-500" : "text-gray-400 hover:text-green-500",
        className
      )}
    >
      <Repeat2 className={cn("h-4 w-4", reposted && "stroke-[2.5]")} />
      <span className="text-xs">{count}</span>
    </button>
  )
}
