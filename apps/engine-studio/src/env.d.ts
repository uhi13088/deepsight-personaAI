declare namespace NodeJS {
  interface ProcessEnv {
    // --- Redis (Upstash) ---
    UPSTASH_REDIS_REST_URL?: string
    UPSTASH_REDIS_REST_TOKEN?: string

    // --- Notifications (T385) ---
    SLACK_WEBHOOK_URL?: string
    SENDGRID_API_KEY?: string
    ALERT_EMAIL_FROM?: string
    ALERT_EMAIL_TO?: string
  }
}
