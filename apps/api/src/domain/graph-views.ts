import { graphRepo, jobRepo, edgeRepo, solutionRepo } from "../db/repos";
import type { Job, Graph, Edge, Solution } from "./schemas";

/**
 * Job with nested micro jobs for UI display
 */
export interface JobWithMicros {
  id: string;
  label: string;
  formulation: string;
  phase: string;
  cadence: string;
  cadenceHint: string | null;
  scoresJson: {
    userCost: number;
    userBenefit: number;
    costRationale: string;
    benefitRationale: string;
  } | null;
  sortOrder: number;
  microJobs: {
    id: string;
    label: string;
    formulation: string;
    cadence: string;
    sortOrder: number;
  }[];
  solutionCount: number;
}

/**
 * UI v1 view structure - timeline-ready JSON
 */
export interface UIv1View {
  graph: {
    id: string;
    segment: string;
    coreJob: string;
    bigJob: string | null;
    language: string;
  };
  jobs: {
    before: JobWithMicros[];
    during: JobWithMicros[];
    after: JobWithMicros[];
  };
  stats: {
    totalJobs: number;
    smallJobCount: number;
    microJobCount: number;
    solutionCount: number;
  };
}

/**
 * Generate UI v1 view for a graph
 */
export function generateUIv1View(graphId: string): UIv1View | null {
  const graph = graphRepo.findById(graphId);
  if (!graph) return null;

  const allJobs = jobRepo.findByGraphId(graphId);
  const smallJobs = allJobs.filter((j) => j.level === "small");
  const microJobs = allJobs.filter((j) => j.level === "micro");

  // Group micro jobs by parent
  const microsByParent = new Map<string, Job[]>();
  for (const micro of microJobs) {
    if (micro.parentId) {
      const existing = microsByParent.get(micro.parentId) ?? [];
      existing.push(micro);
      microsByParent.set(micro.parentId, existing);
    }
  }

  // Transform small jobs with their micros
  function transformJob(job: Job): JobWithMicros {
    const micros = microsByParent.get(job.id) ?? [];
    const solutionCount = solutionRepo.countByJobId(job.id);

    return {
      id: job.id,
      label: job.label,
      formulation: job.formulation,
      phase: job.phase,
      cadence: job.cadence,
      cadenceHint: job.cadenceHint,
      scoresJson: job.scoresJson,
      sortOrder: job.sortOrder,
      microJobs: micros
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((m) => ({
          id: m.id,
          label: m.label,
          formulation: m.formulation,
          cadence: m.cadence,
          sortOrder: m.sortOrder,
        })),
      solutionCount,
    };
  }

  // Group by phase
  const before = smallJobs
    .filter((j) => j.phase === "before")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(transformJob);

  const during = smallJobs
    .filter((j) => j.phase === "during")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(transformJob);

  const after = smallJobs
    .filter((j) => j.phase === "after")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(transformJob);

  // Count total solutions
  let totalSolutions = 0;
  for (const job of allJobs) {
    totalSolutions += solutionRepo.countByJobId(job.id);
  }

  return {
    graph: {
      id: graph.id,
      segment: graph.inputJson.segment,
      coreJob: graph.inputJson.coreJob,
      bigJob: graph.inputJson.bigJob ?? null,
      language: graph.language,
    },
    jobs: {
      before,
      during,
      after,
    },
    stats: {
      totalJobs: allJobs.length,
      smallJobCount: smallJobs.length,
      microJobCount: microJobs.length,
      solutionCount: totalSolutions,
    },
  };
}

/**
 * Mermaid edge style based on edge type
 */
function getMermaidEdgeStyle(type: string): string {
  switch (type) {
    case "next":
      return "-->";
    case "depends_on":
      return "-.->"; // dashed
    case "optional":
      return "-.->";
    case "repeats":
      return "==>";  // thick
    default:
      return "-->";
  }
}

/**
 * Escape text for Mermaid (remove special chars)
 */
function escapeMermaid(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\n/g, " ")
    .slice(0, 50); // Limit length for readability
}

/**
 * Generate Mermaid flowchart for a graph
 */
export function generateMermaidView(graphId: string): string | null {
  const graph = graphRepo.findById(graphId);
  if (!graph) return null;

  const jobs = jobRepo.findByGraphId(graphId);
  const edges = edgeRepo.findByGraphId(graphId);

  const lines: string[] = [
    "flowchart TD",
    "",
    `    %% Graph: ${escapeMermaid(graph.inputJson.segment)}`,
    `    %% Core Job: ${escapeMermaid(graph.inputJson.coreJob)}`,
    "",
  ];

  // Add subgraphs for phases
  const phases = ["before", "during", "after"] as const;
  const phaseLabels = {
    before: "Before",
    during: "During",
    after: "After",
  };

  for (const phase of phases) {
    const phaseJobs = jobs.filter((j) => j.phase === phase && j.level === "small");

    if (phaseJobs.length > 0) {
      lines.push(`    subgraph ${phase}["${phaseLabels[phase]}"]`);

      for (const job of phaseJobs.sort((a, b) => a.sortOrder - b.sortOrder)) {
        const icon = job.cadence === "repeat" ? "🔄 " : "";
        lines.push(`        ${job.id}["${icon}${escapeMermaid(job.label)}"]`);

        // Add micro jobs as sub-nodes
        const micros = jobs.filter((m) => m.parentId === job.id);
        for (const micro of micros.sort((a, b) => a.sortOrder - b.sortOrder)) {
          lines.push(`        ${micro.id}(["${escapeMermaid(micro.label)}"])`);
          lines.push(`        ${job.id} --> ${micro.id}`);
        }
      }

      lines.push("    end");
      lines.push("");
    }
  }

  // Add edges between jobs
  if (edges.length > 0) {
    lines.push("    %% Relationships");
    for (const edge of edges) {
      const arrow = getMermaidEdgeStyle(edge.type);
      const note = edge.note ? `|${escapeMermaid(edge.note)}|` : "";
      lines.push(`    ${edge.fromId} ${arrow}${note} ${edge.toId}`);
    }
  }

  // Add styling
  lines.push("");
  lines.push("    %% Styling");
  lines.push("    classDef before fill:#e3f2fd,stroke:#1976d2");
  lines.push("    classDef during fill:#fff3e0,stroke:#f57c00");
  lines.push("    classDef after fill:#e8f5e9,stroke:#388e3c");
  lines.push("    classDef micro fill:#f5f5f5,stroke:#9e9e9e,stroke-dasharray: 5 5");

  // Apply styles to nodes
  for (const phase of phases) {
    const phaseJobs = jobs.filter((j) => j.phase === phase && j.level === "small");
    if (phaseJobs.length > 0) {
      const ids = phaseJobs.map((j) => j.id).join(",");
      lines.push(`    class ${ids} ${phase}`);
    }
  }

  const microIds = jobs.filter((j) => j.level === "micro").map((j) => j.id);
  if (microIds.length > 0) {
    lines.push(`    class ${microIds.join(",")} micro`);
  }

  return lines.join("\n");
}

/**
 * View mode types
 */
export type ViewMode = "ui_v1" | "mermaid";

/**
 * Generate view based on mode
 */
export function generateView(
  graphId: string,
  mode: ViewMode
): UIv1View | string | null {
  switch (mode) {
    case "ui_v1":
      return generateUIv1View(graphId);
    case "mermaid":
      return generateMermaidView(graphId);
    default:
      return null;
  }
}
