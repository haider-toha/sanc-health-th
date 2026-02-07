/**
 * LLM-based classification for ambiguous medical queries.
 *
 * Uses GPT-4o-mini for fast, cost-effective classification when keyword
 * matching is insufficient.
 */

import { getClassificationClient } from "../clients/openai.js"

const CLASSIFICATION_PROMPT = `You are a medical query classifier. Determine if the following question is medical/health-related.

Medical/health-related includes:
- Symptoms, conditions, diseases
- Treatments, medications, therapies
- General health and wellness
- Mental health concerns
- Preventive care and health-related lifestyle questions

NOT medical includes:
- Weather, sports, entertainment
- Cooking (unless specifically about medical diets)
- Technology, travel, general knowledge
- Veterinary questions (about pets/animals)

Respond with ONLY "yes" or "no".

Question: "{query}"

Answer:`

export interface ClassificationResult {
    isMedical: boolean
    confidence: "high" | "medium"
    method: "llm"
}

/**
 * Classify a query as medical or non-medical using GPT-4o-mini.
 */
export async function classifyWithLLM(query: string): Promise<ClassificationResult> {
    const llm = getClassificationClient()
    const prompt = CLASSIFICATION_PROMPT.replace("{query}", query)
    const response = await llm.invoke(prompt)
    const answer = response.content.toString().toLowerCase().trim()

    const isMedical = answer.includes("yes")
    const confidence: "high" | "medium" = answer.match(/^(yes|no)$/) ? "high" : "medium"

    console.log(`[Scope Classifier] LLM result: ${isMedical ? "MEDICAL" : "NOT MEDICAL"} (confidence: ${confidence})`)

    return { isMedical, confidence, method: "llm" }
}
