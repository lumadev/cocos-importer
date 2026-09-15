import { useEffect, useRef } from "react";
import type { FileSource } from "@/lib/cocos/preview/source";
import { PreviewMessage, useObjectUrl } from "./primitives";

export function AudioPreview({ source, path }: { source: FileSource; path: string | undefined }) {
  const { url, loading } = useObjectUrl(source, path);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audio) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const g = canvas.getContext("2d");
        if (!g) return;
        const data = audio.getChannelData(0);
        const w = (canvas.width = canvas.clientWidth * 2);
        const h = (canvas.height = 200);
        g.clearRect(0, 0, w, h);
        g.strokeStyle = "hsl(var(--primary))";
        g.lineWidth = 1;
        const step = Math.max(1, Math.floor(data.length / w));
        for (let x = 0; x < w; x += 1) {
          let min = 1;
          let max = -1;
          for (let i = 0; i < step; i += 1) {
            const v = data[x * step + i] ?? 0;
            if (v < min) min = v;
            if (v > max) max = v;
          }
          g.beginPath();
          g.moveTo(x, ((1 + min) * h) / 2);
          g.lineTo(x, ((1 + max) * h) / 2);
          g.stroke();
        }
      })
      .catch(() => undefined)
      .finally(() => void ctx.close().catch(() => undefined));
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) return <PreviewMessage>Carregando áudio...</PreviewMessage>;
  if (!url) return <PreviewMessage>Áudio não encontrado: {path ?? "—"}</PreviewMessage>;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <canvas ref={canvasRef} className="h-24 w-full" />
      </div>
      <audio controls src={url} className="w-full">
        <track kind="captions" />
      </audio>
      <p className="truncate font-mono text-xs text-muted-foreground">{path}</p>
    </div>
  );
}
