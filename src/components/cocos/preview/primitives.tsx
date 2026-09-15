import { useEffect, useState } from "react";
import type { FileSource } from "@/lib/cocos/preview/source";

export const CHECKER =
  "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 16px 16px";

export function useObjectUrl(source: FileSource, path: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUrl(null);
    if (!path) {
      setLoading(false);
      return;
    }
    source
      .url(path)
      .then((value) => {
        if (!cancelled) setUrl(value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, path]);

  return { url, loading };
}

export function PreviewMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border p-8 text-center font-mono text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export function PreviewStage({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-auto rounded-lg border border-border p-4 ${className}`}
      style={{ background: CHECKER }}
    >
      {children}
    </div>
  );
}
