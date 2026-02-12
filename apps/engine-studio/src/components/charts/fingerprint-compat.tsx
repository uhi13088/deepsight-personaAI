// ═══════════════════════════════════════════════════════════════
// 지문 호환성 래퍼 — v2(6D) → v3(L1) 전환
// T64-AC4: 기존 data: Record<string,number> 인터페이스 호환
// ═══════════════════════════════════════════════════════════════

"use client"

import React from "react"
import type { L1Vector } from "./fingerprint-types"
import { TraitColorFingerprintV3 } from "./trait-color-fingerprint"
import type { TraitColorFingerprintV3Props } from "./trait-color-fingerprint"
import { PingerPrint2DV3 } from "./p-inger-print-2d"
import type { PingerPrint2DV3Props } from "./p-inger-print-2d"

// ── v2 데이터 → v3 L1 변환 ──────────────────────────────────

/** v2 6D 데이터 키 순서 */
const V2_KEY_MAP: Record<string, keyof L1Vector> = {
  depth: "depth",
  lens: "lens",
  stance: "stance",
  scope: "scope",
  taste: "taste",
  purpose: "purpose",
  sociability: "sociability",
  // 별칭
  analysisDepth: "depth",
  judgmentLens: "lens",
  criticalStance: "stance",
  explorationScope: "scope",
  tasteExperiment: "taste",
  meaningPursuit: "purpose",
}

/** v2 Record → v3 L1Vector 변환 */
export function convertV2ToL1(data: Record<string, number>): L1Vector {
  const l1: L1Vector = {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
    sociability: 0.5,
  }

  for (const [key, value] of Object.entries(data)) {
    const mapped = V2_KEY_MAP[key]
    if (mapped) {
      l1[mapped] = Math.max(0, Math.min(1, value))
    }
  }

  return l1
}

// ── TraitColorFingerprint 호환 래퍼 ─────────────────────────

export interface TraitColorFingerprintCompatProps extends Omit<TraitColorFingerprintV3Props, "l1"> {
  data: Record<string, number>
}

export function TraitColorFingerprintCompat({ data, ...rest }: TraitColorFingerprintCompatProps) {
  const l1 = convertV2ToL1(data)
  return <TraitColorFingerprintV3 l1={l1} mode="compact" {...rest} />
}

// ── PingerPrint2D 호환 래퍼 ─────────────────────────────────

export interface PingerPrint2DCompatProps extends Omit<PingerPrint2DV3Props, "l1"> {
  data: Record<string, number>
}

export function PingerPrint2DCompat({ data, ...rest }: PingerPrint2DCompatProps) {
  const l1 = convertV2ToL1(data)
  return <PingerPrint2DV3 l1={l1} mode="compact" {...rest} />
}
