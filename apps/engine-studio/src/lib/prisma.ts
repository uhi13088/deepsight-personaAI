import { PrismaClient } from "@/generated/prisma"
import { createPrismaSingleton } from "@deepsight/auth"

export const prisma = createPrismaSingleton(
  () =>
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      datasourceUrl: process.env.DATABASE_URL,
    })
)

export default prisma
