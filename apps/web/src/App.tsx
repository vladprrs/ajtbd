import { useState, useCallback } from "react";
import { Chat } from "./components/Chat";
import { GraphPanel } from "./components/GraphPanel";

function App() {
  const [graphId, setGraphId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleGraphCreated = useCallback((id: string) => {
    setGraphId(id);
  }, []);

  const handleGraphUpdated = useCallback(() => {
    // Increment trigger to cause GraphPanel to refresh
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with chat */}
      <div className="w-[420px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <header className="px-4 py-3 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">AJTBD</h1>
          <p className="text-xs text-gray-500">Job Graph Generator</p>
        </header>
        <Chat
          onGraphCreated={handleGraphCreated}
          onGraphUpdated={handleGraphUpdated}
          currentGraphId={graphId}
        />
      </div>

      {/* Main content - graph visualization */}
      <main className="flex-1 overflow-hidden">
        <GraphPanel graphId={graphId} refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
}

export default App;
