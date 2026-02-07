/**
 * PubMed Enricher Node
 *
 * Enriches retrieved documents with PubMed metadata (citations, abstracts,
 * journal info) and re-ranks them using a weighted combination of vector
 * similarity and citation count.
 */

import { Document } from "@langchain/core/documents"
import { StateAnnotation } from "../retrieval_graph/state.js"
import { enrichDocumentsWithPubMed } from "../services/pubmedEnrichment.js"
import { getTopDocuments } from "../utils/ranking.js"
import type { EnrichedDocument } from "../types/pubmed.js"

const TOP_K = 5

const RANKING_WEIGHTS = {
    vectorSimilarity: 0.7,
    citationCount: 0.3
}

/**
 * Wraps raw Pinecone documents as EnrichedDocuments so the respond node
 * always has something to work with, even when PubMed enrichment fails.
 */
function wrapAsEnrichedDocs(docs: Document[]): EnrichedDocument[] {
    return docs.slice(0, TOP_K).map((doc) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        qualityScore: 1.0,
        vectorSimilarityScore: 1.0,
        pubmedData: {
            title: (doc.metadata.title as string) || "Unknown",
            authors: doc.metadata.author ? [doc.metadata.author as string] : [],
            journal: (doc.metadata.article_citation as string) || "Unknown",
            publicationDate: (doc.metadata.last_updated as string) || "Unknown",
            articleTypes: [],
            citationCount: 0,
            relatedArticleCount: 0
        }
    }))
}

/**
 * PubMed Enricher Node
 *
 * Enriches documents with PubMed metadata and re-ranks by quality.
 * Falls back to original documents if enrichment fails.
 */
export async function pubmedEnricher(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    console.log(`[PubMed Enricher] Enriching ${state.retrievedDocs.length} documents`)

    if (state.retrievedDocs.length === 0) {
        return { messages: [], enrichedDocs: [] }
    }

    try {
        const enrichmentResult = await enrichDocumentsWithPubMed(state.retrievedDocs, {
            maxArticlesToEnrich: TOP_K,
            retryAttempts: 1,
            timeoutMs: 10000,
            rankingWeights: RANKING_WEIGHTS
        })

        if (!enrichmentResult.success || enrichmentResult.enrichedDocs.length === 0) {
            console.warn(`[PubMed Enricher] Enrichment failed, falling back to original documents`)
            return { messages: [], enrichedDocs: wrapAsEnrichedDocs(state.retrievedDocs) }
        }

        console.log(`[PubMed Enricher] Enriched ${enrichmentResult.enrichedCount}/${enrichmentResult.enrichedDocs.length} documents`)

        const topDocs = getTopDocuments(enrichmentResult.enrichedDocs, TOP_K, RANKING_WEIGHTS)

        topDocs.forEach((doc, idx) => {
            const title = doc.pubmedData?.title?.substring(0, 60) ?? "Unknown"
            console.log(
                `[PubMed Enricher] Rank ${idx + 1}: "${title}..." (score: ${doc.qualityScore.toFixed(3)}, citations: ${doc.pubmedData?.citationCount ?? 0})`
            )
        })

        return { messages: [], enrichedDocs: topDocs }
    } catch (error) {
        console.error(`[PubMed Enricher] Error during enrichment, falling back to original documents:`, error)
        return { messages: [], enrichedDocs: wrapAsEnrichedDocs(state.retrievedDocs) }
    }
}
