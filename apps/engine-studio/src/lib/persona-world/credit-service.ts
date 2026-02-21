/**
 * PersonaWorld 크레딧 서비스
 *
 * 코인 잔액 조회, 획득, 사용, 충전(Toss), 거래 내역
 */

// ── Types ────────────────────────────────────────────────

export type TransactionType = "EARN" | "PURCHASE" | "SPEND"
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"

export interface TransactionRecord {
  id: string
  userId: string
  type: TransactionType
  amount: number
  balanceAfter: number
  reason: string | null
  orderId: string | null
  paymentKey: string | null
  status: TransactionStatus
  createdAt: Date
}

// ── DI Provider ──────────────────────────────────────────

export interface CreditDataProvider {
  getLatestTransaction(userId: string): Promise<TransactionRecord | null>
  createTransaction(data: {
    userId: string
    type: TransactionType
    amount: number
    balanceAfter: number
    reason?: string
    orderId?: string
    paymentKey?: string
    status?: TransactionStatus
  }): Promise<TransactionRecord>
  findByOrderId(orderId: string): Promise<TransactionRecord | null>
  updateTransaction(id: string, data: Partial<TransactionRecord>): Promise<TransactionRecord>
  getTransactions(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransactionRecord[]>
}

// ── Service ──────────────────────────────────────────────

export async function getBalance(provider: CreditDataProvider, userId: string): Promise<number> {
  const latest = await provider.getLatestTransaction(userId)
  return latest?.balanceAfter ?? 0
}

export async function addCredits(
  provider: CreditDataProvider,
  userId: string,
  amount: number,
  reason?: string
): Promise<TransactionRecord> {
  const currentBalance = await getBalance(provider, userId)
  return provider.createTransaction({
    userId,
    type: "EARN",
    amount,
    balanceAfter: currentBalance + amount,
    reason,
  })
}

export async function spendCredits(
  provider: CreditDataProvider,
  userId: string,
  amount: number,
  reason?: string
): Promise<TransactionRecord> {
  const currentBalance = await getBalance(provider, userId)
  if (currentBalance < amount) {
    throw new Error("INSUFFICIENT_BALANCE")
  }
  return provider.createTransaction({
    userId,
    type: "SPEND",
    amount,
    balanceAfter: currentBalance - amount,
    reason,
  })
}

/**
 * Toss 결제 요청 시 PENDING 거래 생성
 */
export async function purchaseCredits(
  provider: CreditDataProvider,
  userId: string,
  totalCoins: number,
  orderId: string
): Promise<TransactionRecord> {
  // 중복 주문 방지
  const existing = await provider.findByOrderId(orderId)
  if (existing) throw new Error("DUPLICATE_ORDER")

  const currentBalance = await getBalance(provider, userId)
  return provider.createTransaction({
    userId,
    type: "PURCHASE",
    amount: totalCoins,
    balanceAfter: currentBalance + totalCoins,
    orderId,
    status: "PENDING",
  })
}

export async function getTransactionHistory(
  provider: CreditDataProvider,
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<TransactionRecord[]> {
  return provider.getTransactions(userId, options)
}
