/**
 * Chat routes with streaming AI responses
 * POST /api/chat - Streaming chat endpoint with tool execution
 */

import { streamText, type CoreMessage } from "ai";
import { Router, errorResponse, parseBody } from "./router";
import { models, temperatures, maxTokens, wrapAIError } from "../ai/config";
import { getSystemPrompt } from "../ai/prompts/system";
import { allTools } from "../ai/tools";
import { graphRepo } from "../db/repos";

/**
 * Request body for chat endpoint
 */
interface ChatRequest {
  messages: CoreMessage[];
  graphId?: string;
  language?: "ru" | "en";
}

/**
 * Session context - tracks current graph during conversation
 */
interface SessionContext {
  graphId: string | null;
  language: string;
}

// Simple in-memory session store (for MVP)
// In production, use Redis or similar
const sessions = new Map<string, SessionContext>();

/**
 * Get or create session context
 */
function getSession(sessionId: string): SessionContext {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { graphId: null, language: "ru" };
    sessions.set(sessionId, session);
  }
  return session;
}

/**
 * Update session with new graph ID
 */
function updateSession(sessionId: string, graphId: string, language?: string): void {
  const session = getSession(sessionId);
  session.graphId = graphId;
  if (language) {
    session.language = language;
  }
}

export const chatRouter = new Router();

/**
 * POST /api/chat
 * Streaming chat endpoint with AI tool execution
 *
 * Request body:
 * {
 *   messages: CoreMessage[],  // Chat history
 *   graphId?: string,         // Optional: current graph ID
 *   language?: "ru" | "en"    // Language for generation
 * }
 *
 * Response: Server-Sent Events stream with data protocol
 * Events:
 *   - text: Text content from AI
 *   - tool_call: Tool execution started
 *   - tool_result: Tool execution completed
 *   - graph_updated: Graph state changed
 *   - error: Error occurred
 */
chatRouter.post("/api/chat", async (req, _params, _query) => {
  try {
    const body = await parseBody<ChatRequest>(req);

    // Validate messages
    if (!body.messages || !Array.isArray(body.messages)) {
      return errorResponse("INVALID_REQUEST", "messages array is required");
    }

    // Get session ID from header or generate one
    const sessionId = req.headers.get("X-Session-ID") || crypto.randomUUID();
    const session = getSession(sessionId);

    // Use provided graphId or session's current graphId
    const graphId = body.graphId || session.graphId;
    const language = body.language || session.language || "ru";

    // Build system prompt with context
    let systemPrompt = getSystemPrompt(language);

    // Add graph context if available
    if (graphId) {
      const graph = graphRepo.findById(graphId);
      if (graph) {
        systemPrompt += `\n\n## Current Graph Context
Graph ID: ${graph.id}
Segment: ${graph.inputJson.segment}
Core Job: ${graph.inputJson.coreJob}
Language: ${graph.language}

When the user asks about "the graph" or "this graph", refer to this context.
When generating jobs, use the graph ID: ${graph.id}`;
      }
    }

    // Create the stream
    const result = streamText({
      model: models.chat,
      system: systemPrompt,
      messages: body.messages,
      tools: allTools,
      maxSteps: 10, // Allow multi-step tool execution
      temperature: temperatures.chat,
      maxTokens: maxTokens.chat,
      onStepFinish: async ({ toolCalls, toolResults }) => {
        // Check if any tool created/updated a graph
        if (toolResults) {
          for (const toolResult of toolResults) {
            const result = toolResult.result as Record<string, unknown>;
            if (result?.success && result?.graphId) {
              updateSession(sessionId, result.graphId as string, language);
            }
          }
        }
      },
    });

    // Create data stream response with custom events
    const response = result.toDataStreamResponse({
      getErrorMessage: (error) => {
        const aiError = wrapAIError(error);
        return JSON.stringify({
          type: "error",
          code: aiError.code,
          message: aiError.message,
        });
      },
      sendUsage: true,
    });

    // Add session ID to response headers
    const headers = new Headers(response.headers);
    headers.set("X-Session-ID", sessionId);
    if (graphId) {
      headers.set("X-Graph-ID", graphId);
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("INVALID_JSON", "Invalid JSON in request body");
    }
    const aiError = wrapAIError(error);
    return errorResponse(aiError.code, aiError.message, 500);
  }
});

/**
 * GET /api/chat/session
 * Get current session state
 */
chatRouter.get("/api/chat/session", async (req, _params, _query) => {
  const sessionId = req.headers.get("X-Session-ID");

  if (!sessionId) {
    return errorResponse("NO_SESSION", "X-Session-ID header required", 400);
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return errorResponse("SESSION_NOT_FOUND", "Session not found", 404);
  }

  // Get graph details if available
  let graph = null;
  if (session.graphId) {
    graph = graphRepo.findById(session.graphId);
  }

  return new Response(
    JSON.stringify({
      sessionId,
      graphId: session.graphId,
      language: session.language,
      graph: graph
        ? {
            id: graph.id,
            segment: graph.inputJson.segment,
            coreJob: graph.inputJson.coreJob,
          }
        : null,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});

/**
 * DELETE /api/chat/session
 * Clear session (start fresh)
 */
chatRouter.delete("/api/chat/session", async (req, _params, _query) => {
  const sessionId = req.headers.get("X-Session-ID");

  if (!sessionId) {
    return errorResponse("NO_SESSION", "X-Session-ID header required", 400);
  }

  sessions.delete(sessionId);

  return new Response(
    JSON.stringify({ success: true, message: "Session cleared" }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
