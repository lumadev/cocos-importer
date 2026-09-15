import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FolderOpen } from "lucide-react";

import { ActiveProjectBadge } from "@/components/ActiveProjectBadge";
import { useActiveWorkspace } from "@/lib/activeWorkspace";

export const Route = createFileRoute("/cocos/")({
  head: () => ({
    meta: [
      {
        title:
          "Buscador Cocos — Índice pesquisável de projetos Cocos Creator 2D",
      },
      {
        name: "description",
        content:
          "Pesquise atlas, sprites, Spine, cenas, prefabs e scripts do projeto Cocos Creator selecionado.",
      },
      {
        property: "og:title",
        content: "Buscador Cocos — Índice de projetos Cocos Creator",
      },
      {
        property: "og:description",
        content:
          "Busca global sobre atlas, SpriteFrames, SkeletonData Spine, cenas e scripts.",
      },
    ],
  }),
  component: CocosBrowser,
});

function CocosBrowser() {
  const navigate = useNavigate();
  const active = useActiveWorkspace();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && active) {
      navigate({ to: "/w/$id", params: { id: active.id }, replace: true });
    }
  }, [active, mounted, navigate]);

  if (!mounted || active) {
    return (
      <main className="flex min-h-screen items-center justify-center p-10">
        <p className="font-mono text-sm text-muted-foreground">
          {active ? "Carregando projeto..." : "Carregando..."}
        </p>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-16">
      <header className="mb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Voltar para Auxiliador Dev
          </Link>
          <ActiveProjectBadge />
        </div>
        <span className="mt-6 block font-mono text-xs uppercase tracking-[0.3em] text-primary">
          Cocos Creator 2D
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          Buscador Cocos
        </h1>
      </header>

      <section className="rounded-xl border border-border bg-card/70 p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <FolderOpen className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">
          Nenhum projeto selecionado
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione ou importe um projeto na tela inicial para abrir o Buscador
          Cocos.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Ir para a tela inicial
        </Link>
      </section>
    </main>
  );
}
