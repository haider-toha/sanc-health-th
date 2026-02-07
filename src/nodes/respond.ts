/**
 * Respond Node
 *
 * Generates natural language medical responses using LLM based on enriched documents.
 * Produces accessible, well-cited medical information with sources and a disclaimer.
 */

import { AIMessage } from "@langchain/core/messages"
import { StateAnnotation } from "../retrieval_graph/state.js"
import { generateMedicalResponse, formatCompleteResponse } from "../services/responseGeneration.js"

export async function respond(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const userQuery = state.messages[state.messages.length - 1].content.toString()
    const enrichedDocs = state.enrichedDocs

    console.log(`[Respond] Generating response for ${enrichedDocs.length} enriched documents`)

    const result = await generateMedicalResponse({
        userQuery,
        documents: enrichedDocs,
        maxDocuments: 5
    })

    if (!result.success || !result.response) {
        throw new Error(`[Respond] LLM response generation failed: ${result.error}`)
    }

    const responseText = formatCompleteResponse(result.response)
    console.log(`[Respond] Successfully generated LLM response`)

    return {
        messages: [new AIMessage(responseText)]
    }
}
