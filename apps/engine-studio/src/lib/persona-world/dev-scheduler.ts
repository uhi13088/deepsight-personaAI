// ═══════════════════════════════════════════════════════════════
// Dev-mode Auto Scheduler
// 로컬 개발 시 자동으로 페르소나 스케줄러를 주기적으로 실행한다.
// Production에서는 Vercel Cron이 /api/cron/persona-scheduler를 호출.
// ═══════════════════════════════════════════════════════════════

import { executePwScheduler } from "./pw-scheduler-service"

const DEFAULT_INTERVAL_MIN = 10

let started = false

export function startDevScheduler(): void {
  if (started) return
  started = true

  const intervalMin = Number(process.env.DEV_SCHEDULER_INTERVAL_MINUTES) || DEFAULT_INTERVAL_MIN
  const intervalMs = intervalMin * 60 * 1000

  console.log(
    `[DevScheduler] 🚀 페르소나 자율활동 스케줄러 시작 (${intervalMin}분 간격)\n` +
      `[DevScheduler] 환경변수 DEV_SCHEDULER_INTERVAL_MINUTES로 간격 조정 가능`
  )

  // 서버 시작 후 30초 대기 (Prisma/DB 연결 안정화)
  setTimeout(() => {
    void runOnce()
    setInterval(() => {
      void runOnce()
    }, intervalMs)
  }, 30_000)
}

async function runOnce(): Promise<void> {
  const currentHour = new Date().getHours()
  const timeStr = new Date().toLocaleTimeString("ko-KR")

  console.log(`\n[DevScheduler] ──── 스케줄러 실행 (${timeStr}, hour=${currentHour}) ────`)

  try {
    const result = await executePwScheduler({
      trigger: "SCHEDULED",
      currentHour,
    })

    const { postsCreated, interactions, llmAvailable } = result.execution

    console.log(
      `[DevScheduler] 결과: ` +
        `LLM=${llmAvailable ? "ON" : "OFF"}, ` +
        `포스트=${postsCreated.length}건, ` +
        `인터랙션=${interactions.length}건`
    )

    if (postsCreated.length > 0) {
      for (const post of postsCreated) {
        console.log(`  → 포스트 생성: personaId=${post.personaId} type=${post.postType}`)
      }
    }

    if (interactions.length > 0) {
      for (const inter of interactions) {
        console.log(
          `  → 인터랙션: personaId=${inter.personaId} likes=${inter.likes} comments=${inter.comments}`
        )
      }
    }

    if (postsCreated.length === 0 && interactions.length === 0) {
      // 활동이 없는 이유를 진단
      const decisions = result.decisions as Array<{
        personaId: string
        personaName: string
        shouldPost: boolean
        shouldInteract: boolean
      }>

      if (!Array.isArray(decisions) || decisions.length === 0) {
        console.log(
          `  ⚠ 활동 가능한 페르소나 없음 (status=ACTIVE/STANDARD + vectors + activeHours + energy 확인 필요)`
        )
      } else {
        const postDecisions = decisions.filter((d) => d.shouldPost).length
        const interactDecisions = decisions.filter((d) => d.shouldInteract).length
        console.log(
          `  ℹ 결정: ${decisions.length}명 평가 → 포스트=${postDecisions}명, 인터랙션=${interactDecisions}명`
        )
        if (postDecisions > 0 && !llmAvailable) {
          console.log(`  ⚠ 포스트 결정됐지만 LLM 미설정 (ANTHROPIC_API_KEY 확인)`)
        }
      }
    }

    console.log(`[DevScheduler] ──── 실행 완료 ────\n`)
  } catch (err) {
    console.error(`[DevScheduler] 에러:`, err)
  }
}
