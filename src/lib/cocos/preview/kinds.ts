import type { EntityKind, IndexedEntity } from "../types";

/**
 * Kinds that currently get a Preview button.
 * Escopo atual: apenas Spine (skeleton + animações). Os demais tipos
 * (atlas, sprite frame, textura, prefab, áudio, fonte bitmap) já possuem
 * visualizadores prontos e podem ser reativados aqui depois.
 */
const PREVIEWABLE: EntityKind[] = ["skeletonData", "spineAnimation"];

export function hasPreview(entity: IndexedEntity): boolean {
  if (!PREVIEWABLE.includes(entity.kind)) return false;
  return entity.preview?.type === "spine";
}
