import { useEffect, useState } from "react";

import { listWorkspaces } from "@/lib/cocos/storage";
import type { Workspace } from "@/lib/cocos/types";

export const ACTIVE_WORKSPACE_KEY = "auxdev:activeWorkspace";

export function getActiveWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  if (!stored) return null;
  return listWorkspaces().find((w) => w.id === stored) ?? null;
}

export function useActiveWorkspace(): Workspace | null {
  const [active, setActive] = useState<Workspace | null>(null);

  useEffect(() => {
    setActive(getActiveWorkspace());
  }, []);

  return active;
}
