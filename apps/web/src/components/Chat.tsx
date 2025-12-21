import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

interface ChatProps {
  onGraphCreated: (graphId: string) => void;
  onGraphUpdated: () => void;
  currentGraphId: string | null;
}

export function Chat({ onGraphCreated, onGraphUpdated, currentGraphId }: ChatProps) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    append,
    reload,
    setMessages,
  } = useChat({
    api: "/api/chat",
    headers: {
      "X-Session-ID": sessionId,
    },
    body: {
      graphId: currentGraphId,
      language: "ru",
    },
    keepLastMessageOnError: true,
    onError: (err) => {
      setLocalError(err?.message || "Stream error");
    },
    onFinish: (message) => {
      // Check for tool results
      if (message.toolInvocations) {
        let graphUpdated = false;
        for (const tool of message.toolInvocations) {
          if (tool.state === "result" && tool.result?.success) {
            // New graph created
            if (tool.result?.graphId) {
              onGraphCreated(tool.result.graphId as string);
            }
            // Any successful tool means graph was updated
            graphUpdated = true;
          }
        }
        if (graphUpdated) {
          onGraphUpdated();
        }
      }
    },
  });

  useEffect(() => {
    if (error) {
      setLocalError(error.message || "Stream error");
    }
  }, [error]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmitWithCapture = (event?: FormEvent<HTMLFormElement>) => {
    if (input.trim()) {
      setLastPrompt(input.trim());
    }
    setLocalError(null);
    handleSubmit(event);
  };

  const handleRetry = async () => {
    setLocalError(null);
    if (messages.length > 0) {
      await reload();
    } else if (lastPrompt) {
      await append({
        role: "user",
        content: lastPrompt,
      });
    }
  };

  const handleResetSession = async () => {
    setLocalError(null);
    try {
      await fetch("/api/chat/session", {
        method: "DELETE",
        headers: {
          "X-Session-ID": sessionId,
        },
      });
    } catch (err) {
      console.error("Failed to reset session", err);
    }
    setMessages([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">Start a conversation to create a job graph.</p>
            <p className="text-xs mt-2 text-gray-400">
              Try: "Create a graph for software developers who want to deploy code faster"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {/* Message content */}
              <div className="message-content whitespace-pre-wrap">
                {message.content}
              </div>

              {/* Tool invocations */}
              {message.toolInvocations && message.toolInvocations.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.toolInvocations.map((tool) => (
                    <ToolInvocation key={tool.toolCallId} tool={tool} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-200"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-400"></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {localError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">
              Error: {localError}
            </p>
            <div className="flex space-x-2 mt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={handleResetSession}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                Reset session
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmitWithCapture} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Describe your segment and core job..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Send
          </button>
        </div>
        {currentGraphId && (
          <p className="text-xs text-gray-400 mt-2">
            Working with graph: {currentGraphId.slice(0, 8)}...
          </p>
        )}
      </form>
    </div>
  );
}

interface ToolInvocationProps {
  tool: {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    state: "partial-call" | "call" | "result";
    result?: Record<string, unknown>;
  };
}

function ToolInvocation({ tool }: ToolInvocationProps) {
  const toolLabels: Record<string, string> = {
    graph_create: "Creating graph",
    small_jobs_generate: "Generating small jobs",
    micro_jobs_generate: "Generating micro jobs",
    micro_jobs_generate_all: "Generating all micro jobs",
    job_update: "Updating job",
    job_insert_after: "Inserting job",
    job_reorder: "Reordering jobs",
  };

  const label = toolLabels[tool.toolName] || tool.toolName;
  const isComplete = tool.state === "result";
  const isSuccess = isComplete && Boolean(tool.result?.success);

  return (
    <div
      className={`text-xs px-2 py-1 rounded ${
        isComplete
          ? isSuccess
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      <div className="flex items-center space-x-1">
        {!isComplete && (
          <svg
            className="animate-spin h-3 w-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {isComplete && isSuccess && <span>✓</span>}
        {isComplete && !isSuccess && <span>✗</span>}
        <span>{label}</span>
      </div>
      {isComplete && tool.result?.message ? (
        <p className="mt-1 opacity-75">{String(tool.result.message)}</p>
      ) : null}
    </div>
  );
}
