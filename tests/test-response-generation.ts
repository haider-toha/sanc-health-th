/**
 * Test Suite for Response Generation
 *
 * Tests the LLM-based medical response generation system.
 */

import "dotenv/config"
import { generateMedicalResponse, formatCompleteResponse } from "../src/services/responseGeneration.js"
import { formatCitations, buildDocumentContext, calculateResponseMetadata } from "../src/utils/formatters.js"
import type { EnrichedDocument } from "../src/types/pubmed.js"

/**
 * Create mock enriched document for testing
 */
function createMockDocument(overrides?: Partial<EnrichedDocument>): EnrichedDocument {
    return {
        content: "Type 2 diabetes mellitus is characterized by insulin resistance and relative insulin deficiency...",
        metadata: {
            pmid: "12345678",
            title: "Understanding Type 2 Diabetes",
            author: "Smith J, Johnson K"
        },
        pubmedData: {
            title: "Understanding Type 2 Diabetes: A Comprehensive Review",
            authors: ["Smith J", "Johnson K"],
            journal: "Journal of Clinical Medicine",
            publicationDate: "2023-05-15",
            abstract:
                "Type 2 diabetes is a chronic metabolic disorder affecting millions worldwide. This review examines current understanding of pathophysiology, risk factors, and management strategies.",
            articleTypes: ["Journal Article", "Review"],
            citationCount: 45,
            relatedArticleCount: 120,
            doi: "10.1234/jcm.2023.12345"
        },
        qualityScore: 0.85,
        vectorSimilarityScore: 0.89,
        citationScore: 0.75,
        ...overrides
    }
}

/**
 * Test 1: Format Citations
 */
async function testFormatCitations() {
    console.log("\n=== Test 1: Format Citations ===")

    const docs = [
        createMockDocument(),
        createMockDocument({
            pubmedData: {
                title: "Hypertension Management Guidelines",
                authors: ["Brown A"],
                journal: "Cardiology Today",
                publicationDate: "2024-01-10",
                articleTypes: ["Guideline"],
                citationCount: 89,
                relatedArticleCount: 200
            }
        })
    ]

    const citations = formatCitations(docs)

    console.log("Generated citations:")
    citations.forEach((citation) => {
        console.log(`  [${citation.index}] ${citation.title} - ${citation.journal} (${citation.year})`)
        console.log(`      Citations: ${citation.citationCount}`)
    })

    if (citations.length === 2 && citations[0].index === 1 && citations[1].index === 2) {
        console.log("[PASS] Citation formatting works correctly")
        return true
    } else {
        console.log("[FAIL] Citation formatting incorrect")
        return false
    }
}

/**
 * Test 2: Build Document Context
 */
async function testBuildDocumentContext() {
    console.log("\n=== Test 2: Build Document Context ===")

    const docs = [createMockDocument()]
    const context = buildDocumentContext(docs)

    console.log("Context length:", context.length, "characters")
    console.log("Context preview:", context.substring(0, 200) + "...")

    const hasTitle = context.includes("Understanding Type 2 Diabetes")
    const hasAbstract = context.includes("chronic metabolic disorder")
    const hasJournal = context.includes("Journal of Clinical Medicine")

    if (hasTitle && hasAbstract && hasJournal) {
        console.log("[PASS] Document context includes all key information")
        return true
    } else {
        console.log("[FAIL] Document context missing information")
        return false
    }
}

/**
 * Test 3: Calculate Response Metadata
 */
async function testCalculateMetadata() {
    console.log("\n=== Test 3: Calculate Response Metadata ===")

    const docs = [
        createMockDocument({ pubmedData: { ...createMockDocument().pubmedData!, citationCount: 45 } }),
        createMockDocument({ pubmedData: { ...createMockDocument().pubmedData!, citationCount: 89 } }),
        createMockDocument({ pubmedData: { ...createMockDocument().pubmedData!, citationCount: 30 } })
    ]

    const metadata = calculateResponseMetadata(docs)

    console.log("Documents used:", metadata.documentsUsed)
    console.log("Total citations:", metadata.totalCitationCount)
    console.log("Average citations:", metadata.averageCitationCount)

    const expectedTotal = 45 + 89 + 30
    const expectedAvg = Math.round(expectedTotal / 3)

    if (metadata.documentsUsed === 3 && metadata.totalCitationCount === expectedTotal && metadata.averageCitationCount === expectedAvg) {
        console.log("[PASS] Metadata calculation correct")
        return true
    } else {
        console.log("[FAIL] Metadata calculation incorrect")
        return false
    }
}

/**
 * Test 4: Generate Medical Response (LIVE LLM TEST)
 */
async function testGenerateMedicalResponse() {
    console.log("\n=== Test 4: Generate Medical Response (LIVE LLM) ===")
    console.log("  This test calls OpenAI API (costs ~$0.005)")

    const docs = [
        createMockDocument(),
        createMockDocument({
            pubmedData: {
                title: "Dietary Management in Type 2 Diabetes",
                authors: ["Lee M", "Park S"],
                journal: "Nutrition Reviews",
                publicationDate: "2023-08-20",
                abstract: "Dietary interventions play a crucial role in managing type 2 diabetes. This study reviews evidence-based nutritional strategies.",
                articleTypes: ["Journal Article", "Review"],
                citationCount: 67,
                relatedArticleCount: 150
            }
        })
    ]

    const result = await generateMedicalResponse({
        userQuery: "What are the symptoms of type 2 diabetes?",
        documents: docs,
        maxDocuments: 5
    })

    if (result.success && result.response) {
        const response = result.response
        console.log("\n--- Generated Response ---")
        console.log(formatCompleteResponse(response))
        console.log("\n--- Metadata ---")
        console.log("Documents used:", response.metadata.documentsUsed)
        console.log("Average citations:", response.metadata.averageCitationCount)

        const hasCitations = response.answer.includes("[1]") || response.answer.includes("[2]")
        const hasSources = response.sources.length > 0
        const isReasonableLength = response.answer.length > 100

        if (hasCitations && hasSources && isReasonableLength) {
            console.log("\n[PASS] Medical response generated successfully")
            return true
        } else {
            console.log("\n[FAIL] Medical response missing expected elements")
            return false
        }
    } else {
        console.log("\n[FAIL] Response generation failed:", result.error)
        return false
    }
}

/**
 * Test 5: Error Handling (Empty Documents)
 */
async function testErrorHandlingEmptyDocs() {
    console.log("\n=== Test 5: Error Handling - Empty Documents ===")

    const result = await generateMedicalResponse({
        userQuery: "What is diabetes?",
        documents: [],
        maxDocuments: 5
    })

    if (!result.success && result.error?.includes("No documents")) {
        console.log("[PASS] Correctly handles empty document list")
        return true
    } else {
        console.log("[FAIL] Did not handle empty documents correctly")
        return false
    }
}

/**
 * Test 6: Response Format Validation
 */
async function testResponseFormat() {
    console.log("\n=== Test 6: Response Format Validation ===")
    console.log("  This test calls OpenAI API")

    const docs = [createMockDocument()]

    const result = await generateMedicalResponse({
        userQuery: "How is type 2 diabetes treated?",
        documents: docs,
        maxDocuments: 5
    })

    if (result.success && result.response) {
        const fullResponse = formatCompleteResponse(result.response)

        const hasSources = fullResponse.includes("SOURCES:")
        const hasDisclaimer = fullResponse.includes("MEDICAL DISCLAIMER:")
        const hasEducationalPurpose = fullResponse.includes("educational purposes")

        if (hasSources && hasDisclaimer && hasEducationalPurpose) {
            console.log("[PASS] Response format is correct")
            return true
        } else {
            console.log("[FAIL] Response format missing required sections")
            console.log("  Has SOURCES:", hasSources)
            console.log("  Has DISCLAIMER:", hasDisclaimer)
            console.log("  Has educational message:", hasEducationalPurpose)
            return false
        }
    } else {
        console.log("[FAIL] Could not generate response for format validation")
        return false
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log("=".repeat(60))
    console.log("RESPONSE GENERATION TEST SUITE")
    console.log("=".repeat(60))

    const tests = [
        { name: "Format Citations", fn: testFormatCitations },
        { name: "Build Document Context", fn: testBuildDocumentContext },
        { name: "Calculate Metadata", fn: testCalculateMetadata },
        { name: "Generate Medical Response", fn: testGenerateMedicalResponse },
        { name: "Error Handling - Empty Docs", fn: testErrorHandlingEmptyDocs },
        { name: "Response Format Validation", fn: testResponseFormat }
    ]

    const results: boolean[] = []

    for (const test of tests) {
        try {
            const passed = await test.fn()
            results.push(passed)
        } catch (error) {
            console.log(`\n[FAIL] ${test.name} threw error:`, error)
            results.push(false)
        }
    }

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("TEST SUMMARY")
    console.log("=".repeat(60))

    const passed = results.filter((r) => r).length
    const total = results.length

    results.forEach((result, index) => {
        const status = result ? "[PASS]" : "[FAIL]"
        console.log(`${status}: ${tests[index].name}`)
    })

    console.log("\n" + "=".repeat(60))
    console.log(`TOTAL: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`)
    console.log("=".repeat(60))

    if (passed === total) {
        console.log("\nAll tests passed!")
    } else {
        console.log(`\n${total - passed} test(s) failed`)
    }
}

// Run tests
runAllTests().catch(console.error)
