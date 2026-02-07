/**
 * Type definitions for PubMed E-utilities API
 *
 * References:
 * - ESummary: https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESummary
 * - ELink: https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ELink
 */

/**
 * PubMed article metadata from ESummary
 */
export interface PubMedDocSummary {
    uid: string // PubMed ID (PMID)
    title: string
    authors: PubMedAuthor[]
    source: string // Journal name
    pubdate: string // Publication date
    epubdate?: string // Electronic publication date
    volume?: string
    issue?: string
    pages?: string
    articleids: ArticleId[] // DOI, PMC ID, etc.
    fulljournalname?: string
    sortpubdate: string // Sortable publication date
    pubtype: string[] // Article types (e.g., Journal Article, Review, Meta-Analysis)
}

/**
 * Author information
 */
export interface PubMedAuthor {
    name: string
    authtype?: string
}

/**
 * Article identifiers (DOI, PMC ID, etc.)
 */
export interface ArticleId {
    idtype: string // 'doi', 'pmc', 'pubmed', etc.
    value: string
}

export interface LinkSetDb {
    dbto: string // Target database
    linkname: string // Link type (e.g., 'pubmed_pubmed_citedin')
    link: string[] // Array of linked PMIDs
}

/**
 * Enriched document combining Pinecone data with PubMed metadata
 */
export interface EnrichedDocument {
    // Original Pinecone data
    content: string
    metadata: PineconeMetadata

    // PubMed enrichment
    pubmedData?: {
        title: string
        authors: string[] // Formatted author names
        journal: string
        publicationDate: string
        abstract?: string
        meshTerms?: string[] // Medical Subject Headings
        articleTypes: string[]
        doi?: string
        pmcId?: string
        citationCount: number
        relatedArticleCount: number
    }

    // Quality metrics for ranking
    qualityScore: number // Combined score from vector similarity + citations
    vectorSimilarityScore?: number // Original retrieval score
    citationScore?: number // Normalized citation score
}

/**
 * Metadata structure from Pinecone index
 */
export interface PineconeMetadata {
    article_citation?: string
    article_file?: string
    author?: string
    last_updated?: string
    license?: string
    pmc_link?: string
    pmid?: string
    retracted?: string
    title?: string
    version?: number
}

/**
 * Raw ESummary XML response structure
 */
export interface ESummaryResponse {
    result: {
        uids: string[]
        [pmid: string]: PubMedDocSummary | string[]
    }
}

/**
 * Raw ELink XML response structure
 */
export interface ELinkResponse {
    linksets?: Array<{
        ids: string[]
        linksetdbs?: LinkSetDb[]
    }>
}

/**
 * PubMed search result for finding PMIDs by title/author
 */
export interface ESearchResponse {
    esearchresult: {
        count: string
        retmax: string
        retstart: string
        idlist: string[]
    }
}

/**
 * Configuration for PubMed enrichment
 */
export interface PubMedEnrichmentConfig {
    maxArticlesToEnrich: number // How many articles to fetch metadata for
    retryAttempts: number // Number of retry attempts for failed API calls
    timeoutMs: number // API request timeout
}

/**
 * Result of PubMed enrichment operation
 */
export interface EnrichmentResult {
    enrichedCount: number // Number of successfully enriched documents
    enrichedDocs: EnrichedDocument[]
}
