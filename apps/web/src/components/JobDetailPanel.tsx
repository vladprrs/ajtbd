import type { Job } from "../types";
import { ScoreDisplay } from "./ScoreDisplay";

interface JobDetailPanelProps {
  job: Job | null;
  onClose: () => void;
}

export function JobDetailPanel({ job, onClose }: JobDetailPanelProps) {
  if (!job) return null;

  const phaseColors = {
    before: "bg-orange-100 text-orange-700",
    during: "bg-blue-100 text-blue-700",
    after: "bg-green-100 text-green-700",
  };

  const levelLabels = {
    big: "Big Job",
    core: "Core Job",
    small: "Small Job",
    micro: "Micro Job",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-0.5 rounded ${phaseColors[job.phase]}`}>
              {job.phase}
            </span>
            <span className="text-xs text-gray-500">
              {levelLabels[job.level]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Title and formulation */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>{job.label}</span>
              {job.cadence === "repeat" && (
                <span className="text-gray-400 text-base" title="Recurring job">↻</span>
              )}
            </h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {job.formulation}
            </p>
            {job.cadenceHint && (
              <p className="mt-1 text-xs text-gray-500 italic">
                Frequency: {job.cadenceHint}
              </p>
            )}
          </div>

          {/* User story format */}
          {(job.whenText || job.want || job.soThat) && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                User Story
              </h3>
              {job.whenText && (
                <p className="text-sm">
                  <span className="text-gray-500">When</span>{" "}
                  <span className="text-gray-900">{job.whenText}</span>
                </p>
              )}
              {job.want && (
                <p className="text-sm">
                  <span className="text-gray-500">I want to</span>{" "}
                  <span className="text-gray-900">{job.want}</span>
                </p>
              )}
              {job.soThat && (
                <p className="text-sm">
                  <span className="text-gray-500">So that</span>{" "}
                  <span className="text-gray-900">{job.soThat}</span>
                </p>
              )}
            </div>
          )}

          {/* Scores */}
          {job.scoresJson && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Scores
              </h3>
              <ScoreDisplay scores={job.scoresJson} />
            </div>
          )}

          {/* Suggested next */}
          {job.suggestedNext && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Suggested Next
              </h3>
              <p className="text-sm text-gray-700">{job.suggestedNext}</p>
            </div>
          )}

          {/* Micro jobs list */}
          {job.microJobs && job.microJobs.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Micro Jobs ({job.microJobs.length})
              </h3>
              <div className="space-y-2">
                {job.microJobs.map((micro, index) => (
                  <div
                    key={micro.id}
                    className="bg-gray-50 rounded px-3 py-2 text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-xs">{index + 1}.</span>
                      <span className="text-gray-900">{micro.label}</span>
                      {micro.cadence === "repeat" && (
                        <span className="text-gray-400">↻</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-4">
                      {micro.formulation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="pt-4 border-t border-gray-200 text-xs text-gray-400">
            <p>ID: {job.id}</p>
          </div>
        </div>
      </div>
    </>
  );
}
