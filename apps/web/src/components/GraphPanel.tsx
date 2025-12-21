import { useEffect, useState } from "react";

interface Job {
  id: string;
  label: string;
  formulation: string;
  phase: "before" | "during" | "after";
  cadence: "once" | "repeat";
  level: "big" | "core" | "small" | "micro";
  microJobs?: Job[];
}

interface GraphView {
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

interface GraphPanelProps {
  graphId: string | null;
}

export function GraphPanel({ graphId }: GraphPanelProps) {
  const [view, setView] = useState<GraphView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!graphId) {
      setView(null);
      return;
    }

    const fetchGraph = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/graphs/${graphId}/view?mode=ui_v1`);
        if (!response.ok) {
          throw new Error("Failed to fetch graph");
        }
        const data = await response.json();
        setView(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [graphId]);

  if (!graphId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <p className="mt-2 text-sm">No graph selected</p>
          <p className="text-xs">Create a graph using the chat</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!view) {
    return null;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {view.graph.segment}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{view.graph.coreJob}</p>
        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
          <span>{view.stats.smallJobs} small jobs</span>
          <span>{view.stats.microJobs} micro jobs</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-3 gap-6">
        <PhaseColumn phase="before" jobs={view.jobs.before} />
        <PhaseColumn phase="during" jobs={view.jobs.during} />
        <PhaseColumn phase="after" jobs={view.jobs.after} />
      </div>
    </div>
  );
}

interface PhaseColumnProps {
  phase: "before" | "during" | "after";
  jobs: Job[];
}

function PhaseColumn({ phase, jobs }: PhaseColumnProps) {
  const phaseLabels = {
    before: "Before",
    during: "During",
    after: "After",
  };

  const phaseColors = {
    before: "border-orange-200 bg-orange-50",
    during: "border-blue-200 bg-blue-50",
    after: "border-green-200 bg-green-50",
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        {phaseLabels[phase]}
        <span className="ml-2 text-gray-400 font-normal">({jobs.length})</span>
      </h3>
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} phaseColor={phaseColors[phase]} />
        ))}
        {jobs.length === 0 && (
          <p className="text-xs text-gray-400 italic">No jobs</p>
        )}
      </div>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  phaseColor: string;
}

function JobCard({ job, phaseColor }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMicroJobs = job.microJobs && job.microJobs.length > 0;

  return (
    <div className={`rounded-lg border p-3 ${phaseColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {job.label}
            </span>
            {job.cadence === "repeat" && (
              <span className="flex-shrink-0 text-xs text-gray-500" title="Recurring">
                ↻
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {job.formulation}
          </p>
        </div>
        {hasMicroJobs && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Micro jobs */}
      {expanded && hasMicroJobs && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          {job.microJobs!.map((micro) => (
            <div
              key={micro.id}
              className="text-xs bg-white rounded px-2 py-1.5"
            >
              <div className="flex items-center space-x-1">
                <span className="text-gray-700">{micro.label}</span>
                {micro.cadence === "repeat" && (
                  <span className="text-gray-400">↻</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMicroJobs && !expanded && (
        <p className="text-xs text-gray-400 mt-2">
          {job.microJobs!.length} micro jobs
        </p>
      )}
    </div>
  );
}
