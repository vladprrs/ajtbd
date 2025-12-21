import { useEffect, useState, useCallback } from "react";
import type { Job, GraphView } from "../types";
import { JobTimeline } from "./JobTimeline";
import { JobDetailPanel } from "./JobDetailPanel";

interface GraphPanelProps {
  graphId: string | null;
  refreshTrigger?: number;
}

export function GraphPanel({ graphId, refreshTrigger }: GraphPanelProps) {
  const [view, setView] = useState<GraphView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const fetchGraph = useCallback(async () => {
    if (!graphId) {
      setView(null);
      return;
    }

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
  }, [graphId]);

  // Fetch on graphId change
  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Refetch on refresh trigger (e.g., after tool completes)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchGraph();
    }
  }, [refreshTrigger, fetchGraph]);

  const handleJobSelect = useCallback((job: Job) => {
    setSelectedJob(job);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedJob(null);
  }, []);

  if (!graphId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-500">No graph selected</h3>
          <p className="mt-1 text-sm text-gray-400">
            Start a conversation to create a job graph
          </p>
          <div className="mt-6 text-xs text-gray-400 max-w-xs mx-auto">
            <p className="font-medium mb-2">Try asking:</p>
            <p className="italic">
              "Create a graph for software developers who want to deploy code faster"
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !view) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Loading graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={fetchGraph}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!view) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {view.graph.segment}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{view.graph.coreJob}</p>
          </div>
          <button
            onClick={fetchGraph}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center space-x-4 mt-3">
          <Stat label="Small Jobs" value={view.stats.smallJobs} />
          <Stat label="Micro Jobs" value={view.stats.microJobs} />
          <Stat label="Total" value={view.stats.totalJobs} />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        <JobTimeline
          jobs={view.jobs}
          onJobSelect={handleJobSelect}
          selectedJobId={selectedJob?.id}
        />
      </div>

      {/* Detail Panel */}
      <JobDetailPanel job={selectedJob} onClose={handleCloseDetail} />
    </div>
  );
}

interface StatProps {
  label: string;
  value: number;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="flex items-center space-x-1.5">
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
