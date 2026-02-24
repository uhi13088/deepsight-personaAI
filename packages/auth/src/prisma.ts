/**
 * Prisma 싱글턴 팩토리
 * 앱별 PrismaClient 인스턴스 생성을 주입받아 dev 환경 핫리로드 시 연결 누수 방지
 *
 * @example
 * import { PrismaClient } from "@/generated/prisma"
 * import { createPrismaSingleton } from "@deepsight/auth"
 * export const prisma = createPrismaSingleton(() => new PrismaClient({
 *   log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
 * }))
 */

const globalForPrisma = globalThis as unknown as {
  __deepsight_prisma: unknown
}

export function createPrismaSingleton<T>(factory: () => T): T {
  if (globalForPrisma.__deepsight_prisma) {
    return globalForPrisma.__deepsight_prisma as T
  }

  const client = factory()

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__deepsight_prisma = client
  }

  return client
}
