import type { ProjectIndex, Workspace } from "./types";
import { DEMO_WORKSPACE_ID, DEMO_WORKSPACE_NAME, createDemoIndex } from "./demoIndex";

const WS_KEY = "cocos-index.workspaces";
const DB_NAME = "cocos-index";
const STORE = "indexes";
const HANDLES = "handles";

let persistRequested = false;

/**
 * Pede ao navegador para marcar o armazenamento como persistente, evitando
 * que o índice seja descartado automaticamente quando o disco fica cheio.
 * Os dados só somem se o usuário limpar os dados do site.
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (persistRequested) return true;
  persistRequested = true;
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(HANDLES)) db.createObjectStore(HANDLES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(store: string, key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function get<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

async function del(store: string, key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function listWorkspaces(): Workspace[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(WS_KEY);
    return raw ? (JSON.parse(raw) as Workspace[]) : [];
  } catch {
    return [];
  }
}

export function saveWorkspace(workspace: Workspace): Workspace[] {
  const all = listWorkspaces().filter((w) => w.id !== workspace.id);
  const next = [workspace, ...all];
  localStorage.setItem(WS_KEY, JSON.stringify(next));
  void ensurePersistentStorage();
  return next;
}

export async function removeWorkspace(id: string): Promise<Workspace[]> {
  const next = listWorkspaces().filter((w) => w.id !== id);
  localStorage.setItem(WS_KEY, JSON.stringify(next));
  await del(STORE, id).catch(() => undefined);
  await del(HANDLES, id).catch(() => undefined);
  return next;
}

export const saveIndex = (id: string, index: ProjectIndex) => put(STORE, id, index);
export const loadIndex = (id: string) => get<ProjectIndex>(STORE, id);
export const saveDirHandle = (id: string, handle: FileSystemDirectoryHandle) =>
  put(HANDLES, id, handle);
export const loadDirHandle = (id: string) => get<FileSystemDirectoryHandle>(HANDLES, id);

export function downloadIndex(index: ProjectIndex) {
  const blob = new Blob([JSON.stringify(index, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "project-index.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Cria (ou recria) o workspace de demonstração com um índice mock. */
export async function createDemoWorkspace(): Promise<Workspace> {
  const index = createDemoIndex();
  await saveIndex(DEMO_WORKSPACE_ID, index);
  const workspace: Workspace = {
    id: DEMO_WORKSPACE_ID,
    name: DEMO_WORKSPACE_NAME,
    path: index.rootPath,
    lastImportedAt: new Date().toISOString(),
    indexFile: "project-index.json (mock)",
    entityCount: index.stats.entities,
    demo: true,
  };
  saveWorkspace(workspace);
  return workspace;
}