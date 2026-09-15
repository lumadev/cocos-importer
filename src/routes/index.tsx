import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Database,
  Terminal,
  ArrowRight,
  FolderPlus,
  FolderOpen,
  Clock,
  Layers,
  Folder,
  BadgeCheck,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supportsDirectoryPicker } from "@/lib/cocos/importer";
import {
  createDemoWorkspace,
  listWorkspaces,
  removeWorkspace,
} from "@/lib/cocos/storage";
import { useProjectImport } from "@/lib/cocos/useProjectImport";
import type { Workspace } from "@/lib/cocos/types";

const ACTIVE_KEY = "auxdev:activeWorkspace";
const NEW_PROJECT_VALUE = "__new__";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Auxiliador Dev — Ferramentas de produtividade" },
      {
        name: "description",
        content:
          "Importe seu projeto e acesse ferramentas de produtividade: busca de assets Cocos, test datas e comandos npm.",
      },
      {
        property: "og:title",
        content: "Auxiliador Dev — Ferramentas de produtividade",
      },
      {
        property: "og:description",
        content:
          "Importe seu projeto e acesse ferramentas de produtividade: busca de assets Cocos, test datas e comandos npm.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  large?: boolean;
}

const tools: ToolCard[] = [
  {
    id: "cocos",
    title: "Buscador Cocos",
    description:
      "Pesquise atlas, sprites, Spine, cenas, prefabs e scripts do projeto importado em segundos.",
    icon: <Search className="size-6" />,
    to: "/cocos",
    large: true,
  },
  {
    id: "test-datas",
    title: "Listar Test Datas / Mocks",
    description:
      "Lista de test datas e mocks com links rápidos para acessar o localhost durante o desenvolvimento.",
    icon: <Database className="size-6" />,
    to: "/test-datas",
  },
  {
    id: "comandos",
    title: "Listar Comandos",
    description:
      "Lista os scripts npm do projeto, facilitando a execução e consulta dos comandos disponíveis.",
    icon: <Terminal className="size-6" />,
    to: "/comandos",
  },
];

function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pendingHandle, setPendingHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [projectName, setProjectName] = useState("");
  const [targetId, setTargetId] = useState(NEW_PROJECT_VALUE);
  const { state, pickDirectory, run } = useProjectImport();

  useEffect(() => {
    const all = listWorkspaces();
    setWorkspaces(all);
    const stored = localStorage.getItem(ACTIVE_KEY);
    setActiveId(stored && all.some((w) => w.id === stored) ? stored : null);
    setMounted(true);
  }, []);

  const activate = (id: string) => {
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
  };

  const active = workspaces.find((w) => w.id === activeId) ?? null;

  const resetImportFlow = () => {
    setPendingHandle(null);
    setProjectName("");
    setTargetId(NEW_PROJECT_VALUE);
  };

  const handleChooseFolder = async () => {
    setError("");
    try {
      const handle = await pickDirectory();
      const match = workspaces.find((w) => w.name === handle.name && !w.demo);
      setPendingHandle(handle);
      setProjectName(match?.name ?? handle.name);
      setTargetId(match?.id ?? NEW_PROJECT_VALUE);
    } catch (e) {
      if ((e as Error).message === "unsupported") {
        setError(
          "Seu navegador não suporta a seleção de pastas. Use Chrome, Edge ou Opera em desktop.",
        );
      } else if ((e as Error).name !== "AbortError") {
        setError(`Falha ao selecionar a pasta: ${(e as Error).message}`);
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingHandle) return;
    setError("");
    try {
      const target =
        targetId === NEW_PROJECT_VALUE
          ? undefined
          : workspaces.find((w) => w.id === targetId);
      const ws = await run(pendingHandle, target, projectName);
      // Uma importação por projeto: remove versões anteriores com o mesmo nome.
      let all = listWorkspaces();
      for (const old of all.filter(
        (w) => w.name === ws.name && w.id !== ws.id,
      )) {
        all = await removeWorkspace(old.id);
      }
      setWorkspaces(all);
      activate(ws.id);
      setImportOpen(false);
      resetImportFlow();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(`Falha na importação: ${(e as Error).message}`);
      }
    }
  };

  const handleDemo = async () => {
    setError("");
    setDemoBusy(true);
    try {
      const ws = await createDemoWorkspace();
      setWorkspaces(listWorkspaces());
      activate(ws.id);
      setImportOpen(false);
      resetImportFlow();
    } catch (e) {
      setError(`Falha ao criar demonstração: ${(e as Error).message}`);
    } finally {
      setDemoBusy(false);
    }
  };

  const locked = !active;

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16">
      <header className="mb-10 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          Produtividade
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          Auxiliador Dev
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Importe ou selecione um projeto para liberar as ferramentas abaixo.
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-border bg-card/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Projeto atual</h2>
            {active ? (
              <div className="mt-3 flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <Folder className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-semibold text-foreground">
                      {active.name}
                    </span>
                    {active.demo && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <BadgeCheck className="size-3" /> Demo
                      </span>
                    )}
                  </p>
                  {active.path && !active.demo && (
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {active.path}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="size-3" /> {active.entityCount} itens
                      indexados
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      Importado em{" "}
                      {new Date(active.lastImportedAt).toLocaleString("pt-BR")}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Nenhum projeto selecionado ainda.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setImportOpen(true)}
              disabled={state.busy || demoBusy}
            >
              <FolderPlus className="mr-2 size-4" />
              Importar Projeto
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectOpen(true)}
              disabled={workspaces.length === 0}
            >
              <FolderOpen className="mr-2 size-4" />
              Selecionar Projeto
            </Button>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {tools.map((tool) => {
          const content = (
            <div
              className={cn(
                "group relative flex h-full flex-col rounded-2xl border p-6 transition-all",
                "bg-card/70",
                locked
                  ? "border-border/50 opacity-60"
                  : "border-border hover:border-primary/60 hover:bg-card hover:shadow-lg",
              )}
            >
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl border",
                  locked
                    ? "border-border/60 bg-secondary/50 text-muted-foreground"
                    : "border-primary/20 bg-primary/10 text-primary",
                )}
              >
                {tool.icon}
              </div>

              <div className="mt-5 flex flex-1 flex-col">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {tool.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
                <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors group-hover:gap-2">
                  {locked ? (
                    <span className="text-muted-foreground">
                      Selecione um projeto para liberar
                    </span>
                  ) : (
                    <>
                      Abrir ferramenta <ArrowRight className="size-4" />
                    </>
                  )}
                </div>
              </div>
            </div>
          );

          if (locked) {
            return (
              <div
                key={tool.id}
                aria-disabled="true"
                role="article"
                className={cn(tool.large && "md:col-span-2")}
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={tool.id}
              to={tool.to}
              className={cn(
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                tool.large && "md:col-span-2",
              )}
              aria-label={`Abrir ${tool.title}`}
            >
              {content}
            </Link>
          );
        })}
      </section>

      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          if (state.busy) return;
          setImportOpen(o);
          if (!o) resetImportFlow();
        }}
      >
        <DialogContent>
          {!pendingHandle ? (
            <>
              <DialogHeader>
                <DialogTitle>Importar Projeto</DialogTitle>
                <DialogDescription>
                  Selecione a pasta raiz do projeto. A leitura acontece
                  localmente no navegador e a data da importação é salva. Na
                  próxima etapa você pode nomear o projeto ou escolher um já
                  importado para substituir.
                </DialogDescription>
              </DialogHeader>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {mounted && !supportsDirectoryPicker() && (
                <p className="text-xs text-muted-foreground">
                  A seleção de pastas exige um navegador desktop baseado em
                  Chromium.
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={handleDemo}
                  disabled={demoBusy || state.busy}
                >
                  <Sparkles
                    className={cn("mr-2 size-4", demoBusy && "animate-pulse")}
                  />
                  Usar projeto de demonstração
                </Button>
                <Button
                  onClick={handleChooseFolder}
                  disabled={state.busy || demoBusy}
                >
                  <FolderPlus className="mr-2 size-4" />
                  Selecionar pasta
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirmar importação</DialogTitle>
                <DialogDescription>
                  Dê um nome ao projeto para identificá-lo facilmente.
                  Importações mais recentes substituem as antigas com o mesmo
                  nome, ou você pode escolher um projeto já importado para
                  sobrescrever diretamente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="project-name">Nome do projeto</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex.: cash_builder"
                    disabled={state.busy}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="project-target">
                    Substituir projeto existente (opcional)
                  </Label>
                  <Select
                    value={targetId}
                    onValueChange={setTargetId}
                    disabled={state.busy}
                  >
                    <SelectTrigger id="project-target">
                      <SelectValue placeholder="Novo projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NEW_PROJECT_VALUE}>
                        Novo projeto
                      </SelectItem>
                      {workspaces
                        .filter((w) => !w.demo)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {state.busy && (
                <p className="font-mono text-xs text-primary">
                  {state.message}
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={resetImportFlow}
                  disabled={state.busy}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={state.busy || !projectName.trim()}
                >
                  {state.busy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <FolderPlus className="mr-2 size-4" />
                  )}
                  {state.busy ? "Importando..." : "Importar"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={selectOpen} onOpenChange={setSelectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Projeto</DialogTitle>
            <DialogDescription>
              Projetos já importados neste navegador.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <button
                  type="button"
                  onClick={() => {
                    activate(ws.id);
                    setSelectOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col rounded-lg border px-4 py-3 text-left transition-colors",
                    ws.id === activeId
                      ? "border-primary bg-primary/10"
                      : "border-border/70 bg-secondary/40 hover:border-primary/60",
                  )}
                >
                  <span className="truncate font-semibold text-foreground">
                    {ws.name}
                  </span>
                  <span className="mt-1 font-mono text-xs text-muted-foreground">
                    {ws.entityCount} itens ·{" "}
                    {new Date(ws.lastImportedAt).toLocaleString("pt-BR")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {demoBusy && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2
            className="size-10 animate-spin text-primary"
            aria-hidden="true"
          />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              Preparando demonstração
            </p>
            <p className="text-sm text-muted-foreground">
              Gerando índice de exemplo...
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
