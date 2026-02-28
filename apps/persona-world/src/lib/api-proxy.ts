import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

function getEngineStudioUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_STUDIO_URL?.trim()
  if (!raw) return "http://localhost:3000"
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/+$/, "")
  return `https://${raw}`.replace(/\/+$/, "")
}

/**
 * API 요청을 engine-studio로 프록시한다.
 *
 * middleware의 NextResponse.next({ request: { headers } })는
 * 라우트 핸들러의 request.headers에 반영되지 않으므로,
 * 프록시에서 직접 x-internal-token과 x-authenticated-email을 주입한다.
 */
export async function proxyToEngineStudio(
  request: NextRequest,
  prefix: string,
  path: string[]
): Promise<NextResponse> {
  const engineUrl = getEngineStudioUrl()
  const targetPath = `${prefix}/${path.join("/")}`
  const url = new URL(targetPath, engineUrl)

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value)
  })

  // engine-studio로 보낼 헤더를 새로 구성한다.
  // persona-world의 쿠키를 그대로 전달하면, engine-studio의 NextAuth가
  // 다른 secret으로 암호화된 세션 쿠키를 디코딩하려다 {"error":"Unauthorized"} 반환.
  // → cookie 제거 후 커스텀 헤더로만 인증 정보 전달.
  const headers = new Headers()
  // 필수 요청 헤더만 복사
  const forwardHeaders = ["content-type", "accept", "user-agent", "accept-language"]
  for (const name of forwardHeaders) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  // 직접 x-internal-token 주입
  const internalSecret = process.env.INTERNAL_API_SECRET
  if (internalSecret) {
    headers.set("x-internal-token", internalSecret)
  }

  // JWT에서 이메일 추출하여 x-authenticated-email 주입
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    })
    if (token?.email) {
      headers.set("x-authenticated-email", token.email as string)
    }
  } catch {
    // JWT 디코딩 실패 무시
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    // @ts-expect-error duplex required for streaming request body
    init.duplex = "half"
  }

  const targetUrl = url.toString()

  const response = await fetch(targetUrl, init)

  // redirect: "manual" 설정으로 3xx 응답을 직접 받음 → 브라우저에 그대로 전달
  // (OAuth 콜백 등 engine-studio가 redirect 응답을 반환하는 케이스)
  if (response.status >= 300 && response.status < 400) {
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete("transfer-encoding")
    responseHeaders.delete("content-encoding")
    responseHeaders.delete("content-length")

    return new NextResponse(null, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  }

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`[api-proxy] ${response.status}: ${request.method} ${targetPath}`)

    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete("transfer-encoding")
    responseHeaders.delete("content-encoding")
    responseHeaders.delete("content-length")

    return new NextResponse(errorBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  }

  const responseHeaders = new Headers(response.headers)
  responseHeaders.delete("transfer-encoding")
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}
