/** Resolves project-relative file paths to blobs for the Preview panel. */
import { loadDirHandle } from "../storage";
import type { ProjectIndex } from "../types";
import { createDemoFile } from "./demoAssets";

export type SourceStatus = "ready" | "permission" | "unavailable" | "unsupported";

export interface FileSource {
  status: SourceStatus;
  /** Object URL for the file, or null when it cannot be read. */
  url(path: string): Promise<string | null>;
  /** Text content of the file, or null. */
  text(path: string): Promise<string | null>;
  /** Data URI (needed by the Spine player). */
  dataUri(path: string): Promise<string | null>;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function makeSource(
  status: SourceStatus,
  read: (path: string) => Promise<Blob | null>,
): FileSource {
  const blobs = new Map<string, Promise<Blob | null>>();
  const urls = new Map<string, string | null>();

  const get = (path: string) => {
    let pending = blobs.get(path);
    if (!pending) {
      pending = read(path).catch(() => null);
      blobs.set(path, pending);
    }
    return pending;
  };

  return {
    status,
    async url(path) {
      if (urls.has(path)) return urls.get(path) ?? null;
      const blob = await get(path);
      const value = blob ? URL.createObjectURL(blob) : null;
      urls.set(path, value);
      return value;
    },
    async text(path) {
      const blob = await get(path);
      return blob ? blob.text() : null;
    },
    async dataUri(path) {
      const blob = await get(path);
      return blob ? blobToDataUri(blob) : null;
    },
  };
}

interface PermissionHandle extends FileSystemDirectoryHandle {
  queryPermission?: (opts: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (opts: { mode: "read" }) => Promise<PermissionState>;
}

async function readFromDisk(root: FileSystemDirectoryHandle, path: string): Promise<Blob | null> {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return null;
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part);
  }
  const handle = await dir.getFileHandle(fileName);
  return handle.getFile();
}

/**
 * Demo workspaces generate their files in memory; imported workspaces read
 * them on demand through the stored directory handle (may ask for permission).
 */
export async function createFileSource(
  workspaceId: string,
  index: ProjectIndex,
  demo: boolean,
): Promise<FileSource> {
  if (demo) return makeSource("ready", (path) => createDemoFile(index, path));

  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    return makeSource("unsupported", async () => null);
  }

  const handle = (await loadDirHandle(workspaceId).catch(() => undefined)) as
    | PermissionHandle
    | undefined;
  if (!handle) return makeSource("unavailable", async () => null);

  let permission = (await handle.queryPermission?.({ mode: "read" })) ?? "granted";
  if (permission !== "granted") {
    permission = (await handle.requestPermission?.({ mode: "read" })) ?? "denied";
  }
  if (permission !== "granted") return makeSource("permission", async () => null);

  return makeSource("ready", (path) => readFromDisk(handle, path));
}
