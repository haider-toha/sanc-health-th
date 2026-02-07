import { END, START, StateGraph } from "@langchain/langgraph"
import { StateAnnotation, InputStateAnnotation } from "./state.js"
import { respond } from "../nodes/respond.js"
import { vectorSearch } from "../nodes/vectorSearch.js"
import { noResultsResponse } from "../nodes/noResultsResponse.js"
import { scopeClassifier } from "../nodes/scopeClassifier.js"
import { outOfScopeResponse } from "../nodes/outOfScopeResponse.js"
import { queryParser } from "../nodes/queryParser.js"
import { pubmedEnricher } from "../nodes/pubmedEnricher.js"

const builder = new StateGraph({
    stateSchema: StateAnnotation,
    input: InputStateAnnotation
})
    .addNode("scopeClassifier", scopeClassifier)
    .addNode("outOfScopeResponse", outOfScopeResponse)
    .addNode("queryParser", queryParser)
    .addNode("vectorSearch", vectorSearch)
    .addNode("pubmedEnricher", pubmedEnricher)
    .addNode("respond", respond)
    .addNode("noResultsResponse", noResultsResponse)

    // Start with scope classification
    .addEdge(START, "scopeClassifier")

    // Route based on classification result stored in state (no re-classification)
    .addConditionalEdges("scopeClassifier", (state) => (state.isMedical ? "medical" : "out-of-scope"), {
        medical: "queryParser",
        "out-of-scope": "outOfScopeResponse"
    })

    .addEdge("queryParser", "vectorSearch")

    // Route after vector search: enrich if results found, otherwise show no-results message
    .addConditionalEdges("vectorSearch", (state) => (state.retrievedDocs.length > 0 ? "hasResults" : "noResults"), {
        hasResults: "pubmedEnricher",
        noResults: "noResultsResponse"
    })

    .addEdge("pubmedEnricher", "respond")

    // Terminal nodes
    .addEdge("outOfScopeResponse", END)
    .addEdge("noResultsResponse", END)
    .addEdge("respond", END)

export const graph = builder.compile()

graph.name = "Medical Chatbot with PubMed Enrichment"
