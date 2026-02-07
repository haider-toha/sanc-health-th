/**
 * Task 1: Validate Pinecone & Google Vertex AI Integration
 *
 * This script tests:
 * 1. Google Vertex AI embeddings generation
 * 2. Pinecone connection and query
 * 3. Data retrieval from the pubmed-articles index
 */

import "dotenv/config"
import { VertexAIEmbeddings } from "@langchain/google-vertexai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"

async function validateIntegration() {
    console.log("Task 1: Validating Pinecone & Vertex AI Integration\n")
    console.log("=".repeat(60))

    try {
        // Test 1: Google Vertex AI Embeddings
        console.log("\nTest 1: Google Vertex AI Embeddings")
        console.log("-".repeat(60))

        const embeddingModel = new VertexAIEmbeddings({
            model: "text-embedding-005"
        })
        console.log("[PASS] Embedding model initialized: text-embedding-005")

        // Generate a test embedding
        const testQuery = "What are the symptoms of Type 2 diabetes?"
        console.log(`\nTest query: "${testQuery}"`)

        const embedding = await embeddingModel.embedQuery(testQuery)
        console.log(`[PASS] Generated embedding vector (dimension: ${embedding.length})`)
        console.log(
            `       First 5 values: [${embedding
                .slice(0, 5)
                .map((v) => v.toFixed(4))
                .join(", ")}...]`
        )

        // Test 2: Pinecone Connection
        console.log("\nTest 2: Pinecone Connection")
        console.log("-".repeat(60))

        const indexName = process.env.PINECONE_INDEX_NAME
        if (!indexName) {
            throw new Error("[FAIL] PINECONE_INDEX_NAME not found in environment")
        }
        console.log(`[PASS] Index name: ${indexName}`)

        const pinecone = new Pinecone()
        console.log("[PASS] Pinecone client initialized")

        const pineconeIndex = pinecone.Index(indexName)
        console.log("[PASS] Connected to index")

        // Get index stats
        const stats = await pineconeIndex.describeIndexStats()
        console.log(`[PASS] Index stats:`)
        console.log(`       - Total vectors: ${stats.totalRecordCount}`)
        console.log(`       - Dimension: ${stats.dimension}`)
        console.log(`       - Namespaces: ${Object.keys(stats.namespaces || {}).length || "default"}`)

        // Test 3: Vector Search
        console.log("\nTest 3: Vector Search & Retrieval")
        console.log("-".repeat(60))

        const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, {
            pineconeIndex
        })
        console.log("[PASS] Vector store created")

        const retriever = vectorStore.asRetriever({ k: 5 })
        console.log("[PASS] Retriever configured (k=5 for testing)")

        console.log(`\nSearching for: "${testQuery}"`)
        const results = await retriever.invoke(testQuery)

        console.log(`\n[PASS] Retrieved ${results.length} documents`)

        // Display results
        results.forEach((doc, idx) => {
            console.log(`\n--- Document ${idx + 1} ---`)
            console.log(`Content preview: ${doc.pageContent.substring(0, 150)}...`)
            console.log(`Metadata:`, JSON.stringify(doc.metadata, null, 2))
        })

        // Test 4: Try another medical query
        console.log("\nTest 4: Testing with Different Medical Query")
        console.log("-".repeat(60))

        const testQuery2 = "hypertension treatment"
        console.log(`Searching for: "${testQuery2}"`)

        const results2 = await retriever.invoke(testQuery2)
        console.log(`[PASS] Retrieved ${results2.length} documents`)

        if (results2.length > 0) {
            console.log(`\nSample result:`)
            console.log(`Content: ${results2[0].pageContent.substring(0, 200)}...`)
        }

        // Summary
        console.log("\n" + "=".repeat(60))
        console.log("ALL TESTS PASSED!")
        console.log("=".repeat(60))
        console.log("\nSummary:")
        console.log("  - Google Vertex AI embeddings: Working")
        console.log("  - Pinecone connection: Working")
        console.log("  - Vector search: Working")
        console.log("  - Data retrieval: Working")
        console.log(`  - Total vectors in index: ${stats.totalRecordCount}`)
        console.log("\n[SUCCESS] System is ready for implementation tasks!")
    } catch (error) {
        console.error("\n[FAIL] VALIDATION FAILED!")
        console.error("=".repeat(60))
        const isError = error && typeof error === "object" && "message" in error
        if (isError) {
            console.error(`Error: ${(error as Error).message}`)
            console.error(`\nStack trace:`)
            console.error((error as Error).stack)
        } else {
            console.error(error)
        }
        process.exit(1)
    }
}

// Run validation
void validateIntegration()
