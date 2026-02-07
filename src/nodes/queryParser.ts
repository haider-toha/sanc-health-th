/**
 * Query Parser Node
 *
 * Converts natural language medical queries into optimized search queries
 * for vector search. Removes conversational noise, expands abbreviations,
 * and adds medical synonyms.
 */

import { StateAnnotation } from "../retrieval_graph/state.js"
import { getMessageText } from "../utils/getMessageText.js"
import { optimizeQuery } from "../utils/queryOptimizer.js"

export async function queryParser(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const originalQuery = getMessageText(state.messages[state.messages.length - 1])

    console.log(`[Query Parser] Optimizing query: "${originalQuery}"`)

    const result = await optimizeQuery(originalQuery)

    if (result.success) {
        console.log(`[Query Parser] Optimized to: "${result.optimizedQuery}" (${result.processingTime}ms)`)
    } else {
        console.warn(`[Query Parser] Optimization failed, using original query`)
    }

    return {
        messages: [],
        optimizedQuery: result.optimizedQuery
    }
}
