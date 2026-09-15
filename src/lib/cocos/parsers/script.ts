import { baseName, entityId, type AssetParser } from "./types";

/** TypeScript/JavaScript scripts: classes, methods, properties, imports, decorators. */
export const scriptParser: AssetParser = {
  name: "Script (.ts/.js)",
  match: (f) => ["ts", "js"].includes(f.ext) && !!f.text && !f.path.endsWith(".d.ts"),
  parse: (file, ctx) => {
    const text = file.text ?? "";
    const classes = [...text.matchAll(/class\s+([A-Za-z0-9_$]+)/g)].map((m) => m[1] ?? "");
    const methods = [
      ...text.matchAll(/^\s{2,}(?:public |private |protected |async |static )*([A-Za-z0-9_$]+)\s*\(/gm),
    ]
      .map((m) => m[1] ?? "")
      .filter((n) => n && !["if", "for", "while", "switch", "catch", "return"].includes(n));
    const properties = [
      ...text.matchAll(/^\s{2,}(?:public |private |protected |readonly )*([A-Za-z0-9_$]+)\s*[:=][^=]/gm),
    ].map((m) => m[1] ?? "");
    const imports = [...text.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1] ?? "");
    const exports = [...text.matchAll(/export\s+(?:default\s+)?(?:class|function|const|let|enum|interface)\s+([A-Za-z0-9_$]+)/g)].map(
      (m) => m[1] ?? "",
    );
    const decorators = [...text.matchAll(/@([A-Za-z0-9_$]+)/g)].map((m) => m[1] ?? "");

    const meta = ctx.meta.get(file.path);
    const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

    return [
      {
        id: entityId("script", file.path),
        kind: "script",
        name: baseName(file.path),
        path: file.path,
        childIds: [],
        size: file.size,
        details: {
          Classes: uniq(classes),
          Métodos: uniq(methods).slice(0, 120),
          Propriedades: uniq(properties).slice(0, 120),
          Imports: uniq(imports),
          Exports: uniq(exports),
          Decorators: uniq(decorators),
          Linhas: text.split("\n").length,
        },
        ...(meta?.uuid ? { uuid: meta.uuid } : {}),
        ...(file.bundle ? { bundle: file.bundle } : {}),
      },
    ];
  },
};