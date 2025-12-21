import { z } from "zod";
import { tool, generateObject } from "ai";
import { graphRepo, jobRepo } from "../../db/repos";
import { models, temperatures, maxTokens, wrapAIError } from "../config";
import { getMicroJobsPrompt, getSystemPrompt } from "../prompts/system";

/**
 * Schema for generated micro jobs
 */
const MicroJobSchema = z.object({
  formulation: z.string().describe("First-person job statement"),
  label: z.string().describe("Infinitive verb label"),
  cadence: z.enum(["once", "repeat"]).describe("Whether this is a one-time or recurring job"),
  cadenceHint: z.string().optional().describe("Frequency hint for recurring jobs"),
});

const MicroJobsResponseSchema = z.object({
  jobs: z.array(MicroJobSchema).min(3).max(6),
});

/**
 * Tool: micro_jobs_generate
 * Generates 3-6 micro jobs for a specific small job
 */
export const microJobsGenerateTool = tool({
  description: "Generate micro jobs (3-6) that detail how to accomplish a specific small job. Use this to break down individual small jobs.",
  parameters: z.object({
    smallJobId: z.string().describe("The small job ID to generate micro jobs for"),
    count: z.number().int().min(3).max(6).default(5).describe("Number of micro jobs to generate"),
  }),
  execute: async ({ smallJobId, count }) => {
    // Get the small job
    const smallJob = jobRepo.findById(smallJobId);
    if (!smallJob) {
      return {
        success: false,
        error: `Small job not found: ${smallJobId}`,
      };
    }

    if (smallJob.level !== "small") {
      return {
        success: false,
        error: `Job ${smallJobId} is not a small job (level: ${smallJob.level})`,
      };
    }

    // Get the graph for language
    const graph = graphRepo.findById(smallJob.graphId);
    if (!graph) {
      return {
        success: false,
        error: `Graph not found for job: ${smallJobId}`,
      };
    }

    // Check if micro jobs already exist
    const existingMicros = jobRepo.findByParentId(smallJobId);
    if (existingMicros.length > 0) {
      return {
        success: false,
        error: `Small job already has ${existingMicros.length} micro jobs. Delete them first to regenerate.`,
        existingJobIds: existingMicros.map((j) => j.id),
      };
    }

    try {
      // Generate micro jobs using AI
      const { object } = await generateObject({
        model: models.structured,
        schema: MicroJobsResponseSchema,
        system: getSystemPrompt(graph.language),
        prompt: getMicroJobsPrompt(
          smallJob.label,
          smallJob.formulation,
          smallJob.phase,
          graph.language,
          count
        ),
        temperature: temperatures.generation,
        maxTokens: maxTokens.generation,
      });

      // Create job records (inherit phase from parent)
      const createdJobs = jobRepo.createMany(
        object.jobs.map((job, index) => ({
          graphId: graph.id,
          level: "micro" as const,
          parentId: smallJob.id,
          formulation: job.formulation,
          label: job.label,
          phase: smallJob.phase, // Inherit phase from parent
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

      return {
        success: true,
        smallJobId,
        smallJobLabel: smallJob.label,
        jobsCreated: createdJobs.length,
        jobIds: createdJobs.map((j) => j.id),
        message: `Generated ${createdJobs.length} micro jobs for "${smallJob.label}"`,
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

/**
 * Tool: micro_jobs_generate_all
 * Generates micro jobs for all small jobs in a graph
 */
export const microJobsGenerateAllTool = tool({
  description: "Generate micro jobs for ALL small jobs in a graph at once. Use this for batch generation.",
  parameters: z.object({
    graphId: z.string().describe("The graph ID to generate micro jobs for all small jobs"),
    countPerJob: z.number().int().min(3).max(6).default(4).describe("Number of micro jobs per small job"),
  }),
  execute: async ({ graphId, countPerJob }) => {
    const graph = graphRepo.findById(graphId);
    if (!graph) {
      return {
        success: false,
        error: `Graph not found: ${graphId}`,
      };
    }

    // Get all small jobs
    const smallJobs = jobRepo.findByLevel(graphId, "small");
    if (smallJobs.length === 0) {
      return {
        success: false,
        error: "No small jobs found. Generate small jobs first.",
      };
    }

    const results: {
      smallJobId: string;
      label: string;
      microJobsCreated: number;
      error?: string;
    }[] = [];

    let totalCreated = 0;

    for (const smallJob of smallJobs) {
      // Skip if already has micro jobs
      const existingMicros = jobRepo.findByParentId(smallJob.id);
      if (existingMicros.length > 0) {
        results.push({
          smallJobId: smallJob.id,
          label: smallJob.label,
          microJobsCreated: 0,
          error: `Already has ${existingMicros.length} micro jobs`,
        });
        continue;
      }

      try {
        const { object } = await generateObject({
          model: models.structured,
          schema: MicroJobsResponseSchema,
          system: getSystemPrompt(graph.language),
          prompt: getMicroJobsPrompt(
            smallJob.label,
            smallJob.formulation,
            smallJob.phase,
            graph.language,
            countPerJob
          ),
          temperature: temperatures.generation,
          maxTokens: maxTokens.generation,
        });

        const createdJobs = jobRepo.createMany(
          object.jobs.map((job, index) => ({
            graphId: graph.id,
            level: "micro" as const,
            parentId: smallJob.id,
            formulation: job.formulation,
            label: job.label,
            phase: smallJob.phase,
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

        totalCreated += createdJobs.length;
        results.push({
          smallJobId: smallJob.id,
          label: smallJob.label,
          microJobsCreated: createdJobs.length,
        });
      } catch (error) {
        const aiError = wrapAIError(error);
        results.push({
          smallJobId: smallJob.id,
          label: smallJob.label,
          microJobsCreated: 0,
          error: aiError.message,
        });
      }
    }

    const successCount = results.filter((r) => r.microJobsCreated > 0).length;

    return {
      success: successCount > 0,
      graphId,
      smallJobsProcessed: smallJobs.length,
      smallJobsSucceeded: successCount,
      totalMicroJobsCreated: totalCreated,
      results,
      message: `Generated ${totalCreated} micro jobs for ${successCount}/${smallJobs.length} small jobs`,
    };
  },
});
