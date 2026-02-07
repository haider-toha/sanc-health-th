/**
 * OpenAI Client
 *
 * Centralized factory for OpenAI LLM instances with pre-configured settings
 * for different use cases (classification, query optimization, response generation).
 */

import { ChatOpenAI } from "@langchain/openai"

export const OPENAI_MODELS = {
    GPT4O_MINI: "gpt-4o-mini",
    GPT4O: "gpt-4o"
} as const

interface OpenAIClientConfig {
    model?: string
    temperature?: number
    maxTokens?: number
    timeout?: number
}

function getOpenAIClient(config: OpenAIClientConfig): ChatOpenAI {
    return new ChatOpenAI({
        modelName: config.model || OPENAI_MODELS.GPT4O_MINI,
        temperature: config.temperature ?? 0,
        maxTokens: config.maxTokens ?? 100,
        timeout: config.timeout ?? 5000
    })
}

/** Optimized for yes/no classification (minimal tokens, deterministic). */
export function getClassificationClient(): ChatOpenAI {
    return getOpenAIClient({ model: OPENAI_MODELS.GPT4O_MINI, temperature: 0, maxTokens: 10 })
}

/** Optimized for query rewriting (slight creativity for synonym expansion). */
export function getOptimizationClient(): ChatOpenAI {
    return getOpenAIClient({ model: OPENAI_MODELS.GPT4O_MINI, temperature: 0.3, maxTokens: 100 })
}

/** GPT-4o for comprehensive medical responses with citations. */
export function getResponseGenerationClient(): ChatOpenAI {
    return getOpenAIClient({ model: OPENAI_MODELS.GPT4O, temperature: 0.3, maxTokens: 800, timeout: 15000 })
}
