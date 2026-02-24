export {
  // Ironic — 분석적, 비판적, 내향적
  IRONIC_L1,
  IRONIC_L2,
  IRONIC_L3,
  // Neutral — 기준선, 대조군
  NEUTRAL_L1,
  NEUTRAL_L2,
  NEUTRAL_L3,
  // Mature — 성숙한, 신중한 (연령 추론 32~52세)
  MATURE_L1,
  MATURE_L2,
  // Young — 젊은, 캐주얼 (연령 추론 18~33세)
  YOUNG_L1,
  YOUNG_L2,
  // Formal — 공식적, 내향적, 안정적
  FORMAL_L1,
  INTROVERT_L2,
  STABLE_L3,
  // Casual — 캐주얼, 사교적, 불안정
  CASUAL_L1,
  EXTROVERT_L2,
  VOLATILE_L3,
  // Quality — 균형 잡힌, 안정적
  QUALITY_L1,
  QUALITY_L2,
  QUALITY_L3,
  // High assertive
  HIGH_L1,
  // Extreme — 경계값 테스트
  LOW_L1,
  HIGH_ALL_L1,
  LOW_L3,
  HIGH_L3,
} from "./vectors"

export { makeL1, makeL2, makeL3 } from "./factories"
