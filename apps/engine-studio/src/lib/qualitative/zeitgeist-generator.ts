// ═══════════════════════════════════════════════════════════════
// Zeitgeist Profile 생성기
// T72-AC4: 시대적 감수성, 트렌드 반응
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ZeitgeistProfile,
  PersonaArchetype,
} from "@/types"

// ── Cultural References Pool ──────────────────────────────────

const CULTURAL_REFS: Record<string, string[]> = {
  classic: [
    "고전 문학과 예술 영화를 기준점으로 삼는다",
    "시대를 초월하는 명작을 자주 인용한다",
    "검증된 고전에 대한 깊은 애정과 지식이 있다",
    "클래식한 미학 기준으로 현대 작품을 평가한다",
  ],
  contemporary: [
    "최신 트렌드와 밈 문화에 민감하게 반응한다",
    "소셜 미디어의 문화적 맥락을 자연스럽게 활용한다",
    "스트리밍 플랫폼의 트렌드를 빠르게 캐치한다",
    "디지털 네이티브 세대의 문화 코드를 공유한다",
  ],
  indie: [
    "메인스트림이 아닌 인디/대안 문화에 깊은 관심이 있다",
    "소규모 창작자와 독립 프로젝트를 적극 발굴한다",
    "숨겨진 명작을 찾아내는 것에서 보람을 느낀다",
    "대중성보다 독창성을 우선시하는 문화적 취향이 있다",
  ],
  cross_cultural: [
    "한국뿐 아니라 해외 콘텐츠에도 높은 관심을 보인다",
    "다문화적 관점에서 작품을 바라보는 시각이 있다",
    "언어와 문화의 경계를 넘어 콘텐츠를 탐색한다",
    "글로벌 트렌드와 로컬 문화의 교차점에 관심이 크다",
  ],
}

// ── Generational Markers Pool ─────────────────────────────────

const GEN_MARKERS: Record<string, string[]> = {
  digital_native: [
    "온라인 커뮤니티가 주요 활동 공간이다",
    "콘텐츠 소비가 디지털 플랫폼 중심이다",
    "숏폼과 롱폼을 자유롭게 오가는 소비 패턴",
  ],
  bridge: [
    "아날로그와 디지털 경험을 모두 갖고 있다",
    "오프라인 서점과 온라인 리뷰를 병행하는 습관",
    "새로운 플랫폼에 적응하면서도 옛 방식을 그리워한다",
  ],
  traditional: [
    "깊이 있는 독서와 영화 관람을 선호한다",
    "느긋한 감상과 숙고의 시간을 중시한다",
    "빠르게 소비되는 콘텐츠에 비판적이다",
  ],
}

// ── Social Awareness 계산 ─────────────────────────────────────

function calculateSocialAwareness(l1: SocialPersonaVector, l2: CoreTemperamentVector): number {
  // 사교성 + 개방성 + 외향성 기반
  const raw = l1.sociability * 0.3 + l2.openness * 0.4 + l2.extraversion * 0.3
  return Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100
}

// ── Trend Sensitivity 계산 ────────────────────────────────────

function calculateTrendSensitivity(l1: SocialPersonaVector, l2: CoreTemperamentVector): number {
  // 개방성 + 취향 성향 기반 (취향이 실험적이면 트렌드에 민감)
  const raw = l2.openness * 0.5 + l1.taste * 0.3 + l1.sociability * 0.2
  return Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100
}

// ── 메인 생성 함수 ────────────────────────────────────────────

export function generateZeitgeistProfile(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  _archetype?: PersonaArchetype
): ZeitgeistProfile {
  const culturalReferences = selectCulturalReferences(l1, l2)
  const generationalMarkers = selectGenerationalMarkers(l1, l2)
  const socialAwareness = calculateSocialAwareness(l1, l2)
  const trendSensitivity = calculateTrendSensitivity(l1, l2)

  return {
    culturalReferences,
    generationalMarkers,
    socialAwareness,
    trendSensitivity,
  }
}

// ── Cultural References 선택 ──────────────────────────────────

function selectCulturalReferences(l1: SocialPersonaVector, l2: CoreTemperamentVector): string[] {
  const refs: string[] = []

  // 클래식 vs 현대
  if (l1.taste < 0.4 && l1.depth > 0.5) {
    refs.push(pickRandom(CULTURAL_REFS.classic))
  }
  if (l1.taste > 0.6 || l2.openness > 0.6) {
    refs.push(pickRandom(CULTURAL_REFS.contemporary))
  }

  // 인디 취향
  if (l1.taste > 0.5 && l1.sociability < 0.5) {
    refs.push(pickRandom(CULTURAL_REFS.indie))
  }

  // 다문화
  if (l2.openness > 0.5) {
    refs.push(pickRandom(CULTURAL_REFS.cross_cultural))
  }

  // 최소 2개
  while (refs.length < 2) {
    const allRefs = Object.values(CULTURAL_REFS).flat()
    refs.push(allRefs[Math.floor(Math.random() * allRefs.length)])
  }

  return [...new Set(refs)].slice(0, 4)
}

// ── Generational Markers 선택 ─────────────────────────────────

function selectGenerationalMarkers(l1: SocialPersonaVector, l2: CoreTemperamentVector): string[] {
  const markers: string[] = []

  // 디지털 친숙도
  if (l1.sociability > 0.5 && l2.openness > 0.5) {
    markers.push(pickRandom(GEN_MARKERS.digital_native))
  } else if (l1.depth > 0.6 && l1.taste < 0.4) {
    markers.push(pickRandom(GEN_MARKERS.traditional))
  } else {
    markers.push(pickRandom(GEN_MARKERS.bridge))
  }

  // 추가 마커
  if (l2.conscientiousness > 0.6) {
    markers.push(pickRandom(GEN_MARKERS.traditional))
  }

  return [...new Set(markers)].slice(0, 3)
}

// ── 유틸리티 ──────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
