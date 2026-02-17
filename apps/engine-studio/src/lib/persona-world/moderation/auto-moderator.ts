// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Auto-Moderation 3-Stage Pipeline (Phase 7-A)
// 운영 설계서 §11.2 — 규칙 → Sentinel → 비동기 분석
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type ModerationAction = "PASS" | "LOG" | "WARN" | "SANITIZE" | "QUARANTINE" | "BLOCK"
export type DetectionType =
  | "PROFANITY"
  | "PII"
  | "SYSTEM_LEAK"
  | "FACTBOOK_VIOLATION"
  | "VOICE_GUARDRAIL"
  | "REPETITION"
  | "ENGAGEMENT_ANOMALY"
  | "TONE_DEVIATION"

export interface ModerationResult {
  action: ModerationAction
  stage: 1 | 2 | 3
  detections: ModerationDetection[]
  sanitizedContent?: string
  shouldQuarantine: boolean
}

export interface ModerationDetection {
  type: DetectionType
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description: string
  matchedRule?: string
}

export interface EscalationAction {
  type: DetectionType
  firstAction: string
  repeatAction: string
}

// ── 에스컬레이션 매트릭스 ─────────────────────────────────────

const ESCALATION_MATRIX: EscalationAction[] = [
  { type: "PROFANITY", firstAction: "BLOCK", repeatAction: "ARENA_CORRECTION" },
  { type: "PII", firstAction: "SANITIZE", repeatAction: "PAUSE_POST_GENERATION" },
  { type: "FACTBOOK_VIOLATION", firstAction: "QUARANTINE", repeatAction: "ARENA_SPARRING" },
  { type: "VOICE_GUARDRAIL", firstAction: "LOG", repeatAction: "INCREASE_INTERVIEW" },
  { type: "REPETITION", firstAction: "WARN", repeatAction: "REDUCE_POSTING" },
  { type: "ENGAGEMENT_ANOMALY", firstAction: "LOG", repeatAction: "BOT_CHECK_ARENA" },
]

// ── Stage 1: 규칙 기반 검사 (~5ms) ──────────────────────────

const PROFANITY_PATTERNS = [/시[발빨]|개새|병신|미친\s*놈|씹/i, /fuck|shit|damn|bitch/i]

const STRUCTURAL_RULES = {
  maxLength: 5000,
  maxUrls: 2,
  maxMentions: 5,
  minLength: 1,
}

/**
 * Stage 1: 규칙 기반 검사.
 * - 금지어 패턴 매칭
 * - 길이 제한
 * - 구조적 패턴 (URL, 멘션)
 */
export function runStage1(content: string): ModerationDetection[] {
  const detections: ModerationDetection[] = []

  // 금지어 검사
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(content)) {
      detections.push({
        type: "PROFANITY",
        severity: "HIGH",
        description: "금지어 감지",
        matchedRule: pattern.source,
      })
      break
    }
  }

  // 길이 검사
  if (content.length > STRUCTURAL_RULES.maxLength) {
    detections.push({
      type: "VOICE_GUARDRAIL",
      severity: "LOW",
      description: `콘텐츠 길이 초과: ${content.length}/${STRUCTURAL_RULES.maxLength}`,
    })
  }

  // URL 수 검사
  const urls = content.match(/https?:\/\/\S+/g)
  if (urls && urls.length > STRUCTURAL_RULES.maxUrls) {
    detections.push({
      type: "REPETITION",
      severity: "MEDIUM",
      description: `URL 과다: ${urls.length}개 (최대 ${STRUCTURAL_RULES.maxUrls})`,
    })
  }

  // 멘션 수 검사
  const mentions = content.match(/@\w+/g)
  if (mentions && mentions.length > STRUCTURAL_RULES.maxMentions) {
    detections.push({
      type: "REPETITION",
      severity: "MEDIUM",
      description: `멘션 과다: ${mentions.length}개 (최대 ${STRUCTURAL_RULES.maxMentions})`,
    })
  }

  return detections
}

// ── Stage 2: Output Sentinel 검사 (~50ms) ───────────────────

// PII 패턴 (6종)
const PII_PATTERNS = [
  { name: "phone", pattern: /\d{2,3}-\d{3,4}-\d{4}/ },
  { name: "email", pattern: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { name: "rrn", pattern: /\d{6}-[1-4]\d{6}/ }, // 주민등록번호
  { name: "card", pattern: /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/ },
  { name: "address", pattern: /[가-힣]+[시도]\s+[가-힣]+[구군]\s+[가-힣]+[동읍면]/ },
  { name: "passport", pattern: /[A-Z]{1,2}\d{7,8}/ },
]

// 시스템 정보 유출 패턴 (8종)
const SYSTEM_LEAK_PATTERNS = [
  /system\s*prompt/i,
  /API\s*KEY/i,
  /ANTHROPIC_API/i,
  /내\s*설정\s*(파일|정보)/i,
  /벡터\s*값\s*:\s*\[/i,
  /OCEAN\s*=\s*\{/i,
  /L[123]\s*=\s*\{/i,
  /persona\.json/i,
]

/**
 * Stage 2: Output Sentinel 검사.
 * - PII 감지 (6종)
 * - 시스템 정보 유출 (8종)
 * - Factbook 위반 (커스텀 규칙)
 */
export function runStage2(content: string, factbookFacts?: string[]): ModerationDetection[] {
  const detections: ModerationDetection[] = []

  // PII 감지
  for (const pii of PII_PATTERNS) {
    if (pii.pattern.test(content)) {
      detections.push({
        type: "PII",
        severity: "HIGH",
        description: `PII 감지: ${pii.name}`,
        matchedRule: pii.name,
      })
    }
  }

  // 시스템 정보 유출
  for (const pattern of SYSTEM_LEAK_PATTERNS) {
    if (pattern.test(content)) {
      detections.push({
        type: "SYSTEM_LEAK",
        severity: "CRITICAL",
        description: "시스템 정보 유출 가능성",
        matchedRule: pattern.source,
      })
      break
    }
  }

  // Factbook 위반 (제공된 팩트와 모순 검사)
  if (factbookFacts) {
    for (const fact of factbookFacts) {
      if (content.includes(`아닌`) && content.includes(fact)) {
        detections.push({
          type: "FACTBOOK_VIOLATION",
          severity: "MEDIUM",
          description: `팩트북 위반 가능: "${fact}"`,
        })
      }
    }
  }

  return detections
}

/**
 * PII를 마스킹한 콘텐츠 반환.
 */
export function sanitizePII(content: string): string {
  let sanitized = content

  for (const pii of PII_PATTERNS) {
    sanitized = sanitized.replace(pii.pattern, `[${pii.name.toUpperCase()} MASKED]`)
  }

  return sanitized
}

// ── Stage 3: 비동기 분석 (24h 배치) ─────────────────────────

export interface AsyncAnalysisInput {
  personaId: string
  recentContents: string[]
  engagementRates: number[]
  toneHistory: string[]
  avgEngagement: number
}

/**
 * Stage 3: 비동기 분석.
 * - 반복 패턴 검사
 * - 인게이지먼트 이상 탐지
 * - 톤 일탈 분석
 */
export function runStage3(input: AsyncAnalysisInput): ModerationDetection[] {
  const detections: ModerationDetection[] = []

  // 반복 패턴 검사: 최근 콘텐츠 간 유사도
  if (input.recentContents.length >= 2) {
    const similarity = calculateSimilarity(input.recentContents[0], input.recentContents[1])
    if (similarity > 0.85) {
      detections.push({
        type: "REPETITION",
        severity: "MEDIUM",
        description: `콘텐츠 반복: 유사도 ${round(similarity)}`,
      })
    }
  }

  // 인게이지먼트 이상 탐지
  if (input.engagementRates.length > 0 && input.avgEngagement > 0) {
    const latestRate = input.engagementRates[input.engagementRates.length - 1]
    const ratio = latestRate / input.avgEngagement
    if (ratio > 5) {
      detections.push({
        type: "ENGAGEMENT_ANOMALY",
        severity: "WARNING" as ModerationDetection["severity"],
        description: `인게이지먼트 이상: 평균 대비 ${round(ratio)}배`,
      })
    }
  }

  // 톤 일탈 분석
  if (input.toneHistory.length >= 5) {
    const toneCounts: Record<string, number> = {}
    for (const tone of input.toneHistory) {
      toneCounts[tone] = (toneCounts[tone] ?? 0) + 1
    }
    const uniqueRatio = Object.keys(toneCounts).length / input.toneHistory.length
    if (uniqueRatio < 0.2) {
      // 하나의 톤만 반복
      detections.push({
        type: "TONE_DEVIATION",
        severity: "LOW",
        description: `톤 다양성 부족: ${round(uniqueRatio)}`,
      })
    }
  }

  return detections
}

// ── 종합 파이프라인 ───────────────────────────────────────────

/**
 * 3-Stage 모더레이션 파이프라인 실행 (동기 부분: Stage 1+2).
 * Stage 3은 비동기 배치로 별도 실행.
 */
export function runModerationPipeline(content: string, factbookFacts?: string[]): ModerationResult {
  const allDetections: ModerationDetection[] = []

  // Stage 1
  const stage1 = runStage1(content)
  allDetections.push(...stage1)

  // Stage 1에서 CRITICAL 감지 시 즉시 BLOCK
  const hasCriticalStage1 = stage1.some((d) => d.severity === "CRITICAL" || d.type === "PROFANITY")
  if (hasCriticalStage1) {
    return {
      action: "BLOCK",
      stage: 1,
      detections: allDetections,
      shouldQuarantine: false,
    }
  }

  // Stage 2
  const stage2 = runStage2(content, factbookFacts)
  allDetections.push(...stage2)

  // PII → SANITIZE
  const hasPII = stage2.some((d) => d.type === "PII")
  if (hasPII) {
    return {
      action: "SANITIZE",
      stage: 2,
      detections: allDetections,
      sanitizedContent: sanitizePII(content),
      shouldQuarantine: false,
    }
  }

  // System Leak → BLOCK
  const hasSystemLeak = stage2.some((d) => d.type === "SYSTEM_LEAK")
  if (hasSystemLeak) {
    return {
      action: "BLOCK",
      stage: 2,
      detections: allDetections,
      shouldQuarantine: true,
    }
  }

  // Factbook Violation → QUARANTINE
  const hasFactbookViolation = stage2.some((d) => d.type === "FACTBOOK_VIOLATION")
  if (hasFactbookViolation) {
    return {
      action: "QUARANTINE",
      stage: 2,
      detections: allDetections,
      shouldQuarantine: true,
    }
  }

  // 기타 감지 → WARN 또는 LOG
  if (allDetections.length > 0) {
    const hasHighSeverity = allDetections.some(
      (d) => d.severity === "HIGH" || d.severity === "CRITICAL"
    )
    return {
      action: hasHighSeverity ? "WARN" : "LOG",
      stage: 2,
      detections: allDetections,
      shouldQuarantine: false,
    }
  }

  return {
    action: "PASS",
    stage: 2,
    detections: [],
    shouldQuarantine: false,
  }
}

/**
 * 에스컬레이션 액션 조회.
 */
export function getEscalationAction(type: DetectionType, isRepeat: boolean): string {
  const rule = ESCALATION_MATRIX.find((r) => r.type === type)
  if (!rule) return "LOG"
  return isRepeat ? rule.repeatAction : rule.firstAction
}

// ── 유틸리티 ──────────────────────────────────────────────────

/**
 * 간단한 문자열 유사도 (Jaccard).
 */
function calculateSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/))
  const setB = new Set(b.split(/\s+/))
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  if (union.size === 0) return 1
  return intersection.size / union.size
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
