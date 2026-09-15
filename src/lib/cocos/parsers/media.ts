import type { EntityKind, PreviewInfo } from "../types";
import { baseName, entityId, type AssetParser } from "./types";

function fontPreview(path: string, text?: string): PreviewInfo | undefined {
  if (!path.toLowerCase().endsWith(".fnt")) return undefined;
  const page = text?.match(/file="([^"]+)"/)?.[1];
  const dir = path.slice(0, Math.max(0, path.lastIndexOf("/")));
  const name = baseName(path);
  const texture = dir ? `${dir}/${page ?? `${name}_0.png`}` : (page ?? `${name}_0.png`);
  return { type: "bitmapFont", texture };
}

function simpleParser(name: string, kind: EntityKind, exts: string[]): AssetParser {
  return {
    name,
    match: (f) => exts.includes(f.ext),
    parse: (file, ctx) => {
      const meta = ctx.meta.get(file.path);
      const preview: PreviewInfo | undefined =
        kind === "audio"
          ? { type: "audio", audio: file.path }
          : kind === "font"
            ? fontPreview(file.path, file.text)
            : undefined;
      return [
        {
          id: entityId(kind, file.path),
          kind,
          name: baseName(file.path),
          path: file.path,
          childIds: [],
          size: file.size,
          details: {
            Formato: file.ext.toUpperCase(),
            Tamanho: `${(file.size / 1024).toFixed(1)} KB`,
          },
          ...(preview ? { preview } : {}),
          ...(meta?.uuid ? { uuid: meta.uuid } : {}),
          ...(file.bundle ? { bundle: file.bundle } : {}),
        },
      ];
    },
  };
}

export const audioParser = simpleParser("Áudio", "audio", ["mp3", "ogg", "wav", "m4a"]);
export const videoParser = simpleParser("Vídeo", "video", ["mp4", "webm"]);
export const fontParser = simpleParser("Fonte", "font", ["ttf", "otf", "fnt"]);
export const materialParser = simpleParser("Material", "material", ["mtl"]);
export const shaderParser = simpleParser("Shader", "shader", ["effect"]);