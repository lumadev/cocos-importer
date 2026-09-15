import type { ProjectFile } from "../importer";
import type { IndexedEntity } from "../types";

export interface MetaInfo {
  uuid?: string;
  subMetas: Record<string, { uuid?: string; rawWidth?: number; rawHeight?: number }>;
}

export interface ParseContext {
  /** Meta info keyed by the asset path (without the `.meta` suffix). */
  meta: Map<string, MetaInfo>;
  warn: (message: string) => void;
}

export interface AssetParser {
  name: string;
  match: (file: ProjectFile) => boolean;
  parse: (file: ProjectFile, ctx: ParseContext) => IndexedEntity[];
}

export function entityId(kind: string, path: string, name?: string): string {
  return name ? `${kind}:${path}#${name}` : `${kind}:${path}`;
}

export function baseName(path: string): string {
  const file = path.split("/").pop() ?? path;
  const dot = file.lastIndexOf(".");
  return dot > 0 ? file.slice(0, dot) : file;
}