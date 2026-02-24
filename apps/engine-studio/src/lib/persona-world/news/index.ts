// Phase NB — News Reaction System exports

export { fetchArticlesFromRss, parseRssXml, analyzeArticleWithClaude } from "./news-fetcher"
export type { RawArticle, ArticleAnalysis, LLMProvider } from "./news-fetcher"

export {
  computeNewsInterestScore,
  selectPersonasForArticle,
  INTEREST_THRESHOLD,
  DEFAULT_MAX_REACTORS,
} from "./news-interest-matcher"
export type {
  ArticleForMatching,
  PersonaForMatching,
  NewsInterestResult,
} from "./news-interest-matcher"

export { triggerNewsReactionPosts, formatNewsArticleTopic } from "./news-reaction-trigger"
export type {
  NewsArticleForTrigger,
  PersonaForTrigger,
  ScheduledReaction,
  NewsReactionDataProvider,
} from "./news-reaction-trigger"
