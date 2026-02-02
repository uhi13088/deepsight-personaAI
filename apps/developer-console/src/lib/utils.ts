import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num)
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(date)
}

export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return key
  return key.slice(0, 8) + "..." + key.slice(-4)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
    case "success":
    case "completed":
      return "text-green-600 bg-green-100"
    case "pending":
    case "processing":
      return "text-yellow-600 bg-yellow-100"
    case "error":
    case "failed":
    case "revoked":
      return "text-red-600 bg-red-100"
    case "inactive":
    case "expired":
      return "text-gray-600 bg-gray-100"
    default:
      return "text-blue-600 bg-blue-100"
  }
}

export function getHttpStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-green-600"
  if (status >= 400 && status < 500) return "text-yellow-600"
  if (status >= 500) return "text-red-600"
  return "text-gray-600"
}
