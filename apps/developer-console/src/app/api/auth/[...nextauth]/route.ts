/**
 * NextAuth v5 (Auth.js) Catch-All Route Handler
 *
 * Auth.js v5에서는 handlers를 직접 export해야 합니다.
 * try-catch 래핑은 내부 URL 감지 컨텍스트를 깨뜨려 "Invalid URL" 에러를 유발합니다.
 */
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
