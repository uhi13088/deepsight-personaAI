// ═══════════════════════════════════════════════════════════════
// PersonaMatchCache — 페르소나 매칭 데이터 Redis 캐시
// v4.1.1 Infrastructure — T377
//
// 캐시 대상: vFinal(7D) + crossAxisProfile(83D) + paradoxProfile + archetype
// 벡터 변경 전까지 불변 → 피드 요청당 45~120회 재계산 제거
// ═══════════════════════════════════════════════════════════════

import { redis } from "@/lib/redis"
import { calculateVFinal } from "@/lib/vector/v-final"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { prisma } from "@/lib/prisma"
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  VFinalResult,
  CrossAxisProfile,
  ParadoxProfile,
} from "@/types"

// ── Types ────────────────────────────────────────────────────

export interface PrecomputedMatchData {
  vFinal: VFinalResult
  crossAxisProfile: CrossAxisProfile
  paradoxProfile: ParadoxProfile
  archetype: string | null
  updatedAt: string // ISO string
}

// ── Constants ────────────────────────────────────────────────

const CACHE_PREFIX = "persona" as const
const CACHE_SUFFIX = "match" as const
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function cacheKey(personaId: string): string {
  return `${CACHE_PREFIX}:${personaId}:${CACHE_SUFFIX}`
}

// ── Core Functions ───────────────────────────────────────────

/**
 * 캐시에서 페르소나 매칭 데이터 조회.
 * Redis 미설정 또는 캐시 미스 시 null.
 */
export async function getMatchData(personaId: string): Promise<PrecomputedMatchData | null> {
  if (!redis) return null

  try {
    const data = await redis.get<PrecomputedMatchData>(cacheKey(personaId))
    return data ?? null
  } catch (error) {
    console.error(`[match-cache] GET failed for ${personaId}:`, error)
    return null
  }
}

/**
 * 캐시에 페르소나 매칭 데이터 저장.
 * Redis 미설정 시 no-op.
 */
export async function setMatchData(personaId: string, data: PrecomputedMatchData): Promise<void> {
  if (!redis) return

  try {
    await redis.set(cacheKey(personaId), data, { ex: CACHE_TTL_SECONDS })
  } catch (error) {
    console.error(`[match-cache] SET failed for ${personaId}:`, error)
  }
}

/**
 * 페르소나 캐시 무효화.
 * 벡터 변경 시 호출 필수.
 */
export async function invalidateMatchData(personaId: string): Promise<void> {
  if (!redis) return

  try {
    await redis.del(cacheKey(personaId))
  } catch (error) {
    console.error(`[match-cache] DEL failed for ${personaId}:`, error)
  }
}

/**
 * 여러 페르소나의 매칭 데이터를 일괄 조회.
 * 캐시 히트/미스를 분리하여 반환.
 */
export async function bulkGetMatchData(personaIds: string[]): Promise<{
  hits: Map<string, PrecomputedMatchData>
  misses: string[]
}> {
  const hits = new Map<string, PrecomputedMatchData>()
  const misses: string[] = []

  if (!redis || personaIds.length === 0) {
    return { hits, misses: personaIds }
  }

  try {
    const pipeline = redis.pipeline()
    for (const id of personaIds) {
      pipeline.get<PrecomputedMatchData>(cacheKey(id))
    }
    const results = await pipeline.exec<(PrecomputedMatchData | null)[]>()

    for (let i = 0; i < personaIds.length; i++) {
      const data = results[i]
      if (data) {
        hits.set(personaIds[i], data)
      } else {
        misses.push(personaIds[i])
      }
    }
  } catch (error) {
    console.error("[match-cache] bulkGet failed:", error)
    return { hits, misses: personaIds }
  }

  return { hits, misses }
}

// ── Compute & Cache ──────────────────────────────────────────

/**
 * DB에서 벡터 로드 → 계산 → 캐시 저장.
 * cache-aside 패턴: 캐시 미스 시 자동 호출.
 */
export async function computeAndCache(personaId: string): Promise<PrecomputedMatchData | null> {
  // 1. DB에서 벡터 로드
  const vectors = await prisma.personaLayerVector.findMany({
    where: { personaId },
    select: {
      layerType: true,
      dim1: true,
      dim2: true,
      dim3: true,
      dim4: true,
      dim5: true,
      dim6: true,
      dim7: true,
    },
  })

  if (vectors.length === 0) return null

  // 2. 레이어별 벡터 재구성
  const l1 = vectorFromRow(
    vectors.find((v) => v.layerType === "SOCIAL"),
    7
  ) as SocialPersonaVector | null
  const l2 = vectorFromRow(
    vectors.find((v) => v.layerType === "TEMPERAMENT"),
    5
  ) as CoreTemperamentVector | null
  const l3 = vectorFromRow(
    vectors.find((v) => v.layerType === "NARRATIVE"),
    4
  ) as NarrativeDriveVector | null

  if (!l1) return null

  const safeL2: CoreTemperamentVector = l2 ?? {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  }

  const safeL3: NarrativeDriveVector = l3 ?? {
    lack: 0.5,
    moralCompass: 0.5,
    volatility: 0.5,
    growthArc: 0.5,
  }

  // 3. 계산
  const vFinal = calculateVFinal(l1, safeL2, safeL3)
  const crossAxisProfile = calculateCrossAxisProfile(l1, safeL2, safeL3)
  const paradoxProfile = calculateExtendedParadoxScore(l1, safeL2, safeL3, crossAxisProfile)

  // 4. archetype 조회
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: { archetypeId: true },
  })

  const matchData: PrecomputedMatchData = {
    vFinal,
    crossAxisProfile,
    paradoxProfile,
    archetype: persona?.archetypeId ?? null,
    updatedAt: new Date().toISOString(),
  }

  // 5. 캐시 저장
  await setMatchData(personaId, matchData)

  return matchData
}

/**
 * 캐시 우선 조회 (cache-aside 패턴).
 * 캐시 히트 → 즉시 반환, 미스 → 계산 + 캐시 저장 후 반환.
 */
export async function getOrCompute(personaId: string): Promise<PrecomputedMatchData | null> {
  const cached = await getMatchData(personaId)
  if (cached) return cached

  return computeAndCache(personaId)
}

// ── Helpers ──────────────────────────────────────────────────

type VectorRow =
  | {
      dim1: unknown
      dim2: unknown
      dim3: unknown
      dim4: unknown
      dim5: unknown
      dim6: unknown
      dim7: unknown
    }
  | undefined

function vectorFromRow(
  row: VectorRow,
  dimCount: number
): SocialPersonaVector | CoreTemperamentVector | NarrativeDriveVector | null {
  if (!row) return null

  const dims = [row.dim1, row.dim2, row.dim3, row.dim4, row.dim5, row.dim6, row.dim7]
    .slice(0, dimCount)
    .map((d) => (d != null ? Number(d) : 0.5))

  if (dimCount === 7) {
    return {
      depth: dims[0],
      lens: dims[1],
      stance: dims[2],
      scope: dims[3],
      taste: dims[4],
      purpose: dims[5],
      sociability: dims[6],
    } satisfies SocialPersonaVector
  }

  if (dimCount === 5) {
    return {
      openness: dims[0],
      conscientiousness: dims[1],
      extraversion: dims[2],
      agreeableness: dims[3],
      neuroticism: dims[4],
    } satisfies CoreTemperamentVector
  }
  return {
    lack: dims[0],
    moralCompass: dims[1],
    volatility: dims[2],
    growthArc: dims[3],
  } satisfies NarrativeDriveVector
}
