export async function register() {
  // Dev-mode: 페르소나 자율활동 스케줄러 자동 실행
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "development") {
    const { startDevScheduler } = await import("@/lib/persona-world/dev-scheduler")
    startDevScheduler()
  }
}
