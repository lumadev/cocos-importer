import { Boxes } from "lucide-react";
import type { PreviewInfo } from "@/lib/cocos/types";
import { PreviewMessage } from "./primitives";

export function PrefabPreview({ preview }: { preview: PreviewInfo }) {
  const nodes = preview.nodes ?? [];
  if (!nodes.length) return <PreviewMessage>Nenhum nó registrado neste prefab.</PreviewMessage>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Estrutura de nós do prefab ({nodes.length}). A renderização gráfica completa depende do
        runtime do Cocos; aqui é exibida a hierarquia indexada.
      </p>
      <ul className="max-h-[50vh] space-y-1 overflow-auto rounded-lg border border-border p-3">
        {nodes.map((node, i) => (
          <li
            key={`${node}-${i}`}
            className="flex items-center gap-2 rounded px-2 py-1 font-mono text-xs hover:bg-muted/50"
            style={{ paddingLeft: `${(i === 0 ? 0 : 1) * 16 + 8}px` }}
          >
            <Boxes className="size-3.5 shrink-0 text-muted-foreground" />
            {node}
          </li>
        ))}
      </ul>
    </div>
  );
}
