/**
 * AI Tool exports
 * All tools for the AI orchestrator
 */

export { graphCreateTool } from "./graph-create";
export { smallJobsGenerateTool } from "./small-jobs-generate";
export { microJobsGenerateTool, microJobsGenerateAllTool } from "./micro-jobs-generate";

/**
 * All tools combined for use with streamText/generateText
 */
import { graphCreateTool } from "./graph-create";
import { smallJobsGenerateTool } from "./small-jobs-generate";
import { microJobsGenerateTool, microJobsGenerateAllTool } from "./micro-jobs-generate";

export const allTools = {
  graph_create: graphCreateTool,
  small_jobs_generate: smallJobsGenerateTool,
  micro_jobs_generate: microJobsGenerateTool,
  micro_jobs_generate_all: microJobsGenerateAllTool,
};

export type ToolName = keyof typeof allTools;
