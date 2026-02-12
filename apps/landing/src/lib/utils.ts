import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(num)
}

export function formatPercent(num: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100)
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

export function generateId(): string {
  // Use crypto.randomUUID() for guaranteed uniqueness
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Persona 상태 라벨
export const PERSONA_STATUS_LABELS: Record<string, string> = {
  DRAFT: "초안",
  REVIEW: "검수 대기",
  ACTIVE: "활성",
  STANDARD: "표준",
  LEGACY: "구형",
  DEPRECATED: "지원 중단",
  PAUSED: "일시 중단",
  ARCHIVED: "보관",
}

export const PERSONA_ROLE_LABELS: Record<string, string> = {
  REVIEWER: "리뷰어",
  CURATOR: "큐레이터",
  EDUCATOR: "교육자",
  COMPANION: "동반자",
  ANALYST: "분석가",
}

export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: "관리자",
  AI_ENGINEER: "AI 엔지니어",
  CONTENT_MANAGER: "콘텐츠 매니저",
  ANALYST: "분석가",
}
