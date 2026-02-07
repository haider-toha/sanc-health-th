import { BaseMessage } from "@langchain/core/messages"

/**
 * Extracts plain text from a LangChain message.
 *
 * Handles both simple string content and multi-part content arrays
 * (e.g., text + image messages).
 */
export function getMessageText(msg: BaseMessage): string {
    const content = msg.content

    if (typeof content === "string") {
        return content
    }

    // Multi-part content (e.g., text + image)
    return content
        .map((part) => {
            if (typeof part === "string") return part
            if ("text" in part) return part.text
            return ""
        })
        .join("")
        .trim()
}
