import { createRequireAuth } from "@deepsight/auth"
import { auth } from "@/lib/auth"

export const requireAuth = createRequireAuth(auth)
