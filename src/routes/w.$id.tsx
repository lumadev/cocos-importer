import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityRow } from "@/components/cocos/entity-ui";
import {
  InfiniteSentinel,
  InfiniteStatus,
  useInfiniteSlice,
} from "@/components/cocos/infinite-list";
import { useWorkspaceEngine } from "@/lib/cocos/useWorkspace";
import { useProjectImport } from "@/lib/cocos/useProjectImport";
import { downloadIndex } from "@/lib/cocos/storage";
import { KIND_LABEL, type EntityKind, type ProjectIndex } from "@/lib/cocos/types";
import type { SearchResult } from "@/lib/cocos/searchEngine";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  kind: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/w/$id")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Busca global — Cocos Index" },
      {
        name: "description",
        content:
          "Pesquise atlas, sprite frames, animações Spine, cenas, prefabs e scripts do projeto indexado.",
      },
      { property: "og:title", content: "Busca global — Cocos Index" },
      {
        property: "og:description",
        content:
          "Consulta instantânea sobre o índice local do projeto Cocos Creator.",
      },
    ],
  }),
  component: WorkspaceIndex,
});

function WorkspaceIndex() {
  const { id } = Route.useParams();
  const { q, kind } = Route.useSearch();
  const navigate = useNavigate({ from: "/w/$id/" });
  const { engine, workspace, loading, reload } = useWorkspaceEngine(id);
  const { state, refresh } = useProjectImport();
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const kinds = useMemo(() => {
    const stats = engine?.index.stats.byKind ?? {};
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [engine]);

  const results = useMemo(
    () =>
      engine ? engine.search(q, kind ? [kind as EntityKind] : undefined) : [],
    [engine, q, kind],
  );

  const setSearch = (patch: { q?: string; kind?: string }) =>
    navigate({
      search: (prev: { q: string; kind: string }) => ({ ...prev, ...patch }),
      replace: true,
    });

  const browsing = !q.trim() && !kind;
  const groups = useMemo(() => {
    if (!browsing) return [];
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.entity.kind) ?? [];
      list.push(r);
      map.set(r.entity.kind, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [browsing, results]);

  if (loading) {
    return (
      <p className="p-10 font-mono text-sm text-muted-foreground">
        Carregando índice...
      </p>
    );
  }

  if (!engine || !workspace) {
    return (
      <main className="mx-auto max-w-2xl p-10 text-center">
        <h1 className="text-xl font-semibold">Workspace não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O índice deste projeto não está disponível neste navegador.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Voltar para Auxiliador Dev
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-3" /> Voltar para Auxiliador Dev
          </Link>
          <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight">
            {workspace.name}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {engine.index.stats.entities} itens ·{" "}
            {engine.index.stats.filesScanned} arquivos ·{" "}
            {new Date(workspace.lastImportedAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadIndex(engine.index)}
          >
            <Download className="mr-2 size-4" /> project-index.json
          </Button>
          <Button
            size="sm"
            disabled={state.busy}
            onClick={async () => {
              setError("");
              try {
                await refresh(workspace);
                reload();
              } catch (e) {
                if ((e as Error).name !== "AbortError")
                  setError((e as Error).message);
              }
            }}
          >
            <RefreshCw className="mr-2 size-4" /> Atualizar índice
          </Button>
        </div>
      </div>

      {state.busy && (
        <p className="mt-3 font-mono text-xs text-primary">{state.message}</p>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="relative mt-8">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setSearch({ q: e.target.value })}
          placeholder="Buscar atlas, sprite frame, animação Spine, cena, prefab, script..."
          className="h-14 rounded-xl border-border bg-card pl-12 text-base shadow-lg"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <WorkspaceSearchFilter
          active={!kind}
          label="Tudo"
          onClick={() => setSearch({ kind: "" })}
        />
        {kinds.map(([k, count]) => (
          <WorkspaceSearchFilter
            key={k}
            active={kind === k}
            label={`${KIND_LABEL[k as EntityKind] ?? k} (${count})`}
            onClick={() => setSearch({ kind: kind === k ? "" : k })}
          />
        ))}
      </div>

      {browsing ? (
        <div className="mt-6 space-y-2">
          {groups.map(([k, items]) => {
            const isOpen = open[k] ?? false;
            const totalInIndex = engine.index.stats.byKind[k as EntityKind] ?? items.length;
            return (
              <div
                key={k}
                className="overflow-hidden rounded-lg border border-border/70 bg-card/50"
              >
                <button
                  onClick={() => setOpen((prev) => ({ ...prev, [k]: !isOpen }))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40"
                >
                  <ChevronRight
                    className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                  <span className="font-semibold">
                    {KIND_LABEL[k as EntityKind] ?? k}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {totalInIndex} {totalInIndex === 1 ? "item" : "itens"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border/60 p-3">
                    <WorkspaceSearchResultList
                      results={items}
                      resetKey={`browse:${k}`}
                      workspaceId={id}
                      index={engine.index}
                      demo={workspace.demo}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6">
          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {q.trim()
                ? `Nenhum resultado para “${q}”.`
                : "Nenhum item neste filtro."}
            </div>
          ) : (
            <WorkspaceSearchResultList
              results={results}
              resetKey={`filter:${kind}:${q}`}
              workspaceId={id}
              index={engine.index}
              demo={workspace.demo}
            />
          )}
        </div>
      )}
    </main>
  );
}

function WorkspaceSearchResultList({
  results,
  resetKey,
  workspaceId,
  index,
  demo,
}: {
  results: SearchResult[];
  resetKey: string;
  workspaceId: string;
  index: ProjectIndex;
  demo: boolean;
}) {
  const { visible, hasMore, loadMore, total, shown } = useInfiniteSlice(
    results,
    resetKey,
  );

  return (
    <>
      <ul className="space-y-2">
        {visible.map((result) => (
          <li key={result.entity.id}>
            <EntityRow
              workspaceId={workspaceId}
              entity={result.entity}
              parent={result.parent}
              index={index}
              demo={demo}
            />
          </li>
        ))}
      </ul>
      <InfiniteSentinel active={hasMore} onVisible={loadMore} />
      <InfiniteStatus shown={shown} total={total} hasMore={hasMore} />
    </>
  );
}

function WorkspaceSearchFilter({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-primary bg-primary/15 px-3 py-1 font-mono text-xs text-primary"
          : "rounded-full border border-border bg-secondary/50 px-3 py-1 font-mono text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}
