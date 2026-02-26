import { PrismaClient } from "@/generated/prisma"

/**
 * Lazy Prisma singleton — 첫 프로퍼티 접근 시 PrismaClient 생성
 *
 * Next.js 16 Turbopack에서 모듈이 env 로딩 전에 평가될 수 있으므로,
 * process.env.DATABASE_URL을 모듈 로드 시점이 아닌 첫 사용 시점에 읽는다.
 */
const globalForPrisma = globalThis as unknown as { __deepsight_prisma: PrismaClient | undefined }

function getClient(): PrismaClient {
  if (globalForPrisma.__deepsight_prisma) {
    return globalForPrisma.__deepsight_prisma
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
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
