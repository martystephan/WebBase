import { Database } from "lucide-react";
import { ConnectionManager } from "./components/ConnectionManager";
import { Workspace } from "./components/Workspace";
import { useConnections } from "./hooks/useConnections";

function App() {
  const { connections, activeId, active, setConnections, setActiveId } =
    useConnections();

  return (
    <div className="flex h-svh flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-neutral-500" />
          <h1 className="text-sm font-semibold tracking-tight">WebBase</h1>
        </div>
        <span className="text-xs text-neutral-500">MySQL viewer</span>
      </header>

      <ConnectionManager
        connections={connections}
        activeId={activeId}
        onChange={setConnections}
        onSelect={setActiveId}
      />

      <div className="flex min-h-0 flex-1">
        {active ? (
          <Workspace connection={active} />
        ) : (
          <div className="m-auto max-w-md text-center text-sm text-neutral-500">
            {connections.length === 0
              ? "Add a MySQL connection to get started."
              : "Select a connection above."}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
