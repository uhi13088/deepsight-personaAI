/**
 * PersonaWorld Security Audit Log
 *
 * SNS 데이터 접근, 분석, 토큰 사용 등 보안 이벤트를 기록.
 * pw_security_logs 테이블에 기록하되, 실패 시에도 메인 로직을 차단하지 않음.
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"

export type PWSecurityEventType =
  | "SNS_OAUTH_CONNECTED"
  | "SNS_OAUTH_DISCONNECTED"
  | "SNS_DATA_ANALYZED"
  | "SNS_DATA_REANALYZED"
  | "SNS_TOKEN_ACCESSED"
  | "SNS_TOKEN_REFRESHED"
  | "OWNERSHIP_DENIED"
  | "RATE_LIMITED"

interface SecurityLogParams {
  userId: string
  eventType: PWSecurityEventType
  /** 이벤트 세부 정보 (민감 데이터 제외) */
  details?: Record<string, unknown>
  /** 요청자 IP (가능한 경우) */
  ipAddress?: string
}

/**
 * 보안 이벤트를 pw_security_logs 테이블에 기록.
 * 실패해도 예외를 던지지 않음 (fire-and-forget).
 */
export async function logSecurityEvent(params: SecurityLogParams): Promise<void> {
  try {
    await prisma.pWSecurityLog.create({
      data: {
        userId: params.userId,
        eventType: params.eventType,
        details: (params.details ?? {}) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (error) {
    // 감사 로그 실패가 메인 로직을 차단하지 않도록 console.error만 출력
    console.error("[pw-security-log] Failed to record event:", params.eventType, error)
  }
}

/**
 * 요청에서 클라이언트 IP를 추출.
 */
export function extractClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? undefined
  )
}
