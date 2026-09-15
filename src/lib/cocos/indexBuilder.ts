import type { ProjectFile } from "./importer";
import { spineParser } from "./parsers/spine";
import { prefabParser, sceneParser } from "./parsers/scene";
import { scriptParser } from "./parsers/script";
import {
  audioParser,
  fontParser,
  materialParser,
  shaderParser,
  videoParser,
} from "./parsers/media";
import { spineAtlasParser, spriteAtlasParser, textureParser } from "./parsers/spriteAtlas";
import type { AssetParser, MetaInfo, ParseContext } from "./parsers/types";
import { entityId } from "./parsers/types";
import type { IndexedEntity, ProjectIndex, UsageRef } from "./types";

/** Registry — add new parsers here to support more Cocos asset types. */
export const PARSERS: AssetParser[] = [
  spriteAtlasParser,
  spineAtlasParser,
  spineParser,
  textureParser,
  sceneParser,
  prefabParser,
  scriptParser,
  audioParser,
  videoParser,
  fontParser,
  materialParser,
  shaderParser,
];

const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const TOKEN_RE = /["']([A-Za-z0-9_\-. ]{3,60})["']/g;

function collectMeta(files: ProjectFile[]) {
  const meta = new Map<string, MetaInfo>();
  const bundleDirs: Array<{ dir: string; name: string }> = [];
  for (const file of files) {
    if (file.ext !== "meta" || !file.text) continue;
    const target = file.path.slice(0, -".meta".length);
    try {
      const data = JSON.parse(file.text) as {
        uuid?: string;
        subMetas?: Record<string, { uuid?: string; rawWidth?: number; rawHeight?: number }>;
        isBundle?: boolean;
        bundleName?: string;
      };
      meta.set(target, { ...(data.uuid ? { uuid: data.uuid } : {}), subMetas: data.subMetas ?? {} });
      if (data.isBundle) {
        bundleDirs.push({ dir: target, name: data.bundleName || target.split("/").pop() || target });
      }
    } catch {
      /* ignore malformed meta */
    }
  }
  return { meta, bundleDirs };
}

export interface BuildOptions {
  projectName: string;
  rootPath: string;
  onProgress?: (message: string) => void;
}

/** Index Builder: runs every parser and produces the project-index.json payload. */
export function buildIndex(files: ProjectFile[], options: BuildOptions): ProjectIndex {
  const warnings: string[] = [];
  const { meta, bundleDirs } = collectMeta(files);
  const ctx: ParseContext = { meta, warn: (m) => warnings.push(m) };

  const entities: IndexedEntity[] = [];
  for (const file of files) {
    if (file.ext === "meta") continue;
    for (const parser of PARSERS) {
      if (!parser.match(file)) continue;
      try {
        entities.push(...parser.parse(file, ctx));
      } catch (error) {
        warnings.push(`${parser.name} falhou em ${file.path}: ${String(error)}`);
      }
      break;
    }
  }

  // Bundles
  for (const bundle of bundleDirs) {
    const members = entities.filter((e) => e.path.startsWith(`${bundle.dir}/`));
    const roots = members.filter((m) => !m.parentId);
    entities.push({
      id: entityId("bundle", bundle.dir),
      kind: "bundle",
      name: bundle.name,
      path: bundle.dir,
      childIds: roots.map((m) => m.id),
      details: { Pasta: bundle.dir, Assets: roots.length },
    });
  }

  // ---- Cross references -------------------------------------------------
  const byUuid = new Map<string, string>();
  const byId = new Map<string, IndexedEntity>();
  const byName = new Map<string, string[]>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
    if (entity.uuid) byUuid.set(entity.uuid, entity.id);
    const list = byName.get(entity.name) ?? [];
    list.push(entity.id);
    byName.set(entity.name, list);
  }

  const usages: UsageRef[] = [];
  const seen = new Set<string>();
  const referencing = files.filter(
    (f) => f.text && ["fire", "scene", "prefab", "ts", "js", "json", "anim", "mtl"].includes(f.ext),
  );

  for (const file of referencing) {
    const text = file.text ?? "";
    for (const match of text.matchAll(UUID_RE)) {
      const target = byUuid.get(match[0]);
      if (!target) continue;
      const key = `${target}|${file.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      usages.push({ entityId: target, path: file.path, via: "uuid", fileKind: file.ext });
    }
    for (const match of text.matchAll(TOKEN_RE)) {
      const token = match[1];
      if (!token) continue;
      for (const target of byName.get(token) ?? []) {
        const entity = byId.get(target);
        if (!entity || entity.path === file.path) continue;
        const key = `${target}|${file.path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        usages.push({ entityId: target, path: file.path, via: "name", fileKind: file.ext });
      }
    }
  }

  const byKind: Record<string, number> = {};
  for (const entity of entities) byKind[entity.kind] = (byKind[entity.kind] ?? 0) + 1;

  options.onProgress?.("Índice gerado");

  return {
    version: 1,
    projectName: options.projectName,
    rootPath: options.rootPath,
    createdAt: new Date().toISOString(),
    stats: { filesScanned: files.length, entities: entities.length, byKind },
    entities,
    usages,
    warnings: warnings.slice(0, 50),
  };
}