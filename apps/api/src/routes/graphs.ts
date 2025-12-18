import { Router, json, errorResponse, parseBody } from "./router";
import { graphRepo } from "../db/repos";
import { GraphInput } from "../domain/schemas";
import { generateId } from "../domain/schemas";

const router = new Router();

/**
 * POST /api/graphs - Create a new graph
 */
router.post("/api/graphs", async (req) => {
  try {
    const body = await parseBody<{
      segment: string;
      coreJob: string;
      bigJob?: string;
      language?: string;
      options?: {
        generateSmallJobs?: boolean;
        smallJobCount?: number;
      };
    }>(req);

    // Validate input
    const inputResult = GraphInput.safeParse(body);
    if (!inputResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid graph input",
        400,
        inputResult.error.issues
      );
    }

    const input = inputResult.data;

    // Create placeholder job IDs (jobs will be created by AI tools)
    const coreJobId = generateId();
    const bigJobId = input.bigJob ? generateId() : null;

    // Create graph
    const graph = graphRepo.create({
      language: input.language || "ru",
      inputJson: {
        segment: input.segment,
        coreJob: input.coreJob,
        bigJob: input.bigJob,
        options: input.options,
      },
      coreJobId,
      bigJobId,
      warningsJson: null,
    });

    return json(graph, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse("CREATE_FAILED", message, 500);
  }
});

/**
 * GET /api/graphs - List all graphs
 */
router.get("/api/graphs", async (_req, _params, query) => {
  try {
    const limit = parseInt(query.get("limit") || "20", 10);
    const offset = parseInt(query.get("offset") || "0", 10);
    const segment = query.get("segment");

    let graphs;
    if (segment) {
      graphs = graphRepo.findBySegment(segment);
    } else {
      graphs = graphRepo.findMany(undefined, {
        limit,
        offset,
        orderBy: "updatedAt",
        orderDir: "DESC",
      });
    }

    return json({
      data: graphs,
      meta: {
        count: graphs.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse("LIST_FAILED", message, 500);
  }
});

/**
 * GET /api/graphs/:id - Get a single graph
 */
router.get("/api/graphs/:id", async (_req, params) => {
  try {
    const graph = graphRepo.findById(params.id);

    if (!graph) {
      return errorResponse("NOT_FOUND", `Graph not found: ${params.id}`, 404);
    }

    return json(graph);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse("GET_FAILED", message, 500);
  }
});

/**
 * PATCH /api/graphs/:id - Update a graph
 */
router.patch("/api/graphs/:id", async (req, params) => {
  try {
    const body = await parseBody<{
      language?: string;
      warningsJson?: string[] | null;
    }>(req);

    const graph = graphRepo.update(params.id, body);

    if (!graph) {
      return errorResponse("NOT_FOUND", `Graph not found: ${params.id}`, 404);
    }

    return json(graph);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse("UPDATE_FAILED", message, 500);
  }
});

/**
 * DELETE /api/graphs/:id - Delete a graph
 */
router.delete("/api/graphs/:id", async (_req, params) => {
  try {
    const deleted = graphRepo.delete(params.id);

    if (!deleted) {
      return errorResponse("NOT_FOUND", `Graph not found: ${params.id}`, 404);
    }

    return json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse("DELETE_FAILED", message, 500);
  }
});

export { router as graphsRouter };
