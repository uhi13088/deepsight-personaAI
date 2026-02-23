// ═══════════════════════════════════════════════════════════════
// Arena PersonaMeta Loader
// 판정 실행 전 페르소나 메타데이터 로드 유틸리티
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"
import type { PersonaMeta } from "./arena-engine"

interface VoiceSpec {
  styleParams?: {
    sentenceLength?: number
  }
}

/**
 * 참가자 ID 목록으로 PersonaMeta Map 로드.
 * voiceSpec.styleParams.sentenceLength + PersonaState.energy/paradoxTension 조회.
 *
 * 사용 예시:
 * ```ts
 * const personaMeta = await loadPersonaMeta([participantA, participantB])
 * const judgment = judgeSessionRuleBased(session, personaMeta)
 * ```
 */
export async function loadPersonaMeta(participantIds: string[]): Promise<Map<string, PersonaMeta>> {
  const metaMap = new Map<string, PersonaMeta>()

  if (participantIds.length === 0) return metaMap

  // voiceSpec에서 sentenceLength 조회
  const personas = await prisma.persona.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, voiceSpec: true },
  })

  // PersonaState에서 energy, paradoxTension 조회
  const states = await prisma.personaState.findMany({
    where: { personaId: { in: participantIds } },
    select: { personaId: true, energy: true, paradoxTension: true },
  })
  const stateMap = new Map(states.map((s) => [s.personaId, s]))

  for (const persona of personas) {
    const voiceSpec = persona.voiceSpec as VoiceSpec | null
    const sentenceLength = voiceSpec?.styleParams?.sentenceLength ?? 0.5 // 기본값: 중간

    const state = stateMap.get(persona.id)
    const energy = state ? Number(state.energy) : 0.7 // 기본값: 70%
    const paradoxTension = state ? Number(state.paradoxTension) : 0.0

    metaMap.set(persona.id, { sentenceLength, energy, paradoxTension })
  }

  return metaMap
}
