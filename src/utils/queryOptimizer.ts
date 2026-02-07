/**
 * Query Optimizer for Vector Search
 *
 * Uses GPT-4o-mini to convert natural language medical queries into
 * optimized search queries. Handles noise removal, medical entity
 * extraction, abbreviation expansion, and synonym addition.
 */

import { getOptimizationClient } from "../clients/openai.js"

const OPTIMIZATION_PROMPT = `You are a medical query optimizer for vector database search.

Your task: Convert the user's natural language query into an optimized search query that will retrieve the most relevant medical documents.

Rules:
1. Extract and PRESERVE key symptom descriptors (tired, dizzy, pain) - keep both common AND medical terms
2. Add medical synonyms (e.g., "tired" → "tired fatigue") but don't replace the original word
3. Expand colloquial terms (e.g., "sugar problems" → "diabetes hyperglycemia")
4. Add relevant medical abbreviations (e.g., "hypertension" → "hypertension HTN")
5. Remove ALL conversational noise: articles (a, an, the), pronouns (I, my, mom), helper verbs (has been, have)
6. Remove politeness phrases: "I want to know", "Can you tell me", "Please help"
7. Keep output concise: only medical keywords and symptom descriptors
8. Output ONLY the optimized keywords - no quotes, no extra punctuation

Examples:
Input: "I want to know what are the symptoms of type 2 diabetes"
Output: type 2 diabetes symptoms T2D hyperglycemia polyuria polydipsia

Input: "My mom has been experiencing chest pain when she exercises"
Output: chest pain exercise-induced angina cardiovascular symptoms exertion

Input: "My mom has been feeling dizzy and tired lately"
Output: dizzy tired dizziness fatigue vertigo symptoms causes

Input: "I have a headache, fever, and sore throat"
Output: headache fever sore throat symptoms viral infection pharyngitis

Input: "high blood pressure medication side effects"
Output: hypertension HTN antihypertensive medication side effects adverse reactions

User query: "{query}"

Optimized search query:`

export interface OptimizationResult {
    originalQuery: string
    optimizedQuery: string
    method: "llm"
    processingTime: number
    success: boolean
    error?: string
}

/**
 * Optimize a medical query for vector search using LLM.
 *
 * Falls back to the original query if optimization fails.
 */
export async function optimizeQuery(query: string): Promise<OptimizationResult> {
    const startTime = Date.now()

    try {
        const llm = getOptimizationClient()
        const prompt = OPTIMIZATION_PROMPT.replace("{query}", query)
        const response = await llm.invoke(prompt)
        const optimizedQuery = response.content.toString().trim()

        if (!optimizedQuery) {
            throw new Error("LLM returned empty response")
        }

        return {
            originalQuery: query,
            optimizedQuery,
            method: "llm",
            processingTime: Date.now() - startTime,
            success: true
        }
    } catch (error) {
        console.error("[Query Optimizer] Optimization failed, using original query:", error)

        return {
            originalQuery: query,
            optimizedQuery: query,
            method: "llm",
            processingTime: Date.now() - startTime,
            success: false,
            error: error && typeof error === "object" && "message" in error ? String(error.message) : "Unknown error"
        }
    }
}
