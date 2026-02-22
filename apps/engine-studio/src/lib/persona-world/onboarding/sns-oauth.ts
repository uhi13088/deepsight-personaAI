// ═══════════════════════════════════════════════════════════════
// PersonaWorld — SNS OAuth Integration
// 설계서 §12, 구현계획서 §8.3
// 플랫폼별 OAuth URL 빌드 + 콜백 토큰 교환
// ═══════════════════════════════════════════════════════════════

import type { SNSPlatform } from "@/generated/prisma"

// ── 플랫폼 설정 타입 ──────────────────────────────────────────

export interface OAuthPlatformConfig {
  platform: SNSPlatform
  authUrl: string
  tokenUrl: string
  scopes: string[]
  /** 추가 auth params (response_type, access_type 등) */
  extraAuthParams?: Record<string, string>
}

export interface OAuthTokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  scope?: string
  tokenType?: string
}

export interface OAuthCallbackParams {
  code: string
  state: string
  platform: SNSPlatform
}

// ── 플랫폼별 OAuth 설정 ──────────────────────────────────────

const PLATFORM_CONFIGS: Record<SNSPlatform, OAuthPlatformConfig> = {
  YOUTUBE: {
    platform: "YOUTUBE",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
  },
  SPOTIFY: {
    platform: "SPOTIFY",
    authUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scopes: [
      "user-read-recently-played",
      "user-top-read",
      "user-library-read",
      "user-read-private",
    ],
  },
  INSTAGRAM: {
    platform: "INSTAGRAM",
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scopes: ["user_profile", "user_media"],
  },
  TWITTER: {
    platform: "TWITTER",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "users.read", "like.read", "follows.read"],
    extraAuthParams: {
      code_challenge_method: "S256",
    },
  },
  NETFLIX: {
    platform: "NETFLIX",
    // Netflix에는 공개 OAuth API가 없음 — 데이터 업로드 방식
    authUrl: "",
    tokenUrl: "",
    scopes: [],
  },
  LETTERBOXD: {
    platform: "LETTERBOXD",
    // Letterboxd에는 공개 OAuth API가 없음 — 데이터 업로드 방식
    authUrl: "",
    tokenUrl: "",
    scopes: [],
  },
  TIKTOK: {
    platform: "TIKTOK",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.list"],
    extraAuthParams: {
      client_key: "", // env에서 주입
    },
  },
}

// ── OAuth가 지원되는 플랫폼 ───────────────────────────────────

/** OAuth 인증이 가능한 플랫폼 목록 */
export const OAUTH_SUPPORTED_PLATFORMS: SNSPlatform[] = [
  "YOUTUBE",
  "SPOTIFY",
  "INSTAGRAM",
  "TWITTER",
  "TIKTOK",
]

/** 데이터 업로드 방식만 지원하는 플랫폼 */
export const UPLOAD_ONLY_PLATFORMS: SNSPlatform[] = ["NETFLIX", "LETTERBOXD"]

// ── 환경변수 키 매핑 ─────────────────────────────────────────

/**
 * 플랫폼별 환경변수 키 매핑.
 * 실제 값은 process.env에서 런타임에 읽음.
 */
function getClientCredentials(platform: SNSPlatform): {
  clientId: string
  clientSecret: string
} {
  // YouTube는 Google OAuth를 사용하므로 GOOGLE_ 환경변수 우선 사용
  const prefix = platform === "YOUTUBE" ? "GOOGLE" : platform.toUpperCase()
  const clientId = process.env[`${prefix}_CLIENT_ID`] ?? ""
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`] ?? ""
  return { clientId, clientSecret }
}

function getRedirectUri(platform: SNSPlatform): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? ""
  return `${baseUrl}/api/persona-world/onboarding/sns/callback?platform=${platform.toLowerCase()}`
}

// ── OAuth URL 빌드 ───────────────────────────────────────────

/**
 * OAuth 인증 URL 빌드.
 *
 * @param platform 대상 SNS 플랫폼
 * @param userId 유저 ID (state에 포함)
 * @param codeChallenge PKCE code_challenge (Twitter 등)
 * @returns 인증 URL 또는 null (비 OAuth 플랫폼)
 */
export function buildAuthUrl(
  platform: SNSPlatform,
  userId: string,
  codeChallenge?: string,
  returnTo?: string
): string | null {
  if (!OAUTH_SUPPORTED_PLATFORMS.includes(platform)) return null

  const config = PLATFORM_CONFIGS[platform]
  if (!config.authUrl) return null

  const { clientId } = getClientCredentials(platform)
  if (!clientId) return null

  const redirectUri = getRedirectUri(platform)

  // state에 userId + returnTo를 인코딩 (CSRF 방지 + 유저 식별 + 복귀 URL)
  const state = encodeState(userId, platform, returnTo)

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    state,
    ...config.extraAuthParams,
  })

  // PKCE 지원 (Twitter)
  if (codeChallenge && config.extraAuthParams?.code_challenge_method) {
    params.set("code_challenge", codeChallenge)
    params.set("code_challenge_method", config.extraAuthParams.code_challenge_method)
  }

  // TikTok은 client_key 사용
  if (platform === "TIKTOK") {
    params.set("client_key", clientId)
    params.delete("client_id")
  }

  return `${config.authUrl}?${params.toString()}`
}

// ── 토큰 교환 ────────────────────────────────────────────────

/**
 * OAuth 콜백에서 authorization code → access token 교환.
 */
export async function exchangeCodeForToken(
  platform: SNSPlatform,
  code: string,
  codeVerifier?: string
): Promise<OAuthTokenResponse> {
  const config = PLATFORM_CONFIGS[platform]
  if (!config.tokenUrl) {
    throw new Error(`Platform ${platform} does not support OAuth token exchange`)
  }

  const { clientId, clientSecret } = getClientCredentials(platform)
  const redirectUri = getRedirectUri(platform)

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })

  // PKCE code_verifier (Twitter)
  if (codeVerifier) {
    body.set("code_verifier", codeVerifier)
  }

  // TikTok은 client_key 사용
  if (platform === "TIKTOK") {
    body.set("client_key", clientId)
    body.delete("client_id")
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  }

  // Spotify는 Basic Auth 헤더 사용
  if (platform === "SPOTIFY") {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    headers["Authorization"] = `Basic ${basic}`
    body.delete("client_id")
    body.delete("client_secret")
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Token exchange failed for ${platform}: ${res.status} ${errorText}`)
  }

  const data = await res.json()
  return normalizeTokenResponse(platform, data)
}

/**
 * Refresh token으로 새 access token 발급.
 */
export async function refreshAccessToken(
  platform: SNSPlatform,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const config = PLATFORM_CONFIGS[platform]
  if (!config.tokenUrl) {
    throw new Error(`Platform ${platform} does not support token refresh`)
  }

  const { clientId, clientSecret } = getClientCredentials(platform)

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  }

  if (platform === "SPOTIFY") {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    headers["Authorization"] = `Basic ${basic}`
    body.delete("client_id")
    body.delete("client_secret")
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Token refresh failed for ${platform}: ${res.status} ${errorText}`)
  }

  const data = await res.json()
  return normalizeTokenResponse(platform, data)
}

// ── State 인코딩/디코딩 ──────────────────────────────────────

/**
 * OAuth state 파라미터에 userId와 platform 인코딩.
 */
export function encodeState(userId: string, platform: SNSPlatform, returnTo?: string): string {
  return Buffer.from(JSON.stringify({ userId, platform, ts: Date.now(), returnTo })).toString(
    "base64url"
  )
}

/**
 * OAuth state 파라미터 디코딩.
 */
export function decodeState(state: string): {
  userId: string
  platform: SNSPlatform
  ts: number
  returnTo?: string
} | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"))
    if (!decoded.userId || !decoded.platform) return null
    return decoded as { userId: string; platform: SNSPlatform; ts: number; returnTo?: string }
  } catch {
    return null
  }
}

/**
 * State 유효성 검증 (10분 내 생성).
 */
export function validateState(state: string): {
  valid: boolean
  userId?: string
  platform?: SNSPlatform
  returnTo?: string
} {
  const decoded = decodeState(state)
  if (!decoded) return { valid: false }

  const elapsed = Date.now() - decoded.ts
  const maxAge = 10 * 60 * 1000 // 10분
  if (elapsed > maxAge) return { valid: false }

  return {
    valid: true,
    userId: decoded.userId,
    platform: decoded.platform,
    returnTo: decoded.returnTo,
  }
}

// ── 유틸리티 ─────────────────────────────────────────────────

/**
 * 플랫폼별 토큰 응답 정규화.
 */
function normalizeTokenResponse(
  platform: SNSPlatform,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): OAuthTokenResponse {
  // 각 플랫폼의 필드명이 다를 수 있음
  if (platform === "TIKTOK") {
    return {
      accessToken: data.access_token ?? data.data?.access_token ?? "",
      refreshToken: data.refresh_token ?? data.data?.refresh_token,
      expiresIn: data.expires_in ?? data.data?.expires_in,
      scope: data.scope ?? data.data?.scope,
      tokenType: data.token_type ?? data.data?.token_type,
    }
  }

  return {
    accessToken: data.access_token ?? "",
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type,
  }
}

/**
 * 플랫폼이 OAuth를 지원하는지 확인.
 */
export function isOAuthSupported(platform: SNSPlatform): boolean {
  return OAUTH_SUPPORTED_PLATFORMS.includes(platform)
}

/**
 * 플랫폼의 OAuth 설정 조회.
 */
export function getPlatformConfig(platform: SNSPlatform): OAuthPlatformConfig {
  return PLATFORM_CONFIGS[platform]
}
