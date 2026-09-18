import type { Doc, Frame, Group } from "../tokens";
import type { FileTree, FileEntry } from "../tauri";
import { readFileAsString, readFileTreeRecursive } from "../tauri";
import { detectProject, detectScreens, detectFlutterProject, type ProjectInfo } from "./detect";
import { parseJsx, type JSXNode } from "./parser";
import { COMPONENT_MAP, LAYOUT_CONTAINERS, mergeCustomMappings, type ComponentMapping } from "./componentMap";

export type ImportResult = {
  projectInfo: ProjectInfo;
  rootPath: string;
  fileTree: FileTree;
  screens: { path: string; name: string; doc: Partial<Doc> }[];
  /** files that failed to parse (skipped silently before) */
  parseErrors?: number;
};

/** Normalize any path to forward slashes (Rust backend may return backslashes on Windows) */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/** Join a root directory and a relative path safely on both platforms */
function joinPath(root: string, rel: string): string {
  const r = normalizePath(root).replace(/\/+$/, "");
  return `${r}/${normalizePath(rel)}`;
}

function fileNameFromPath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  const last = parts[parts.length - 1] ?? path;
  return last.replace(/\.(tsx|ts|jsx|js)$/, "");
}

function frameNameFromPath(path: string): string {
  const clean = path.replace(/\\/g, "/");
  // Flutter: lib/home_page.dart or lib/screens/home_screen.dart -> "Home"
  const dart = clean.match(/(?:^|\/)([\w-]+)\.dart$/);
  if (dart) {
    const base = dart[1].replace(/[-_](page|screen|view)$/i, "");
    return base
      .split(/[-_]/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ") || "Main";
  }
  const match = clean.match(/(?:app|src\/app)\/(.+?)\/page\.(?:tsx|ts|jsx|js)$/);
  if (match) {
    return match[1]
      .split("/")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }
  const match2 = clean.match(/(?:pages|src\/pages)\/(.+?)\.(?:tsx|ts|jsx|js)$/);
  if (match2) {
    return match2[1]
      .split("/")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }
  return fileNameFromPath(path);
}

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

/** Extract text label from a node's children */
function extractLabel(node: JSXNode): string {
  if (node.text) return node.text;
  for (const child of node.children) {
    if (child.componentName === "#text" && child.text) return child.text;
  }
  return "";
}

/** Map a single JSX node to an M3E Canvas item (no recursion) */
function buildItem(node: JSXNode, componentMap: Record<string, ComponentMapping>): Record<string, unknown> | null {
  const mapping = componentMap[node.componentName];
  if (!mapping) return null;

  const item: Record<string, unknown> = {
    kind: mapping.kind,
    label: "",
    icon: null,
    variant: mapping.defaultVariant ?? "filled",
  };

  for (const [jsxProp, field] of Object.entries(mapping.propMap)) {
    const value = node.props[jsxProp];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
      // numeric canvas fields must be real numbers (Slider value, Tab selected)
      if (field === "value" || field === "selected") {
        const num = Number(value);
        if (!Number.isNaN(num)) (item as Record<string, unknown>)[field] = num;
      } else {
        item[field] = value;
      }
    }
  }

  // Try to get a label from children text or props
  if (!item.label) {
    const label = extractLabel(node);
    if (label) item.label = label;
  }

  // For MUI ListItem with nested ListItemText, extract text from children
  if (node.componentName === "ListItem" || node.componentName === "ListItemButton") {
    for (const child of node.children) {
      if (child.componentName === "ListItemText") {
        const primary = child.props.primary;
        if (typeof primary === "string") item.label = primary;
        const secondary = child.props.secondary;
        if (typeof secondary === "string") item.supporting = secondary;
      }
    }
  }

  return item;
}

/** Map a single JSX node to an M3E Canvas item, recursing into children to find mappable components */
function mapNodeToItems(node: JSXNode, items: Record<string, unknown>[], depth: number, componentMap: Record<string, ComponentMapping>): void {
  if (depth > 10) return; // safety limit

  if (node.componentName === "#text") return;

  const item = buildItem(node, componentMap);
  if (item) items.push(item);

  // Always recurse into children to find more mappable components
  for (const child of node.children) {
    if (child.componentName === "#text") continue;
    mapNodeToItems(child, items, depth + 1, componentMap);
  }
}

/** Determine stacking axis from a layout container's props */
function axisOf(node: JSXNode): "x" | "y" {
  const props = node.props;
  // MUI Stack: direction="row" or "column"
  if (typeof props.direction === "string") return props.direction === "row" ? "x" : "y";
  // Chakra VStack/HStack
  if (node.componentName === "HStack" || node.componentName === "HFlex") return "x";
  if (node.componentName === "VStack" || node.componentName === "VFlex") return "y";
  // Flutter Row/Column
  if (node.componentName === "Row") return "x";
  if (node.componentName === "Column") return "y";
  // Flutter explicit Axis
  if (props.axis === "Axis.horizontal") return "x";
  if (props.axis === "Axis.vertical") return "y";
  // CSS flex
  const style = props.style;
  if (typeof style === "object" && style) {
    const s = style as Record<string, unknown>;
    if (typeof s.flexDirection === "string") return s.flexDirection.includes("row") ? "x" : "y";
  }
  // Tailwind classes
  const className = props.className;
  if (typeof className === "string") {
    if (className.includes("flex-row") || className.includes("flex-row-reverse")) return "x";
    if (className.includes("flex-col")) return "y";
  }
  return "y"; // default vertical
}

/**
 * Recursively walk a component tree emitting one group per layout container.
 * - Layout containers (Row/Column/Stack/div...) become their own group with
 *   their directly-owned widgets (non-layout children, deep-flattened).
 * - Nested layout containers become sibling groups, preserving structure.
 * - Mapped non-layout widgets become single-item groups.
 * - Unmapped wrappers (Scaffold, MaterialApp, CustomScrollView...) are
 *   transparent: we descend into their children.
 */
function collectGroups(node: JSXNode, out: Group[], componentMap: Record<string, ComponentMapping>, depth: number): void {
  if (depth > 14) return;
  if (node.componentName === "#text") return;

  const isLayout = LAYOUT_CONTAINERS.has(node.componentName);

  if (isLayout) {
    const items: Record<string, unknown>[] = [];
    for (const child of node.children) {
      if (child.componentName === "#text") continue;
      if (LAYOUT_CONTAINERS.has(child.componentName)) continue; // handled as its own group below
      mapNodeToItems(child, items, 0, componentMap);
    }
    if (items.length > 0) {
      out.push({
        id: nextId("g"),
        x: 0,
        y: 0,
        axis: axisOf(node),
        items: items.map((item) => ({ ...item, id: nextId("i") })) as any,
      });
    }
    for (const child of node.children) {
      if (LAYOUT_CONTAINERS.has(child.componentName)) collectGroups(child, out, componentMap, depth + 1);
    }
    return;
  }

  if (componentMap[node.componentName]) {
    const item = buildItem(node, componentMap);
    if (item) {
      out.push({
        id: nextId("g"),
        x: 0,
        y: 0,
        axis: "y",
        items: [{ ...item, id: nextId("i") } as any],
      });
    }
    // Mapped widget may still own nested layout (e.g. Card > Column)
    for (const child of node.children) {
      if (LAYOUT_CONTAINERS.has(child.componentName)) collectGroups(child, out, componentMap, depth + 1);
    }
    return;
  }

  // Unmapped wrapper: descend into everything
  for (const child of node.children) {
    collectGroups(child, out, componentMap, depth + 1);
  }
}

export function mapComponentTree(nodes: JSXNode[], x: number, y: number, componentMap: Record<string, ComponentMapping>): Group[] {
  const raw: Group[] = [];
  for (const node of nodes) {
    collectGroups(node, raw, componentMap, 0);
  }

  // Place groups vertically, widening horizontal rows so items fit side by side
  let currentY = y;
  for (const g of raw) {
    g.x = x;
    g.y = currentY;
    const slots = g.axis === "x" ? Math.min(g.items.length, 4) : g.items.length;
    currentY += slots * 72 + 16;
  }
  return raw;
}

export async function importProject(
  rootPath: string,
  customMappings?: Record<string, { kind: string; labelProp?: string }>,
): Promise<ImportResult> {
  const fileTree = await readFileTreeRecursive(rootPath, 6);

  // Find and read package.json (paths normalized: backend may use backslashes on Windows)
  const pkgEntry = fileTree.entries.find((e) => {
    const p = normalizePath(e.path);
    return p === "package.json" || p.endsWith("/package.json");
  });
  let projectInfo: ProjectInfo;

  // Flutter projects have a pubspec.yaml instead of package.json
  const pubspecEntry = fileTree.entries.find((e) => normalizePath(e.path) === "pubspec.yaml");

  if (pubspecEntry) {
    const pubspecPath = joinPath(rootPath, pubspecEntry.path);
    const pubspecText = await readFileAsString(pubspecPath);
    const flutter = detectFlutterProject(pubspecText);
    projectInfo = { ...flutter, uiLib: "unknown", router: "unknown" };
  } else if (pkgEntry) {
    const pkgPath = joinPath(rootPath, pkgEntry.path);
    const pkgContent = await readFileAsString(pkgPath);
    const pkgJson = JSON.parse(pkgContent);
    projectInfo = detectProject(pkgJson);
  } else {
    projectInfo = {
      framework: "unknown",
      uiLib: "unknown",
      router: "unknown",
      typescript: false,
      pkgName: "unknown",
      pkgVersion: "0.0.0",
      dependencies: {},
    };
  }

  // Detect screen/route files
  const screenPaths = detectScreens(fileTree, projectInfo.framework);
  const screens: { path: string; name: string; doc: Partial<Doc> }[] = [];
  const componentMap = customMappings ? mergeCustomMappings(customMappings) : COMPONENT_MAP;

  // Flutter l10n: load .arb translations so labels like "l10n.someKey"
  // resolve to real UI text (prefers Chinese, then English, then any)
  const l10n = await loadArbTranslations(rootPath, fileTree);

  let parseErrors = 0;
  for (const screenPath of screenPaths) {
    const fullPath = joinPath(rootPath, screenPath);
    try {
      const source = await readFileAsString(fullPath);
      const { components } = await parseJsx(source, screenPath);
      const name = frameNameFromPath(normalizePath(screenPath));
      const groups = mapComponentTree(components, 16, 100, componentMap);
      if (l10n) applyTranslations(groups, l10n);

      screens.push({
        path: screenPath,
        name,
        doc: {
          frames: [{ id: nextId("f"), name, x: 0, y: 0, linkedFile: screenPath } as Frame],
          groups,
        },
      });
    } catch {
      parseErrors++;
    }
  }

  return { projectInfo, rootPath, fileTree, screens, parseErrors };
}

/** Load Flutter .arb translations, preferring Chinese locales */
async function loadArbTranslations(rootPath: string, fileTree: FileTree): Promise<Record<string, string>> {
  const arbs = fileTree.entries.map((e) => normalizePath(e.path)).filter((p) => p.endsWith(".arb"));
  if (arbs.length === 0) return {};
  // prefer files under a l10n/ folder and shallower paths (skips backup copies)
  const inL10n = arbs.filter((p) => /(^|\/)l10n\//.test(p));
  const pool = (inL10n.length > 0 ? inL10n : arbs).sort(
    (a, b) => a.split("/").length - b.split("/").length,
  );
  const pick = (re: RegExp) => pool.find((p) => re.test(p));
  const chosen = pick(/zh(?=[^/]*\.arb$)/i) ?? pick(/en(?=[^/]*\.arb$)/i) ?? pool[0];
  try {
    const text = await readFileAsString(joinPath(rootPath, chosen));
    const data = JSON.parse(text) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!k.startsWith("@") && typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

const L10N_LABEL_RE = /^l10n\.([A-Za-z0-9_]+)/;

/** Replace "l10n.someKey" labels with translated text in place */
function applyTranslations(groups: Group[], l10n: Record<string, string>) {
  for (const g of groups) {
    for (const item of g.items as Record<string, unknown>[]) {
      for (const field of ["label", "supporting"]) {
        const v = item[field];
        if (typeof v === "string") {
          const m = L10N_LABEL_RE.exec(v);
          if (m && m[1] in l10n) item[field] = l10n[m[1]];
        }
      }
    }
  }
}
