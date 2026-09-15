import { FolderOpen } from "lucide-react";

import { useActiveWorkspace } from "@/lib/activeWorkspace";

export function ActiveProjectBadge() {
  const active = useActiveWorkspace();

  if (!active) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm">
      <FolderOpen className="size-4 text-primary" />
      <span className="font-medium">{active.name}</span>
      {active.demo && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Demo
        </span>
      )}
    </div>
  );
}
