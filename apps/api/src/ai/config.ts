import { createOpenAI } from "@ai-sdk/openai";

/**
 * AI SDK Configuration
 * Uses OpenAI provider with configurable settings
 */

// OpenAI provider instance
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: "strict",
});

/**
 * Model configurations for different use cases
 */
export const models = {
  // For chat and complex reasoning
  chat: openai("gpt-4o"),

  // For batch generation (faster, cheaper)
  batch: openai("gpt-4o-mini"),

  // For structured output generation
  structured: openai("gpt-4o"),
} as const;

/**
 * Temperature settings by use case
 */
export const temperatures = {
  // Creative job generation
  generation: 0.7,

  // Precise validation/fixing
  validation: 0.2,

  // Balanced chat
  chat: 0.5,
} as const;

/**
 * Token limits by use case
 */
export const maxTokens = {
  // Job generation (needs room for multiple jobs)
  generation: 4000,

  // Validation responses
  validation: 1000,

  // Chat responses
  chat: 2000,
} as const;

/**
 * Error wrapper for AI SDK calls
 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIError";
  }
}

/**
 * Wrap AI SDK errors in AIError
 */
export function wrapAIError(error: unknown): AIError {
  if (error instanceof AIError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common OpenAI errors
    if (error.message.includes("rate limit")) {
      return new AIError("Rate limit exceeded. Please try again later.", "RATE_LIMIT", error);
    }
    if (error.message.includes("API key")) {
      return new AIError("Invalid or missing API key.", "AUTH_ERROR", error);
    }
    if (error.message.includes("context length")) {
      return new AIError("Input too long. Please reduce content.", "CONTEXT_LENGTH", error);
    }

    return new AIError(error.message, "AI_ERROR", error);
  }

  return new AIError("Unknown AI error", "UNKNOWN", error);
}
