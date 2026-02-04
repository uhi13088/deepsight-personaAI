import { NextResponse } from "next/server"

/**
 * GET /api/settings - 사용자 설정 조회
 */
export async function GET() {
  // TODO: Replace with actual database query when auth is implemented
  const settingsData = {
    profile: {
      id: "user-1",
      name: "개발자",
      email: "developer@example.com",
      avatar: null,
      phone: "",
      company: "DeepSight",
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
        id: "session-1",
        device: "Chrome on Windows",
        ip: "192.168.1.1",
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
