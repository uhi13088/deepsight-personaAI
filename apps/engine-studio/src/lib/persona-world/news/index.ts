// Phase NB — News Reaction System exports

export { fetchArticlesFromRss, parseRssXml, analyzeArticleWithClaude } from "./news-fetcher"
export type { RawArticle, ArticleAnalysis, LLMProvider } from "./news-fetcher"

export {
  computeNewsInterestScore,
  computeRegionalRelevance,
  selectPersonasForArticle,
  allocateDailyReactions,
  INTEREST_THRESHOLD,
  AUTO_INTEREST_THRESHOLD,
} from "./news-interest-matcher"
export type {
  ArticleForMatching,
  PersonaForMatching,
  NewsInterestResult,
  ArticleReactionPair,
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
} from "./news-reaction-trigger"
