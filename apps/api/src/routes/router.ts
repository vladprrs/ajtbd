/**
 * Simple router utility for Bun.serve
 * Provides Express-style path matching and parameter extraction
 */

export type RouteHandler = (
  req: Request,
  params: Record<string, string>,
  query: URLSearchParams
) => Response | Promise<Response>;

export interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

/**
 * Convert path pattern to regex
 * Supports :param syntax for path parameters
 */
function pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];

  const regexStr = path
    .replace(/\//g, "\\/")
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });

  return {
    pattern: new RegExp(`^${regexStr}$`),
    paramNames,
  };
}

/**
 * Router class for handling HTTP requests
 */
export class Router {
  private routes: Route[] = [];

  /**
   * Register a GET route
   */
  get(path: string, handler: RouteHandler): this {
    return this.addRoute("GET", path, handler);
  }

  /**
   * Register a POST route
   */
  post(path: string, handler: RouteHandler): this {
    return this.addRoute("POST", path, handler);
  }

  /**
   * Register a PUT route
   */
  put(path: string, handler: RouteHandler): this {
    return this.addRoute("PUT", path, handler);
  }

  /**
   * Register a PATCH route
   */
  patch(path: string, handler: RouteHandler): this {
    return this.addRoute("PATCH", path, handler);
  }

  /**
   * Register a DELETE route
   */
  delete(path: string, handler: RouteHandler): this {
    return this.addRoute("DELETE", path, handler);
  }

  /**
   * Add a route for any method
   */
  private addRoute(method: string, path: string, handler: RouteHandler): this {
    const { pattern, paramNames } = pathToRegex(path);
    this.routes.push({ method, pattern, paramNames, handler });
    return this;
  }

  /**
   * Match a request to a route
   */
  match(
    method: string,
    pathname: string
  ): { handler: RouteHandler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  /**
   * Handle a request
   */
  async handle(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    const result = this.match(req.method, url.pathname);

    if (!result) {
      return null;
    }

    return result.handler(req, result.params, url.searchParams);
  }
}

/**
 * JSON response helper
 */
export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Error response helper
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): Response {
  return json(
    {
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
    },
    status
  );
}

/**
 * Parse JSON body from request
 */
export async function parseBody<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text) {
    throw new Error("Empty request body");
  }
  return JSON.parse(text) as T;
}

/**
 * Not found response
 */
export function notFound(path: string, method: string): Response {
  return errorResponse("NOT_FOUND", `Route not found: ${method} ${path}`, 404);
}
