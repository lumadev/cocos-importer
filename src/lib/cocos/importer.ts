/**
 * Importer: locates and reads the relevant files of a Cocos Creator project
 * from a directory chosen by the user (File System Access API).
 */

export interface ProjectFile {
  /** Project-relative path, e.g. "assets/atlas/ui.plist" */
  path: string;
  name: string;
  ext: string;
  size: number;
  /** Text content when the file is textual and small enough. */
  text?: string;
  /** Bundle name inferred from the path (assets/<bundle>/...). */
  bundle?: string;
}

const TEXT_EXTS = new Set([
  "plist",
  "json",
  "atlas",
  "meta",
  "fire",
  "scene",
  "prefab",
  "ts",
  "js",
  "mtl",
  "effect",
  "pac",
  "anim",
  "fnt",
]);

const BINARY_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "mp3",
  "ogg",
  "wav",
  "m4a",
  "mp4",
  "webm",
  "ttf",
  "otf",
  "skel",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  "library",
  "temp",
  "build",
  "local",
  ".git",
  ".creator",
  "settings",
  "packages",
]);

const MAX_TEXT_BYTES = 8 * 1024 * 1024;

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickProjectDirectory(): Promise<FileSystemDirectoryHandle> {
  const picker = (
    window as unknown as {
      showDirectoryPicker: (o?: unknown) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  return picker({ id: "cocos-project", mode: "read" });
}

function bundleOf(path: string): string | undefined {
  const parts = path.split("/");
  if (parts[0] === "assets" && parts.length > 2) return parts[1];
  return undefined;
}

export async function readProjectFiles(
  root: FileSystemDirectoryHandle,
  onProgress?: (info: { scanned: number; current: string }) => void,
): Promise<ProjectFile[]> {
  const out: ProjectFile[] = [];
  let scanned = 0;

  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    const entries = (
      dir as unknown as {
        entries: () => AsyncIterable<[string, FileSystemHandle]>;
      }
    ).entries();
    for await (const [name, handle] of entries) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === "directory") {
        if (SKIP_DIRS.has(name.toLowerCase())) continue;
        await walk(handle as FileSystemDirectoryHandle, path);
        continue;
      }
      const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
      if (!TEXT_EXTS.has(ext) && !BINARY_EXTS.has(ext)) continue;

      const file = await (handle as FileSystemFileHandle).getFile();
      scanned += 1;
      if (scanned % 40 === 0) onProgress?.({ scanned, current: path });

      const bundle = bundleOf(path);
      const pf: ProjectFile = {
        path,
        name,
        ext,
        size: file.size,
        ...(bundle ? { bundle } : {}),
      };
      if (TEXT_EXTS.has(ext) && file.size <= MAX_TEXT_BYTES) {
        pf.text = await file.text();
      }
      out.push(pf);
    }
  }

  await walk(root, "");
  onProgress?.({ scanned, current: "concluído" });
  return out;
}