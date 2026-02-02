/**
 * Prisma Client 설정
 *
 * 사용법:
 * 1. `npx prisma generate` 실행 후 이 파일 활성화
 * 2. 또는 데이터베이스 연결 후 사용
 *
 * @example
 * import { prisma } from "@/lib/db/prisma"
 * const users = await prisma.user.findMany()
 */

// Prisma Client가 생성되면 아래 주석 해제
// import { PrismaClient } from "@prisma/client"
//
// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined
// }
//
// export const prisma =
//   globalForPrisma.prisma ??
//   new PrismaClient({
//     log:
//       process.env.NODE_ENV === "development"
//         ? ["query", "error", "warn"]
//         : ["error"],
//   })
//
// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
//
// export default prisma

// 임시 placeholder (Prisma generate 전)
export const prisma = null
export default prisma
