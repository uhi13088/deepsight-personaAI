import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"

/**
 * POST /api/settings/2fa/enable - 2FA 활성화 (QR 코드 생성)
 */
export async function POST() {
  const { response } = await requireAuth()
  if (response) return response

  // TODO: In production, use `otplib` to generate real TOTP secrets
  const secret = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()
  const issuer = "DeepSight"
  const accountName = "user"

  // otpauth URL format for authenticator apps
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

  // Generate QR code as data URL using a public API
  // In production, use a library like `qrcode` to generate this server-side
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`

  return NextResponse.json({
    success: true,
    data: {
      qrCode: qrCodeUrl,
      secret: secret,
    },
  })
}
