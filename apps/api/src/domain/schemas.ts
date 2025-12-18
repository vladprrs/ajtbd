import { z } from "zod";

// Enums
export const JobLevel = z.enum(["big", "core", "small", "micro"]);
export type JobLevel = z.infer<typeof JobLevel>;

export const Phase = z.enum(["before", "during", "after", "unknown"]);
export type Phase = z.infer<typeof Phase>;

export const Cadence = z.enum(["once", "repeat"]);
export type Cadence = z.infer<typeof Cadence>;

export const SolutionType = z.enum([
  "self",
  "product",
  "service",
  "our_product",
  "partner",
]);
export type SolutionType = z.infer<typeof SolutionType>;

export const EdgeType = z.enum(["next", "depends_on", "optional", "repeats"]);
export type EdgeType = z.infer<typeof EdgeType>;

// Job Scores
export const JobScores = z.object({
  userCost: z.number().int().min(1).max(10),
  userBenefit: z.number().int().min(1).max(10),
  costRationale: z.string(),
  benefitRationale: z.string(),
});
export type JobScores = z.infer<typeof JobScores>;

// Graph Input (for creating new graphs)
export const GraphInput = z.object({
  segment: z.string().min(1),
  coreJob: z.string().min(1),
  bigJob: z.string().optional(),
  language: z.string().default("en"),
  options: z
    .object({
      generateSmallJobs: z.boolean().default(true),
      smallJobCount: z.number().int().min(8).max(12).default(10),
    })
    .optional(),
});
export type GraphInput = z.infer<typeof GraphInput>;

// Graph (full entity)
export const Graph = z.object({
  id: z.string(),
  segment: z.string(),
  coreJob: z.string(),
  bigJob: z.string().nullable(),
  language: z.string(),
  options: z.record(z.unknown()).nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Graph = z.infer<typeof Graph>;

// Job (full entity)
export const Job = z.object({
  id: z.string(),
  graphId: z.string(),
  level: JobLevel,
  parentId: z.string().nullable(),
  formulation: z.string(), // "I want to..."
  label: z.string(), // Infinitive verb, no "I want"
  phase: Phase,
  cadence: Cadence,
  cadenceHint: z.string().nullable(),
  when: z.string().nullable(),
  want: z.string().nullable(),
  soThat: z.string().nullable(),
  suggestedNext: z.string().nullable(),
  scores: JobScores.nullable(),
  sortOrder: z.number().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Job = z.infer<typeof Job>;

// Job Input (for creating/updating jobs)
export const JobInput = z.object({
  graphId: z.string(),
  level: JobLevel,
  parentId: z.string().optional(),
  formulation: z.string().min(1),
  label: z.string().min(1),
  phase: Phase,
  cadence: Cadence,
  cadenceHint: z.string().optional(),
  when: z.string().optional(),
  want: z.string().optional(),
  soThat: z.string().optional(),
  suggestedNext: z.string().optional(),
  scores: JobScores.optional(),
  sortOrder: z.number().optional(),
});
export type JobInput = z.infer<typeof JobInput>;

// Solution
export const Solution = z.object({
  id: z.string(),
  jobId: z.string(),
  name: z.string(),
  type: SolutionType,
  actorId: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Solution = z.infer<typeof Solution>;

// Solution Input
export const SolutionInput = z.object({
  jobId: z.string(),
  name: z.string().min(1),
  type: SolutionType,
  actorId: z.string().optional(),
  description: z.string().optional(),
});
export type SolutionInput = z.infer<typeof SolutionInput>;

// Edge
export const Edge = z.object({
  id: z.string(),
  graphId: z.string(),
  fromId: z.string(),
  toId: z.string(),
  type: EdgeType,
  note: z.string().nullable(),
  createdAt: z.number(),
});
export type Edge = z.infer<typeof Edge>;

// Edge Input
export const EdgeInput = z.object({
  graphId: z.string(),
  fromId: z.string(),
  toId: z.string(),
  type: EdgeType,
  note: z.string().optional(),
});
export type EdgeInput = z.infer<typeof EdgeInput>;

// Actor
export const Actor = z.object({
  id: z.string(),
  graphId: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Actor = z.infer<typeof Actor>;

// Problem
export const Problem = z.object({
  id: z.string(),
  jobId: z.string(),
  description: z.string(),
  severity: z.number().int().min(1).max(10).nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Problem = z.infer<typeof Problem>;

// Sequence
export const Sequence = z.object({
  id: z.string(),
  graphId: z.string(),
  name: z.string(),
  jobIds: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Sequence = z.infer<typeof Sequence>;

// API Error Response
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// Utility: Generate ID
export function generateId(): string {
  return crypto.randomUUID();
}
