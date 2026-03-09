import { Redis } from "@upstash/redis"

const globalForRedis = globalThis as unknown as {
  __deepsight_redis: Redis | undefined
}

/**
 * Upstash Redis 클라이언트 싱글턴.
 * 환경변수 미설정 시 null 반환 (graceful degradation).
 */
function getClient(): Redis | null {
  if (globalForRedis.__deepsight_redis) {
    return globalForRedis.__deepsight_redis
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn(
      "[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Redis disabled."
    )
    return null
  }

  const client = new Redis({ url, token })

  if (process.env.NODE_ENV !== "production") {
    globalForRedis.__deepsight_redis = client
  }

  return client
}

/**
 * Redis 연결 헬스체크.
 * @returns "PONG" on success, error message on failure, null if Redis disabled
 */
export async function pingRedis(): Promise<{ ok: boolean; message: string }> {
  const client = getClient()

  if (!client) {
    return { ok: false, message: "Redis not configured (env vars missing)" }
  }

  try {
    const result = await client.ping()
    return { ok: result === "PONG", message: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[redis] Ping failed:", message)
    return { ok: false, message }
  }
}

/**
 * Redis 클라이언트 (환경변수 미설정 시 null).
 * 사용 시 null 체크 필수.
 */
export const redis = getClient()

export default redis
