import type { EntityKind, IndexedEntity, PreviewRect, ProjectIndex, UsageRef } from "./types";

export const DEMO_WORKSPACE_ID = "demo-slot-game";
export const DEMO_WORKSPACE_NAME = "Demo — Slot Game (mock)";

let uuidSeed = 0;
const uuid = () => {
  uuidSeed += 1;
  const n = uuidSeed.toString(16).padStart(6, "0");
  return `a1b2c3d4-${n.slice(0, 4)}-4f${n.slice(4)}-9abc-0123456789ab`;
};

const entities: IndexedEntity[] = [];
const usages: UsageRef[] = [];

function add(e: Omit<IndexedEntity, "childIds"> & { childIds?: string[] }): IndexedEntity {
  const entity: IndexedEntity = { childIds: [], ...e };
  entities.push(entity);
  return entity;
}

const id = (kind: EntityKind, path: string, name: string) => `${kind}:${path}#${name}`;

function addAtlas(path: string, bundle: string, frames: [string, number, number][]) {
  const name = path.split("/").pop()!.replace(/\.plist$/, "");
  const atlasId = id("spriteAtlas", path, name);
  const texture = path.replace(/\.plist$/, ".png");
  // Simple shelf packing so the demo atlas page and the frame crops match.
  const pageWidth = 1024;
  let penX = 0;
  let penY = 0;
  let rowHeight = 0;
  const rects: PreviewRect[] = [];
  for (const [, w, h] of frames) {
    if (penX + w > pageWidth) {
      penX = 0;
      penY += rowHeight;
      rowHeight = 0;
    }
    rects.push({ x: penX, y: penY, w, h });
    penX += w;
    rowHeight = Math.max(rowHeight, h);
  }
  const pageHeight = penY + rowHeight;

  const children = frames.map(([frame, w, h], i) => {
    const rect = rects[i]!;
    const child = add({
      id: id("spriteFrame", path, frame),
      kind: "spriteFrame",
      name: frame,
      path,
      uuid: uuid(),
      parentId: atlasId,
      bundle,
      details: {
        Tamanho: `${w}x${h}`,
        Rotacionado: "não",
        Offset: `{0,${i % 4}}`,
        "Source size": `${w}x${h}`,
        Formato: "TexturePacker plist",
      },
      preview: {
        type: "frame",
        texture,
        rect,
        rotated: false,
        sourceSize: { w, h },
      },
    });
    return child.id;
  });
  add({
    id: atlasId,
    kind: "spriteAtlas",
    name,
    path,
    uuid: uuid(),
    bundle,
    childIds: children,
    size: 148_320,
    details: {
      "Sprite frames": frames.length,
      Textura: texture,
      Formato: "plist (TexturePacker)",
      Frames: frames.map(([f]) => f),
    },
    preview: {
      type: "atlas",
      texture,
      sourceSize: { w: pageWidth, h: pageHeight },
      frames: frames.map(([frame], i) => ({ name: frame, rect: rects[i]!, rotated: false })),
    },
  });
  return atlasId;
}

function addSpine(path: string, bundle: string, animations: string[], skins: string[]) {
  const name = path.split("/").pop()!.replace(/\.json$/, "");
  const skelId = id("skeletonData", path, name);
  const bones = ["root", "body", "head", "arm-left", "arm-right"];
  const slots = ["body", "head", "glow", "fx"];
  const attachments = ["body-01", "head-01", "glow-ring", "fx-sparkle"];
  const events = ["win-sound", "hit", "land"];

  const childIds: string[] = [];
  const atlasPath = path.replace(/\.json$/, ".atlas");
  const base = { type: "spine" as const, skeleton: path, atlas: atlasPath };
  const push = (
    kind: EntityKind,
    child: string,
    details: IndexedEntity["details"],
    preview?: IndexedEntity["preview"],
  ) => {
    const e = add({
      id: id(kind, path, child),
      kind,
      name: child,
      path,
      parentId: skelId,
      bundle,
      details,
      ...(preview ? { preview } : {}),
    });
    childIds.push(e.id);
  };

  animations.forEach((anim, i) =>
    push(
      "spineAnimation",
      anim,
      {
        Duração: `${(0.6 + i * 0.35).toFixed(2)}s`,
        Timelines: 8 + i * 3,
        Loop: i % 2 === 0 ? "sim" : "não",
      },
      { ...base, animation: anim },
    ),
  );
  skins.forEach((skin) =>
    push("spineSkin", skin, { Attachments: attachments.length }, { ...base, skin }),
  );
  bones.forEach((bone, i) =>
    push(
      "spineBone",
      bone,
      { Parent: i === 0 ? "—" : (bones[i - 1] ?? "root"), Length: 40 + i * 12 },
      { ...base, bone },
    ),
  );
  slots.forEach((slot) =>
    push(
      "spineSlot",
      slot,
      { Bone: "body", "Attachment padrão": `${slot}-01` },
      { ...base, slot },
    ),
  );
  attachments.forEach((att) =>
    push(
      "spineAttachment",
      att,
      { Tipo: "region", Slot: att.split("-")[0] ?? att },
      { ...base, attachment: att },
    ),
  );
  events.forEach((ev) => push("spineEvent", ev, { Int: 0, Float: 0, String: ev }));

  add({
    id: skelId,
    kind: "skeletonData",
    name,
    path,
    uuid: uuid(),
    bundle,
    childIds,
    size: 512_400,
    details: {
      Versão: "3.8.99",
      Animações: animations.length,
      Skins: skins.length,
      Bones: bones.length,
      Slots: slots.length,
      Atlas: atlasPath,
      "Lista de animações": animations,
    },
    preview: { ...base },
  });
  return skelId;
}

function build(): ProjectIndex {
  entities.length = 0;
  usages.length = 0;
  uuidSeed = 0;

  const symbols = addAtlas("assets/resources/atlas/symbols.plist", "resources", [
    ["symbol_cherry", 128, 128],
    ["symbol_lemon", 128, 128],
    ["symbol_bell", 128, 128],
    ["symbol_seven", 128, 160],
    ["symbol_bar", 128, 96],
    ["symbol_wild", 160, 160],
    ["symbol_scatter", 160, 160],
    ["symbol_bonus", 160, 160],
    ["symbol_blank", 128, 128],
    ["symbol_frame", 144, 144],
  ]);

  const ui = addAtlas("assets/bundles/ui/atlas/ui_common.plist", "ui", [
    ["btn_spin_normal", 180, 180],
    ["btn_spin_pressed", 180, 180],
    ["btn_auto", 120, 64],
    ["btn_close", 64, 64],
    ["panel_bg", 720, 420],
    ["icon_coin", 48, 48],
    ["icon_settings", 48, 48],
    ["progress_fill", 320, 24],
    ["progress_bg", 320, 24],
    ["badge_new", 96, 48],
  ]);

  const texId = id("texture", "assets/resources/textures/background_main.png", "background_main");
  const sub = add({
    id: id("spriteFrame", "assets/resources/textures/background_main.png", "background_main"),
    kind: "spriteFrame",
    name: "background_main",
    path: "assets/resources/textures/background_main.png",
    uuid: uuid(),
    parentId: texId,
    bundle: "resources",
    details: { Tamanho: "1920x1080", Origem: "subMeta", Trim: "não" },
    preview: {
      type: "frame",
      texture: "assets/resources/textures/background_main.png",
      sourceSize: { w: 1920, h: 1080 },
    },
  });
  add({
    id: texId,
    kind: "texture",
    name: "background_main",
    path: "assets/resources/textures/background_main.png",
    uuid: uuid(),
    bundle: "resources",
    childIds: [sub.id],
    size: 2_411_008,
    details: { Tamanho: "1920x1080", "Sprite frames": 1, Formato: "png" },
    preview: { type: "image", texture: "assets/resources/textures/background_main.png" },
  });

  const bigWin = addSpine(
    "assets/resources/spine/big_win/big_win.json",
    "resources",
    ["idle", "win_small", "win_big", "win_mega", "outro"],
    ["default", "gold"],
  );
  const character = addSpine(
    "assets/bundles/game/spine/mascot/mascot.json",
    "game",
    ["idle", "cheer", "sad", "jump"],
    ["default", "halloween"],
  );

  const scenes = [
    ["assets/scenes/Boot.fire", "Boot", 12],
    ["assets/scenes/Game.fire", "Game", 148],
  ] as const;
  scenes.forEach(([path, name, nodes]) =>
    add({
      id: id("scene", path, name),
      kind: "scene",
      name,
      path,
      uuid: uuid(),
      details: {
        Nós: nodes,
        Componentes: ["cc.Canvas", "cc.Sprite", "cc.Label", "sp.Skeleton"],
        Prefabs: ["ReelView", "WinPopup"],
      },
    }),
  );

  const prefabs = [
    ["assets/prefabs/ReelView.prefab", "ReelView", "game"],
    ["assets/prefabs/WinPopup.prefab", "WinPopup", "ui"],
    ["assets/prefabs/SettingsDialog.prefab", "SettingsDialog", "ui"],
  ] as const;
  prefabs.forEach(([path, name, bundle]) =>
    add({
      id: id("prefab", path, name),
      kind: "prefab",
      name,
      path,
      uuid: uuid(),
      bundle,
      details: {
        Nós: 24,
        Componentes: ["cc.Sprite", "cc.Button", "cc.Animation"],
        Scripts: [`${name}Controller`],
      },
      preview: {
        type: "prefab",
        nodes: [name, "bg", "content", "title", "icon", "btn_close", "list", "item_0", "item_1"],
      },
    }),
  );

  const scripts = [
    ["assets/scripts/game/ReelController.ts", "ReelController", ["spin", "stop", "onSymbolLanded"]],
    ["assets/scripts/game/WinPresenter.ts", "WinPresenter", ["showWin", "playBigWin", "hide"]],
    ["assets/scripts/ui/SettingsDialog.ts", "SettingsDialog", ["open", "close", "onToggleSound"]],
    ["assets/scripts/core/AssetLoader.ts", "AssetLoader", ["preload", "loadAtlas", "loadSpine"]],
  ] as const;
  scripts.forEach(([path, name, methods]) =>
    add({
      id: id("script", path, name),
      kind: "script",
      name,
      path,
      uuid: uuid(),
      details: {
        Classes: [name],
        Métodos: [...methods],
        Imports: ["cc", "./AssetLoader", "../core/EventBus"],
        Linhas: 120 + methods.length * 30,
      },
    }),
  );

  const audios = [
    ["assets/resources/audio/spin.mp3", "spin"],
    ["assets/resources/audio/big_win.mp3", "big_win"],
    ["assets/resources/audio/click.mp3", "click"],
  ] as const;
  audios.forEach(([path, name]) =>
    add({
      id: id("audio", path, name),
      kind: "audio",
      name,
      path,
      uuid: uuid(),
      bundle: "resources",
      size: 84_221,
      details: { Formato: "mp3", Duração: "1.8s" },
      preview: { type: "audio", audio: path },
    }),
  );

  add({
    id: id("font", "assets/resources/fonts/Digital.fnt", "Digital"),
    kind: "font",
    name: "Digital",
    path: "assets/resources/fonts/Digital.fnt",
    uuid: uuid(),
    bundle: "resources",
    details: { Tipo: "BMFont", Tamanho: 48, Textura: "Digital_0.png" },
    preview: { type: "bitmapFont", texture: "assets/resources/fonts/Digital_0.png" },
  });

  const use = (entityId: string, path: string, via: UsageRef["via"], fileKind: string) =>
    usages.push({ entityId, path, via, fileKind });

  use(symbols, "assets/scenes/Game.fire", "uuid", "fire");
  use(symbols, "assets/prefabs/ReelView.prefab", "uuid", "prefab");
  use(symbols, "assets/scripts/game/ReelController.ts", "name", "ts");
  use(ui, "assets/prefabs/WinPopup.prefab", "uuid", "prefab");
  use(ui, "assets/prefabs/SettingsDialog.prefab", "uuid", "prefab");
  use(ui, "assets/scripts/ui/SettingsDialog.ts", "name", "ts");
  use(bigWin, "assets/scenes/Game.fire", "uuid", "fire");
  use(bigWin, "assets/scripts/game/WinPresenter.ts", "name", "ts");
  use(character, "assets/prefabs/ReelView.prefab", "uuid", "prefab");
  use(texId, "assets/scenes/Boot.fire", "uuid", "fire");
  use(texId, "assets/scenes/Game.fire", "uuid", "fire");

  for (const e of entities) {
    if (e.kind === "spriteFrame" && e.parentId === symbols) {
      use(e.id, "assets/prefabs/ReelView.prefab", "name", "prefab");
    }
    if (e.kind === "spineAnimation" && e.parentId === bigWin) {
      use(e.id, "assets/scripts/game/WinPresenter.ts", "name", "ts");
    }
  }

  const byKind: Record<string, number> = {};
  for (const e of entities) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;

  return {
    version: 1,
    projectName: DEMO_WORKSPACE_NAME,
    rootPath: "/demo/slot-game",
    createdAt: new Date().toISOString(),
    stats: { filesScanned: 187, entities: entities.length, byKind },
    entities: entities.map((e) => ({ ...e })),
    usages: usages.map((u) => ({ ...u })),
    warnings: [
      "Projeto de demonstração gerado localmente — nenhum arquivo real foi lido.",
      "assets/bundles/ui/atlas/ui_common.png não encontrado (mock).",
    ],
  };
}

export function createDemoIndex(): ProjectIndex {
  return build();
}