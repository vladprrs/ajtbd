import { useState } from "react";
import { Chat } from "./components/Chat";
import { GraphPanel } from "./components/GraphPanel";

function App() {
  const [graphId, setGraphId] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with chat */}
      <div className="w-[400px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <header className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">AJTBD</h1>
          <p className="text-sm text-gray-500">Job Graph Generator</p>
        </header>
        <Chat onGraphCreated={setGraphId} currentGraphId={graphId} />
      </div>

      {/* Main content - graph visualization */}
      <main className="flex-1 overflow-auto">
        <GraphPanel graphId={graphId} />
      </main>
    </div>
  );
}

export default App;
