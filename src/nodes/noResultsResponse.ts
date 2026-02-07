/**
 * No Results Response Node
 *
 * Returns a helpful message when vector search finds no relevant documents.
 */

import { AIMessage } from "@langchain/core/messages"
import { StateAnnotation } from "../retrieval_graph/state.js"

const NO_RESULTS_RESPONSE = `I wasn't able to find any relevant information to answer your question. This could be because:

- The topic may not be covered in the available medical literature
- The question may need to be rephrased for better search results
- The specific information you're looking for may not be available in our sources

Please try rephrasing your question or asking about a related topic.`

export async function noResultsResponse(_state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    console.log(`[No Results] Returning no-results message`)

    return { messages: [new AIMessage(NO_RESULTS_RESPONSE)] }
}
