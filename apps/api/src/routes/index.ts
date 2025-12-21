/**
 * Route exports and combined router
 */

import { Router, json, notFound } from "./router";
import { graphsRouter } from "./graphs";
import { chatRouter } from "./chat";

// Re-export utilities
export { Router, json, errorResponse, parseBody, notFound } from "./router";

// Combined router that handles all routes
const routers = [graphsRouter, chatRouter];

/**
 * Handle a request using all registered routers
 */
export async function handleRequest(req: Request): Promise<Response | null> {
  for (const router of routers) {
    const response = await router.handle(req);
    if (response) {
      return response;
    }
  }
  return null;
}

/**
 * Health check handler
 */
export function healthCheck(): Response {
  return json({ ok: true });
}
