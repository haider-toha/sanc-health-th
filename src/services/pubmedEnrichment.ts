/**
 * PubMed Enrichment Service
 *
 * Two-phase enrichment strategy:
 * 1. Lightweight: Fetch ONLY citation counts for re-ranking
 * 2. Full: Fetch summaries + abstracts for top documents
 */

import { Document } from "@langchain/core/documents"
import { getPubMedClient, PubMedClient } from "../clients/pubmed.js"
import type { EnrichedDocument, PubMedDocSummary, PubMedEnrichmentConfig, EnrichmentResult, PineconeMetadata } from "../types/pubmed.js"

const DEFAULT_CONFIG: PubMedEnrichmentConfig = {
    maxArticlesToEnrich: 5,
    retryAttempts: 1,
    timeoutMs: 10000
}

/**
 * Phase 1: Fetch ONLY citation counts for re-ranking.
 */
export async function enrichWithCitationsOnly(documents: Document[], config: Partial<PubMedEnrichmentConfig> = {}): Promise<EnrichmentResult> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config }
    const pubmedClient = getPubMedClient({
        retryAttempts: fullConfig.retryAttempts,
        timeoutMs: fullConfig.timeoutMs
    })

    const docsToEnrich = documents.slice(0, fullConfig.maxArticlesToEnrich)
    const pmidMap = await resolvePMIDs(docsToEnrich, pubmedClient)
    const validPmids = Object.values(pmidMap).filter((pmid): pmid is string => pmid !== undefined)

    if (validPmids.length === 0) {
        console.warn(`[Citations Only] No valid PMIDs found`)
        return {
            enrichedCount: 0,
            enrichedDocs: docsToEnrich.map((doc) => createMinimalEnrichedDoc(doc))
        }
    }

    console.log(`[Citations Only] Fetching citation counts for ${validPmids.length} PMIDs`)
    const citationCounts = await pubmedClient.fetchCitationCounts(validPmids)

    const enrichedDocs = docsToEnrich.map((doc, i) => {
        const pmid = pmidMap[i]
        return createMinimalEnrichedDoc(doc, pmid ? (citationCounts[pmid] ?? 0) : 0)
    })

    const enrichedCount = enrichedDocs.filter((doc) => doc.pubmedData?.citationCount && doc.pubmedData.citationCount > 0).length

    console.log(`[Citations Only] Complete: ${enrichedCount}/${docsToEnrich.length} with citation data`)

    return { enrichedCount, enrichedDocs }
}

/**
 * Phase 2: Fetch full metadata (summaries + abstracts) for final documents.
 */
export async function enrichWithFullMetadata(documents: EnrichedDocument[], config: Partial<PubMedEnrichmentConfig> = {}): Promise<EnrichmentResult> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config }
    const pubmedClient = getPubMedClient({
        retryAttempts: fullConfig.retryAttempts,
        timeoutMs: fullConfig.timeoutMs
    })

    const pmids = documents.map((doc) => (doc.metadata as PineconeMetadata).pmid).filter((pmid): pmid is string => typeof pmid === "string" && pmid !== "0")

    if (pmids.length === 0) {
        console.warn(`[Full Metadata] No valid PMIDs`)
        return { enrichedCount: 0, enrichedDocs: documents }
    }

    console.log(`[Full Metadata] Fetching for ${pmids.length} PMIDs`)

    const [summaries, abstracts] = await Promise.all([pubmedClient.fetchDocumentSummaries(pmids), pubmedClient.fetchAbstracts(pmids)])

    const enrichedDocs = documents.map((doc) => {
        const pmid = (doc.metadata as PineconeMetadata).pmid
        if (!pmid || pmid === "0") return doc

        const citationCount = doc.pubmedData?.citationCount ?? 0
        return createFullyEnrichedDoc(doc, summaries[pmid], abstracts[pmid], citationCount)
    })

    const enrichedCount = enrichedDocs.filter((doc) => doc.pubmedData?.abstract).length

    console.log(`[Full Metadata] Complete: ${enrichedCount}/${documents.length} with abstracts`)

    return { enrichedCount, enrichedDocs }
}

/**
 * Resolve PMIDs from metadata or title/author search.
 */
async function resolvePMIDs(documents: Document[], pubmedClient: PubMedClient): Promise<Record<number, string | undefined>> {
    const pmidMap: Record<number, string | undefined> = {}

    for (let i = 0; i < documents.length; i++) {
        const metadata = documents[i].metadata as PineconeMetadata
        let pmid = metadata.pmid

        if (!pmid || pmid === "0") {
            if (metadata.title) {
                const found = await pubmedClient.searchByTitleAndAuthor(metadata.title, metadata.author)
                pmid = found[0]
                if (pmid) console.log(`[Resolve PMID] Found ${pmid} for doc ${i}`)
            }
        }

        pmidMap[i] = pmid || undefined
    }

    return pmidMap
}

/**
 * Create minimal enriched document with citation count only.
 */
function createMinimalEnrichedDoc(doc: Document, citationCount = 0): EnrichedDocument {
    const metadata = doc.metadata as PineconeMetadata

    return {
        content: doc.pageContent,
        metadata,
        qualityScore: 0,
        vectorSimilarityScore: 1.0,
        pubmedData: {
            title: metadata.title || "Unknown",
            authors: metadata.author ? [metadata.author] : [],
            journal: metadata.article_citation || "Unknown",
            publicationDate: metadata.last_updated || "Unknown",
            articleTypes: [],
            citationCount,
            relatedArticleCount: 0
        }
    }
}

/**
 * Create fully enriched document with all metadata.
 */
function createFullyEnrichedDoc(
    doc: EnrichedDocument,
    summary: PubMedDocSummary | undefined,
    abstract: string | undefined,
    citationCount: number
): EnrichedDocument {
    const metadata = doc.metadata as PineconeMetadata

    if (!summary) return doc

    const authors = summary.authors?.map((a) => a.name) || []
    const doi = summary.articleids?.find((id) => id.idtype === "doi")?.value
    const pmcId = summary.articleids?.find((id) => id.idtype === "pmc")?.value

    return {
        ...doc,
        pubmedData: {
            title: summary.title || metadata.title || "Unknown",
            authors,
            journal: summary.fulljournalname || summary.source || "Unknown",
            publicationDate: summary.pubdate || summary.sortpubdate || "Unknown",
            abstract,
            articleTypes: summary.pubtype || [],
            doi,
            pmcId,
            citationCount,
            relatedArticleCount: 0
        }
    }
}
