import { PrismaClient } from "@/generated/prisma"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const globalForPrisma = globalThis as unknown as { __deepsight_prisma: PrismaClient | undefined }

function isValidPostgresUrl(url: string): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://")
}

function parseEnvValue(raw: string): string {
  let value = raw.trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  return value
}

function loadEnvVar(key: string, envPaths: string[]): string | undefined {
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue

    try {
      const content = readFileSync(envPath, "utf-8")
      const lines = content.split(/\r?\n/)

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith(key)) continue

        const eqIdx = trimmed.indexOf("=")
        if (eqIdx === -1) continue

        // key 정확히 매칭 (DATABASE_URL_OTHER 등 방지)
        const parsedKey = trimmed.substring(0, eqIdx).trim()
        if (parsedKey !== key) continue

        const value = parseEnvValue(trimmed.substring(eqIdx + 1))
        if (value && isValidPostgresUrl(value)) {
          console.log(`[prisma] ${key} loaded from ${envPath}`)
          return value
        }
      }
    } catch (err) {
      console.error(`[prisma] Error reading ${envPath}:`, err)
    }
  }
  return undefined
}

function loadDatabaseUrl(): string | undefined {
  const envPaths = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "apps/engine-studio/.env.local"),
    resolve(process.cwd(), "apps/engine-studio/.env"),
  ]

  // 1차: process.env (값 형식까지 검증)
  if (process.env.DATABASE_URL && isValidPostgresUrl(process.env.DATABASE_URL)) {
    console.log("[prisma] DATABASE_URL from process.env OK")
    return process.env.DATABASE_URL
  }

  if (process.env.DATABASE_URL) {
    console.error(
      `[prisma] DATABASE_URL in process.env is INVALID (starts with: "${process.env.DATABASE_URL.substring(0, 15)}..."). Trying file fallback...`
    )
  } else {
    console.error("[prisma] DATABASE_URL not in process.env. Trying file fallback...")
  }

  console.error("[prisma] cwd:", process.cwd())

  // 2차: .env.local / .env 직접 파싱
  const url = loadEnvVar("DATABASE_URL", envPaths)
  if (url) {
    process.env.DATABASE_URL = url
    return url
  }

  console.error("[prisma] FATAL: DATABASE_URL not found anywhere!")
  return undefined
}

function ensureDirectUrl(fallbackUrl: string): void {
  if (process.env.DIRECT_URL && isValidPostgresUrl(process.env.DIRECT_URL)) {
    return
  }

  const envPaths = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "apps/engine-studio/.env.local"),
    resolve(process.cwd(), "apps/engine-studio/.env"),
  ]

  const directUrl = loadEnvVar("DIRECT_URL", envPaths)
  if (directUrl) {
    process.env.DIRECT_URL = directUrl
    return
  }

  // DIRECT_URL 없으면 DATABASE_URL로 fallback
  process.env.DIRECT_URL = fallbackUrl
  console.log("[prisma] DIRECT_URL not found, falling back to DATABASE_URL")
}

function getClient(): PrismaClient {
  if (globalForPrisma.__deepsight_prisma) {
    return globalForPrisma.__deepsight_prisma
  }

  const url = loadDatabaseUrl()

  // schema.prisma의 directUrl = env("DIRECT_URL") — 엔진이 스키마 검증 시 이 값도 체크하므로 반드시 유효해야 함
  if (url) {
    ensureDirectUrl(url)
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
