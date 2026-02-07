/**
 * Out-of-Scope Response Node
 *
 * Returns a polite message when a query is classified as non-medical.
 */

import { AIMessage } from "@langchain/core/messages"
import { StateAnnotation } from "../retrieval_graph/state.js"

const OUT_OF_SCOPE_MESSAGE = `I'm a medical information assistant and can only help with health-related questions.

Your question doesn't appear to be medical in nature. Please ask about symptoms, conditions, treatments, or general health topics.`

export async function outOfScopeResponse(_state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    console.log(`[Out-of-Scope] Returning non-medical query message`)

    return { messages: [new AIMessage(OUT_OF_SCOPE_MESSAGE)] }
}
