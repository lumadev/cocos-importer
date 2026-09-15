import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CornerUpLeft, PlayCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntityRow, KindBadge, decodeEntityId, encodeEntityId } from "@/components/cocos/entity-ui";
import { useWorkspaceEngine } from "@/lib/cocos/useWorkspace";
import { hasPreview } from "@/lib/cocos/preview/kinds";
import { PreviewDialog } from "@/components/cocos/preview/PreviewDialog";
import { KIND_LABEL } from "@/lib/cocos/types";

export const Route = createFileRoute("/w/$id/e/$entityId")({
  head: () => ({
    meta: [
      { title: "Detalhes do asset — Cocos Index" },
      {
        name: "description",
        content:
          "Conteúdo, propriedades e referências cruzadas do asset indexado do projeto Cocos Creator.",
      },
      { property: "og:title", content: "Detalhes do asset — Cocos Index" },
      {
        property: "og:description",
        content: "Sprites de um atlas, animações de um Spine e onde cada recurso é utilizado.",
      },
    ],
  }),
  component: EntityPage,
});

function EntityPage() {
  const { id, entityId } = Route.useParams();
  const { engine, workspace, loading } = useWorkspaceEngine(id);
  const [filter, setFilter] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const decoded = useMemo(() => {
    try {
      return decodeEntityId(entityId);
    } catch {
      return "";
    }
  }, [entityId]);

  if (loading) {
    return <p className="p-10 font-mono text-sm text-muted-foreground">Carregando índice...</p>;
  }

  const entity = engine?.get(decoded);
  if (!engine || !entity) {
    return (
      <main className="mx-auto max-w-2xl p-10 text-center">
        <h1 className="text-xl font-semibold">Item não encontrado no índice</h1>
        <Link to="/w/$id" params={{ id }} className="mt-6 inline-block text-primary underline">
          Voltar à busca
        </Link>
      </main>
    );
  }

  const parent = engine.parent(entity);
  const children = engine.children(entity);
  const usages = engine.usages(entity);
  const visibleChildren = filter
    ? children.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : children;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        to="/w/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3" /> Busca global
      </Link>

      <header className="mt-3 flex flex-wrap items-center gap-3">
        <KindBadge kind={entity.kind} />
        <h1 className="text-3xl font-extrabold tracking-tight">{entity.name}</h1>
        {hasPreview(entity) && (
          <Button size="sm" className="gap-2" onClick={() => setPreviewOpen(true)}>
            <PlayCircle className="size-4" /> Preview
          </Button>
        )}
      </header>
      {hasPreview(entity) && (
        <PreviewDialog
          entity={entity}
          index={engine.index}
          workspaceId={id}
          demo={Boolean(workspace?.demo)}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
      <p className="mt-1 font-mono text-xs text-muted-foreground">{entity.path}</p>

      {parent && (
        <Link
          to="/w/$id/e/$entityId"
          params={{ id, entityId: encodeEntityId(parent.id) }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
        >
          <CornerUpLeft className="size-4" />
          Pertence a {KIND_LABEL[parent.kind]}: <strong>{parent.name}</strong>
        </Link>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {Object.entries(entity.details).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {key}
            </h2>
            {Array.isArray(value) ? (
              value.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {value.map((item, i) => (
                    <li
                      key={`${item}-${i}`}
                      className="rounded bg-secondary px-2 py-0.5 font-mono text-xs"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <p className="mt-2 break-words text-sm">{String(value)}</p>
            )}
          </div>
        ))}
        {entity.bundle && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Bundle
            </h2>
            <p className="mt-2 text-sm">{entity.bundle}</p>
          </div>
        )}
        {entity.uuid && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              UUID
            </h2>
            <p className="mt-2 break-all font-mono text-xs">{entity.uuid}</p>
          </div>
        )}
      </section>

      {children.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Conteúdo ({children.length})</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar itens internos"
                className="h-9 w-64 pl-9"
              />
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {visibleChildren.slice(0, 400).map((child) => (
              <li key={child.id}>
                <EntityRow
                  workspaceId={id}
                  entity={child}
                  index={engine.index}
                  demo={workspace?.demo}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Onde é utilizado ({usages.length})</h2>
        {usages.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nenhuma referência encontrada no índice.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {usages.slice(0, 200).map((usage) => {
              const targets = engine.entitiesInFile(usage.path);
              const target = targets[0];
              const content = (
                <span className="flex items-center gap-3">
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    .{usage.fileKind}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{usage.path}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    via {usage.via}
                  </span>
                </span>
              );
              return (
                <li key={`${usage.path}-${usage.via}`}>
                  {target ? (
                    <Link
                      to="/w/$id/e/$entityId"
                      params={{ id, entityId: encodeEntityId(target.id) }}
                      className="block rounded-lg border border-border/70 bg-card px-4 py-3 hover:border-primary/60"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
