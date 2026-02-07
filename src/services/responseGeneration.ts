/**
 * Response Generation Service
 *
 * Generates natural language medical responses using GPT-4o.
 * Synthesizes information from enriched PubMed documents into
 * accessible, well-cited medical answers.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getResponseGenerationClient } from "../clients/openai.js"
import type { MedicalResponse, ResponseGenerationResult, ResponseContext } from "../types/response.js"
import { formatCitations, formatMedicalResponse, buildDocumentContext, calculateResponseMetadata, cleanResponseText } from "../utils/formatters.js"

const MAX_RETRIES = 1

/**
 * System prompt for the medical Q&A model.
 *
 * Emphasizes evidence-based responses, proper citation usage, accessible
 * language, and the boundary between information and medical advice.
 */
const MEDICAL_QA_SYSTEM_PROMPT = `You are a knowledgeable medical information assistant. Your role is to provide accurate, accessible medical information based on scientific literature.

**Guidelines:**
1. **Answer Style:** Write in a professional yet accessible tone. Explain medical concepts clearly for a general audience.
2. **Citations:** Use numbered citations [1], [2], [3] throughout your answer when referencing specific information from the provided documents.
3. **Structure:** Provide a concise answer in 2-4 paragraphs. Focus on directly answering the user's question.
4. **Accuracy:** Only include information supported by the provided documents. Do not add unsupported claims.
5. **Accessibility:** Use clear language. Explain medical terms when first introduced (e.g., "hypertension (high blood pressure)").
6. **Comprehensiveness:** Cover key aspects relevant to the question: symptoms, causes, treatments, risk factors as appropriate.
7. **Evidence Quality:** When available, note the type of evidence (e.g., systematic review, clinical trial, case study) to help readers gauge reliability.

**Citation Format:**
- Cite sources inline: "Type 2 diabetes is characterized by insulin resistance [1] and reduced insulin production [2]."
- Multiple citations are fine: "This approach has shown effectiveness [1][2][3]."

**What NOT to do:**
- Do not provide medical advice or diagnoses
- Do not recommend specific treatments without source support
- Do not use overly technical jargon without explanation
- Do not add information beyond what's in the documents
- Do not create a "Sources" or "References" section (this is added automatically)

Generate a focused, well-cited response based on the documents provided.`

/**
 * Generate a medical response from enriched documents using GPT-4o.
 */
export async function generateMedicalResponse(context: ResponseContext, retryCount = 0): Promise<ResponseGenerationResult> {
    const documentsToUse = context.documents.slice(0, context.maxDocuments)

    if (documentsToUse.length === 0) {
        return { success: false, error: "No documents available to generate response", retryCount }
    }

    try {
        const documentContext = buildDocumentContext(documentsToUse)
        const userPrompt = buildUserPrompt(context.userQuery, documentContext)
        const llm = getResponseGenerationClient()

        console.log(`[Response Generation] Generating response with ${documentsToUse.length} documents`)

        const response = await llm.invoke([new SystemMessage(MEDICAL_QA_SYSTEM_PROMPT), new HumanMessage(userPrompt)])

        const cleanedAnswer = cleanResponseText(response.content.toString())
        const citations = formatCitations(documentsToUse)
        const metadata = calculateResponseMetadata(documentsToUse)

        const medicalResponse: MedicalResponse = {
            answer: cleanedAnswer,
            sources: citations,
            disclaimer: "",
            metadata
        }

        console.log(`[Response Generation] Success (${metadata.documentsUsed} docs, avg citations: ${metadata.averageCitationCount})`)

        return { success: true, response: medicalResponse, retryCount }
    } catch (error) {
        const errorMessage = error && typeof error === "object" && "message" in error ? String(error.message) : String(error)
        console.error(`[Response Generation] Error: ${errorMessage}`)

        if (retryCount < MAX_RETRIES) {
            console.log(`[Response Generation] Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
            await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)))
            return generateMedicalResponse(context, retryCount + 1)
        }

        return { success: false, error: errorMessage, retryCount }
    }
}

function buildUserPrompt(userQuery: string, documentContext: string): string {
    return `**User Question:**
${userQuery}

**Available Scientific Literature:**
${documentContext}

**Instructions:**
Based on the scientific literature provided above, generate a clear, well-cited answer to the user's question. Use numbered citations [1], [2], etc. when referencing specific documents.`
}

/**
 * Format the complete response with sources and disclaimer.
 */
export function formatCompleteResponse(response: MedicalResponse): string {
    return formatMedicalResponse(response.answer, response.sources)
}
