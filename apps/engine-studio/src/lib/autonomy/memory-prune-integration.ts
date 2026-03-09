// ═══════════════════════════════════════════════════════════════
// T409: Memory Prune Integration — consolidation 후 자동 prune
// autoMemoryManagement=true인 페르소나만 실행
// ═══════════════════════════════════════════════════════════════

import type { AutonomyPolicy } from "./autonomy-policy"
import { selectMemoriesToPrune, type PrunableMemory, type MemoryPruneResult } from "./memory-prune"

// ── 타입 ────────────────────────────────────────────────────

export interface PruneIntegrationProvider {
  /** personaId로 autonomyPolicy 조회 */
  getAutonomyPolicy(personaId: string): Promise<AutonomyPolicy | null>
  /** personaId로 모든 SemanticMemory 조회 */
  getAllSemanticMemories(personaId: string): Promise<PrunableMemory[]>
  /** 선정된 기억 삭제 실행 */
  deleteMemories(memoryIds: string[]): Promise<number>
}

export interface PruneIntegrationResult {
  personaId: string
  executed: boolean
  skipReason?: string
  pruneResult?: MemoryPruneResult
  deletedCount: number
}

// ── 핵심 함수 ────────────────────────────────────────────────

/**
 * consolidation 후 자동 prune 실행.
 * autoMemoryManagement=true인 페르소나만 실행.
 */
export async function runAutoPrune(
  provider: PruneIntegrationProvider,
  personaId: string
): Promise<PruneIntegrationResult> {
  const policy = await provider.getAutonomyPolicy(personaId)

  if (!policy?.autoMemoryManagement) {
    return {
      personaId,
      executed: false,
      skipReason: "autoMemoryManagement 비활성",
      deletedCount: 0,
    }
  }

  const memories = await provider.getAllSemanticMemories(personaId)
  if (memories.length === 0) {
    return {
      personaId,
      executed: false,
      skipReason: "기억 없음",
      deletedCount: 0,
    }
  }

  const pruneResult = selectMemoriesToPrune(memories, policy.memoryConfig)

  if (pruneResult.prunedCount === 0) {
    return {
      personaId,
      executed: true,
      pruneResult,
      deletedCount: 0,
    }
  }

  const idsToDelete = pruneResult.decisions.map((d) => d.memoryId)
  const deletedCount = await provider.deleteMemories(idsToDelete)

  console.log(
    `[memory-prune] ${personaId}: ${deletedCount}개 삭제 (보호: ${pruneResult.skippedProtected}개)`
  )

  return {
    personaId,
    executed: true,
    pruneResult,
    deletedCount,
  }
}
