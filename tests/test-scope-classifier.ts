/**
 * Task 2: Scope Classifier Test
 *
 * Tests the hybrid scope classification system with various queries.
 * Verifies keyword-based fast path and LLM-based classification for ambiguous queries.
 */

import "dotenv/config"
import { scopeClassifier } from "../src/nodes/scopeClassifier.js"
import { StateAnnotation } from "../src/retrieval_graph/state.js"
import { HumanMessage } from "@langchain/core/messages"

interface TestCase {
    query: string
    expectedMedical: boolean
    expectedMethod: "keyword" | "llm"
    description: string
}

const testCases: TestCase[] = [
    // Medical - Keyword matches
    {
        query: "What are the symptoms of diabetes?",
        expectedMedical: true,
        expectedMethod: "keyword",
        description: "Clear medical query with 'diabetes' and 'symptoms'"
    },
    {
        query: "I have a severe headache and fever",
        expectedMedical: true,
        expectedMethod: "keyword",
        description: "Symptoms query with 'headache' and 'fever'"
    },
    {
        query: "Can you recommend a medication for hypertension?",
        expectedMedical: true,
        expectedMethod: "keyword",
        description: "Treatment query with 'medication' and 'hypertension'"
    },

    // Non-medical - Keyword matches
    {
        query: "What's the weather like today?",
        expectedMedical: false,
        expectedMethod: "keyword",
        description: "Clear non-medical with 'weather'"
    },
    {
        query: "Can you recommend a good pizza restaurant?",
        expectedMedical: false,
        expectedMethod: "keyword",
        description: "Non-medical with 'pizza' and 'restaurant'"
    },
    {
        query: "What movies are playing this weekend?",
        expectedMedical: false,
        expectedMethod: "keyword",
        description: "Entertainment query with 'movies'"
    },

    // Ambiguous - LLM classification
    {
        query: "I've been feeling really tired lately",
        expectedMedical: true,
        expectedMethod: "llm",
        description: "Ambiguous symptom without obvious keywords"
    },
    {
        query: "What should I eat for dinner?",
        expectedMedical: false,
        expectedMethod: "llm",
        description: "Ambiguous food question (not medical diet)"
    },
    {
        query: "I can't sleep well at night",
        expectedMedical: true,
        expectedMethod: "llm",
        description: "Sleep issue - could be medical (insomnia)"
    }
]

async function runTests() {
    console.log("Task 2: Scope Classifier Test")
    console.log("=".repeat(60))
    console.log()

    let passed = 0
    let failed = 0

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i]
        console.log(`\nTest ${i + 1}/${testCases.length}: ${testCase.description}`)
        console.log(`Query: "${testCase.query}"`)
        console.log(`Expected: ${testCase.expectedMedical ? "MEDICAL" : "NOT MEDICAL"} (via ${testCase.expectedMethod})`)

        try {
            const state: typeof StateAnnotation.State = {
                messages: [new HumanMessage(testCase.query)],
                retrievedDocs: [],
                isMedical: undefined,
                optimizedQuery: undefined,
                enrichedDocs: []
            }

            // Run the scope classifier node - returns state update with isMedical
            const result = await scopeClassifier(state)
            const isMedical = result.isMedical as boolean

            const success = isMedical === testCase.expectedMedical

            if (success) {
                console.log(`[PASS] Result: ${isMedical ? "MEDICAL" : "NOT MEDICAL"}`)
                passed++
            } else {
                console.log(`[FAIL] Result: ${isMedical ? "MEDICAL" : "NOT MEDICAL"}`)
                console.log(`       Expected: ${testCase.expectedMedical ? "MEDICAL" : "NOT MEDICAL"}`)
                failed++
            }
        } catch (error) {
            console.log(`[ERROR] Test failed with exception:`, error)
            failed++
        }
    }

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("Test Summary")
    console.log("=".repeat(60))
    console.log(`Total tests: ${testCases.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%`)

    if (failed === 0) {
        console.log("\n[SUCCESS] All tests passed!")
        process.exit(0)
    } else {
        console.log("\n[FAILED] Some tests failed")
        process.exit(1)
    }
}

// Run tests
void runTests()
