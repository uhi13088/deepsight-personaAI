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

  const headers = new Headers(request.headers)
  headers.delete("host")

  // 직접 x-internal-token 주입 (middleware 헤더 수정은 route handler에 미반영)
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
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    // @ts-expect-error duplex required for streaming request body
    init.duplex = "half"
  }

  const targetUrl = url.toString()

  if (!internalSecret) {
    console.warn(
      `[api-proxy] INTERNAL_API_SECRET is not set — engine-studio may reject with 401. Target: ${request.method} ${targetPath}`
    )
  }

  const response = await fetch(targetUrl, init)

  if (response.status === 401) {
    console.error(
      `[api-proxy] 401 from engine-studio: ${request.method} ${targetPath} → ${targetUrl} (INTERNAL_API_SECRET set: ${!!internalSecret})`
    )
  }

  const responseHeaders = new Headers(response.headers)
  responseHeaders.delete("transfer-encoding")
  // Node.js fetch가 자동으로 gzip 디코딩하므로 content-encoding도 제거해야 함
  // 그렇지 않으면 브라우저가 이미 디코딩된 바디를 다시 디코딩하려 해서 ERR_CONTENT_DECODING_FAILED 발생
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}
