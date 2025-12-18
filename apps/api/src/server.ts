import { db, runMigrations } from "./db";

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

function jsonResponse(
  data: unknown,
  status = 200,
  origin: string | null = null
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(origin),
    },
  });
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
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
      return jsonResponse({ ok: true }, 200, origin);
    }

    // 404 for unmatched routes
    return jsonResponse(
      {
        error: {
          code: "NOT_FOUND",
          message: `Route not found: ${req.method} ${url.pathname}`,
        },
      },
      404,
      origin
    );
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
