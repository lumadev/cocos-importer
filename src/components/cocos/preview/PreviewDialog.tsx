import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KIND_LABEL, type IndexedEntity, type ProjectIndex } from "@/lib/cocos/types";
import { createFileSource, type FileSource } from "@/lib/cocos/preview/source";
import { SpinePreview } from "./SpinePreview";
import { PreviewMessage } from "./primitives";

const STATUS_MESSAGE: Record<string, string> = {
  permission:
    "Permissão de leitura negada. Reabra o preview e autorize o acesso à pasta do projeto.",
  unavailable:
    "A pasta do projeto não está mais acessível neste navegador. Reimporte o projeto para visualizar os arquivos.",
  unsupported: "Este navegador não suporta leitura de pastas locais (File System Access API).",
};

export function PreviewDialog({
  entity,
  index,
  workspaceId,
  demo,
  open,
  onOpenChange,
}: {
  entity: IndexedEntity;
  index: ProjectIndex;
  workspaceId: string;
  demo: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [source, setSource] = useState<FileSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSource(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let createdSource: FileSource | null = null;
    setSource(null);
    setError(null);
    setLoading(true);
    createFileSource(workspaceId, index, demo)
      .then((created) => {
        if (cancelled) {
          created.dispose();
          return;
        }
        createdSource = created;
        setSource(created);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao preparar os arquivos.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      createdSource?.dispose();
      createdSource = null;
    };
  }, [open, workspaceId, index, demo]);

  const preview = entity.preview;

  function body() {
    if (error) return <PreviewMessage>{error}</PreviewMessage>;
    if (loading || !source) return <PreviewMessage>Preparando arquivos...</PreviewMessage>;
    if (source.status !== "ready")
      return <PreviewMessage>{STATUS_MESSAGE[source.status]}</PreviewMessage>;
    if (!preview) return <PreviewMessage>Este item não possui preview.</PreviewMessage>;

    switch (preview.type) {
      case "spine":
        return (
          <SpinePreview
            source={source}
            preview={preview}
            index={index}
            entity={entity}
            demo={demo}
          />
        );
      default:
        return <PreviewMessage>Preview disponível apenas para animações Spine nesta etapa.</PreviewMessage>;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {KIND_LABEL[entity.kind]}
            </span>
            {entity.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {demo ? "Conteúdo sintético do projeto de demonstração · " : ""}
            {entity.path}
          </DialogDescription>
        </DialogHeader>
        {open && body()}
      </DialogContent>
    </Dialog>
  );
}
