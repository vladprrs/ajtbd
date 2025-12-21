/**
 * Shared types for the web app
 */

export interface JobScores {
  userCost: number;
  userBenefit: number;
  costRationale: string;
  benefitRationale: string;
}

export interface Job {
  id: string;
  label: string;
  formulation: string;
  phase: "before" | "during" | "after";
  cadence: "once" | "repeat";
  cadenceHint?: string | null;
  level: "big" | "core" | "small" | "micro";
  whenText?: string | null;
  want?: string | null;
  soThat?: string | null;
  suggestedNext?: string | null;
  scoresJson?: JobScores | null;
  microJobs?: Job[];
}

export interface GraphView {
  graph: {
    id: string;
    segment: string;
    coreJob: string;
    language: string;
  };
  jobs: {
    before: Job[];
    during: Job[];
    after: Job[];
  };
  stats: {
    totalJobs: number;
    smallJobs: number;
    microJobs: number;
  };
}
