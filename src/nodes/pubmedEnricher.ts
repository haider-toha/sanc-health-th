/**
 * PubMed Enricher Node
 *
 * Three-phase strategy:
 * 1. Fetch citation counts for candidates (fast, single API call)
 * 2. Re-rank by vector similarity + citations, select top K
 * 3. Fetch full metadata for top K only
 */

import { StateAnnotation } from "../retrieval_graph/state.js"
import { enrichWithCitationsOnly, enrichWithFullMetadata } from "../services/pubmedEnrichment.js"
import { getTopDocuments } from "../utils/ranking.js"
import { RERANK_CANDIDATES, TOP_K, RANKING_WEIGHTS } from "../config/pipeline.js"

export async function pubmedEnricher(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const docs = state.retrievedDocs

    if (docs.length === 0) {
        console.log(`[PubMed Enricher] No documents to enrich`)
        return { messages: [], enrichedDocs: [] }
    }

    console.log(`[PubMed Enricher] Processing ${docs.length} documents`)

    // Phase 1: Fetch citation counts
    console.log(`[PubMed Enricher] Phase 1: Fetching citation counts for ${Math.min(docs.length, RERANK_CANDIDATES)} candidates`)
    const citationResult = await enrichWithCitationsOnly(docs, {
        maxArticlesToEnrich: RERANK_CANDIDATES,
        retryAttempts: 1,
        timeoutMs: 10000
    })

    // Phase 2: Re-rank and select top K
    console.log(`[PubMed Enricher] Phase 2: Re-ranking ${citationResult.enrichedDocs.length} documents`)
    const topCandidates = getTopDocuments(citationResult.enrichedDocs, TOP_K, RANKING_WEIGHTS)

    console.log(`[PubMed Enricher] Top ${TOP_K} after re-ranking:`)
    topCandidates.forEach((doc, idx) => {
        const title = doc.pubmedData?.title?.substring(0, 50) ?? "Unknown"
        const citations = doc.pubmedData?.citationCount ?? 0
        console.log(`  ${idx + 1}. "${title}..." (score: ${doc.qualityScore.toFixed(3)}, citations: ${citations})`)
    })

    // Phase 3: Fetch full metadata for top K
    console.log(`[PubMed Enricher] Phase 3: Fetching full metadata for top ${TOP_K}`)
    const fullResult = await enrichWithFullMetadata(topCandidates, {
        maxArticlesToEnrich: TOP_K,
        retryAttempts: 1,
        timeoutMs: 10000
    })

    console.log(`[PubMed Enricher] Complete: ${fullResult.enrichedCount}/${TOP_K} fully enriched`)

    return { messages: [], enrichedDocs: fullResult.enrichedDocs }
}
