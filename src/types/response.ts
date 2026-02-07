/**
 * Type definitions for LLM response generation
 */

import type { EnrichedDocument } from "./pubmed.js"

/**
 * Formatted citation for a source paper
 */
export interface FormattedCitation {
    index: number
    title: string
    journal: string
    year: string
    citationCount: number
    pmid?: string
    doi?: string
}

/**
 * Structure of the final medical response
 */
export interface MedicalResponse {
    answer: string
    sources: FormattedCitation[]
    disclaimer: string
    metadata: {
        documentsUsed: number
        averageCitationCount: number
        totalCitationCount: number
        generatedAt: Date
    }
}

/**
 * Context provided to LLM for response generation
 */
export interface ResponseContext {
    userQuery: string
    documents: EnrichedDocument[]
    maxDocuments: number
}

/**
 * Result of response generation attempt
 */
export interface ResponseGenerationResult {
    success: boolean
    response?: MedicalResponse
    error?: string
    retryCount: number
}
