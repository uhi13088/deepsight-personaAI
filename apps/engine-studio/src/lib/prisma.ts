import { PrismaClient } from "@/generated/prisma"
import { createPrismaSingleton } from "@deepsight/auth"

export const prisma = createPrismaSingleton(() => new PrismaClient())

export default prisma
