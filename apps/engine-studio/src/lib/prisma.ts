import { PrismaClient } from "@/generated/prisma"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const globalForPrisma = globalThis as unknown as { __deepsight_prisma: PrismaClient | undefined }

function loadDatabaseUrl(): string | undefined {
  // 1차: process.env
  if (process.env.DATABASE_URL) {
    console.log("[prisma] DATABASE_URL from process.env OK")
    return process.env.DATABASE_URL
  }

  console.error("[prisma] DATABASE_URL not in process.env, trying .env.local fallback...")
  console.error("[prisma] cwd:", process.cwd())

  // 2차: .env.local 직접 파싱
  const envPaths = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "apps/engine-studio/.env.local"),
  ]

  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      console.error("[prisma]", envPath, "→ NOT FOUND")
      continue
    }
    console.error("[prisma]", envPath, "→ EXISTS, parsing...")

    try {
      const content = readFileSync(envPath, "utf-8")
      const lines = content.split(/\r?\n/)

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("DATABASE_URL")) continue

        const eqIdx = trimmed.indexOf("=")
        if (eqIdx === -1) continue

        let value = trimmed.substring(eqIdx + 1).trim()
        // Remove surrounding quotes
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }

        if (value && (value.startsWith("postgresql://") || value.startsWith("postgres://"))) {
          console.log("[prisma] DATABASE_URL loaded from", envPath)
          process.env.DATABASE_URL = value
          return value
        }
      }
      console.error("[prisma] DATABASE_URL not found or invalid in", envPath)
    } catch (err) {
      console.error("[prisma] Error reading", envPath, ":", err)
    }
  }

  console.error("[prisma] FATAL: DATABASE_URL not found anywhere!")
  return undefined
}

function getClient(): PrismaClient {
  if (globalForPrisma.__deepsight_prisma) {
    return globalForPrisma.__deepsight_prisma
  }

  const url = loadDatabaseUrl()

  // directUrl이 없으면 DATABASE_URL로 fallback (schema.prisma의 directUrl = env("DIRECT_URL") 대응)
  if (url && !process.env.DIRECT_URL) {
    process.env.DIRECT_URL = url
    console.log("[prisma] DIRECT_URL not set, falling back to DATABASE_URL")
  }

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
