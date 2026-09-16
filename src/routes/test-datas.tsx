import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, ArrowLeft, FolderOpen, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ActiveProjectBadge } from "@/components/ActiveProjectBadge";
import { useActiveWorkspace } from "@/lib/activeWorkspace";
import {
  readWorkspaceTextFile,
  type ProjectFileStatus,
} from "@/lib/cocos/projectFile";

const TEST_DATAS_PATH = "docs/testdata/TEST_DATAS.md";

export const Route = createFileRoute("/test-datas")({
  head: () => ({
    meta: [
      { title: "Test Datas / Mocks — Auxiliador Dev" },
      {
        name: "description",
        content:
          "Lista de test datas e mocks com links rápidos para localhost.",
      },
      { property: "og:title", content: "Test Datas / Mocks — Auxiliador Dev" },
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
  const [status, setStatus] = useState<ProjectFileStatus | "loading">(
    "loading",
  );
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!active) {
      setStatus("unavailable");
      setContent(null);
      return;
    }
    setStatus("loading");
    (async () => {
      const result = await readWorkspaceTextFile(
        active.id,
        TEST_DATAS_PATH,
        active.demo,
      );
      if (cancelled) return;
      setStatus(result.status);
      setContent(result.content);
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Voltar para Auxiliador Dev
        </Link>
        <ActiveProjectBadge />
      </div>

      <header className="mb-12">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          Ferramenta
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          Test Datas / Mocks
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Conteúdo de{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {TEST_DATAS_PATH}
          </code>{" "}
          do projeto importado.
        </p>
      </header>

      {status === "loading" && (
        <section className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Lendo {TEST_DATAS_PATH}...
        </section>
      )}

      {status === "unavailable" && !active && (
        <TestDatasEmptyState message="Nenhum projeto selecionado. Volte para a tela inicial e selecione ou importe um projeto." />
      )}

      {status === "unavailable" && active && (
        <TestDatasEmptyState message="A pasta deste projeto não está mais acessível neste navegador. Reimporte-o na tela inicial." />
      )}

      {status === "permission" && (
        <TestDatasEmptyState message="Permissão de leitura da pasta do projeto foi negada. Reimporte o projeto para conceder acesso novamente." />
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

      {status === "ready" && content !== null && (
        <section className="rounded-xl border border-border bg-card/70 p-6">
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground">
            {content}
          </pre>
        </section>
      )}
    </main>
  );
}

function TestDatasEmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
      <Database className="mx-auto size-10 text-muted-foreground" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </section>
  );
}
