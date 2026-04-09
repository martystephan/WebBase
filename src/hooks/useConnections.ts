import { useCallback, useMemo, useState } from "react";
import {
  loadActiveId,
  loadConnections,
  saveActiveId,
  saveConnections,
  type Connection,
} from "../lib/connections";

export function useConnections() {
  const [connections, setConnectionsState] = useState<Connection[]>(() =>
    loadConnections()
  );
  const [activeId, setActiveIdState] = useState<string | null>(() =>
    loadActiveId()
  );

  const setConnections = useCallback((next: Connection[]) => {
    setConnectionsState(next);
    saveConnections(next);
  }, []);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    saveActiveId(id);
  }, []);

  const active = useMemo(
    () => connections.find((c) => c.id === activeId) ?? null,
    [connections, activeId]
  );

  return { connections, activeId, active, setConnections, setActiveId };
}
