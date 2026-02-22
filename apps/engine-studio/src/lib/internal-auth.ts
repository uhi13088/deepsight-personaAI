/**
 * Internal API 인증 유틸리티
 *
 * persona-world → engine-studio 프록시 요청에 대한 서비스간 인증.
 * persona-world 미들웨어가 X-Internal-Token 헤더를 주입하고,
 * engine-studio의 public/persona-world 라우트에서 이를 검증한다.
 *
 * INTERNAL_API_SECRET 환경변수가 설정되지 않으면 검증을 건너뛴다 (개발 모드).
 */

import { NextRequest, NextResponse } from "next/server"

const HEADER_NAME = "x-internal-token"

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
