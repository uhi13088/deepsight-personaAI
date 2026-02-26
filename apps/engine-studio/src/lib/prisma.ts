import { PrismaClient } from "@/generated/prisma"
import { readFileSync } from "fs"
import { resolve } from "path"

/**
 * Lazy Prisma singleton + env fallback
 *
 * Next.js 16 Turbopack 환경에서 process.env.DATABASE_URL이
 * 런타임에서도 undefined일 수 있어, .env.local 직접 파싱 fallback 추가.
 */
const globalForPrisma = globalThis as unknown as { __deepsight_prisma: PrismaClient | undefined }

function loadDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  // Fallback: .env.local에서 직접 파싱
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
    const match = content.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m)
    if (match?.[1]) {
      process.env.DATABASE_URL = match[1]
      return match[1]
    }
  } catch {
    // .env.local 없으면 무시
  }

  return undefined
}

function getClient(): PrismaClient {
  if (globalForPrisma.__deepsight_prisma) {
    return globalForPrisma.__deepsight_prisma
  }

  const url = loadDatabaseUrl()

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    ...(url ? { datasourceUrl: url } : {}),
  })

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__deepsight_prisma = client
  }

  return client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
})

export default prisma
