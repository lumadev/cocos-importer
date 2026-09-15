import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import type { EntityKind, IndexedEntity, ProjectIndex } from "@/lib/cocos/types";
import { KIND_LABEL } from "@/lib/cocos/types";
import { cn } from "@/lib/utils";
import { hasPreview } from "@/lib/cocos/preview/kinds";
import { PreviewDialog } from "@/components/cocos/preview/PreviewDialog";
import { Button } from "@/components/ui/button";

export function encodeEntityId(id: string): string {
  return btoa(encodeURIComponent(id)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeEntityId(slug: string): string {
  const padded = slug.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4)));
}

const KIND_TONE: Partial<Record<EntityKind, string>> = {
  spriteAtlas: "border-primary/40 text-primary bg-primary/10",
  spriteFrame: "border-primary/25 text-primary/80 bg-primary/5",
  skeletonData: "border-accent/40 text-accent bg-accent/10",
  spineAnimation: "border-accent/25 text-accent/85 bg-accent/5",
  scene: "border-highlight/40 text-highlight bg-highlight/10",
  prefab: "border-highlight/30 text-highlight/85 bg-highlight/5",
  script: "border-border text-foreground/80 bg-secondary",
};

export function KindBadge({ kind, className }: { kind: EntityKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-2 py-0.5 font-mono text-[11px] tracking-wide",
        KIND_TONE[kind] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

export function EntityLink({
  workspaceId,
  entity,
  children,
  className,
}: {
  workspaceId: string;
  entity: IndexedEntity;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to="/w/$id/e/$entityId"
      params={{ id: workspaceId, entityId: encodeEntityId(entity.id) }}
      className={className}
    >
      {children}
    </Link>
  );
}

export function EntityRow({
  workspaceId,
  entity,
  parent,
  index,
  demo,
}: {
  workspaceId: string;
  entity: IndexedEntity;
  parent?: IndexedEntity | undefined;
  index?: ProjectIndex | undefined;
  demo?: boolean | undefined;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewable = index ? hasPreview(entity) : false;

  return (
    <>
      <div className="group flex items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 transition-colors hover:border-primary/60 hover:bg-secondary/60">
        <EntityLink
          workspaceId={workspaceId}
          entity={entity}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <KindBadge kind={entity.kind} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-foreground group-hover:text-primary">
              {entity.name}
            </span>
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {parent ? `${parent.name} · ` : ""}
              {entity.path}
            </span>
          </span>
          {entity.childIds.length > 0 && (
            <span className="shrink-0 rounded bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {entity.childIds.length} itens
            </span>
          )}
        </EntityLink>
        {previewable && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Preview de ${entity.name}`}
            onClick={(e) => {
              e.stopPropagation();
              setPreviewOpen(true);
            }}
          >
            <Play className="size-4 text-primary" />
          </Button>
        )}
      </div>
      {previewable && index && (
        <PreviewDialog
          entity={entity}
          index={index}
          workspaceId={workspaceId}
          demo={demo ?? false}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  );
}