interface GetEngineStudioUrlOptions {
  /** App name for warning messages */
  appName?: string
}

/**
 * Parse NEXT_PUBLIC_ENGINE_STUDIO_URL with fallback to localhost:3000.
 * Ensures protocol prefix and trailing slash removal.
 */
export function getEngineStudioUrl(options: GetEngineStudioUrlOptions = {}): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_STUDIO_URL?.trim()
  if (!raw) {
    if (process.env.VERCEL && options.appName) {
      console.warn(
        `\x1b[33m[${options.appName}] WARNING: NEXT_PUBLIC_ENGINE_STUDIO_URL is not set!\x1b[0m\n` +
          "All API calls will fail. Set this env var in Vercel project settings.\n" +
          "Example: NEXT_PUBLIC_ENGINE_STUDIO_URL=https://your-engine-studio.vercel.app"
      )
    }
    return "http://localhost:3000"
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "")
  }
  return `https://${raw}`.replace(/\/+$/, "")
}
