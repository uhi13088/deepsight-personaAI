"use client"

import { PWBadge } from "./pw-badge"
import { type ProfileLevel, PROFILE_LEVELS } from "@/lib/profile-level"

interface PWProfileLevelBadgeProps {
  level: ProfileLevel
  showLabel?: boolean
  className?: string
}

export function PWProfileLevelBadge({
  level,
  showLabel = true,
  className,
}: PWProfileLevelBadgeProps) {
  const config = PROFILE_LEVELS[level]

  return (
    <PWBadge variant="gradient" className={className}>
      <span className="flex items-center gap-1">
        <span>{config.emoji}</span>
        {showLabel && <span>{config.label}</span>}
      </span>
    </PWBadge>
  )
}
