/**
 * Reads individual files (package.json, docs, etc.) from the directory
 * handle stored for an imported workspace, on demand, in the browser.
 */
import { loadDirHandle } from "./storage";

export type ProjectFileStatus =
  "ready" | "permission" | "unavailable" | "unsupported" | "missing" | "demo";

export interface ProjectFileResult {
  status: ProjectFileStatus;
  content: string | null;
}

interface PermissionHandle extends FileSystemDirectoryHandle {
  queryPermission?: (opts: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (opts: { mode: "read" }) => Promise<PermissionState>;
}

async function resolveFileHandle(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemFileHandle | null> {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return null;
  try {
    let dir = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
    return await dir.getFileHandle(fileName);
  } catch {
    return null;
  }
}

/**
 * Reads a text file at `path` (relative to the project root) using the
 * directory handle saved for `workspaceId`. Demo workspaces have no real
 * folder on disk, so they always resolve to "demo".
 */
export async function readWorkspaceTextFile(
  workspaceId: string,
  path: string,
  demo?: boolean,
): Promise<ProjectFileResult> {
  if (demo) return { status: "demo", content: null };
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    return { status: "unsupported", content: null };
  }

  const handle = (await loadDirHandle(workspaceId).catch(() => undefined)) as
    PermissionHandle | undefined;
  if (!handle) return { status: "unavailable", content: null };

  let permission =
    (await handle.queryPermission?.({ mode: "read" })) ?? "granted";
  if (permission !== "granted") {
    permission =
      (await handle.requestPermission?.({ mode: "read" })) ?? "denied";
  }
  if (permission !== "granted") return { status: "permission", content: null };

  const fileHandle = await resolveFileHandle(handle, path);
  if (!fileHandle) return { status: "missing", content: null };

  try {
    const file = await fileHandle.getFile();
    return { status: "ready", content: await file.text() };
  } catch {
    return { status: "missing", content: null };
  }
}
