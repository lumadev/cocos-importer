import type { EntityKind, IndexedEntity, ProjectIndex, UsageRef } from "./types";

export interface SearchResult {
  entity: IndexedEntity;
  score: number;
  parent?: IndexedEntity;
}

/**
 * Search Engine — every query runs exclusively over the generated index.
 */
export class SearchEngine {
  private readonly byId = new Map<string, IndexedEntity>();
  private readonly usagesByEntity = new Map<string, UsageRef[]>();

  constructor(public readonly index: ProjectIndex) {
    for (const entity of index.entities) this.byId.set(entity.id, entity);
    for (const usage of index.usages) {
      const list = this.usagesByEntity.get(usage.entityId) ?? [];
      list.push(usage);
      this.usagesByEntity.set(usage.entityId, list);
    }
  }

  get(id: string): IndexedEntity | undefined {
    return this.byId.get(id);
  }

  children(entity: IndexedEntity): IndexedEntity[] {
    return entity.childIds
      .map((id) => this.byId.get(id))
      .filter((e): e is IndexedEntity => Boolean(e));
  }

  parent(entity: IndexedEntity): IndexedEntity | undefined {
    return entity.parentId ? this.byId.get(entity.parentId) : undefined;
  }

  usages(entity: IndexedEntity): UsageRef[] {
    return this.usagesByEntity.get(entity.id) ?? [];
  }

  /** Entities declared inside a given file path (used to resolve usage links). */
  entitiesInFile(path: string): IndexedEntity[] {
    return this.index.entities.filter((e) => e.path === path && !e.parentId);
  }

  /**
   * Returns every match for `query` / `kinds`, ranked by score.
   * Callers should paginate in the UI (the old hard limit of 60 hid results).
   */
  search(query: string, kinds?: EntityKind[]): SearchResult[] {
    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];
    for (const entity of this.index.entities) {
      if (kinds && kinds.length > 0 && !kinds.includes(entity.kind)) continue;
      const name = entity.name.toLowerCase();
      let score = 0;
      if (!q) {
        score = entity.parentId ? 1 : 2;
      } else if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else if (entity.path.toLowerCase().includes(q)) score = 30;
      if (score === 0) continue;
      if (!entity.parentId) score += 5;
      const parent = this.parent(entity);
      results.push({ entity, score, ...(parent ? { parent } : {}) });
    }
    results.sort(
      (a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name),
    );
    return results;
  }
}

export function createSearchEngine(index: ProjectIndex): SearchEngine {
  return new SearchEngine(index);
}