import { PrismaClient } from "@/generated/prisma"
import { createPrismaSingleton } from "@deepsight/auth"

const dbUrl = process.env.DATABASE_URL

// 디버깅: DATABASE_URL 로딩 상태 확인 (원인 파악 후 제거 예정)
if (process.env.NODE_ENV === "development") {
  if (!dbUrl) {
    const dbKeys = Object.keys(process.env).filter((k) => k.includes("DATABASE"))
    console.error("[prisma] DATABASE_URL is UNDEFINED. Similar keys:", dbKeys)
    console.error("[prisma] Total env vars loaded:", Object.keys(process.env).length)
  } else {
    console.log("[prisma] DATABASE_URL loaded OK, starts with:", dbUrl.substring(0, 20))
  }
}

export const prisma = createPrismaSingleton(
  () =>
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      datasourceUrl: dbUrl,
    })
)

export default prisma
