/**
 * Vector Search Node
 *
 * Queries the Pinecone vector store using Google Vertex AI embeddings
 * to retrieve relevant medical documents for the user's query.
 */

import { StateAnnotation } from "../retrieval_graph/state.js"
import { VertexAIEmbeddings } from "@langchain/google-vertexai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"
import { getMessageText } from "../utils/getMessageText.js"

// Module-level clients - initialized once and reused across invocations
const embeddingModel = new VertexAIEmbeddings({ model: "text-embedding-005" })
const pinecone = new Pinecone()

export async function vectorSearch(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const query = state.optimizedQuery ?? getMessageText(state.messages[state.messages.length - 1])

    console.log(`[Vector Search] Searching with query: "${query}"`)

    const indexName = process.env.PINECONE_INDEX_NAME
    if (!indexName) {
        throw new Error("PINECONE_INDEX_NAME environment variable is not set")
    }

    const pineconeIndex = pinecone.Index(indexName)
    const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, { pineconeIndex })
    const retriever = vectorStore.asRetriever({ k: 10 })
    const results = await retriever.invoke(query)

    console.log(`[Vector Search] Retrieved ${results.length} documents`)

    return { retrievedDocs: results }
}
