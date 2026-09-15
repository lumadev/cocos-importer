import type { IndexedEntity, EntityKind, PreviewInfo } from "../types";
import { baseName, entityId, type AssetParser } from "./types";

interface SpineJson {
  skeleton?: { spine?: string; images?: string; hash?: string; width?: number; height?: number };
  bones?: Array<{ name?: string; parent?: string; length?: number }>;
  slots?: Array<{ name?: string; bone?: string; attachment?: string }>;
  skins?: unknown;
  animations?: Record<string, unknown>;
  events?: Record<string, unknown>;
}

export function looksLikeSpine(text: string): SpineJson | null {
  if (!text.includes('"bones"') && !text.includes('"skeleton"')) return null;
  try {
    const data = JSON.parse(text) as SpineJson;
    if (data && (data.skeleton?.spine || (data.bones && data.slots))) return data;
    return null;
  } catch {
    return null;
  }
}

function child(
  kind: EntityKind,
  name: string,
  path: string,
  parentId: string,
  details: Record<string, string | number | string[]>,
  bundle?: string,
  preview?: PreviewInfo,
): IndexedEntity {
  return {
    id: entityId(kind, path, `${kind}/${name}`),
    kind,
    name,
    path,
    parentId,
    childIds: [],
    details,
    ...(preview ? { preview } : {}),
    ...(bundle ? { bundle } : {}),
  };
}

/** Spine SkeletonData (`.json`) — animations, skins, bones, slots, attachments, events. */
export const spineParser: AssetParser = {
  name: "SkeletonData (Spine)",
  match: (f) => f.ext === "json" && !!f.text && !!looksLikeSpine(f.text),
  parse: (file, ctx) => {
    const data = looksLikeSpine(file.text ?? "");
    if (!data) return [];
    const skelName = baseName(file.path);
    const skelId = entityId("skeletonData", file.path);
    const bundle = file.bundle;
    const kids: IndexedEntity[] = [];
    const dir = file.path.slice(0, Math.max(0, file.path.lastIndexOf("/")));
    const atlasPath = dir ? `${dir}/${skelName}.atlas` : `${skelName}.atlas`;
    const base: PreviewInfo = { type: "spine", skeleton: file.path, atlas: atlasPath };

    const animations = Object.keys(data.animations ?? {});
    for (const anim of animations) {
      const timelines = data.animations?.[anim];
      kids.push(
        child(
          "spineAnimation",
          anim,
          file.path,
          skelId,
          {
            "Skeleton Data": skelName,
            Timelines: timelines ? Object.keys(timelines as object) : "—",
          },
          bundle,
          { ...base, animation: anim },
        ),
      );
    }

    // Skins: array (3.8+) or object (3.6-).
    const skins = data.skins;
    const skinEntries: Array<{ name: string; attachments: string[] }> = [];
    if (Array.isArray(skins)) {
      for (const s of skins as Array<{ name?: string; attachments?: Record<string, object> }>) {
        const slots = s.attachments ?? {};
        const attachments = Object.values(slots).flatMap((v) => Object.keys(v ?? {}));
        skinEntries.push({ name: s.name ?? "default", attachments });
      }
    } else if (skins && typeof skins === "object") {
      for (const [name, slots] of Object.entries(skins as Record<string, Record<string, object>>)) {
        const attachments = Object.values(slots ?? {}).flatMap((v) => Object.keys(v ?? {}));
        skinEntries.push({ name, attachments });
      }
    }

    const allAttachments = new Set<string>();
    for (const skin of skinEntries) {
      skin.attachments.forEach((a) => allAttachments.add(a));
      kids.push(
        child(
          "spineSkin",
          skin.name,
          file.path,
          skelId,
          { "Skeleton Data": skelName, Attachments: skin.attachments.length },
          bundle,
          { ...base, skin: skin.name },
        ),
      );
    }
    for (const att of allAttachments) {
      kids.push(
        child(
          "spineAttachment",
          att,
          file.path,
          skelId,
          { "Skeleton Data": skelName },
          bundle,
          { ...base, attachment: att },
        ),
      );
    }

    for (const bone of data.bones ?? []) {
      if (!bone.name) continue;
      kids.push(
        child(
          "spineBone",
          bone.name,
          file.path,
          skelId,
          { "Skeleton Data": skelName, Parent: bone.parent ?? "—" },
          bundle,
          { ...base, bone: bone.name },
        ),
      );
    }
    for (const slot of data.slots ?? []) {
      if (!slot.name) continue;
      kids.push(
        child(
          "spineSlot",
          slot.name,
          file.path,
          skelId,
          {
            "Skeleton Data": skelName,
            Bone: slot.bone ?? "—",
            "Attachment padrão": slot.attachment ?? "—",
          },
          bundle,
          { ...base, slot: slot.name },
        ),
      );
    }
    for (const evt of Object.keys(data.events ?? {})) {
      kids.push(child("spineEvent", evt, file.path, skelId, { "Skeleton Data": skelName }, bundle));
    }

    const meta = ctx.meta.get(file.path);
    const skeleton: IndexedEntity = {
      id: skelId,
      kind: "skeletonData",
      name: skelName,
      path: file.path,
      childIds: kids.map((k) => k.id),
      size: file.size,
      details: {
        "Versão Spine": data.skeleton?.spine ?? "—",
        Animações: animations.length,
        Skins: skinEntries.length,
        Bones: (data.bones ?? []).length,
        Slots: (data.slots ?? []).length,
        Attachments: allAttachments.size,
        Eventos: Object.keys(data.events ?? {}).length,
        Imagens: data.skeleton?.images ?? "—",
      },
      preview: { ...base },
      ...(meta?.uuid ? { uuid: meta.uuid } : {}),
      ...(bundle ? { bundle } : {}),
    };

    return [skeleton, ...kids];
  },
};