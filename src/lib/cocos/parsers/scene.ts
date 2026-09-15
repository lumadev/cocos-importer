import type { IndexedEntity, EntityKind } from "../types";
import { baseName, entityId, type AssetParser } from "./types";

interface CocosNodeRecord {
  __type__?: string;
  _name?: string;
  _components?: Array<{ __id__?: number }>;
  node?: { __id__?: number };
}

function parseNodeGraph(text: string) {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const list = (Array.isArray(data) ? data : [data]) as CocosNodeRecord[];
  const nodes: string[] = [];
  const components = new Map<string, number>();
  for (const record of list) {
    const type = record?.__type__ ?? "";
    if (type === "cc.Node") {
      if (record._name) nodes.push(record._name);
    } else if (type && (record.node || type.startsWith("cc.") || type.length === 36)) {
      if (type === "cc.SceneAsset" || type === "cc.Scene" || type === "cc.Prefab") continue;
      components.set(type, (components.get(type) ?? 0) + 1);
    }
  }
  return { nodes, components };
}

function makeSceneLike(kind: EntityKind): AssetParser {
  const exts = kind === "scene" ? ["fire", "scene"] : ["prefab"];
  return {
    name: kind === "scene" ? "Cena (.fire/.scene)" : "Prefab (.prefab)",
    match: (f) => exts.includes(f.ext) && !!f.text,
    parse: (file, ctx) => {
      const graph = parseNodeGraph(file.text ?? "");
      if (!graph) {
        ctx.warn(`Arquivo inválido: ${file.path}`);
        return [];
      }
      const meta = ctx.meta.get(file.path);
      return [
        {
          id: entityId(kind, file.path),
          kind,
          name: baseName(file.path),
          path: file.path,
          childIds: [],
          size: file.size,
          details: {
            Nodes: graph.nodes.length,
            "Hierarquia (nodes)": graph.nodes.slice(0, 200),
            Componentes: Array.from(graph.components.entries()).map(
              ([type, count]) => `${type} (${count})`,
            ),
          },
          ...(kind === "prefab"
            ? { preview: { type: "prefab" as const, nodes: graph.nodes.slice(0, 200) } }
            : {}),
          ...(meta?.uuid ? { uuid: meta.uuid } : {}),
          ...(file.bundle ? { bundle: file.bundle } : {}),
        },
      ];
    },
  };
}

export const sceneParser = makeSceneLike("scene");
export const prefabParser = makeSceneLike("prefab");