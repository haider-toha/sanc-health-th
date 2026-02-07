/**
 * Scope Classifier Node
 *
 * Determines if a user query is medical/health-related using a hybrid approach:
 * 1. Fast keyword matching for obvious cases
 * 2. LLM classification for ambiguous cases
 *
 * This ensures both speed and accuracy while keeping costs low.
 */

import { StateAnnotation } from "../retrieval_graph/state.js"
import { getMessageText } from "../utils/getMessageText.js"
import { MEDICAL_KEYWORDS, NON_MEDICAL_KEYWORDS } from "../config/scopeKeywords.js"
import { classifyWithLLM } from "../utils/llmClassifier.js"

/**
 * Checks if query contains any medical keywords
 */
function containsMedicalKeyword(query: string): string | null {
    const lowerQuery = query.toLowerCase()

    for (const keyword of MEDICAL_KEYWORDS) {
        if (lowerQuery.includes(keyword)) {
            return keyword
        }
    }

    return null
}

/**
 * Checks if query contains any non-medical keywords
 */
function containsNonMedicalKeyword(query: string): string | null {
    const lowerQuery = query.toLowerCase()

    for (const keyword of NON_MEDICAL_KEYWORDS) {
        if (lowerQuery.includes(keyword)) {
            return keyword
        }
    }

    return null
}

/**
 * Classifies query scope using a hybrid keyword + LLM approach.
 *
 * Fast path: keyword matching for obvious medical/non-medical queries.
 * Slow path: LLM classification for ambiguous queries.
 */
async function classifyQuery(query: string): Promise<boolean> {
    // Fast path: check for medical keywords
    const medicalKeyword = containsMedicalKeyword(query)
    if (medicalKeyword) {
        console.log(`[Scope Classifier] MEDICAL - Keyword match: "${medicalKeyword}"`)
        return true
    }

    // Fast path: check for non-medical keywords
    const nonMedicalKeyword = containsNonMedicalKeyword(query)
    if (nonMedicalKeyword) {
        console.log(`[Scope Classifier] NOT MEDICAL - Keyword match: "${nonMedicalKeyword}"`)
        return false
    }

    // Slow path: LLM classification for ambiguous queries
    console.log(`[Scope Classifier] Ambiguous query, using LLM classification`)
    const llmResult = await classifyWithLLM(query)
    return llmResult.isMedical
}

/**
 * Scope Classifier Node
 *
 * Classifies the query once and stores the result in state for routing.
 */
export async function scopeClassifier(state: typeof StateAnnotation.State): Promise<typeof StateAnnotation.Update> {
    const query = getMessageText(state.messages[state.messages.length - 1])

    console.log(`\n[Scope Classifier] Classifying query: "${query}"`)

    const isMedical = await classifyQuery(query)

    return {
        messages: [],
        isMedical
    }
}
