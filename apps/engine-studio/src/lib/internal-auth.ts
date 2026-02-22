/**
 * Internal API 인증 유틸리티
 *
 * persona-world → engine-studio 프록시 요청에 대한 서비스간 인증.
 * persona-world 미들웨어가 X-Internal-Token + X-Authenticated-Email 헤더를 주입하고,
 * engine-studio의 public/persona-world 라우트에서 이를 검증한다.
 *
 * INTERNAL_API_SECRET 환경변수가 설정되지 않으면 검증을 건너뛴다 (개발 모드).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logSecurityEvent, extractClientIp } from "@/lib/persona-world/security-log"

const HEADER_NAME = "x-internal-token"
const EMAIL_HEADER = "x-authenticated-email"

/**
 * Internal token을 검증한다.
 * @returns null이면 인증 성공, NextResponse이면 인증 실패 응답
 */
export function verifyInternalToken(request: NextRequest): NextResponse | null {
  const expectedSecret = process.env.INTERNAL_API_SECRET
  if (!expectedSecret) {
    // 시크릿 미설정 시 검증 건너뜀 (로컬 개발용)
    return null
  }

  const token = request.headers.get(HEADER_NAME)
  if (token === expectedSecret) {
    return null // 인증 성공
  }

  return NextResponse.json(
    { success: false, error: { code: "UNAUTHORIZED", message: "Invalid internal token" } },
    { status: 401 }
  )
}

/**
 * 요청자의 인증된 이메일이 userId의 소유자와 일치하는지 검증한다.
 *
 * persona-world 미들웨어가 JWT에서 추출한 x-authenticated-email 헤더와
 * DB의 PersonaWorldUser.email을 비교하여 소유권을 확인한다.
 *
 * @returns null이면 검증 성공, NextResponse이면 접근 거부 응답
 */
export async function verifyUserOwnership(
  request: NextRequest,
  userId: string
): Promise<NextResponse | null> {
  const authenticatedEmail = request.headers.get(EMAIL_HEADER)

  // 개발 모드 (INTERNAL_API_SECRET 미설정) — 검증 건너뜀
  if (!process.env.INTERNAL_API_SECRET) {
    return null
  }

  // 이메일 헤더 누락 시 (미들웨어가 JWT 디코딩 실패)
  if (!authenticatedEmail) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "인증 정보가 누락되었습니다" } },
      { status: 401 }
    )
  }

  // userId의 이메일과 인증된 이메일 비교
  const user = await prisma.personaWorldUser.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  if (!user || user.email.toLowerCase() !== authenticatedEmail.toLowerCase()) {
    // 감사 로그: 소유권 거부 이벤트 기록
    void logSecurityEvent({
      userId,
      eventType: "OWNERSHIP_DENIED",
      details: {
        attemptedEmail: authenticatedEmail,
        endpoint: request.nextUrl.pathname,
      },
      ipAddress: extractClientIp(request.headers),
    })
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "접근 권한이 없습니다" } },
      { status: 403 }
    )
  }

  return null
}

/**
 * 미들웨어가 주입한 인증된 이메일을 추출한다.
 */
export function getAuthenticatedEmail(request: NextRequest): string | null {
  return request.headers.get(EMAIL_HEADER)
}
