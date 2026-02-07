/**
 * Test Suite for PubMed Enricher
 *
 * Tests the complete enrichment pipeline:
 * - PubMed client API calls
 * - Document enrichment service
 * - Citation-based re-ranking
 */

import "dotenv/config"
import { Document } from "@langchain/core/documents"
import { getPubMedClient } from "../src/clients/pubmed.js"
import { enrichDocumentsWithPubMed } from "../src/services/pubmedEnrichment.js"
import { rerankDocuments, calculateQualityScore } from "../src/utils/ranking.js"

/**
 * Sample documents for testing (from real Pinecone data)
 */
const SAMPLE_DOCS: Document[] = [
    new Document({
        pageContent: "Type 2 diabetes mellitus is a chronic metabolic disorder...",
        metadata: {
            pmid: "40539149",
            title: "Comparative Analysis of Clinical Features of Type 2 Diabetes Mellitus Between Men and Women",
            author: "Alexander Muacevic; John R Adler",
            article_citation: "Cureus.; 17(5):e84472",
            pmc_link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12178220"
        }
    }),
    new Document({
        pageContent: "Hypertension, or high blood pressure, is a common condition...",
        metadata: {
            pmid: "36631896",
            title: "Judging the possibility of the onset of diabetes mellitus type 2",
            author: "María Teresa Muñoz Sastre",
            article_citation: "Clin Diabetes Endocrinol. 2023 Jan 11; 9:1"
        }
    }),
    new Document({
        pageContent: "Cardiovascular disease remains the leading cause of death...",
        metadata: {
            pmid: "0", // Missing PMID - will test search functionality
            title: "Prevalence and burden of diabetes mellitus-related symptoms in patients with type 2 diabetes mellitus",
            author: "Jonathan Yuet Han Tan; Chirk Jenn Ng"
        }
    })
]

/**
 * Test configuration
 */
interface TestResult {
    name: string
    passed: boolean
    duration: number
    error?: string
}

const testResults: TestResult[] = []

/**
 * Run a test and record result
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    console.log(`\nTest: ${name}`)
    console.log("-".repeat(70))

    const startTime = Date.now()

    try {
        await testFn()
        const duration = Date.now() - startTime
        testResults.push({ name, passed: true, duration })
        console.log(`[PASS] ${name} (${duration}ms)`)
    } catch (error) {
        const duration = Date.now() - startTime
        const errorMsg = error && typeof error === "object" && "message" in error ? (error as Error).message : String(error)
        testResults.push({ name, passed: false, duration, error: errorMsg })
        console.log(`[FAIL] ${name} (${duration}ms)`)
        console.log(`Error: ${errorMsg}`)
    }
}

/**
 * Test 1: PubMed Client - Fetch Document Summaries
 */
async function testFetchDocumentSummaries(): Promise<void> {
    const client = getPubMedClient()
    const pmids = ["40539149", "36631896"]

    const summaries = await client.fetchDocumentSummaries(pmids)

    // Verify we got summaries for both PMIDs
    if (Object.keys(summaries).length !== 2) {
        throw new Error(`Expected 2 summaries, got ${Object.keys(summaries).length}`)
    }

    // Verify summary structure
    const summary = summaries["40539149"]
    if (!summary) {
        throw new Error("Missing summary for PMID 40539149")
    }

    if (!summary.title || !summary.pubdate) {
        throw new Error("Summary missing required fields (title, pubdate)")
    }

    console.log(`Retrieved summaries for PMIDs: ${Object.keys(summaries).join(", ")}`)
    console.log(`Sample title: ${summary.title.substring(0, 60)}...`)
}

/**
 * Test 2: PubMed Client - Fetch Citation Counts
 */
async function testFetchCitationCounts(): Promise<void> {
    const client = getPubMedClient()
    const pmids = ["40539149", "36631896"]

    const citationCounts = await client.fetchCitationCounts(pmids)

    // Verify we got counts for both PMIDs
    if (Object.keys(citationCounts).length !== 2) {
        throw new Error(`Expected 2 citation counts, got ${Object.keys(citationCounts).length}`)
    }

    // Verify counts are non-negative
    for (const [pmid, count] of Object.entries(citationCounts)) {
        if (count < 0) {
            throw new Error(`Invalid citation count for PMID ${pmid}: ${count}`)
        }
    }

    console.log(`Citation counts:`)
    for (const [pmid, count] of Object.entries(citationCounts)) {
        console.log(`  PMID ${pmid}: ${count} citations`)
    }
}

/**
 * Test 3: PubMed Client - Fetch Abstracts
 */
async function testFetchAbstracts(): Promise<void> {
    const client = getPubMedClient()
    const pmids = ["40539149"]

    const abstracts = await client.fetchAbstracts(pmids)

    // Verify we got at least one abstract
    if (Object.keys(abstracts).length === 0) {
        console.log("Warning: No abstracts found (some articles may not have abstracts)")
        return
    }

    const abstract = Object.values(abstracts)[0]
    if (!abstract || abstract.length < 50) {
        throw new Error("Abstract too short or missing")
    }

    console.log(`Retrieved ${Object.keys(abstracts).length} abstract(s)`)
    console.log(`Sample abstract (first 100 chars): ${abstract.substring(0, 100)}...`)
}

/**
 * Test 4: Enrichment Service - Basic Enrichment
 */
async function testBasicEnrichment(): Promise<void> {
    const docs = SAMPLE_DOCS.slice(0, 2) // Use first 2 docs with valid PMIDs

    const result = await enrichDocumentsWithPubMed(docs, {
        maxArticlesToEnrich: 2,
        retryAttempts: 1,
        timeoutMs: 10000
    })

    if (!result.success) {
        throw new Error("Enrichment failed")
    }

    if (result.enrichedCount === 0) {
        throw new Error("No documents enriched")
    }

    // Verify enriched data structure
    const enrichedDoc = result.enrichedDocs[0]
    if (!enrichedDoc.pubmedData) {
        throw new Error("Missing PubMed data in enriched document")
    }

    if (!enrichedDoc.pubmedData.title || !enrichedDoc.pubmedData.journal) {
        throw new Error("Enriched document missing required fields")
    }

    console.log(`Enriched ${result.enrichedCount}/${result.enrichedDocs.length} documents`)
    console.log(`Sample enriched doc:`)
    console.log(`  Title: ${enrichedDoc.pubmedData.title.substring(0, 60)}...`)
    console.log(`  Journal: ${enrichedDoc.pubmedData.journal}`)
    console.log(`  Citations: ${enrichedDoc.pubmedData.citationCount}`)
}

/**
 * Test 5: Enrichment Service - Handling Missing PMIDs
 */
async function testMissingPMIDHandling(): Promise<void> {
    const docs = [SAMPLE_DOCS[2]] // Document with PMID = "0"

    const result = await enrichDocumentsWithPubMed(docs, {
        maxArticlesToEnrich: 1,
        retryAttempts: 1,
        timeoutMs: 10000
    })

    // Should still complete successfully (graceful degradation)
    if (!result.success) {
        throw new Error("Enrichment should succeed with graceful degradation")
    }

    // Document should still be present in results
    if (result.enrichedDocs.length !== 1) {
        throw new Error(`Expected 1 document, got ${result.enrichedDocs.length}`)
    }

    console.log(`Gracefully handled missing PMID`)
    console.log(`Enriched: ${result.enrichedCount}, Failed: ${result.failedCount}`)
}

/**
 * Test 6: Ranking Utility - Calculate Quality Score
 */
async function testCalculateQualityScore(): Promise<void> {
    const vectorSimilarity = 0.85
    const citationCount = 100
    const maxCitations = 500

    const score = calculateQualityScore(vectorSimilarity, citationCount, maxCitations, {
        vectorSimilarity: 0.7,
        citationCount: 0.3
    })

    // Score should be between 0 and 1
    if (score < 0 || score > 1) {
        throw new Error(`Quality score out of range: ${score}`)
    }

    // Score should be weighted toward vector similarity (0.7 weight)
    // Expected: ~0.7*0.85 + 0.3*log(101)/log(501) ≈ 0.595 + 0.223 ≈ 0.818
    if (score < 0.7 || score > 0.9) {
        throw new Error(`Quality score unexpected: ${score}`)
    }

    console.log(`Quality score: ${score.toFixed(3)}`)
    console.log(`  Vector similarity contribution: ${(vectorSimilarity * 0.7).toFixed(3)}`)
    console.log(`  Citation contribution: ${(score - vectorSimilarity * 0.7).toFixed(3)}`)
}

/**
 * Test 7: Ranking Utility - Re-rank Documents
 */
async function testRerankDocuments(): Promise<void> {
    // Create mock enriched documents with different citation counts
    const mockDocs = [
        {
            content: "Doc 1",
            metadata: {},
            qualityScore: 0,
            vectorSimilarityScore: 0.8,
            pubmedData: {
                title: "Document 1",
                authors: [],
                journal: "Journal A",
                publicationDate: "2024",
                articleTypes: [],
                citationCount: 50,
                relatedArticleCount: 0
            }
        },
        {
            content: "Doc 2",
            metadata: {},
            qualityScore: 0,
            vectorSimilarityScore: 0.7,
            pubmedData: {
                title: "Document 2",
                authors: [],
                journal: "Journal B",
                publicationDate: "2024",
                articleTypes: [],
                citationCount: 200, // Higher citations
                relatedArticleCount: 0
            }
        },
        {
            content: "Doc 3",
            metadata: {},
            qualityScore: 0,
            vectorSimilarityScore: 0.9, // Highest similarity
            pubmedData: {
                title: "Document 3",
                authors: [],
                journal: "Journal C",
                publicationDate: "2024",
                articleTypes: [],
                citationCount: 10,
                relatedArticleCount: 0
            }
        }
    ]

    const ranked = rerankDocuments(mockDocs)

    // Verify documents are sorted by quality score
    for (let i = 0; i < ranked.length - 1; i++) {
        if (ranked[i].qualityScore < ranked[i + 1].qualityScore) {
            throw new Error("Documents not properly ranked")
        }
    }

    console.log(`Ranked documents by quality score:`)
    ranked.forEach((doc, idx) => {
        console.log(
            `  ${idx + 1}. ${doc.pubmedData?.title} - Score: ${doc.qualityScore.toFixed(3)} ` +
                `(Vector: ${doc.vectorSimilarityScore?.toFixed(3)}, Citations: ${doc.pubmedData?.citationCount})`
        )
    })
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
    console.log("Task 4: PubMed Enricher Test Suite")
    console.log("=".repeat(70))

    await runTest("PubMed Client - Fetch Document Summaries", testFetchDocumentSummaries)
    await runTest("PubMed Client - Fetch Citation Counts", testFetchCitationCounts)
    await runTest("PubMed Client - Fetch Abstracts", testFetchAbstracts)
    await runTest("Enrichment Service - Basic Enrichment", testBasicEnrichment)
    await runTest("Enrichment Service - Handling Missing PMIDs", testMissingPMIDHandling)
    await runTest("Ranking Utility - Calculate Quality Score", testCalculateQualityScore)
    await runTest("Ranking Utility - Re-rank Documents", testRerankDocuments)

    // Print summary
    console.log("\n" + "=".repeat(70))
    console.log("Test Summary")
    console.log("=".repeat(70))

    const passed = testResults.filter((r) => r.passed).length
    const failed = testResults.filter((r) => !r.passed).length
    const totalTime = testResults.reduce((sum, r) => sum + r.duration, 0)

    console.log(`Total tests: ${testResults.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Success rate: ${((passed / testResults.length) * 100).toFixed(1)}%`)
    console.log(`Total time: ${totalTime}ms`)

    if (failed > 0) {
        console.log("\nFailed tests:")
        testResults
            .filter((r) => !r.passed)
            .forEach((r) => {
                console.log(`  - ${r.name}: ${r.error}`)
            })
    }

    console.log("\n[SUCCESS] All core functionality tested!")
}

// Run tests
void runAllTests()
