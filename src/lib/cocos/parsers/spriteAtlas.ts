import type { IndexedEntity, PreviewRect } from "../types";
import { parsePlist } from "./plist";
import { baseName, entityId, type AssetParser } from "./types";

function nums(value: unknown): number[] {
  return String(value ?? "")
    .match(/-?\d+(\.\d+)?/g)
    ?.map(Number) ?? [];
}

function rectOf(value: unknown): PreviewRect | undefined {
  const [x, y, w, h] = nums(value);
  if ([x, y, w, h].some((n) => typeof n !== "number" || Number.isNaN(n))) return undefined;
  return { x: x as number, y: y as number, w: w as number, h: h as number };
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(0, i) : "";
}

function sibling(path: string, file: string): string {
  const dir = dirOf(path);
  return dir ? `${dir}/${file}` : file;
}

/** TexturePacker / Cocos `.plist` sprite sheets and Spine `.atlas` files. */
export const spriteAtlasParser: AssetParser = {
  name: "SpriteAtlas (.plist)",
  match: (f) => f.ext === "plist" && !!f.text,
  parse: (file, ctx) => {
    const data = parsePlist(file.text ?? "");
    if (!data) {
      ctx.warn(`Não foi possível interpretar o plist: ${file.path}`);
      return [];
    }
    const frames = (data['frames'] ?? data['textures']) as Record<string, unknown> | undefined;
    if (!frames || typeof frames !== "object") return [];

    const metadata = (data['metadata'] ?? {}) as Record<string, unknown>;
    const texture = String(metadata['realTextureFileName'] ?? metadata['textureFileName'] ?? "");
    const atlasName = baseName(file.path);
    const atlasId = entityId("spriteAtlas", file.path);
    const meta = ctx.meta.get(file.path);
    const texturePath = sibling(file.path, texture || `${atlasName}.png`);
    const pageSize = nums(metadata['size']);

    const frameNames = Object.keys(frames);
    const children: IndexedEntity[] = frameNames.map((frameName) => {
      const frame = frames[frameName] as Record<string, unknown>;
      const rect = rectOf(frame?.['frame'] ?? frame?.['textureRect']);
      const source = nums(frame?.['sourceSize'] ?? frame?.['spriteSourceSize']);
      const off = nums(frame?.['offset'] ?? frame?.['spriteOffset']);
      const rotated = Boolean(frame?.['rotated'] ?? frame?.['textureRotated'] ?? false);
      return {
        id: entityId("spriteFrame", file.path, frameName),
        kind: "spriteFrame",
        name: frameName,
        path: file.path,
        parentId: atlasId,
        childIds: [],
        details: {
          Atlas: atlasName,
          Frame: String(frame?.['frame'] ?? frame?.['textureRect'] ?? "—"),
          "Source size": String(frame?.['sourceSize'] ?? frame?.['spriteSourceSize'] ?? "—"),
          Rotacionado: rotated ? "sim" : "não",
        },
        preview: {
          type: "frame" as const,
          texture: texturePath,
          rotated,
          ...(rect ? { rect } : {}),
          ...(source.length >= 2 ? { sourceSize: { w: source[0]!, h: source[1]! } } : {}),
          ...(off.length >= 2 ? { offset: { x: off[0]!, y: off[1]! } } : {}),
        },
        ...(file.bundle ? { bundle: file.bundle } : {}),
      };
    });

    const atlas: IndexedEntity = {
      id: atlasId,
      kind: "spriteAtlas",
      name: atlasName,
      path: file.path,
      childIds: children.map((c) => c.id),
      size: file.size,
      details: {
        Formato: "plist (TexturePacker)",
        "Sprite frames": frameNames.length,
        Textura: texture || "—",
      },
      preview: {
        type: "atlas",
        texture: texturePath,
        ...(pageSize.length >= 2
          ? { sourceSize: { w: pageSize[0]!, h: pageSize[1]! } }
          : {}),
        frames: children.map((c) => ({
          name: c.name,
          ...(c.preview?.rect ? { rect: c.preview.rect } : {}),
          rotated: Boolean(c.preview?.rotated),
        })),
      },
      ...(meta?.uuid ? { uuid: meta.uuid } : {}),
      ...(file.bundle ? { bundle: file.bundle } : {}),
    };

    return [atlas, ...children];
  },
};

/** Spine `.atlas` (text region list) — also a sprite container. */
export const spineAtlasParser: AssetParser = {
  name: "Spine atlas (.atlas)",
  match: (f) => f.ext === "atlas" && !!f.text,
  parse: (file, ctx) => {
    const lines = (file.text ?? "").split(/\r?\n/);
    const atlasName = baseName(file.path);
    const atlasId = entityId("spriteAtlas", file.path);
    const regions: Array<{ name: string; rect?: PreviewRect; rotated?: boolean }> = [];
    const pages: string[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      if (!line.trim()) continue;
      if (/\.(png|jpg|jpeg|webp)\s*$/i.test(line.trim()) && !line.includes(":")) {
        pages.push(line.trim());
        continue;
      }
      if (!line.startsWith(" ") && !line.startsWith("\t") && !line.includes(":")) {
        regions.push({ name: line.trim() });
        continue;
      }
      const current = regions[regions.length - 1];
      if (!current) continue;
      const [key, rawValue] = line.split(":");
      const prop = (key ?? "").trim().toLowerCase();
      const value = nums(rawValue);
      if (prop === "xy" && value.length >= 2) {
        current.rect = { x: value[0]!, y: value[1]!, w: current.rect?.w ?? 0, h: current.rect?.h ?? 0 };
      } else if (prop === "size" && value.length >= 2) {
        current.rect = { x: current.rect?.x ?? 0, y: current.rect?.y ?? 0, w: value[0]!, h: value[1]! };
      } else if (prop === "bounds" && value.length >= 4) {
        current.rect = { x: value[0]!, y: value[1]!, w: value[2]!, h: value[3]! };
      } else if (prop === "rotate") {
        current.rotated = /true|90/i.test(rawValue ?? "");
      }
    }

    const page = pages[0];
    const texturePath = sibling(file.path, page ?? `${atlasName}.png`);

    const children: IndexedEntity[] = regions.map((region) => ({
      id: entityId("spriteFrame", file.path, region.name),
      kind: "spriteFrame",
      name: region.name,
      path: file.path,
      parentId: atlasId,
      childIds: [],
      details: {
        Atlas: atlasName,
        Tipo: "Região Spine",
        Retângulo: region.rect
          ? `${region.rect.x},${region.rect.y} ${region.rect.w}x${region.rect.h}`
          : "—",
      },
      preview: {
        type: "frame" as const,
        texture: texturePath,
        rotated: Boolean(region.rotated),
        ...(region.rect ? { rect: region.rect } : {}),
      },
      ...(file.bundle ? { bundle: file.bundle } : {}),
    }));

    const meta = ctx.meta.get(file.path);
    return [
      {
        id: atlasId,
        kind: "spriteAtlas",
        name: atlasName,
        path: file.path,
        childIds: children.map((c) => c.id),
        size: file.size,
        details: {
          Formato: "Spine atlas",
          Regiões: regions.length,
          Páginas: pages.length ? pages : "—",
        },
        preview: {
          type: "atlas",
          texture: texturePath,
          frames: regions.map((r) => ({
            name: r.name,
            ...(r.rect ? { rect: r.rect } : {}),
            rotated: Boolean(r.rotated),
          })),
        },
        ...(meta?.uuid ? { uuid: meta.uuid } : {}),
        ...(file.bundle ? { bundle: file.bundle } : {}),
      },
      ...children,
    ];
  },
};

/** Standalone textures whose `.meta` declares sprite frames (subMetas). */
export const textureParser: AssetParser = {
  name: "Texture (.png/.jpg)",
  match: (f) => ["png", "jpg", "jpeg", "webp"].includes(f.ext),
  parse: (file, ctx) => {
    const meta = ctx.meta.get(file.path);
    const texId = entityId("texture", file.path);
    const subs = Object.entries(meta?.subMetas ?? {});
    const children: IndexedEntity[] = subs.map(([name, sub]) => ({
      id: entityId("spriteFrame", file.path, name),
      kind: "spriteFrame",
      name,
      path: file.path,
      parentId: texId,
      childIds: [],
      details: {
        Textura: baseName(file.path),
        Dimensões:
          sub.rawWidth && sub.rawHeight ? `${sub.rawWidth} x ${sub.rawHeight}` : "—",
      },
      preview: {
        type: "frame" as const,
        texture: file.path,
        ...(sub.rawWidth && sub.rawHeight
          ? { sourceSize: { w: sub.rawWidth, h: sub.rawHeight } }
          : {}),
      },
      ...(sub.uuid ? { uuid: sub.uuid } : {}),
      ...(file.bundle ? { bundle: file.bundle } : {}),
    }));

    return [
      {
        id: texId,
        kind: "texture",
        name: baseName(file.path),
        path: file.path,
        childIds: children.map((c) => c.id),
        size: file.size,
        details: {
          Formato: file.ext.toUpperCase(),
          "Sprite frames": children.length,
        },
        preview: { type: "image", texture: file.path },
        ...(meta?.uuid ? { uuid: meta.uuid } : {}),
        ...(file.bundle ? { bundle: file.bundle } : {}),
      },
      ...children,
    ];
  },
};