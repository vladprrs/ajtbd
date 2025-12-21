import { z } from "zod";
import { tool } from "ai";
import { graphRepo, jobRepo } from "../../db/repos";
import { generateId } from "../../domain/schemas";

/**
 * Tool: graph_create
 * Creates a new graph with core job and optional big job
 */
export const graphCreateTool = tool({
  description: "Create a new job graph with a core job. Use this when the user wants to analyze a new job or segment.",
  parameters: z.object({
    segment: z.string().describe("The user segment or persona (e.g., 'Родители детей 3-7 лет', 'Small business owners')"),
    coreJob: z.string().describe("The core job formulation in first person (e.g., 'Я хочу воспитать здорового ребёнка')"),
    bigJob: z.string().optional().describe("Optional higher-level job that the core job contributes to"),
    language: z.enum(["ru", "en"]).default("ru").describe("Language for job formulations"),
  }),
  execute: async ({ segment, coreJob, bigJob, language }) => {
    // Generate placeholder IDs for the graph record (will update after job creation)
    const coreJobId = generateId();
    const bigJobId = bigJob ? generateId() : null;

    // Create the graph record first
    const graph = graphRepo.create({
      language,
      inputJson: {
        segment,
        coreJob,
        bigJob,
      },
      coreJobId,
      bigJobId,
      warningsJson: null,
    });

    // Create parent big job (if provided) before core job to satisfy FK
    let createdBigJobId: string | null = null;
    if (bigJob) {
      const createdBig = jobRepo.create({
        graphId: graph.id,
        level: "big",
        parentId: null,
        formulation: bigJob,
        label: extractLabel(bigJob, language),
        phase: "during",
        cadence: "once",
        cadenceHint: null,
        whenText: null,
        want: null,
        soThat: null,
        suggestedNext: null,
        scoresJson: null,
        sortOrder: 0,
      });
      createdBigJobId = createdBig.id;
    }

    // Create the core job record (may reference big job as parent)
    const createdCore = jobRepo.create({
      graphId: graph.id,
      level: "core",
      parentId: createdBigJobId,
      formulation: coreJob,
      label: extractLabel(coreJob, language),
      phase: "during",
      cadence: "once",
      cadenceHint: null,
      whenText: null,
      want: null,
      soThat: null,
      suggestedNext: null,
      scoresJson: null,
      sortOrder: 0,
    });

    // Update graph to point to the actual job IDs
    graphRepo.update(graph.id, {
      coreJobId: createdCore.id,
      bigJobId: createdBigJobId,
    });

    return {
      success: true,
      graphId: graph.id,
      coreJobId: createdCore.id,
      bigJobId: createdBigJobId,
      message: `Created graph for segment "${segment}" with core job "${coreJob}"`,
    };
  },
});

/**
 * Extract label from formulation (helper)
 */
function extractLabel(formulation: string, language: string): string {
  const prefixes = language === "ru"
    ? ["я хочу ", "я хотел бы ", "мне нужно "]
    : ["i want to ", "i need to ", "i would like to "];

  let label = formulation;
  for (const prefix of prefixes) {
    if (label.toLowerCase().startsWith(prefix)) {
      label = label.slice(prefix.length);
      break;
    }
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}
