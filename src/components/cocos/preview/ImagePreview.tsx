import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileSource } from "@/lib/cocos/preview/source";
import { PreviewMessage, PreviewStage, useObjectUrl } from "./primitives";

export function ImagePreview({
  source,
  path,
  caption,
}: {
  source: FileSource;
  path: string | undefined;
  caption?: string;
}) {
  const { url, loading } = useObjectUrl(source, path);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  if (loading) return <PreviewMessage>Carregando imagem...</PreviewMessage>;
  if (!url) return <PreviewMessage>Imagem não encontrada: {path ?? "—"}</PreviewMessage>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setZoom((z) => Math.max(0.1, z / 1.5))}>
          <ZoomOut className="size-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setZoom((z) => Math.min(8, z * 1.5))}>
          <ZoomIn className="size-4" />
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%{size ? ` · ${size.w}x${size.h}px` : ""}
        </span>
      </div>
      <PreviewStage className="max-h-[60vh]">
        <img
          src={url}
          alt={caption ?? path ?? "preview"}
          onLoad={(e) =>
            setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
          style={{
            width: size ? size.w * zoom : undefined,
            imageRendering: zoom > 2 ? "pixelated" : "auto",
          }}
          className="max-w-none"
        />
      </PreviewStage>
      <p className="truncate font-mono text-xs text-muted-foreground">{path}</p>
    </div>
  );
}
