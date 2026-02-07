/**
 * PubMed E-utilities API Client
 *
 * Provides methods to interact with NCBI's E-utilities API:
 * - ESummary: Fetch document summaries (metadata)
 * - ELink: Fetch citation counts via "cited by" links
 * - ESearch: Search for articles by title/author
 * - EFetch: Retrieve full abstracts
 *
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 * Rate limits: 3 req/s without API key, 10 req/s with API key
 */

import { XMLParser } from "fast-xml-parser"
import type { ESearchResponse, ESummaryResponse, ELinkResponse, PubMedDocSummary } from "../types/pubmed.js"

const EUTILS_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

export interface PubMedClientConfig {
    apiKey?: string
    retryAttempts?: number
    timeoutMs?: number
    email?: string
}

/**
 * PubMed E-utilities client with retry support and proper XML parsing.
 */
export class PubMedClient {
    private readonly apiKey?: string
    private readonly retryAttempts: number
    private readonly timeoutMs: number
    private readonly email?: string
    private readonly xmlParser: XMLParser

    constructor(config: PubMedClientConfig = {}) {
        this.apiKey = config.apiKey
        this.retryAttempts = config.retryAttempts ?? 1
        this.timeoutMs = config.timeoutMs ?? 10000
        this.email = config.email
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            textNodeName: "#text",
            isArray: (name) => name === "AbstractText" || name === "PubmedArticle"
        })
    }

    /**
     * Fetch document summaries for given PMIDs.
     */
    async fetchDocumentSummaries(pmids: string[]): Promise<Record<string, PubMedDocSummary>> {
        if (pmids.length === 0) return {}

        const url = this.buildUrl("esummary.fcgi", {
            db: "pubmed",
            id: pmids.join(","),
            retmode: "json",
            version: "2.0"
        })

        const response = await this.fetchWithRetry(url)
        const data = (await response.json()) as ESummaryResponse

        const summaries: Record<string, PubMedDocSummary> = {}

        if (data.result?.uids) {
            for (const pmid of data.result.uids) {
                const docData = data.result[pmid]
                if (typeof docData !== "string" && docData !== undefined) {
                    summaries[pmid] = docData as PubMedDocSummary
                }
            }
        }

        return summaries
    }

    /**
     * Fetch citation counts for given PMIDs using ELink's "cited by" data.
     */
    async fetchCitationCounts(pmids: string[]): Promise<Record<string, number>> {
        if (pmids.length === 0) return {}

        const url = this.buildUrl("elink.fcgi", {
            dbfrom: "pubmed",
            db: "pubmed",
            id: pmids.join(","),
            linkname: "pubmed_pubmed_citedin",
            retmode: "json"
        })

        const response = await this.fetchWithRetry(url)
        const data = (await response.json()) as ELinkResponse

        // Initialize all PMIDs to 0
        const citationCounts: Record<string, number> = {}
        for (const pmid of pmids) {
            citationCounts[pmid] = 0
        }

        if (data.linksets) {
            for (const linkset of data.linksets) {
                if (linkset.ids?.[0]) {
                    const sourcePmid = linkset.ids[0]
                    const citedByLink = linkset.linksetdbs?.find((db) => db.linkname === "pubmed_pubmed_citedin")
                    if (citedByLink?.link) {
                        citationCounts[sourcePmid] = citedByLink.link.length
                    }
                }
            }
        }

        return citationCounts
    }

    /**
     * Search for a PubMed article by title and optional author.
     * Returns at most 1 matching PMID.
     */
    async searchByTitleAndAuthor(title: string, author?: string): Promise<string[]> {
        let query = `${title}[Title]`
        if (author) {
            const lastName = this.extractLastName(author)
            if (lastName) {
                query += ` AND ${lastName}[Author]`
            }
        }

        const url = this.buildUrl("esearch.fcgi", {
            db: "pubmed",
            term: query,
            retmode: "json",
            retmax: "1"
        })

        try {
            const response = await this.fetchWithRetry(url)
            const data = (await response.json()) as ESearchResponse
            return data.esearchresult?.idlist || []
        } catch (error) {
            console.error(`[PubMed Client] Search failed for title "${title.substring(0, 40)}...":`, error)
            return []
        }
    }

    /**
     * Fetch abstracts for given PMIDs using EFetch (XML).
     */
    async fetchAbstracts(pmids: string[]): Promise<Record<string, string>> {
        if (pmids.length === 0) return {}

        const url = this.buildUrl("efetch.fcgi", {
            db: "pubmed",
            id: pmids.join(","),
            retmode: "xml",
            rettype: "abstract"
        })

        const response = await this.fetchWithRetry(url)
        const xmlText = await response.text()

        return this.parseAbstractsFromXML(xmlText)
    }

    private buildUrl(endpoint: string, params: Record<string, string>): string {
        const url = new URL(`${EUTILS_BASE_URL}/${endpoint}`)

        if (this.apiKey) url.searchParams.set("api_key", this.apiKey)
        if (this.email) url.searchParams.set("email", this.email)

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value)
        }

        return url.toString()
    }

    /**
     * Fetch with timeout and retry (exponential backoff).
     */
    private async fetchWithRetry(url: string, attempt = 0): Promise<Response> {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

        try {
            // eslint-disable-next-line no-undef
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { "User-Agent": "MedicalChatbot/1.0" }
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            return response
        } catch (error) {
            clearTimeout(timeoutId)

            if (attempt < this.retryAttempts) {
                const delay = Math.pow(2, attempt) * 1000
                console.warn(`[PubMed Client] Request failed, retrying in ${delay}ms (${attempt + 1}/${this.retryAttempts})`)
                await new Promise((resolve) => setTimeout(resolve, delay))
                return this.fetchWithRetry(url, attempt + 1)
            }

            throw error
        }
    }

    /**
     * Parse abstracts from PubMed EFetch XML using fast-xml-parser.
     */
    private parseAbstractsFromXML(xmlText: string): Record<string, string> {
        const abstracts: Record<string, string> = {}

        try {
            const parsed = this.xmlParser.parse(xmlText)
            const articles = parsed?.PubmedArticleSet?.PubmedArticle

            if (!articles) return abstracts

            for (const article of articles) {
                const citation = article?.MedlineCitation
                if (!citation) continue

                const pmid = typeof citation.PMID === "object" ? citation.PMID["#text"] : citation.PMID
                if (!pmid) continue

                const abstractNode = citation.Article?.Abstract
                if (!abstractNode) continue

                const textNodes = abstractNode.AbstractText
                if (!textNodes) continue

                // AbstractText can be a single object or an array of labeled sections
                const parts: string[] = []
                for (const node of textNodes) {
                    const text = typeof node === "string" ? node : node["#text"]
                    if (text) parts.push(String(text).trim())
                }

                if (parts.length > 0) {
                    abstracts[String(pmid)] = parts.join(" ")
                }
            }
        } catch (error) {
            console.error(`[PubMed Client] Error parsing abstracts XML:`, error)
        }

        return abstracts
    }

    /**
     * Extract last name from author string.
     * Handles: "Doe, John" | "Doe J" | "John Doe"
     */
    private extractLastName(author: string): string | null {
        if (!author) return null

        // Take only the first author if multiple are separated by semicolons
        const firstAuthor = author.split(";")[0].trim()

        if (firstAuthor.includes(",")) {
            // "Doe, John" format
            return firstAuthor.split(",")[0].trim()
        }

        // "Doe J" or "John Doe" format
        const parts = firstAuthor.split(/\s+/)
        if (parts.length <= 1) return parts[0] || null

        // If last part is a single letter/initial, first part is likely the last name ("Doe J")
        const lastPart = parts[parts.length - 1]
        if (lastPart.length <= 2) {
            return parts[0]
        }

        // Otherwise assume "John Doe" format - last word is last name
        return lastPart
    }
}

/**
 * Factory function for PubMed client. Creates a new instance each time to
 * respect the caller's configuration (retry attempts, timeouts, etc.).
 */
export function getPubMedClient(config?: PubMedClientConfig): PubMedClient {
    return new PubMedClient(config)
}
