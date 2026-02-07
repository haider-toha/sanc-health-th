/**
 * Shared pipeline configuration constants.
 *
 * Centralised to keep vectorSearch and pubmedEnricher in sync.
 */

/** Number of candidates retrieved from Pinecone for re-ranking. */
export const RERANK_CANDIDATES = 20

/** Number of top documents passed to the response generator. */
export const TOP_K = 5

/** Weights for combining vector similarity and citation count. */
export const RANKING_WEIGHTS = {
    vectorSimilarity: 0.7,
    citationCount: 0.3
} as const
