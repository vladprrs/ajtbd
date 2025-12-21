import { useState } from "react";
import type { Job } from "../types";

interface JobTimelineProps {
  jobs: {
    before: Job[];
    during: Job[];
    after: Job[];
  };
  onJobSelect: (job: Job) => void;
  selectedJobId?: string | null;
}

export function JobTimeline({ jobs, onJobSelect, selectedJobId }: JobTimelineProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <PhaseColumn
        phase="before"
        jobs={jobs.before}
        onJobSelect={onJobSelect}
        selectedJobId={selectedJobId}
      />
      <PhaseColumn
        phase="during"
        jobs={jobs.during}
        onJobSelect={onJobSelect}
        selectedJobId={selectedJobId}
      />
      <PhaseColumn
        phase="after"
        jobs={jobs.after}
        onJobSelect={onJobSelect}
        selectedJobId={selectedJobId}
      />
    </div>
  );
}

interface PhaseColumnProps {
  phase: "before" | "during" | "after";
  jobs: Job[];
  onJobSelect: (job: Job) => void;
  selectedJobId?: string | null;
}

function PhaseColumn({ phase, jobs, onJobSelect, selectedJobId }: PhaseColumnProps) {
  const phaseLabels = {
    before: "Before",
    during: "During",
    after: "After",
  };

  const phaseStyles = {
    before: {
      header: "text-orange-700 bg-orange-50",
      card: "border-orange-200 bg-orange-50 hover:bg-orange-100",
      cardSelected: "border-orange-400 bg-orange-100 ring-2 ring-orange-400",
    },
    during: {
      header: "text-blue-700 bg-blue-50",
      card: "border-blue-200 bg-blue-50 hover:bg-blue-100",
      cardSelected: "border-blue-400 bg-blue-100 ring-2 ring-blue-400",
    },
    after: {
      header: "text-green-700 bg-green-50",
      card: "border-green-200 bg-green-50 hover:bg-green-100",
      cardSelected: "border-green-400 bg-green-100 ring-2 ring-green-400",
    },
  };

  const styles = phaseStyles[phase];

  return (
    <div>
      <div className={`rounded-t-lg px-3 py-2 ${styles.header}`}>
        <h3 className="text-sm font-medium">
          {phaseLabels[phase]}
          <span className="ml-2 opacity-60 font-normal">({jobs.length})</span>
        </h3>
      </div>
      <div className="space-y-2 mt-2">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            styles={styles}
            onSelect={onJobSelect}
            isSelected={selectedJobId === job.id}
          />
        ))}
        {jobs.length === 0 && (
          <p className="text-xs text-gray-400 italic px-1">No jobs in this phase</p>
        )}
      </div>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  styles: {
    card: string;
    cardSelected: string;
  };
  onSelect: (job: Job) => void;
  isSelected: boolean;
}

function JobCard({ job, styles, onSelect, isSelected }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMicroJobs = job.microJobs && job.microJobs.length > 0;
  const hasScores = job.scoresJson != null;

  return (
    <div
      className={`rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected ? styles.cardSelected : styles.card
      }`}
      onClick={() => onSelect(job)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {job.label}
            </span>
            <div className="flex items-center space-x-1 flex-shrink-0">
              {job.cadence === "repeat" && (
                <span className="text-xs text-gray-500" title="Recurring">
                  ↻
                </span>
              )}
              {hasScores && (
                <span className="text-xs text-purple-500" title="Has scores">
                  ◆
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {job.formulation}
          </p>
        </div>
        {hasMicroJobs && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
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

      {/* Quick score preview */}
      {hasScores && (
        <div className="mt-2 flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-red-500">Cost:</span>
            <span className="font-medium">{job.scoresJson!.userCost}/10</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-green-500">Benefit:</span>
            <span className="font-medium">{job.scoresJson!.userBenefit}/10</span>
          </div>
        </div>
      )}

      {/* Micro jobs */}
      {expanded && hasMicroJobs && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
          {job.microJobs!.map((micro) => (
            <div
              key={micro.id}
              className="text-xs bg-white/80 rounded px-2 py-1.5 cursor-pointer hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(micro);
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-700 truncate">{micro.label}</span>
                <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                  {micro.cadence === "repeat" && (
                    <span className="text-gray-400">↻</span>
                  )}
                </div>
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
