import { useEffect, useState } from "react";
import { createSearchEngine, type SearchEngine } from "./searchEngine";
import { listWorkspaces, loadIndex } from "./storage";
import type { Workspace } from "./types";

export function useWorkspaceEngine(id: string) {
  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const ws = listWorkspaces().find((w) => w.id === id) ?? null;
      const index = await loadIndex(id).catch(() => undefined);
      if (cancelled) return;
      setWorkspace(ws);
      setEngine(index ? createSearchEngine(index) : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  return { engine, workspace, loading, reload: () => setNonce((n) => n + 1) };
}