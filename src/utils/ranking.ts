/**
 * Ranking utilities for re-ranking documents based on multiple signals.
 *
 * Combines vector similarity scores with citation counts (log-normalized)
 * to produce a final quality score for each document.
 */

import type { EnrichedDocument } from "../types/pubmed.js"

export interface RankingWeights {
    vectorSimilarity: number
    citationCount: number
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
    vectorSimilarity: 0.7,
    citationCount: 0.3
}

/**
 * Calculate quality score using weighted combination of vector similarity
 * and log-normalized citation count.
 *
 * Log normalization prevents highly-cited papers from dominating results
 * that are less relevant to the actual query.
 */
export function calculateQualityScore(
    vectorSimilarity: number,
    citationCount: number,
    maxCitations: number,
    weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): number {
    const normalizedCitations = maxCitations > 0 ? Math.log(citationCount + 1) / Math.log(maxCitations + 1) : 0

    return vectorSimilarity * weights.vectorSimilarity + normalizedCitations * weights.citationCount
}

/**
 * Re-rank documents by quality score (descending).
 */
export function rerankDocuments(documents: EnrichedDocument[], weights: RankingWeights = DEFAULT_RANKING_WEIGHTS): EnrichedDocument[] {
    if (documents.length === 0) return []

    const maxCitations = Math.max(...documents.map((doc) => doc.pubmedData?.citationCount ?? 0))

    const rankedDocs = documents.map((doc) => {
        const vectorSimilarity = doc.vectorSimilarityScore ?? 1.0
        const citationCount = doc.pubmedData?.citationCount ?? 0
        const qualityScore = calculateQualityScore(vectorSimilarity, citationCount, maxCitations, weights)

        return {
            ...doc,
            qualityScore,
            vectorSimilarityScore: vectorSimilarity,
            citationScore: maxCitations > 0 ? Math.log(citationCount + 1) / Math.log(maxCitations + 1) : 0
        }
    })

    rankedDocs.sort((a, b) => b.qualityScore - a.qualityScore)

    return rankedDocs
}

/**
 * Get top N documents by quality score.
 */
export function getTopDocuments(documents: EnrichedDocument[], n: number, weights: RankingWeights = DEFAULT_RANKING_WEIGHTS): EnrichedDocument[] {
    return rerankDocuments(documents, weights).slice(0, n)
}
