/**
 * PersonaWorld - 크레딧(코인) 서비스
 *
 * DB 기반 잔액 관리 + 거래 내역 기록
 */

// ── DI Provider ──────────────────────────────────────────────

export interface CreditDataProvider {
  /** 유저의 최근 거래에서 잔액 조회 (없으면 0) */
  getLastBalance(userId: string): Promise<number>
  /** 거래 기록 추가 */
  createTransaction(data: {
    userId: string
    type: "EARN" | "PURCHASE" | "SPEND"
    amount: number
    balanceAfter: number
    reason?: string
    orderId?: string
    paymentKey?: string
    status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
  }): Promise<{ id: string; balanceAfter: number }>
  /** 거래 내역 조회 */
  getTransactions(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<
    Array<{
      id: string
      type: "EARN" | "PURCHASE" | "SPEND"
      amount: number
      balanceAfter: number
      reason: string | null
      orderId: string | null
      status: string
      createdAt: Date
    }>
  >
  /** orderId로 거래 조회 */
  findByOrderId(orderId: string): Promise<{ id: string; status: string } | null>
  /** 거래 상태 업데이트 */
  updateTransactionStatus(id: string, status: "COMPLETED" | "FAILED" | "REFUNDED"): Promise<void>
}

// ── 핵심 로직 ────────────────────────────────────────────────

/**
 * 유저 코인 잔액 조회
 */
export async function getBalance(provider: CreditDataProvider, userId: string): Promise<number> {
  return provider.getLastBalance(userId)
}

/**
 * 코인 적립 (온보딩, 데일리 등)
 */
export async function addCredits(
  provider: CreditDataProvider,
  userId: string,
  amount: number,
  reason: string
): Promise<{ balance: number; transactionId: string }> {
  if (amount <= 0) throw new Error("amount must be positive")

  const currentBalance = await provider.getLastBalance(userId)
  const newBalance = currentBalance + amount

  const tx = await provider.createTransaction({
    userId,
    type: "EARN",
    amount,
    balanceAfter: newBalance,
    reason,
  })

  return { balance: tx.balanceAfter, transactionId: tx.id }
}

/**
 * 코인 소비 (상점 구매)
 */
export async function spendCredits(
  provider: CreditDataProvider,
  userId: string,
  amount: number,
  reason: string
): Promise<{ balance: number; transactionId: string }> {
  if (amount <= 0) throw new Error("amount must be positive")

  const currentBalance = await provider.getLastBalance(userId)
  if (currentBalance < amount) {
    throw new Error("INSUFFICIENT_BALANCE")
  }

  const newBalance = currentBalance - amount

  const tx = await provider.createTransaction({
    userId,
    type: "SPEND",
    amount,
    balanceAfter: newBalance,
    reason,
  })

  return { balance: tx.balanceAfter, transactionId: tx.id }
}

/**
 * 실결제 코인 충전 (Toss 결제 확인 후 호출)
 */
export async function purchaseCredits(
  provider: CreditDataProvider,
  userId: string,
  amount: number,
  orderId: string,
  paymentKey: string,
  reason: string
): Promise<{ balance: number; transactionId: string }> {
  if (amount <= 0) throw new Error("amount must be positive")

  // 중복 결제 방지
  const existing = await provider.findByOrderId(orderId)
  if (existing && existing.status === "COMPLETED") {
    throw new Error("DUPLICATE_ORDER")
  }

  const currentBalance = await provider.getLastBalance(userId)
  const newBalance = currentBalance + amount

  const tx = await provider.createTransaction({
    userId,
    type: "PURCHASE",
    amount,
    balanceAfter: newBalance,
    reason,
    orderId,
    paymentKey,
    status: "COMPLETED",
  })

  return { balance: tx.balanceAfter, transactionId: tx.id }
}

/**
 * 거래 내역 조회
 */
export async function getTransactionHistory(
  provider: CreditDataProvider,
  userId: string,
  options?: { limit?: number; offset?: number }
) {
  return provider.getTransactions(userId, options)
}
