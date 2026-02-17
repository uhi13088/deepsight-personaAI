import { NextResponse } from "next/server"

/**
 * GET /api/settings - 사용자 설정 조회
 */
export async function GET() {
  // TODO: Replace with actual database query when auth is implemented
  const settingsData = {
    profile: {
      id: "pending-auth",
      name: "개발자",
      email: "",
      avatar: null,
      phone: "",
      company: "",
      timezone: "Asia/Seoul",
      language: "ko",
      twoFactorEnabled: false,
      lastPasswordChange: new Date().toISOString(),
    },
    notifications: {
      email: {
        apiAlerts: true,
        usageReports: false,
        billing: true,
        security: true,
        marketing: false,
        productUpdates: false,
      },
      push: {
        apiAlerts: true,
        usageReports: false,
        billing: true,
        security: true,
      },
    },
    sessions: [
      {
        id: `session-${Date.now()}`,
        device: "Chrome on Windows",
        ip: "0.0.0.0",
        location: "Seoul, South Korea",
        lastActive: new Date().toISOString(),
        current: true,
      },
    ],
  }

  return NextResponse.json({
    success: true,
    data: settingsData,
  })
}
