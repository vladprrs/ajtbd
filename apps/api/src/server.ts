import { db, runMigrations } from "./db";
import { handleRequest, healthCheck, notFound } from "./routes";

const PORT = parseInt(process.env.PORT || "3001", 10);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173").split(
  ","
);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "60", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);

// Run migrations on startup
console.log("Running database migrations...");
runMigrations();
console.log("Migrations complete.");

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (origin && CORS_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (CORS_ORIGINS.includes("*")) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

function addCorsHeaders(
  response: Response,
  origin: string | null,
  extraHeaders: Record<string, string> = {}
): Response {
  const corsHeaders = getCorsHeaders(origin);
  const newHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  for (const [key, value] of Object.entries(extraHeaders)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Basic in-memory rate limiter for chat endpoint
 */
type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "local";
}

function checkRateLimit(req: Request, url: URL): Response | null {
  if (url.pathname !== "/api/chat" || RATE_LIMIT_MAX <= 0) {
    return null;
  }

  const now = Date.now();
  const key = `${getClientKey(req)}::chat`;
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (bucket.count + 1 > RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return new Response(
      JSON.stringify({
        error: {
          code: "RATE_LIMIT",
          message: "Rate limit exceeded. Please retry later.",
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(bucket.resetAt),
        },
      }
    );
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return null;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");
    const requestId = crypto.randomUUID();
    const start = performance.now();
    let response: Response;

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      const preflight = new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
      return preflight;
    }

    // Health check endpoint
    if (url.pathname === "/health" && req.method === "GET") {
      response = healthCheck();
    } else {
      const limited = checkRateLimit(req, url);
      if (limited) {
        response = limited;
      } else {
        // Try registered routes
        const handled = await handleRequest(req);
        response = handled ?? notFound(url.pathname, req.method);
      }
    }

    const durationMs = Math.round(performance.now() - start);
    const responseWithCors = addCorsHeaders(response, origin, {
      "X-Request-ID": requestId,
      "X-Response-Time": `${durationMs}ms`,
    });

    console.log(
      `[req ${requestId}] ${req.method} ${url.pathname} -> ${response.status} (${durationMs}ms)`
    );

    return responseWithCors;
  },
});

console.log(`Server running at http://localhost:${server.port}`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  db.close();
  process.exit(0);
});
