/**
 * Synthetic assets for the demo workspace: the mock index has no files on
 * disk, so every preview file is generated on the fly in the browser.
 */
import type { ProjectIndex, PreviewRect } from "../types";

const PALETTE = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb7185", "#60a5fa"];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const colorFor = (name: string) => PALETTE[hash(name) % PALETTE.length]!;

function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = Math.max(1, Math.round(width));
  el.height = Math.max(1, Math.round(height));
  const ctx = el.getContext("2d")!;
  return { el, ctx };
}

function toBlob(el: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => el.toBlob((b) => resolve(b ?? new Blob()), "image/png"));
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  rect: PreviewRect,
  label: string,
  withLabel = true,
) {
  const color = colorFor(label);
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#0b1220");
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  if (!withLabel) return;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `${Math.max(10, Math.min(16, rect.w / 8))}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w - 10);
}

async function atlasPage(index: ProjectIndex, texturePath: string): Promise<Blob | null> {
  const atlas = index.entities.find(
    (e) => e.preview?.type === "atlas" && e.preview.texture === texturePath,
  );
  if (!atlas?.preview?.frames?.length) return null;
  const frames = atlas.preview.frames;
  const width = atlas.preview.sourceSize?.w ?? 1024;
  const height =
    atlas.preview.sourceSize?.h ??
    Math.max(...frames.map((f) => (f.rect ? f.rect.y + f.rect.h : 128)));
  const { el, ctx } = canvas(width, height);
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, el.width, el.height);
  for (const frame of frames) {
    if (!frame.rect) continue;
    drawCell(ctx, frame.rect, frame.name);
  }
  return toBlob(el);
}

async function fontPage(): Promise<Blob> {
  const glyphs = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$.,:";
  const cols = 10;
  const cell = 64;
  const rows = Math.ceil(glyphs.length / cols);
  const { el, ctx } = canvas(cols * cell, rows * cell);
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, el.width, el.height);
  ctx.font = "44px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < glyphs.length; i += 1) {
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cell;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(x, y, cell, cell);
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(glyphs[i]!, x + cell / 2, y + cell / 2);
  }
  return toBlob(el);
}

async function genericTexture(path: string): Promise<Blob> {
  const { el, ctx } = canvas(960, 540);
  const grad = ctx.createLinearGradient(0, 0, el.width, el.height);
  grad.addColorStop(0, colorFor(path));
  grad.addColorStop(1, "#0b1220");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, el.width, el.height);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  for (let x = 0; x < el.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, el.height);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "26px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(path.split("/").pop() ?? path, el.width / 2, el.height / 2);
  ctx.font = "16px ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("textura gerada (demo)", el.width / 2, el.height / 2 + 32);
  return toBlob(el);
}

// ---------------------------------------------------------------- Spine ----

const SPINE_VERSION = "4.3.13";
const REGION_SIZE = 96;
const PAGE = 512;

function spineParts(index: ProjectIndex, skeletonPath: string) {
  const kids = index.entities.filter((e) => e.path === skeletonPath && e.parentId);
  const names = (kind: string) => kids.filter((k) => k.kind === kind).map((k) => k.name);
  const bones = names("spineBone");
  return {
    bones: bones.length ? bones : ["root", "body", "head"],
    slots: names("spineSlot").length ? names("spineSlot") : ["body", "head"],
    attachments: names("spineAttachment").length ? names("spineAttachment") : ["body-01", "head-01"],
    skins: names("spineSkin").length ? names("spineSkin") : ["default"],
    animations: names("spineAnimation").length ? names("spineAnimation") : ["idle"],
    events: names("spineEvent"),
  };
}

function regionRects(attachments: string[]) {
  const perRow = Math.floor(PAGE / REGION_SIZE);
  return attachments.map((name, i) => ({
    name,
    x: (i % perRow) * REGION_SIZE,
    y: Math.floor(i / perRow) * REGION_SIZE,
    w: REGION_SIZE,
    h: REGION_SIZE,
  }));
}

async function spinePage(index: ProjectIndex, skeletonPath: string): Promise<Blob> {
  const { attachments } = spineParts(index, skeletonPath);
  const rects = regionRects(attachments);
  const height = Math.max(PAGE, Math.max(...rects.map((r) => r.y + r.h)));
  const { el, ctx } = canvas(PAGE, height);
  ctx.clearRect(0, 0, el.width, el.height);
  for (const r of rects) {
    const color = colorFor(r.name);
    ctx.save();
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2 - 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.stroke();
    ctx.fillStyle = "rgba(9,14,26,0.9)";
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(r.name, r.x + r.w / 2, r.y + r.h / 2, r.w - 12);
    ctx.restore();
  }
  return toBlob(el);
}

function spineAtlasText(index: ProjectIndex, skeletonPath: string, pageName: string): string {
  const { attachments } = spineParts(index, skeletonPath);
  const rects = regionRects(attachments);
  const height = Math.max(PAGE, Math.max(...rects.map((r) => r.y + r.h)));
  const lines = [
    pageName,
    `size: ${PAGE}, ${height}`,
    "format: RGBA8888",
    "filter: Linear, Linear",
    "repeat: none",
  ];
  for (const r of rects) {
    lines.push(
      r.name,
      "  rotate: false",
      `  xy: ${r.x}, ${r.y}`,
      `  size: ${r.w}, ${r.h}`,
      `  orig: ${r.w}, ${r.h}`,
      "  offset: 0, 0",
      "  index: -1",
    );
  }
  return `${lines.join("\n")}\n`;
}

function spineSkeletonJson(index: ProjectIndex, skeletonPath: string): string {
  const { bones, slots, attachments, skins, animations, events } = spineParts(index, skeletonPath);
  const boneDefs = bones.map((name, i) => {
    if (i === 0) return { name };
    const parent = bones[Math.max(0, i - 1)]!;
    return { name, parent, length: 70, rotation: i === 1 ? 90 : (i % 2 === 0 ? 35 : -35), x: i === 1 ? 0 : 70 };
  });

  const slotDefs = slots.map((name, i) => ({
    name,
    bone: bones[Math.min(i + 1, bones.length - 1)] ?? bones[0]!,
    attachment: attachments[i % attachments.length]!,
  }));

  const skinDefs = skins.map((skinName) => {
    const map: Record<string, Record<string, object>> = {};
    slotDefs.forEach((slot, i) => {
      const att = attachments[i % attachments.length]!;
      map[slot.name] = {
        [att]: { width: REGION_SIZE, height: REGION_SIZE, x: 35, scaleX: 1, scaleY: 1 },
      };
    });
    return { name: skinName, attachments: map };
  });

  const animDefs: Record<string, unknown> = {};
  animations.forEach((anim, i) => {
    const amp = 8 + (hash(anim) % 20);
    const dur = 0.8 + (i % 3) * 0.4;
    const target = bones[1] ?? bones[0]!;
    const second = bones[2] ?? target;
    animDefs[anim] = {
      bones: {
        [target]: {
          rotate: [
            { time: 0, value: 0 },
            { time: dur / 2, value: amp },
            { time: dur, value: 0 },
          ],
        },
        [second]: {
          translate: [
            { time: 0, x: 0, y: 0 },
            { time: dur / 2, x: 0, y: amp },
            { time: dur, x: 0, y: 0 },
          ],
        },
      },
      ...(events.length
        ? { events: [{ time: dur / 2, name: events[i % events.length]! }] }
        : {}),
    };
  });

  return JSON.stringify({
    skeleton: {
      hash: "demo",
      spine: SPINE_VERSION,
      x: -140,
      y: -40,
      width: 280,
      height: 320,
      images: "./",
      audio: "",
    },
    bones: boneDefs,
    slots: slotDefs,
    skins: skinDefs,
    ...(events.length
      ? { events: Object.fromEntries(events.map((e) => [e, {}])) }
      : {}),
    animations: animDefs,
  });
}

// ---------------------------------------------------------------- Audio ----

function wavTone(seed: string): Blob {
  const sampleRate = 22_050;
  const duration = 1.6;
  const total = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + total * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + total * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, total * 2, true);

  const base = 220 + (hash(seed) % 6) * 55;
  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-2.4 * t);
    const wave =
      Math.sin(2 * Math.PI * base * t) * 0.6 + Math.sin(2 * Math.PI * base * 2 * t) * 0.25;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, wave * env)) * 32_000, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// ------------------------------------------------------------- Dispatch ----

/** Builds the file the demo workspace would have on disk at `path`. */
export async function createDemoFile(index: ProjectIndex, path: string): Promise<Blob | null> {
  const lower = path.toLowerCase();

  if (/\.(mp3|ogg|wav|m4a)$/.test(lower)) return wavTone(path);

  if (lower.endsWith(".atlas")) {
    const skeleton = path.replace(/\.atlas$/i, ".json");
    const pageName = `${path.split("/").pop()!.replace(/\.atlas$/i, "")}.png`;
    return new Blob([spineAtlasText(index, skeleton, pageName)], { type: "text/plain" });
  }

  if (lower.endsWith(".json")) {
    return new Blob([spineSkeletonJson(index, path)], { type: "application/json" });
  }

  if (/\.(png|jpg|jpeg|webp)$/.test(lower)) {
    const spineSibling = index.entities.find(
      (e) => e.preview?.type === "spine" && e.preview.atlas?.replace(/\.atlas$/i, ".png") === path,
    );
    if (spineSibling?.preview?.skeleton) return spinePage(index, spineSibling.preview.skeleton);

    const page = await atlasPage(index, path);
    if (page) return page;

    const isFont = index.entities.some(
      (e) => e.preview?.type === "bitmapFont" && e.preview.texture === path,
    );
    if (isFont) return fontPage();

    return genericTexture(path);
  }

  return null;
}
