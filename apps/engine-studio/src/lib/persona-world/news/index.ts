// Phase NB — News Reaction System exports

export { fetchArticlesFromRss, parseRssXml, analyzeArticleWithClaude } from "./news-fetcher"
export type { RawArticle, ArticleAnalysis, LLMProvider } from "./news-fetcher"

// T256: Auto-fetch
export { ensurePresetsSeeded, executeNewsAutoFetch, PRESET_SOURCES } from "./news-auto-fetch"
export type { NewsAutoFetchDataProvider, AutoFetchResult } from "./news-auto-fetch"

export {
  computeNewsInterestScore,
  computeRegionalRelevance,
  selectPersonasForArticle,
  allocateDailyReactions,
  getImportanceGrade,
  getGradeConfig,
  computeEffectiveDailyBudget,
  INTEREST_THRESHOLD,
  AUTO_INTEREST_THRESHOLD,
} from "./news-interest-matcher"
export type {
  ArticleForMatching,
  PersonaForMatching,
  NewsInterestResult,
  ArticleReactionPair,
  AllocateDailyReactionsOptions,
  ImportanceGrade,
  DynamicGradeConfig,
} from "./news-interest-matcher"

export {
  triggerNewsReactionPosts,
  runDailyNewsReactions,
  formatNewsArticleTopic,
} from "./news-reaction-trigger"
export type {
  NewsArticleForTrigger,
  PersonaForTrigger,
  ScheduledReaction,
  NewsReactionDataProvider,
  DailyNewsDataProvider,
  CostCheckProvider,
} from "./news-reaction-trigger"
