import { useEffect, useMemo, useRef, useState } from "react";
import type { PreviewInfo } from "@/lib/cocos/types";
import type { FileSource } from "@/lib/cocos/preview/source";
import { Button } from "@/components/ui/button";
import { PreviewMessage, PreviewStage, useObjectUrl } from "./primitives";
import { drawFrame } from "./FramePreview";

function FrameThumb({
  image,
  frame,
  active,
  onClick,
}: {
  image: HTMLImageElement;
  frame: NonNullable<PreviewInfo["frames"]>[number];
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawFrame(ref.current, image, { type: "frame", ...frame });
  }, [image, frame]);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-md border p-2 text-left transition-colors ${
        active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
      }`}
    >
      <canvas ref={ref} className="max-h-16 max-w-full object-contain" style={{ width: "auto" }} />
      <span className="w-full truncate font-mono text-[10px] text-muted-foreground">
        {frame.name}
      </span>
    </button>
  );
}

export function AtlasPreview({ source, preview }: { source: FileSource; preview: PreviewInfo }) {
  const { url, loading } = useObjectUrl(source, preview.texture);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showRects, setShowRects] = useState(true);
  const frames = useMemo(() => preview.frames ?? [], [preview.frames]);

  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
  }, [url]);

  if (loading) return <PreviewMessage>Carregando atlas...</PreviewMessage>;
  if (!url) return <PreviewMessage>Página do atlas não encontrada: {preview.texture ?? "—"}</PreviewMessage>;

  const width = image?.naturalWidth ?? 0;
  const height = image?.naturalHeight ?? 0;
  const scale = width ? Math.min(1, 720 / width) : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant={showRects ? "default" : "secondary"} size="sm" onClick={() => setShowRects((v) => !v)}>
          {showRects ? "Ocultar recortes" : "Mostrar recortes"}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {frames.length} frames · {width}x{height}px
        </span>
      </div>

      <PreviewStage className="max-h-[45vh]">
        <div className="relative" style={{ width: width * scale, height: height * scale }}>
          <img src={url} alt={preview.texture} className="absolute inset-0 h-full w-full" />
          {showRects &&
            frames.map((frame) =>
              frame.rect ? (
                <div
                  key={frame.name}
                  onMouseEnter={() => setSelected(frame.name)}
                  className={`absolute border ${
                    selected === frame.name ? "border-primary bg-primary/20" : "border-primary/40"
                  }`}
                  style={{
                    left: frame.rect.x * scale,
                    top: frame.rect.y * scale,
                    width: frame.rect.w * scale,
                    height: frame.rect.h * scale,
                  }}
                  title={frame.name}
                />
              ) : null,
            )}
        </div>
      </PreviewStage>

      {image && frames.length > 0 && (
        <div className="grid max-h-56 grid-cols-3 gap-2 overflow-auto sm:grid-cols-5 md:grid-cols-6">
          {frames.map((frame) => (
            <FrameThumb
              key={frame.name}
              image={image}
              frame={frame}
              active={selected === frame.name}
              onClick={() => setSelected(frame.name)}
            />
          ))}
        </div>
      )}
      <p className="truncate font-mono text-xs text-muted-foreground">{preview.texture}</p>
    </div>
  );
}
