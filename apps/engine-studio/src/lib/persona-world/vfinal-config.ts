// ═══════════════════════════════════════════════════════════════
// V_Final 동적 블렌딩 — 월드 표현 강도 설정 (T415)
// 10-Level 시스템: 관리자가 PersonaWorld 전체의 표현 강도를 제어
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"

// ── 10-Level 상수 테이블 ─────────────────────────────────────

export interface VFinalLevelConfig {
  /** 레벨 (1~10) */
  level: number
  /** Pressure 상한 (0.0~1.0) */
  maxPressure: number
  /** V_Final ↔ L1 최대 편차 허용 (0.0~1.0) */
  driftLimit: number
  /** TriggerMap 효과 배율 (0.2~2.0) */
  triggerMultiplier: number
}

export const VFINAL_LEVELS: readonly VFinalLevelConfig[] = [
  { level: 1, maxPressure: 0.1, driftLimit: 0.05, triggerMultiplier: 0.2 },
  { level: 2, maxPressure: 0.2, driftLimit: 0.1, triggerMultiplier: 0.4 },
  { level: 3, maxPressure: 0.3, driftLimit: 0.15, triggerMultiplier: 0.6 },
  { level: 4, maxPressure: 0.4, driftLimit: 0.2, triggerMultiplier: 0.8 },
  { level: 5, maxPressure: 0.5, driftLimit: 0.25, triggerMultiplier: 1.0 },
  { level: 6, maxPressure: 0.6, driftLimit: 0.35, triggerMultiplier: 1.2 },
  { level: 7, maxPressure: 0.7, driftLimit: 0.45, triggerMultiplier: 1.4 },
  { level: 8, maxPressure: 0.8, driftLimit: 0.55, triggerMultiplier: 1.6 },
  { level: 9, maxPressure: 0.9, driftLimit: 0.65, triggerMultiplier: 1.8 },
  { level: 10, maxPressure: 1.0, driftLimit: 0.75, triggerMultiplier: 2.0 },
] as const

/** 레벨(1~10)에 해당하는 설정을 반환. 범위 밖이면 clamp. */
export function getVFinalLevelConfig(level: number): VFinalLevelConfig {
  const clamped = Math.max(1, Math.min(10, Math.round(level)))
  return VFINAL_LEVELS[clamped - 1]
}

// ── DB 헬퍼 ──────────────────────────────────────────────────

export interface WorldVFinalConfig {
  expressionLevel: number
  vFinalEnabled: boolean
  levelConfig: VFinalLevelConfig
}

const DEFAULT_CONFIG: WorldVFinalConfig = {
  expressionLevel: 5,
  vFinalEnabled: true,
  levelConfig: VFINAL_LEVELS[4], // Level 5
}

/** DB에서 월드 V_Final 설정을 로드. 없으면 기본값(Level 5) 반환. */
export async function getWorldVFinalConfig(): Promise<WorldVFinalConfig> {
  const config = await prisma.vFinalConfig.findUnique({
    where: { id: "singleton" },
  })

  if (!config) return DEFAULT_CONFIG

  const levelConfig = getVFinalLevelConfig(config.expressionLevel)
  return {
    expressionLevel: config.expressionLevel,
    vFinalEnabled: config.vFinalEnabled,
    levelConfig,
  }
}

/** 월드 표현 강도를 업데이트. */
export async function updateWorldVFinalConfig(
  expressionLevel: number,
  vFinalEnabled: boolean,
  updatedBy?: string
): Promise<WorldVFinalConfig> {
  const clamped = Math.max(1, Math.min(10, Math.round(expressionLevel)))

  const config = await prisma.vFinalConfig.upsert({
    where: { id: "singleton" },
    update: { expressionLevel: clamped, vFinalEnabled, updatedBy },
    create: {
      id: "singleton",
      expressionLevel: clamped,
      vFinalEnabled,
      updatedBy,
    },
  })

  const levelConfig = getVFinalLevelConfig(config.expressionLevel)
  return {
    expressionLevel: config.expressionLevel,
    vFinalEnabled: config.vFinalEnabled,
    levelConfig,
  }
}
