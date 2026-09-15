import { useEffect, useState } from "react";

import {
  readWorkspaceTextFile,
  type ProjectFileStatus,
} from "@/lib/cocos/projectFile";

export interface NpmScriptsResult {
  status: ProjectFileStatus | "loading" | "invalid";
  scripts: Record<string, string>;
}

/**
 * Reads the `scripts` section of the `package.json` at the root of the
 * imported project's folder (always the project root, per convention).
 */
export function useNpmScripts(
  workspaceId: string | null,
  demo: boolean,
): NpmScriptsResult {
  const [result, setResult] = useState<NpmScriptsResult>({
    status: "loading",
    scripts: {},
  });

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) {
      setResult({ status: "unavailable", scripts: {} });
      return;
    }
    setResult({ status: "loading", scripts: {} });
    (async () => {
      const { status, content } = await readWorkspaceTextFile(
        workspaceId,
        "package.json",
        demo,
      );
      if (cancelled) return;
      if (status !== "ready" || !content) {
        setResult({ status, scripts: {} });
        return;
      }
      try {
        const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
        setResult({ status: "ready", scripts: pkg.scripts ?? {} });
      } catch {
        setResult({ status: "invalid", scripts: {} });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, demo]);

  return result;
}
