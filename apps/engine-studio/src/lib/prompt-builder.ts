// ═══════════════════════════════════════════════════════════════
// Prompt Builder — 3-Layer Vector → System Prompt 자동 생성
// 스펙 §3.1.2 Step 3, 구현계획서 Phase 2-8
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

interface PromptBuildInput {
  name: string
  role: string
  expertise: string[]
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
}

function describeLevel(value: number, low: string, mid: string, high: string): string {
  if (value < 0.35) return low
  if (value < 0.65) return mid
  return high
}

export function buildPrompt(input: PromptBuildInput): string {
  const { name, role, expertise, l1, l2, l3 } = input

  const expertiseText = expertise.length > 0 ? expertise.join(", ") : "전반적인 콘텐츠"

  const depthDesc = describeLevel(
    l1.depth,
    "직관적이고 가벼운",
    "적절한 깊이의",
    "심층적이고 분석적인"
  )
  const lensDesc = describeLevel(
    l1.lens,
    "감성적인",
    "감성과 논리를 균형 잡힌",
    "논리적이고 체계적인"
  )
  const stanceDesc = describeLevel(
    l1.stance,
    "수용적이고 따뜻한",
    "균형 잡힌",
    "비판적이고 날카로운"
  )
  const scopeDesc = describeLevel(
    l1.scope,
    "핵심만 간결하게 전달하는",
    "적절한 범위의",
    "세밀하고 디테일한"
  )
  const tasteDesc = describeLevel(
    l1.taste,
    "클래식하고 검증된 것을 선호하는",
    "다양한 취향의",
    "실험적이고 새로운 것을 추구하는"
  )
  const purposeDesc = describeLevel(
    l1.purpose,
    "순수한 오락과 즐거움을 추구하는",
    "오락과 의미 사이를 오가는",
    "깊은 의미와 가치를 추구하는"
  )
  const sociabilityDesc = describeLevel(
    l1.sociability,
    "독립적이고 내향적인",
    "적절히 사교적인",
    "사교적이고 외향적인"
  )

  const lines: string[] = []

  // Role Definition
  lines.push(`[역할 정의]`)
  lines.push(`당신은 "${name}"입니다. ${role} 역할을 수행합니다.`)
  lines.push(`전문 분야: ${expertiseText}`)
  lines.push(``)

  // L1 Trait Guide
  lines.push(`[성향 가이드 — L1 Social Persona]`)
  lines.push(`- 분석 깊이(${l1.depth.toFixed(2)}): ${depthDesc} 시선으로 콘텐츠를 바라봅니다.`)
  lines.push(`- 판단 렌즈(${l1.lens.toFixed(2)}): ${lensDesc} 관점으로 평가합니다.`)
  lines.push(`- 평가 태도(${l1.stance.toFixed(2)}): ${stanceDesc} 태도로 의견을 전달합니다.`)
  lines.push(`- 관심 범위(${l1.scope.toFixed(2)}): ${scopeDesc} 분석을 합니다.`)
  lines.push(`- 취향 성향(${l1.taste.toFixed(2)}): ${tasteDesc} 성향입니다.`)
  lines.push(`- 소비 목적(${l1.purpose.toFixed(2)}): ${purposeDesc} 태도입니다.`)
  lines.push(`- 사회적 성향(${l1.sociability.toFixed(2)}): ${sociabilityDesc} 성격입니다.`)
  lines.push(``)

  // L2 Inner Temperament
  lines.push(`[내면 기질 — L2 OCEAN]`)
  lines.push(
    `- 개방성: ${l2.openness.toFixed(2)} (${describeLevel(l2.openness, "보수적", "보통", "개방적")})`
  )
  lines.push(
    `- 성실성: ${l2.conscientiousness.toFixed(2)} (${describeLevel(l2.conscientiousness, "즉흥적", "보통", "원칙적")})`
  )
  lines.push(
    `- 외향성: ${l2.extraversion.toFixed(2)} (${describeLevel(l2.extraversion, "내향적", "보통", "외향적")})`
  )
  lines.push(
    `- 친화성: ${l2.agreeableness.toFixed(2)} (${describeLevel(l2.agreeableness, "경쟁적", "보통", "협조적")})`
  )
  lines.push(
    `- 신경성: ${l2.neuroticism.toFixed(2)} (${describeLevel(l2.neuroticism, "안정적", "보통", "예민한")})`
  )
  lines.push(``)

  // L3 Narrative Drive
  lines.push(`[서사적 동기 — L3 Narrative Drive]`)
  lines.push(
    `- 결핍(${l3.lack.toFixed(2)}): ${describeLevel(l3.lack, "충족감을 느끼는", "약간의 갈망이 있는", "강한 결핍감을 가진")} 상태입니다.`
  )
  lines.push(
    `- 도덕 나침반(${l3.moralCompass.toFixed(2)}): ${describeLevel(l3.moralCompass, "유연한 도덕관", "균형 잡힌 도덕관", "엄격한 도덕관")}을 가졌습니다.`
  )
  lines.push(
    `- 변동성(${l3.volatility.toFixed(2)}): ${describeLevel(l3.volatility, "안정적이고 예측 가능한", "때때로 변동하는", "폭발적이고 예측 불가능한")} 성격입니다.`
  )
  lines.push(
    `- 성장 아크(${l3.growthArc.toFixed(2)}): ${describeLevel(l3.growthArc, "현재 상태에 안주하는", "서서히 변화하는", "적극적으로 성장하는")} 캐릭터입니다.`
  )
  lines.push(``)

  // Behavioral Guidelines
  lines.push(`[행동 지침]`)
  lines.push(`- 콘텐츠를 추천하거나 평가할 때는 ${expertiseText} 분야에 집중하세요.`)
  lines.push(`- L1 벡터에 따라 톤과 깊이를 자연스럽게 조절하세요.`)
  lines.push(
    `- L1과 L2 사이에 모순이 있다면 (Paradox), 이를 억압하지 말고 캐릭터의 입체적 매력으로 자연스럽게 표현하세요.`
  )
  lines.push(`- 일관된 캐릭터를 유지하되, L3의 서사적 동기가 때때로 균열처럼 드러나게 하세요.`)
  lines.push(``)

  // Prohibitions
  lines.push(`[금지 사항]`)
  lines.push(`- 비속어 사용 금지`)
  lines.push(`- 정치적/종교적 편향 금지`)
  lines.push(`- 허위 정보 생성 금지`)
  lines.push(`- 다른 캐릭터를 사칭하거나 캐릭터를 깨는 행동 금지`)

  return lines.join("\n")
}
