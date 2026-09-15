import { useEffect, useRef, useState } from "react";
import type {
  IndexedEntity,
  PreviewInfo,
  ProjectIndex,
} from "@/lib/cocos/types";
import type { FileSource } from "@/lib/cocos/preview/source";
import { PreviewMessage } from "./primitives";

type PixiModule = typeof import("pixi.js");
type SpineModule = typeof import("@pixi-spine/all-3.8");
type PixiApplication = InstanceType<PixiModule["Application"]>;
type SpineInstance = InstanceType<SpineModule["Spine"]>;
type SpineTextureAtlas = InstanceType<SpineModule["TextureAtlas"]>;
type SpineBaseTexture = InstanceType<PixiModule["BaseTexture"]>;

/** Official Spine 3.8 demo shipped in /public — used by the demo workspace. */
const DEMO = {
  skeleton: "/spine-demo/spineboy-pro.json",
  atlas: "/spine-demo/spineboy-pma.atlas",
};

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
  const appRef = useRef<PixiApplication | null>(null);
  const spineRef = useRef<SpineInstance | null>(null);
  const layoutRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [animations, setAnimations] = useState<string[]>([]);
  const [skins, setSkins] = useState<string[]>([]);
  const [animation, setAnimation] = useState(preview.animation ?? "");
  const [skin, setSkin] = useState(preview.skin ?? "");

  useEffect(() => {
    let cancelled = false;
    let disposeAtlas: (() => void) | null = null;

    async function boot() {
      const host = hostRef.current;
      if (!host) return;
      if (!demo && (!preview.skeleton || !preview.atlas)) {
        setError("Skeleton ou atlas não informados para este asset.");
        return;
      }

      try {
        const [
          PIXI,
          { Spine, TextureAtlas, AtlasAttachmentLoader, SkeletonJson },
        ] = await Promise.all([
          import("pixi.js"),
          import("@pixi-spine/all-3.8"),
        ]);

        const skeletonPath = demo ? DEMO.skeleton : preview.skeleton!;
        const atlasPath = demo ? DEMO.atlas : preview.atlas!;
        const dir = atlasPath.slice(0, atlasPath.lastIndexOf("/") + 1);

        const [atlasText, skeletonText] = demo
          ? await Promise.all([
              fetch(DEMO.atlas).then((r) => r.text()),
              fetch(DEMO.skeleton).then((r) => r.text()),
            ])
          : await Promise.all([
              source.text(atlasPath),
              source.text(skeletonPath),
            ]);

        if (!atlasText || !skeletonText) {
          setError("Não foi possível ler os arquivos do Spine (.json/.atlas).");
          return;
        }
        if (cancelled) return;

        // Resolves an atlas page (image) name to a URL the renderer can load.
        const resolvePage = (name: string) =>
          demo ? Promise.resolve(`${dir}${name}`) : source.url(`${dir}${name}`);

        const textureLoader = (
          path: string,
          loaderFunction: (tex: SpineBaseTexture) => void,
        ) => {
          void (async () => {
            const url = await resolvePage(path);
            if (!url) {
              loaderFunction(null as unknown as SpineBaseTexture);
              return;
            }
            const baseTexture = PIXI.BaseTexture.from(url);
            if (baseTexture.valid) {
              loaderFunction(baseTexture as unknown as SpineBaseTexture);
            } else {
              baseTexture.once("loaded", () =>
                loaderFunction(baseTexture as unknown as SpineBaseTexture),
              );
              baseTexture.once("error", () =>
                loaderFunction(null as unknown as SpineBaseTexture),
              );
            }
          })();
        };

        const atlas = await new Promise<SpineTextureAtlas>((resolve) => {
          new TextureAtlas(atlasText, textureLoader, resolve as never);
        });
        if (cancelled) {
          atlas.dispose();
          return;
        }
        disposeAtlas = () => atlas.dispose();

        const attachmentLoader = new AtlasAttachmentLoader(atlas);
        const skeletonJson = new SkeletonJson(attachmentLoader);
        const skeletonData = skeletonJson.readSkeletonData(skeletonText);

        const spine = new Spine(skeletonData);
        spineRef.current = spine;

        const names = skeletonData.animations.map((a) => a.name);
        const skinNames = skeletonData.skins.map((s) => s.name);
        setAnimations(names);
        setSkins(skinNames);
        const initialAnimation = names.includes(animation)
          ? animation
          : (names[0] ?? "");
        setAnimation(initialAnimation);

        host.innerHTML = "";
        const app = new PIXI.Application({
          backgroundAlpha: 0,
          antialias: true,
          resizeTo: host,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
        });
        appRef.current = app;
        host.appendChild(app.view as unknown as Node);
        app.stage.addChild(spine);

        /** Fit and center the spine using its current visual AABB (not root). */
        const layout = () => {
          const screenW = app.screen.width;
          const screenH = app.screen.height;
          if (screenW < 1 || screenH < 1) return;

          spine.update(0);
          const bounds = spine.getLocalBounds();
          const bw =
            bounds.width > 1 ? bounds.width : skeletonData.width || 1;
          const bh =
            bounds.height > 1 ? bounds.height : skeletonData.height || 1;
          const bx = bounds.width > 1 ? bounds.x : 0;
          const by = bounds.height > 1 ? bounds.y : -bh;

          const fit =
            Math.min(screenW / bw, screenH / bh) * 0.88;
          spine.scale.set(fit);
          // Map the visual center of the AABB to the viewport center.
          spine.x = screenW / 2 - (bx + bw / 2) * fit;
          spine.y = screenH / 2 - (by + bh / 2) * fit;
        };
        layoutRef.current = layout;

        if (initialAnimation) {
          spine.state.setAnimation(0, initialAnimation, true);
          spine.update(0);
        }
        layout();
        app.renderer.on("resize", layout);

        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      }
    }

    void boot();
    return () => {
      cancelled = true;
      setReady(false);
      layoutRef.current = null;
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
      spineRef.current = null;
      disposeAtlas?.();
    };
    // Recreate only when the files change; animation/skin are applied below.
  }, [source, preview.skeleton, preview.atlas, demo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || !animation) return;
    try {
      const spine = spineRef.current;
      if (!spine) return;
      spine.state.setAnimation(0, animation, true);
      spine.update(0);
      layoutRef.current?.();
    } catch {
      /* animação inexistente no skeleton */
    }
  }, [animation, ready]);

  useEffect(() => {
    if (!ready || !skin) return;
    try {
      const spine = spineRef.current;
      if (!spine) return;
      spine.skeleton.setSkinByName(skin);
      spine.skeleton.setSlotsToSetupPose();
      spine.update(0);
      layoutRef.current?.();
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
          Demonstração usando o esqueleto oficial <strong>Spineboy</strong>{" "}
          (Spine 3.8) da Spine. No projeto real, o preview usa os arquivos do
          próprio asset (<span className="font-mono">{entity.name}</span>).
        </p>
      )}

      <p className="truncate font-mono text-xs text-muted-foreground">
        {demo
          ? `${DEMO.skeleton} · ${DEMO.atlas}`
          : `${preview.skeleton} · ${preview.atlas}`}
      </p>
    </div>
  );
}
