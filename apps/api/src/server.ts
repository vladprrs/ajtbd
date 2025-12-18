import { db, runMigrations } from "./db";
import { handleRequest, healthCheck, notFound } from "./routes";

const PORT = parseInt(process.env.PORT || "3001", 10);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173").split(
  ","
);

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

function addCorsHeaders(response: Response, origin: string | null): Response {
  const corsHeaders = getCorsHeaders(origin);
  const newHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    // Health check endpoint
    if (url.pathname === "/health" && req.method === "GET") {
      return addCorsHeaders(healthCheck(), origin);
    }

    // Try registered routes
    const response = await handleRequest(req);
    if (response) {
      return addCorsHeaders(response, origin);
    }

    // 404 for unmatched routes
    return addCorsHeaders(notFound(url.pathname, req.method), origin);
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
