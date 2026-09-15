import { useEffect, useRef, useState } from "react";
import type { IndexedEntity, PreviewInfo, ProjectIndex } from "@/lib/cocos/types";
import type { FileSource } from "@/lib/cocos/preview/source";
import { PreviewMessage } from "./primitives";

interface Player {
  dispose: () => void;
  animationState?: { setAnimation: (track: number, name: string, loop: boolean) => void };
  skeleton?: {
    setSkinByName: (name: string) => void;
    setSlotsToSetupPose: () => void;
    data: { animations: Array<{ name: string }>; skins: Array<{ name: string }> };
  };
}

/** Official Spine demo shipped in /public — used by the demo workspace. */
const DEMO = {
  skeleton: "/spine-demo/spineboy-pro.json",
  atlas: "/spine-demo/spineboy-pma.atlas",
};

/** Extracts the page image names declared inside a `.atlas` file. */
function atlasPages(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\.(png|jpg|jpeg|webp)$/i.test(line));
}

export function SpinePreview({
  source,
  preview,
  demo,
  entity,
}: {
  source: FileSource;
  preview: PreviewInfo;
  index: ProjectIndex;
  entity: IndexedEntity;
  demo: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [animations, setAnimations] = useState<string[]>([]);
  const [skins, setSkins] = useState<string[]>([]);
  const [animation, setAnimation] = useState(preview.animation ?? "");
  const [skin, setSkin] = useState(preview.skin ?? "");

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const host = hostRef.current;
      if (!host) return;
      if (!demo && (!preview.skeleton || !preview.atlas)) {
        setError("Skeleton ou atlas não informados para este asset.");
        return;
      }
      try {
        const [{ SpinePlayer }] = await Promise.all([
          import("@esotericsoftware/spine-player"),
          import("@esotericsoftware/spine-player/dist/spine-player.css"),
        ]);

        const config: Record<string, unknown> = {
          alpha: true,
          backgroundColor: "#00000000",
          premultipliedAlpha: true,
          showControls: true,
          success: (player: Player) => {
            if (cancelled) return;
            const data = player.skeleton?.data;
            const names = data?.animations.map((a) => a.name) ?? [];
            setAnimations(names);
            setSkins(data?.skins.map((s) => s.name) ?? []);
            setAnimation((current) => (names.includes(current) ? current : (names[0] ?? "")));
            setReady(true);
          },
          error: (_p: unknown, message: string) => {
            if (!cancelled) setError(message || "Falha ao carregar o Spine.");
          },
        };

        if (demo) {
          config['skeleton'] = DEMO.skeleton;
          config['atlas'] = DEMO.atlas;
        } else {
          const atlasText = await source.text(preview.atlas!);
          const skeletonUri = await source.dataUri(preview.skeleton!);
          if (!atlasText || !skeletonUri) {
            setError("Não foi possível ler os arquivos do Spine (.json/.atlas).");
            return;
          }
          const dir = preview.atlas!.slice(0, preview.atlas!.lastIndexOf("/") + 1);
          const raw: Record<string, string> = {
            "skeleton.json": skeletonUri,
            "skeleton.atlas": `data:text/plain;base64,${btoa(unescape(encodeURIComponent(atlasText)))}`,
          };
          for (const page of atlasPages(atlasText)) {
            const uri = await source.dataUri(`${dir}${page}`);
            if (uri) raw[page] = uri;
          }
          config['skeleton'] = "skeleton.json";
          config['atlas'] = "skeleton.atlas";
          config['rawDataURIs'] = raw;
        }
        if (cancelled) return;

        host.innerHTML = "";
        playerRef.current = new SpinePlayer(host, config as never) as unknown as Player;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    void boot();
    return () => {
      cancelled = true;
      playerRef.current?.dispose();
      playerRef.current = null;
    };
    // Recreate only when the files change; animation/skin are applied below.
  }, [source, preview.skeleton, preview.atlas, demo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || !animation) return;
    try {
      playerRef.current?.animationState?.setAnimation(0, animation, true);
    } catch {
      /* animação inexistente no skeleton */
    }
  }, [animation, ready]);

  useEffect(() => {
    if (!ready || !skin) return;
    try {
      playerRef.current?.skeleton?.setSkinByName(skin);
      playerRef.current?.skeleton?.setSlotsToSetupPose();
    } catch {
      /* skin inexistente */
    }
  }, [skin, ready]);

  return (
    <div className="space-y-3">
      {error ? (
        <PreviewMessage>{error}</PreviewMessage>
      ) : (
        <div
          ref={hostRef}
          className="h-[46vh] min-h-72 w-full overflow-hidden rounded-lg border border-border bg-muted/20"
        />
      )}

      <div className="flex flex-wrap gap-3">
        {animations.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Animação
            <select
              value={animation}
              onChange={(e) => setAnimation(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
            >
              <option value="">(padrão)</option>
              {animations.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        {skins.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Skin
            <select
              value={skin}
              onChange={(e) => setSkin(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
            >
              <option value="">(padrão)</option>
              {skins.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {demo && (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Demonstração usando o esqueleto oficial <strong>Spineboy</strong> da Spine. No projeto
          real, o preview usa os arquivos do próprio asset (
          <span className="font-mono">{entity.name}</span>).
        </p>
      )}

      <p className="truncate font-mono text-xs text-muted-foreground">
        {demo ? `${DEMO.skeleton} · ${DEMO.atlas}` : `${preview.skeleton} · ${preview.atlas}`}
      </p>
    </div>
  );
}
