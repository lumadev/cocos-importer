import { useEffect, useRef, useState } from "react";
import type { PreviewInfo } from "@/lib/cocos/types";
import type { FileSource } from "@/lib/cocos/preview/source";
import { PreviewMessage, PreviewStage, useObjectUrl } from "./primitives";

export function drawFrame(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  preview: PreviewInfo,
) {
  const rect = preview.rect ?? { x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight };
  canvas.width = Math.max(1, rect.w);
  canvas.height = Math.max(1, rect.h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (preview.rotated) {
    ctx.translate(0, rect.h);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(image, rect.x, rect.y, rect.h, rect.w, 0, 0, rect.h, rect.w);
  } else {
    ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  }
}

export function FramePreview({ source, preview }: { source: FileSource; preview: PreviewInfo }) {
  const { url, loading } = useObjectUrl(source, preview.texture);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) drawFrame(canvas, image, preview);
    };
    image.onerror = () => setFailed(true);
    image.src = url;
  }, [url, preview]);

  if (loading) return <PreviewMessage>Carregando sprite...</PreviewMessage>;
  if (!url || failed)
    return <PreviewMessage>Textura não encontrada: {preview.texture ?? "—"}</PreviewMessage>;

  const rect = preview.rect;

  return (
    <div className="space-y-3">
      <PreviewStage className="max-h-[55vh]">
        <canvas
          ref={canvasRef}
          className="max-w-none"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            imageRendering: zoom > 2 ? "pixelated" : "auto",
          }}
        />
      </PreviewStage>
      <input
        type="range"
        min={0.25}
        max={6}
        step={0.25}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label="Zoom"
      />
      <dl className="grid grid-cols-2 gap-2 font-mono text-xs text-muted-foreground sm:grid-cols-4">
        <div>rect: {rect ? `${rect.x},${rect.y} ${rect.w}x${rect.h}` : "—"}</div>
        <div>rotated: {preview.rotated ? "sim" : "não"}</div>
        <div>offset: {preview.offset ? `${preview.offset.x},${preview.offset.y}` : "—"}</div>
        <div>
          source: {preview.sourceSize ? `${preview.sourceSize.w}x${preview.sourceSize.h}` : "—"}
        </div>
      </dl>
      <p className="truncate font-mono text-xs text-muted-foreground">{preview.texture}</p>
    </div>
  );
}
