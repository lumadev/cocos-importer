/** Minimal plist (Apple XML) parser, enough for TexturePacker sprite sheets. */

export type PlistValue = string | number | boolean | PlistValue[] | { [k: string]: PlistValue };

export function parsePlist(text: string): Record<string, PlistValue> | null {
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) return null;
  const root = doc.querySelector("plist > dict");
  if (!root) return null;
  return parseDict(root);
}

function children(el: Element): Element[] {
  return Array.from(el.children);
}

function parseDict(el: Element): Record<string, PlistValue> {
  const obj: Record<string, PlistValue> = {};
  const kids = children(el);
  for (let i = 0; i < kids.length; i += 1) {
    const node = kids[i];
    if (!node || node.tagName !== "key") continue;
    const valueNode = kids[i + 1];
    if (!valueNode) break;
    obj[node.textContent ?? ""] = parseValue(valueNode);
    i += 1;
  }
  return obj;
}

function parseValue(el: Element): PlistValue {
  switch (el.tagName) {
    case "dict":
      return parseDict(el);
    case "array":
      return children(el).map(parseValue);
    case "integer":
    case "real":
      return Number(el.textContent ?? 0);
    case "true":
      return true;
    case "false":
      return false;
    default:
      return el.textContent ?? "";
  }
}