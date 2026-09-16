import { useEffect, useState } from "react";

import {
  readWorkspaceTextFile,
  type ProjectFileStatus,
} from "@/lib/cocos/projectFile";

export const TEST_DATAS_PATH = "docs/testdata/TEST_DATAS.md";
export const TEST_DATA_DESCRIPTIONS_PATH =
  "docs/testdata/TEST_DATA_DESCRIPTIONS.md";

export interface TestDataEntry {
  name: string;
  description: string;
  category: string;
}

export interface TestDatasResult {
  status: ProjectFileStatus | "loading";
  entries: TestDataEntry[];
}

const NAME_HEADERS = new Set([
  "name",
  "file name",
  "filename",
  "test data",
  "testdata",
]);

const DESCRIPTION_HEADERS = new Set([
  "description",
  "desc",
  "descrição",
  "descricao",
]);

/**
 * Reads and parses test data catalog markdown from the imported project.
 * Prefers descriptions from TEST_DATA_DESCRIPTIONS.md when present.
 */
export function useTestDatas(
  workspaceId: string | null,
  demo: boolean,
): TestDatasResult {
  const [result, setResult] = useState<TestDatasResult>({
    status: "loading",
    entries: [],
  });

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) {
      setResult({ status: "unavailable", entries: [] });
      return;
    }
    setResult({ status: "loading", entries: [] });
    (async () => {
      const catalog = await readWorkspaceTextFile(
        workspaceId,
        TEST_DATAS_PATH,
        demo,
      );
      if (cancelled) return;
      if (catalog.status !== "ready" || !catalog.content) {
        setResult({ status: catalog.status, entries: [] });
        return;
      }

      const descriptionsFile = await readWorkspaceTextFile(
        workspaceId,
        TEST_DATA_DESCRIPTIONS_PATH,
        demo,
      );
      if (cancelled) return;

      const descriptionMap =
        descriptionsFile.status === "ready" && descriptionsFile.content
          ? parseDescriptionMap(descriptionsFile.content)
          : new Map<string, string>();

      setResult({
        status: "ready",
        entries: parseTestDatasMarkdown(catalog.content, descriptionMap),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, demo]);

  return result;
}

/** Parse markdown tables into name → description. */
export function parseDescriptionMap(markdown: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of parseTables(markdown)) {
    if (entry.description) map.set(entry.name, entry.description);
  }
  return map;
}

/**
 * Extract test data entries from TEST_DATAS.md.
 * Merges optional description overrides and fills gaps from the full-list fence.
 */
export function parseTestDatasMarkdown(
  markdown: string,
  descriptionOverrides: Map<string, string> = new Map(),
): TestDataEntry[] {
  const byName = new Map<string, TestDataEntry>();

  const upsert = (entry: TestDataEntry) => {
    const existing = byName.get(entry.name);
    byName.set(entry.name, {
      name: entry.name,
      description:
        descriptionOverrides.get(entry.name) ||
        entry.description ||
        existing?.description ||
        "",
      category: entry.category || existing?.category || "",
    });
  };

  for (const entry of parseTables(markdown)) upsert(entry);

  for (const name of parseFullListNames(markdown)) {
    upsert({
      name,
      description: descriptionOverrides.get(name) ?? "",
      category: "",
    });
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

function parseTables(markdown: string): TestDataEntry[] {
  const entries: TestDataEntry[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let category = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading?.[1]) {
      category = heading[1].replace(/\s*—.*$/, "").trim();
      continue;
    }

    if (!isTableSeparator(lines[i + 1])) continue;
    const headerCells = splitRow(line);
    if (headerCells.length < 2) continue;

    const rows: string[][] = [];
    let j = i + 2;
    while (j < lines.length) {
      const rowLine = lines[j];
      if (!rowLine?.trim().startsWith("|")) break;
      rows.push(splitRow(rowLine));
      j++;
    }

    const nameIdx = headerCells.findIndex((h) =>
      NAME_HEADERS.has(normalizeHeader(h)),
    );
    const descIdx = headerCells.findIndex((h) =>
      DESCRIPTION_HEADERS.has(normalizeHeader(h)),
    );

    if (nameIdx >= 0) {
      for (const row of rows) {
        const name = extractName(row[nameIdx] ?? "");
        if (!name) continue;
        entries.push({
          name,
          description: cleanCell(row[descIdx] ?? ""),
          category,
        });
      }
    } else {
      // Matrix tables: first column is a label, remaining cells hold names.
      for (const row of rows) {
        const label = cleanCell(row[0] ?? "");
        for (let c = 1; c < headerCells.length; c++) {
          const name = extractName(row[c] ?? "");
          if (!name) continue;
          const variant = cleanCell(headerCells[c] ?? "");
          const description = [label, variant].filter(Boolean).join(" · ");
          entries.push({ name, description, category });
        }
      }
    }

    i = j - 1;
  }

  return entries;
}

function parseFullListNames(markdown: string): string[] {
  const names: string[] = [];
  const fenceRe = /```[^\n]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(markdown))) {
    const body = match[1];
    if (!body) continue;
    // Skip fences that look like URL/usage examples rather than name lists.
    if (body.includes("?testdata=") || body.includes("http")) continue;
    for (const line of body.split("\n")) {
      const name = line.trim();
      if (!name || name.startsWith("#") || name.includes(" ")) continue;
      if (/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) names.push(name);
    }
  }
  return names;
}

function isTableSeparator(line: string | undefined): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  return /^\|?[\s:|-]+\|[\s:|-]*\|?$/.test(trimmed) && trimmed.includes("-");
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function normalizeHeader(value: string): string {
  return cleanCell(value).toLowerCase();
}

function cleanCell(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function extractName(cell: string): string | null {
  const tick = cell.match(/`([^`]+)`/);
  const raw = (tick?.[1] ?? cleanCell(cell)).trim();
  if (!raw || raw === "-" || raw === "—") return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(raw)) return null;
  return raw;
}
