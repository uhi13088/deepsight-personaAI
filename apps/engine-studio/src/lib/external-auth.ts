// ═══════════════════════════════════════════════════════════════
// external-auth.ts — B2B External API Key 인증
// Developer Console api_keys 테이블 조회 (공유 DB)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"

const HEADER_NAME = "x-api-key"

interface ApiKeyRow {
  organization_id: string
}

/**
 * x-api-key 헤더를 검증하고 tenantId(organizationId)를 반환.
 *
 * @returns `{ tenantId: string }` 인증 성공 | NextResponse 인증 실패
 */
export async function verifyExternalApiKey(
  request: NextRequest
): Promise<{ tenantId: string } | NextResponse> {
  const rawKey = request.headers.get(HEADER_NAME)
  if (!rawKey) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "x-api-key 헤더가 필요합니다" } },
      { status: 401 }
    )
  }

  const keyHash = createHash("sha256").update(rawKey).digest("hex")

  // Developer Console의 api_keys 테이블 조회 (공유 DB)
  const rows = await prisma.$queryRaw<ApiKeyRow[]>`
    SELECT organization_id
    FROM api_keys
    WHERE key_hash = ${keyHash}
      AND status = 'ACTIVE'
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "유효하지 않은 API 키입니다" } },
      { status: 401 }
    )
  }

  const tenantId = rows[0].organization_id
  return { tenantId }
}
