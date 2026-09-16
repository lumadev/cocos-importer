/**
 * Guards relative project paths before walking a FileSystemDirectoryHandle.
 * Rejects traversal (`..`), absolute paths, and null bytes.
 */
export function isSafeRelativePath(path: string): boolean {
  if (!path || path.includes("\0")) return false;
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return false;
  const parts = normalized.split("/").filter((p) => p.length > 0);
  if (parts.length === 0) return false;
  return parts.every((part) => part !== "." && part !== "..");
}
