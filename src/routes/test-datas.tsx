import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Database,
  ArrowLeft,
  FolderOpen,
  Loader2,
  Search,
  Copy,
  Check,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ActiveProjectBadge } from "@/components/ActiveProjectBadge";
import { Input } from "@/components/ui/input";
import { useActiveWorkspace } from "@/lib/activeWorkspace";
import {
  TEST_DATAS_PATH,
  useTestDatas,
  type TestDataEntry,
} from "@/lib/testDatas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/test-datas")({
  head: () => ({
    meta: [
      { title: "Test Datas — Auxiliador Dev" },
      {
        name: "description",
        content:
          "Lista de test datas e mocks com links rápidos para localhost.",
      },
      { property: "og:title", content: "Test Datas — Auxiliador Dev" },
      {
        property: "og:description",
        content:
          "Lista de test datas e mocks com links rápidos para localhost.",
      },
    ],
  }),
  component: TestDatasIndex,
});

function TestDatasIndex() {
  const active = useActiveWorkspace();
  const { status, entries } = useTestDatas(
    active?.id ?? null,
    Boolean(active?.demo),
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16">
      <div className="mb-8 flex flex-wrap items-center gap-3 justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Voltar para Auxiliador Dev
        </Link>
        <ActiveProjectBadge />
      </div>

      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          Ferramenta
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          Test Datas
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Catálogo parseado de{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {TEST_DATAS_PATH}
          </code>
          . Busque por nome ou descrição e copie o parâmetro{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            ?testdata=
          </code>{" "}
          para o localhost.
        </p>
      </header>

      {status === "ready" && entries.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou descrição..."
              className="h-12 rounded-xl border-border bg-card pl-12 text-base shadow-sm"
              aria-label="Buscar test datas"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {filtered.length === entries.length
              ? `${entries.length} test data${entries.length === 1 ? "" : "s"}`
              : `${filtered.length} de ${entries.length} test datas`}
          </p>
        </div>
      )}

      <section className="grid gap-4">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Lendo {TEST_DATAS_PATH}
            ...
          </div>
        )}

        {status === "unavailable" && !active && (
          <TestDatasEmptyState
            icon={
              <FolderOpen className="mx-auto size-10 text-muted-foreground" />
            }
            message="Nenhum projeto selecionado. Volte para a tela inicial e selecione ou importe um projeto."
          />
        )}

        {status === "unavailable" && active && (
          <TestDatasEmptyState
            icon={
              <FolderOpen className="mx-auto size-10 text-muted-foreground" />
            }
            message="A pasta deste projeto não está mais acessível neste navegador. Reimporte-o na tela inicial."
          />
        )}

        {status === "permission" && (
          <TestDatasEmptyState
            icon={
              <FolderOpen className="mx-auto size-10 text-muted-foreground" />
            }
            message="Permissão de leitura da pasta do projeto foi negada. Reimporte o projeto para conceder acesso novamente."
          />
        )}

        {status === "unsupported" && (
          <TestDatasEmptyState message="Seu navegador não suporta a leitura local de pastas. Use Chrome, Edge ou Opera em desktop." />
        )}

        {status === "missing" && (
          <TestDatasEmptyState
            message={`Não foi encontrado o arquivo ${TEST_DATAS_PATH} neste projeto.`}
          />
        )}

        {status === "demo" && (
          <TestDatasEmptyState message="O projeto de demonstração não possui test datas reais. Importe um projeto para ver a lista." />
        )}

        {status === "ready" && entries.length === 0 && (
          <TestDatasEmptyState message="Nenhum test data encontrado no arquivo do projeto." />
        )}

        {status === "ready" &&
          entries.length > 0 &&
          filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
              Nenhum resultado para “{query.trim()}”.
            </div>
          )}

        {status === "ready" &&
          filtered.map((entry) => (
            <TestDataCard key={entry.name} entry={entry} />
          ))}
      </section>
    </main>
  );
}

function TestDatasEmptyState({
  icon,
  message,
}: {
  icon?: React.ReactNode;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      {icon ?? <Database className="mx-auto size-10 text-muted-foreground" />}
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}

function TestDataCard({ entry }: { entry: TestDataEntry }) {
  const [copied, setCopied] = useState(false);
  const param = `?testdata=${entry.name}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(param);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore copy errors (e.g. insecure context).
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 transition-all hover:border-primary/60 hover:bg-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {entry.category && (
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {entry.category}
            </p>
          )}
          <h2 className="break-all text-lg font-semibold tracking-tight">
            {entry.name}
          </h2>
          {entry.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {entry.description}
            </p>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground/70">
              Sem descrição no catálogo
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 self-start rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            copied
              ? "border-green-500/30 bg-green-500/10 text-green-600"
              : "border-border bg-background text-foreground hover:bg-accent",
          )}
          aria-label={copied ? "Copiado" : `Copiar ${param}`}
        >
          {copied ? (
            <>
              <Check className="size-4" /> Copiado
            </>
          ) : (
            <>
              <Copy className="size-4" /> {param}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
