/**
 * Utility functions for formatting citations and responses
 */

import type { EnrichedDocument } from "../types/pubmed.js"
import type { FormattedCitation } from "../types/response.js"

/**
 * Format enriched documents into structured citations
 */
export function formatCitations(documents: EnrichedDocument[]): FormattedCitation[] {
    return documents.map((doc, index) => {
        const pubmedData = doc.pubmedData
        const metadata = doc.metadata

        // Extract year from publication date
        const year = pubmedData?.publicationDate ? extractYear(pubmedData.publicationDate) : metadata.last_updated ? extractYear(metadata.last_updated) : "N/A"

        return {
            index: index + 1,
            title: pubmedData?.title || metadata.title || "Untitled",
            journal: pubmedData?.journal || "Unknown Journal",
            year,
            citationCount: pubmedData?.citationCount || 0,
            pmid: metadata.pmid,
            doi: pubmedData?.doi
        }
    })
}

/**
 * Extract year from various date formats
 * Handles: "2023-01-15", "2023/01/15", "2023 Jan 15", "Jan 15 2023"
 */
function extractYear(dateString: string): string {
    // Try to match 4-digit year
    const yearMatch = dateString.match(/\b(19|20)\d{2}\b/)
    return yearMatch ? yearMatch[0] : "N/A"
}

/**
 * Format sources section for the response
 */
export function formatSourcesSection(citations: FormattedCitation[]): string {
    if (citations.length === 0) {
        return ""
    }

    const formattedSources = citations.map((citation) => {
        const parts = [`[${citation.index}]`, citation.title, "-", citation.journal, `(${citation.year})`]

        // Add citation count if available
        if (citation.citationCount > 0) {
            parts.push(`| Cited by: ${citation.citationCount} articles`)
        }

        return parts.join(" ")
    })

    return "\n\nSOURCES:\n" + formattedSources.join("\n")
}

/**
 * Standard medical disclaimer
 */
export const MEDICAL_DISCLAIMER =
    "\n\nMEDICAL DISCLAIMER:\n" +
    "This information is for educational purposes only and should not replace professional medical advice. " +
    "Please consult a qualified healthcare provider for diagnosis and treatment decisions."

/**
 * Format the complete medical response
 */
export function formatMedicalResponse(answer: string, citations: FormattedCitation[]): string {
    const sourcesSection = formatSourcesSection(citations)
    return answer + sourcesSection + MEDICAL_DISCLAIMER
}

/**
 * Build context for LLM from enriched documents
 * Returns formatted text with document content, abstracts, and metadata
 */
export function buildDocumentContext(documents: EnrichedDocument[]): string {
    return documents
        .map((doc, index) => {
            const citation = index + 1
            const pubmedData = doc.pubmedData
            const metadata = doc.metadata

            const parts: string[] = []

            // Header with citation number
            parts.push(`\n[Document ${citation}]`)

            // Title and metadata
            if (pubmedData?.title || metadata.title) {
                parts.push(`Title: ${pubmedData?.title || metadata.title}`)
            }

            if (pubmedData?.journal) {
                parts.push(`Journal: ${pubmedData.journal}`)
            }

            if (pubmedData?.publicationDate) {
                parts.push(`Published: ${pubmedData.publicationDate}`)
            }

            // Abstract (if available) - prioritize PubMed abstract
            if (pubmedData?.abstract) {
                parts.push(`\nAbstract: ${pubmedData.abstract}`)
            }

            // Key excerpts from full text (limit to first 500 chars to avoid token limits)
            if (doc.content) {
                const excerpt = doc.content.substring(0, 500).trim()
                parts.push(`\nKey Content: ${excerpt}${doc.content.length > 500 ? "..." : ""}`)
            }

            // Article types (e.g., Review, Meta-Analysis)
            if (pubmedData?.articleTypes && pubmedData.articleTypes.length > 0) {
                parts.push(`\nArticle Type: ${pubmedData.articleTypes.join(", ")}`)
            }

            return parts.join("\n")
        })
        .join("\n\n---")
}

/**
 * Calculate metadata statistics for response
 */
export function calculateResponseMetadata(documents: EnrichedDocument[]) {
    const citationCounts = documents.map((doc) => doc.pubmedData?.citationCount || 0).filter((count) => count > 0)

    const totalCitations = citationCounts.reduce((sum, count) => sum + count, 0)
    const avgCitations = citationCounts.length > 0 ? Math.round(totalCitations / citationCounts.length) : 0

    return {
        documentsUsed: documents.length,
        averageCitationCount: avgCitations,
        totalCitationCount: totalCitations,
        generatedAt: new Date()
    }
}

/**
 * Clean and normalize LLM response text
 * Removes extra whitespace, fixes formatting issues
 */
export function cleanResponseText(text: string): string {
    return (
        text
            .trim()
            // Remove multiple consecutive newlines (max 2)
            .replace(/\n{3,}/g, "\n\n")
            // Remove trailing spaces from lines
            .replace(/ +$/gm, "")
            // Ensure single space after periods (unless end of line)
            .replace(/\.([^ \n])/g, ". $1")
    )
}
