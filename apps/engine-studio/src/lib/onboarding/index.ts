/**
 * PersonaWorld 유저 온보딩 모듈
 *
 * - Cold Start 설문 처리
 * - SNS 데이터 분석
 * - 6D 벡터 병합
 * - 프로필 품질 관리
 */

export {
  // 벡터 병합
  mergeVectors,
  smoothMerge,
  normalizeVector,
  // 프로필 품질
  calculateProfileQuality,
  getQuestionCountForLevel,
  getEstimatedTimeForLevel,
  // 유사도 계산
  cosineSimilarity,
  euclideanDistance,
  similarityScore,
  // 타입
  type Vector6D,
  type ProfileQuality,
  type MergeOptions,
  type ProfileQualityResult,
  type DataSourceInfo,
} from "./vector-merger"

export {
  // SNS 분석
  analyzeSNSData,
  // 타입
  type SNSExtendedData,
  type SNSAnalysisResult,
  type NetflixData,
  type YouTubeData,
  type InstagramData,
} from "./sns-analyzer"
