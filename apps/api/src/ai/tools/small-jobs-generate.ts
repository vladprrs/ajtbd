import { z } from "zod";
import { tool, generateObject } from "ai";
import { graphRepo, jobRepo } from "../../db/repos";
import { models, temperatures, maxTokens, wrapAIError } from "../config";
import { getSmallJobsPrompt, getSystemPrompt } from "../prompts/system";

/**
 * Schema for generated small jobs
 */
const SmallJobSchema = z.object({
  formulation: z.string().describe("First-person job statement (Я хочу... / I want to...)"),
  label: z.string().describe("Infinitive verb label without first-person prefix"),
  phase: z.enum(["before", "during", "after"]).describe("When this job happens relative to core job"),
  cadence: z.enum(["once", "repeat"]).describe("Whether this is a one-time or recurring job"),
  cadenceHint: z.string().optional().describe("Frequency hint for recurring jobs"),
});

const SmallJobsResponseSchema = z.object({
  jobs: z.array(SmallJobSchema).min(8).max(12),
});

/**
 * Tool: small_jobs_generate
 * Generates 8-12 small jobs for a graph's core job
 */
export const smallJobsGenerateTool = tool({
  description: "Generate small jobs (8-12) that break down the core job into actionable steps. Use this after creating a graph.",
  parameters: z.object({
    graphId: z.string().describe("The graph ID to generate small jobs for"),
    count: z.number().int().min(8).max(12).default(10).describe("Number of small jobs to generate"),
  }),
  execute: async ({ graphId, count }) => {
    // Get the graph
    const graph = graphRepo.findById(graphId);
    if (!graph) {
      return {
        success: false,
        error: `Graph not found: ${graphId}`,
      };
    }

    // Get the core job
    const coreJob = jobRepo.findById(graph.coreJobId);
    if (!coreJob) {
      return {
        success: false,
        error: `Core job not found for graph: ${graphId}`,
      };
    }

    // Prevent duplicates and enforce max small jobs
    const existingSmallJobs = jobRepo.findByLevel(graphId, "small");
    if (existingSmallJobs.length > 0) {
      const count = existingSmallJobs.length;
      const countText = count >= 12 ? "at the maximum (12)" : `already has ${count}`;
      return {
        success: false,
        error: `Graph ${countText} small jobs. Delete existing small jobs before regenerating.`,
        existingJobIds: existingSmallJobs.map((j) => j.id),
      };
    }

    try {
      // Generate small jobs using AI
      const { object } = await generateObject({
        model: models.structured,
        schema: SmallJobsResponseSchema,
        system: getSystemPrompt(graph.language),
        prompt: getSmallJobsPrompt(
          graph.inputJson.segment,
          graph.inputJson.coreJob,
          graph.language,
          count
        ),
        temperature: temperatures.generation,
        maxTokens: maxTokens.generation,
      });

      // Create job records
      const createdJobs = jobRepo.createMany(
        object.jobs.map((job, index) => ({
          graphId: graph.id,
          level: "small" as const,
          parentId: coreJob.id,
          formulation: job.formulation,
          label: job.label,
          phase: job.phase,
          cadence: job.cadence,
          cadenceHint: job.cadenceHint ?? null,
          whenText: null,
          want: null,
          soThat: null,
          suggestedNext: null,
          scoresJson: null,
          sortOrder: index,
        }))
      );

      // Group by phase for summary
      const byPhase = {
        before: createdJobs.filter((j) => j.phase === "before").length,
        during: createdJobs.filter((j) => j.phase === "during").length,
        after: createdJobs.filter((j) => j.phase === "after").length,
      };

      return {
        success: true,
        graphId: graph.id,
        jobsCreated: createdJobs.length,
        jobIds: createdJobs.map((j) => j.id),
        byPhase,
        message: `Generated ${createdJobs.length} small jobs: ${byPhase.before} before, ${byPhase.during} during, ${byPhase.after} after`,
      };
    } catch (error) {
      const aiError = wrapAIError(error);
      return {
        success: false,
        error: aiError.message,
        code: aiError.code,
      };
    }
  },
});
