/** Core domain types for the Cocos Creator project index. */

export type EntityKind =
  | "spriteAtlas"
  | "spriteFrame"
  | "texture"
  | "skeletonData"
  | "spineAnimation"
  | "spineSkin"
  | "spineBone"
  | "spineSlot"
  | "spineAttachment"
  | "spineEvent"
  | "scene"
  | "prefab"
  | "script"
  | "audio"
  | "video"
  | "font"
  | "material"
  | "shader"
  | "bundle";

export interface EntityRef {
  id: string;
  kind: EntityKind;
  name: string;
}

export interface PreviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PreviewType =
  | "image"
  | "frame"
  | "atlas"
  | "spine"
  | "audio"
  | "bitmapFont"
  | "prefab";

/** Structured data used by the Preview panel (paths are project-relative). */
export interface PreviewInfo {
  type: PreviewType;
  /** Image file (texture / atlas page / font page). */
  texture?: string;
  rect?: PreviewRect;
  rotated?: boolean;
  offset?: { x: number; y: number };
  sourceSize?: { w: number; h: number };
  /** Frames of an atlas. */
  frames?: Array<{ name: string; rect?: PreviewRect; rotated?: boolean }>;
  /** Spine skeleton `.json` and `.atlas`. */
  skeleton?: string;
  atlas?: string;
  animation?: string;
  skin?: string;
  bone?: string;
  slot?: string;
  attachment?: string;
  /** Audio file. */
  audio?: string;
  /** Prefab/scene node names. */
  nodes?: string[];
}

export interface IndexedEntity {
  /** Stable id: `${kind}:${path}#${name}` */
  id: string;
  kind: EntityKind;
  name: string;
  /** Project-relative file path this entity comes from. */
  path: string;
  /** Cocos asset uuid when available (from .meta). */
  uuid?: string;
  /** Container entity (atlas for a sprite frame, skeleton for an animation). */
  parentId?: string;
  /** Direct children (sprite frames, spine animations...). */
  childIds: string[];
  /** Arbitrary details rendered on the detail page. */
  details: Record<string, string | number | string[]>;
  bundle?: string;
  size?: number;
  /** Everything the Preview panel needs to render this entity. */
  preview?: PreviewInfo;
}

export interface UsageRef {
  /** Entity being used. */
  entityId: string;
  /** Path of the file referencing it. */
  path: string;
  /** How it was matched. */
  via: "uuid" | "name";
  /** File category of the referencing file. */
  fileKind: string;
}

export interface ProjectIndex {
  version: number;
  projectName: string;
  rootPath: string;
  createdAt: string;
  stats: {
    filesScanned: number;
    entities: number;
    byKind: Record<string, number>;
  };
  entities: IndexedEntity[];
  usages: UsageRef[];
  warnings: string[];
}

export interface Workspace {
  id: string;
  name: string;
  path: string;
  lastImportedAt: string;
  indexFile: string;
  entityCount: number;
  /** Workspace de demonstração (sem pasta real no disco). */
  demo?: boolean;
}

export const KIND_LABEL: Record<EntityKind, string> = {
  spriteAtlas: "Sprite Atlas",
  spriteFrame: "Sprite Frame",
  texture: "Textura",
  skeletonData: "Skeleton Data (Spine)",
  spineAnimation: "Animação Spine",
  spineSkin: "Skin",
  spineBone: "Bone",
  spineSlot: "Slot",
  spineAttachment: "Attachment",
  spineEvent: "Evento Spine",
  scene: "Cena",
  prefab: "Prefab",
  script: "Script",
  audio: "Áudio",
  video: "Vídeo",
  font: "Fonte",
  material: "Material",
  shader: "Shader",
  bundle: "Bundle",
};