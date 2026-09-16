import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Terminal,
  ArrowLeft,
  Copy,
  Check,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { useState } from "react";

import { useNpmScripts } from "@/lib/npm.commands";
import { useActiveWorkspace } from "@/lib/activeWorkspace";
import { ActiveProjectBadge } from "@/components/ActiveProjectBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comandos")({
  head: () => ({
    meta: [
      { title: "Comandos NPM — Auxiliador Dev" },
      {
        name: "description",
        content: "Lista de comandos npm do projeto para execução rápida.",
      },
      { property: "og:title", content: "Comandos NPM — Auxiliador Dev" },
      {
        property: "og:description",
        content: "Lista de comandos npm do projeto para execução rápida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComandosIndex,
});

function ComandosIndex() {
  const active = useActiveWorkspace();
  const { status, scripts } = useNpmScripts(
    active?.id ?? null,
    Boolean(active?.demo),
  );
  const entries = Object.entries(scripts);

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
          Comandos NPM
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Scripts disponíveis no{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            package.json
          </code>{" "}
          do projeto. Clique para copiar o comando de execução com pnpm.
        </p>
      </header>

      <section className="grid gap-4">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Lendo package.json...
          </div>
        )}

        {status === "unavailable" && !active && (
          <ComandosEmptyState
            icon={
              <FolderOpen className="mx-auto size-10 text-muted-foreground" />
            }
            message="Nenhum projeto selecionado. Volte para a tela inicial e selecione ou importe um projeto."
          />
        )}

        {status === "unavailable" && active && (
          <ComandosEmptyState
            icon={
              <FolderOpen className="mx-auto size-10 text-muted-foreground" />
            }
            message="A pasta deste projeto não está mais acessível neste navegador. Reimporte-o na tela inicial."
          />
        )}

        {status === "permission" && (
          <ComandosEmptyState
            icon={
              <FolderOpen className="mx-auto size-10 text-muted-foreground" />
            }
            message="Permissão de leitura da pasta do projeto foi negada. Reimporte o projeto para conceder acesso novamente."
          />
        )}

        {status === "unsupported" && (
          <ComandosEmptyState
            icon={
              <Terminal className="mx-auto size-10 text-muted-foreground" />
            }
            message="Seu navegador não suporta a leitura local de pastas. Use Chrome, Edge ou Opera em desktop."
          />
        )}

        {status === "missing" && (
          <ComandosEmptyState
            icon={
              <Terminal className="mx-auto size-10 text-muted-foreground" />
            }
            message="Não foi encontrado um package.json na raiz do projeto importado."
          />
        )}

        {status === "invalid" && (
          <ComandosEmptyState
            icon={
              <Terminal className="mx-auto size-10 text-muted-foreground" />
            }
            message="O package.json encontrado não é um JSON válido."
          />
        )}

        {status === "demo" && (
          <ComandosEmptyState
            icon={
              <Terminal className="mx-auto size-10 text-muted-foreground" />
            }
            message="O projeto de demonstração não possui um package.json real. Importe um projeto para ver seus comandos."
          />
        )}

        {status === "ready" && entries.length === 0 && (
          <ComandosEmptyState
            icon={
              <Terminal className="mx-auto size-10 text-muted-foreground" />
            }
            message="Nenhum comando encontrado no package.json."
          />
        )}

        {status === "ready" &&
          entries.map(([name, command]) => (
            <NpmCommandCard key={name} name={name} command={command} />
          ))}
      </section>
    </main>
  );
}

function ComandosEmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      {icon}
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}

function NpmCommandCard({ name, command }: { name: string; command: string }) {
  const [copied, setCopied] = useState(false);
  const runCommand = `pnpm run ${name}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(runCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore copy errors (e.g. insecure context).
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 transition-all hover:bg-card hover:border-primary/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight capitalize">
            {name}
          </h2>
          <p className="mt-1 break-all font-mono text-sm text-muted-foreground">
            {command}
          </p>
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
          aria-label={copied ? "Copiado" : `Copiar ${runCommand}`}
        >
          {copied ? (
            <>
              <Check className="size-4" /> Copiado
            </>
          ) : (
            <>
              <Copy className="size-4" /> {runCommand}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
