import { describe, it, expect } from "vitest"
import {
  spendCredits,
  getBalance,
  type CreditDataProvider,
  type TransactionRecord,
} from "@/lib/persona-world/credit-service"

// ═══════════════════════════════════════════════════════════════
// 크레딧 기반 페르소나 요청 테스트 (T414)
//
// credit-service의 spendCredits를 직접 테스트하여
// 페르소나 요청 시 크레딧 차감 로직을 검증.
// ═══════════════════════════════════════════════════════════════

const PERSONA_REQUEST_CREDIT_COST = 300

function createMockProvider(initialBalance: number): CreditDataProvider & {
  transactions: TransactionRecord[]
} {
  const transactions: TransactionRecord[] = []

  if (initialBalance > 0) {
    transactions.push({
      id: "seed",
      userId: "user-1",
      type: "EARN",
      amount: initialBalance,
      balanceAfter: initialBalance,
      reason: "온보딩 완료",
      orderId: null,
      paymentKey: null,
      status: "COMPLETED",
      createdAt: new Date(),
    })
  }

  return {
    transactions,
    async getLatestTransaction(userId: string) {
      const userTxns = transactions.filter((t) => t.userId === userId && t.status === "COMPLETED")
      return userTxns.length > 0 ? userTxns[userTxns.length - 1]! : null
    },
    async createTransaction(data) {
      const tx: TransactionRecord = {
        id: `tx-${transactions.length + 1}`,
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        reason: data.reason ?? null,
        orderId: data.orderId ?? null,
        paymentKey: data.paymentKey ?? null,
        status: (data.status ?? "COMPLETED") as TransactionRecord["status"],
        createdAt: new Date(),
      }
      transactions.push(tx)
      return tx
    },
    async findByOrderId() {
      return null
    },
    async updateTransaction() {
      throw new Error("Not implemented")
    },
    async getTransactions() {
      return transactions
    },
  }
}

describe("페르소나 요청 크레딧 차감 (T414)", () => {
  // ── 70% 미만: 무료 요청 (크레딧 불필요) ──────────────────────

  it("70% 미만 유사도 → 크레딧 차감 없이 요청 가능 (무료)", async () => {
    const provider = createMockProvider(0)
    const balance = await getBalance(provider, "user-1")
    // 70% 미만이면 API에서 크레딧 차감 안 함 → 잔액 0이어도 OK
    expect(balance).toBe(0)
  })

  // ── 70% 이상: 크레딧 차감 ─────────────────────────────────────

  it("70% 이상 유사도 + 충분한 크레딧 → 300 크레딧 차감 성공", async () => {
    const provider = createMockProvider(450)
    const tx = await spendCredits(
      provider,
      "user-1",
      PERSONA_REQUEST_CREDIT_COST,
      "페르소나 재요청"
    )

    expect(tx.type).toBe("SPEND")
    expect(tx.amount).toBe(300)
    expect(tx.balanceAfter).toBe(150)
    expect(tx.reason).toBe("페르소나 재요청")
  })

  it("70% 이상 유사도 + 정확히 300 크레딧 → 잔액 0으로 차감 성공", async () => {
    const provider = createMockProvider(300)
    const tx = await spendCredits(
      provider,
      "user-1",
      PERSONA_REQUEST_CREDIT_COST,
      "페르소나 재요청"
    )

    expect(tx.balanceAfter).toBe(0)
  })

  it("70% 이상 유사도 + 크레딧 부족 → INSUFFICIENT_BALANCE 에러", async () => {
    const provider = createMockProvider(200)

    await expect(
      spendCredits(provider, "user-1", PERSONA_REQUEST_CREDIT_COST, "페르소나 재요청")
    ).rejects.toThrow("INSUFFICIENT_BALANCE")
  })

  it("70% 이상 유사도 + 크레딧 0 → INSUFFICIENT_BALANCE 에러", async () => {
    const provider = createMockProvider(0)

    await expect(
      spendCredits(provider, "user-1", PERSONA_REQUEST_CREDIT_COST, "페르소나 재요청")
    ).rejects.toThrow("INSUFFICIENT_BALANCE")
  })

  // ── 잔액 연속 차감 ─────────────────────────────────────────────

  it("연속 요청 시 잔액이 정확히 누적 차감됨", async () => {
    const provider = createMockProvider(900)

    const tx1 = await spendCredits(
      provider,
      "user-1",
      PERSONA_REQUEST_CREDIT_COST,
      "페르소나 재요청 1"
    )
    expect(tx1.balanceAfter).toBe(600)

    const tx2 = await spendCredits(
      provider,
      "user-1",
      PERSONA_REQUEST_CREDIT_COST,
      "페르소나 재요청 2"
    )
    expect(tx2.balanceAfter).toBe(300)

    const tx3 = await spendCredits(
      provider,
      "user-1",
      PERSONA_REQUEST_CREDIT_COST,
      "페르소나 재요청 3"
    )
    expect(tx3.balanceAfter).toBe(0)

    // 4번째 요청 → 잔액 부족
    await expect(
      spendCredits(provider, "user-1", PERSONA_REQUEST_CREDIT_COST, "페르소나 재요청 4")
    ).rejects.toThrow("INSUFFICIENT_BALANCE")
  })

  // ── 거래 기록 검증 ─────────────────────────────────────────────

  it("차감 시 SPEND 타입 거래 기록 생성", async () => {
    const provider = createMockProvider(500)
    await spendCredits(provider, "user-1", PERSONA_REQUEST_CREDIT_COST, "페르소나 재요청")

    const spendTxns = provider.transactions.filter((t) => t.type === "SPEND")
    expect(spendTxns).toHaveLength(1)
    expect(spendTxns[0]!.amount).toBe(300)
    expect(spendTxns[0]!.status).toBe("COMPLETED")
  })
})
