/**
 * PubMed Enrichment Service
 *
 * Enriches Pinecone documents with PubMed metadata: summaries, abstracts,
 * and citation counts. Handles PMID resolution for documents that are
 * missing PMIDs in their Pinecone metadata.
 */

import { Document } from "@langchain/core/documents"
import { getPubMedClient, PubMedClient } from "../clients/pubmed.js"
import type { EnrichedDocument, PubMedDocSummary, PubMedEnrichmentConfig, EnrichmentResult, PineconeMetadata } from "../types/pubmed.js"

const DEFAULT_CONFIG: PubMedEnrichmentConfig = {
    maxArticlesToEnrich: 5,
    retryAttempts: 1,
    timeoutMs: 10000,
    rankingWeights: {
        vectorSimilarity: 0.7,
        citationCount: 0.3
    }
}

/**
 * Enrich Pinecone documents with PubMed metadata.
 *
 * Pipeline: resolve PMIDs -> fetch summaries + abstracts + citations -> merge
 */
export async function enrichDocumentsWithPubMed(documents: Document[], config: Partial<PubMedEnrichmentConfig> = {}): Promise<EnrichmentResult> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config }

    const result: EnrichmentResult = {
        success: true,
        enrichedCount: 0,
        failedCount: 0,
        enrichedDocs: [],
        errors: []
    }

    if (documents.length === 0) return result

    const pubmedClient = getPubMedClient({
        retryAttempts: fullConfig.retryAttempts,
        timeoutMs: fullConfig.timeoutMs
    })

    const docsToEnrich = documents.slice(0, fullConfig.maxArticlesToEnrich)

    try {
        const pmidMap = await resolvePMIDs(docsToEnrich, pubmedClient)
        const validPmids = Object.values(pmidMap).filter((pmid): pmid is string => pmid !== undefined)

        if (validPmids.length === 0) {
            console.warn(`[PubMed Enrichment] No valid PMIDs found, returning unenriched documents`)
            result.enrichedDocs = docsToEnrich.map((doc) => createEnrichedDocument(doc, null, null, 0))
            return result
        }

        console.log(`[PubMed Enrichment] Fetching metadata for ${validPmids.length} PMIDs`)

        // Fetch all PubMed data in parallel
        const [summaries, abstracts, citationCounts] = await Promise.all([
            pubmedClient.fetchDocumentSummaries(validPmids),
            pubmedClient.fetchAbstracts(validPmids),
            pubmedClient.fetchCitationCounts(validPmids)
        ])

        // Merge PubMed data into enriched documents
        for (let i = 0; i < docsToEnrich.length; i++) {
            const doc = docsToEnrich[i]
            const pmid = pmidMap[i]

            if (!pmid) {
                result.enrichedDocs.push(createEnrichedDocument(doc, null, null, 0))
                result.failedCount++
                continue
            }

            const enrichedDoc = createEnrichedDocument(doc, summaries[pmid] ?? null, abstracts[pmid] ?? null, citationCounts[pmid] ?? 0)
            result.enrichedDocs.push(enrichedDoc)
            result.enrichedCount++
        }

        console.log(`[PubMed Enrichment] Complete: ${result.enrichedCount} enriched, ${result.failedCount} failed`)
    } catch (error) {
        console.error(`[PubMed Enrichment] Fatal error:`, error)
        result.success = false
        result.enrichedDocs = docsToEnrich.map((doc) => createEnrichedDocument(doc, null, null, 0))
    }

    return result
}

/**
 * Resolve PMIDs for documents.
 * Extracts from metadata first, falls back to title/author search.
 */
async function resolvePMIDs(documents: Document[], pubmedClient: PubMedClient): Promise<Record<number, string | undefined>> {
    const pmidMap: Record<number, string | undefined> = {}

    for (let i = 0; i < documents.length; i++) {
        const metadata = documents[i].metadata as PineconeMetadata
        let pmid = metadata.pmid

        if (!pmid || pmid === "0") {
            // Attempt to find PMID via title/author search
            if (metadata.title) {
                const found = await pubmedClient.searchByTitleAndAuthor(metadata.title, metadata.author)
                pmid = found[0]
                if (pmid) {
                    console.log(`[PubMed Enrichment] Resolved PMID ${pmid} via search for doc ${i}`)
                }
            }
        }

        pmidMap[i] = pmid || undefined
    }

    return pmidMap
}

/**
 * Create an EnrichedDocument by merging Pinecone doc with PubMed data.
 */
function createEnrichedDocument(doc: Document, summary: PubMedDocSummary | null, abstract: string | null, citationCount: number): EnrichedDocument {
    const metadata = doc.metadata as PineconeMetadata

    const enrichedDoc: EnrichedDocument = {
        content: doc.pageContent,
        metadata,
        qualityScore: 0,
        vectorSimilarityScore: 1.0
    }

    if (summary) {
        const authors = summary.authors?.map((a) => a.name) || []
        const doi = summary.articleids?.find((id) => id.idtype === "doi")?.value
        const pmcId = summary.articleids?.find((id) => id.idtype === "pmc")?.value

        enrichedDoc.pubmedData = {
            title: summary.title || metadata.title || "Unknown",
            authors,
            journal: summary.fulljournalname || summary.source || "Unknown",
            publicationDate: summary.pubdate || summary.sortpubdate || "Unknown",
            abstract: abstract ?? undefined,
            articleTypes: summary.pubtype || [],
            doi: doi ?? undefined,
            pmcId: pmcId ?? undefined,
            citationCount,
            relatedArticleCount: 0
        }
    } else {
        enrichedDoc.pubmedData = {
            title: metadata.title || "Unknown",
            authors: metadata.author ? [metadata.author] : [],
            journal: metadata.article_citation || "Unknown",
            publicationDate: metadata.last_updated || "Unknown",
            articleTypes: [],
            citationCount: 0,
            relatedArticleCount: 0
        }
    }

    return enrichedDoc
}
