/**
 * Lightweight JSX/TSX parser using Babel.
 * Extracts component tree from source code without executing it.
 */

export type JSXNode = {
  componentName: string;
  props: Record<string, unknown>;
  children: JSXNode[];
  text?: string;
  source: { start: number; end: number };
};

export type ParseResult = {
  imports: { name: string; source: string }[];
  /** top-level JSX elements, each with a fully populated children tree */
  components: JSXNode[];
  text: string;
};

const babelCache = new Map<string, { parser: typeof import("@babel/parser"); traverse: typeof import("@babel/traverse").default }>();

async function getBabel() {
  if (babelCache.has("babel")) return babelCache.get("babel")!;
  const parser = await import("@babel/parser");
  const traverse = (await import("@babel/traverse")).default;
  const result = { parser, traverse };
  babelCache.set("babel", result);
  return result;
}

function getPropValue(node: unknown): unknown {
  if (!node || typeof node !== "object") return undefined;
  const n = node as Record<string, unknown>;
  if (n.type === "StringLiteral") return n.value;
  if (n.type === "NumericLiteral") return n.value;
  if (n.type === "BooleanLiteral") return n.value;
  if (n.type === "NullLiteral") return null;
  if (n.type === "JSXExpressionContainer" && "expression" in n) {
    const expr = n.expression as Record<string, unknown>;
    if (expr.type === "StringLiteral") return expr.value;
    if (expr.type === "NumericLiteral") return expr.value;
    if (expr.type === "BooleanLiteral") return expr.value;
    if (expr.type === "Identifier") return expr.name;
    if (expr.type === "MemberExpression") {
      // e.g. Foo.Bar
      const obj = expr.object as Record<string, unknown>;
      const prop = expr.property as Record<string, unknown>;
      if (obj.type === "Identifier" && prop.type === "Identifier") return `${obj.name}.${prop.name}`;
    }
  }
  if (n.type === "JSXEmptyExpression") return undefined;
  return undefined;
}

/** Build a JSXNode tree from a Babel JSXElement node, recursing into children */
function buildNode(babelNode: any): JSXNode | null {
  const nameNode = babelNode.openingElement?.name;
  if (!nameNode) return null;

  let componentName = "";
  if (nameNode.type === "JSXIdentifier") {
    componentName = nameNode.name;
  } else if (nameNode.type === "JSXMemberExpression") {
    const parts: string[] = [];
    let current: any = nameNode;
    while (current) {
      parts.unshift(current.property?.name ?? "");
      current = current.object;
      if (current?.type === "JSXIdentifier") {
        parts.unshift(current.name);
        break;
      }
    }
    componentName = parts.join(".");
  }

  if (!componentName) return null;

  const props: Record<string, unknown> = {};
  for (const attr of babelNode.openingElement?.attributes ?? []) {
    if (attr.type === "JSXAttribute" && attr.name?.name) {
      props[attr.name.name] = getPropValue(attr.value);
    } else if (attr.type === "JSXSpreadAttribute") {
      props["...spread"] = true;
    }
  }

  const children: JSXNode[] = [];
  for (const child of babelNode.children ?? []) {
    if (child.type === "JSXText" && child.value?.trim()) {
      children.push({
        componentName: "#text",
        props: {},
        children: [],
        text: child.value.trim(),
        source: { start: child.start ?? 0, end: child.end ?? 0 },
      });
    } else if (child.type === "JSXElement") {
      const nested = buildNode(child);
      if (nested) children.push(nested);
    } else if (child.type === "JSXExpressionContainer") {
      const expr = child.expression;
      if (expr?.type === "StringLiteral" && expr.value?.trim()) {
        children.push({
          componentName: "#text",
          props: {},
          children: [],
          text: expr.value,
          source: { start: child.start ?? 0, end: child.end ?? 0 },
        });
      }
    }
  }

  return {
    componentName,
    props,
    children,
    text: undefined,
    source: {
      start: babelNode.start ?? 0,
      end: babelNode.end ?? 0,
    },
  };
}

export async function parseJsx(source: string, filePath?: string): Promise<ParseResult> {
  const ext = filePath?.split(".").pop()?.toLowerCase();
  if (ext === "dart") {
    return parseDart(source);
  }
  if (ext === "vue" || ext === "svelte" || ext === "html") {
    return parseMarkup(source);
  }
  return parseJsxSource(source);
}

async function parseJsxSource(source: string): Promise<ParseResult> {
  const { parser, traverse } = await getBabel();

  let ast: unknown;
  try {
    ast = parser.parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
    });
  } catch {
    return { imports: [], components: [], text: source };
  }

  const imports: { name: string; source: string }[] = [];
  const components: JSXNode[] = [];

  traverse(ast as any, {
    ImportDeclaration(path: any) {
      for (const spec of path.node.specifiers) {
        imports.push({
          name: spec.local?.name ?? spec.imported?.name ?? "",
          source: path.node.source?.value ?? "",
        });
      }
    },
    JSXElement(path: any) {
      // Only capture top-level JSX elements (not nested inside other JSX)
      if (path.parentPath?.isJSXElement() || path.parentPath?.isJSXFragment()) return;

      const node = buildNode(path.node);
      if (node) components.push(node);
    },
  });

  return { imports, components, text: source };
}

// ---------------------------------------------------------------------------
// Markup (Vue SFC / Svelte / HTML) parsing
// ---------------------------------------------------------------------------

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

const TAG_RE = /<!--[\s\S]*?-->|<\/?([A-Za-z][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
const ATTR_RE = /([@:.\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function parseAttrs(raw: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const m of raw.matchAll(ATTR_RE)) {
    props[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return props;
}

function pushText(children: JSXNode[], text: string, start: number, end: number) {
  // Collapse whitespace; resolve Vue {{ mustache }} to plain text
  const resolved = text.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => String(expr).trim());
  const trimmed = resolved.replace(/\s+/g, " ").trim();
  if (!trimmed) return;
  children.push({
    componentName: "#text",
    props: {},
    children: [],
    text: trimmed,
    source: { start, end },
  });
}

/** Parse HTML/Vue/Svelte template markup into a JSXNode tree */
export function parseMarkup(source: string): ParseResult {
  // Strip script/style blocks and comments first
  let markup = source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Vue SFC: only keep the template block
  const tpl = markup.match(/<template[^>]*>([\s\S]*)<\/template>\s*$/i);
  if (tpl) markup = tpl[1];

  const components: JSXNode[] = [];
  const stack: JSXNode[] = [];

  let last = 0;
  for (const m of markup.matchAll(TAG_RE)) {
    // Text between tags becomes children of the innermost open element
    const between = markup.slice(last, m.index);
    if (between.trim() && stack.length > 0) {
      pushText(stack[stack.length - 1].children, between, last, m.index);
    }
    last = m.index + m[0].length;

    const name = m[1];
    if (!name) continue; // comment or malformed tag (already stripped defensively)

    const closing = m[0][1] === "/";
    const selfClosing = m[3] === "/" || VOID_ELEMENTS.has(name.toLowerCase());

    if (closing) {
      // Pop to the matching open tag (tolerate mismatches)
      const idx = stack.map((n) => n.componentName).lastIndexOf(name);
      if (idx >= 0) stack.length = idx;
      continue;
    }

    const node: JSXNode = {
      componentName: name,
      props: parseAttrs(m[2] ?? ""),
      children: [],
      source: { start: m.index ?? 0, end: last },
    };

    if (stack.length > 0) stack[stack.length - 1].children.push(node);
    else components.push(node);

    if (!selfClosing) stack.push(node);
  }

  // Trailing text before EOF
  const tail = markup.slice(last);
  if (tail.trim() && stack.length > 0) {
    pushText(stack[stack.length - 1].children, tail, last, markup.length);
  }

  return { imports: [], components, text: source };
}

// ---------------------------------------------------------------------------
// Dart (Flutter) parsing
// ---------------------------------------------------------------------------

type DartCallSpan = { name: string; open: number; end: number };

const isIdentStart = (c: string) => /[A-Za-z_$]/.test(c);
const isIdentChar = (c: string) => /[A-Za-z0-9_$]/.test(c);

const DART_KEYWORDS = new Set([
  "const", "final", "var", "new", "required", "this", "super",
  "return", "if", "else", "for", "switch", "case", "break", "continue",
  "true", "false", "null", "async", "await", "late", "static",
]);

/**
 * Scan Dart source for capitalized widget constructor calls, skipping string
 * literals (including '''...''', r'...', and ${...} interpolation), comments,
 * and non-widget parentheses. Returns spans ordered by start position.
 */
function scanDartCalls(src: string): DartCallSpan[] {
  const spans: DartCallSpan[] = [];
  const parens: { open: number; name: string | null; start: number }[] = [];
  const n = src.length;
  let i = 0;
  let lastWord = "";
  let lastWordStart = -1;

  while (i < n) {
    const c = src[i];

    // comments
    if (c === "/" && src[i + 1] === "/") {
      i = src.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }

    // string literals
    if (c === "'" || c === '"') {
      const triple = src.startsWith(c.repeat(3), i);
      const quote = c.repeat(triple ? 3 : 1);
      i += quote.length;
      while (i < n) {
        if (src.startsWith(quote, i)) {
          i += quote.length;
          break;
        }
        if (src[i] === "\\") i += 2;
        else if (src[i] === "$" && src[i + 1] === "{") {
          // ${...} interpolation: skip balanced braces
          let depth = 1;
          i += 2;
          while (i < n && depth > 0) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") depth--;
            else if (src[i] === "\\") i++;
            i++;
          }
        } else i++;
      }
      lastWord = "";
      continue;
    }

    if (isIdentStart(c)) {
      let j = i;
      while (j < n && isIdentChar(src[j])) j++;
      lastWord = src.slice(i, j);
      lastWordStart = i;
      i = j;
      continue;
    }

    if (c === "(") {
      let name: string | null = null;
      // Named constructors: Image.network( -> qualified name
      let isCall = false;
      if (lastWord && /^[A-Z]/.test(lastWord)) {
        isCall = true;
        name = lastWord;
      } else if (
        lastWord &&
        lastWordStart > 0 &&
        src[lastWordStart - 1] === "."
      ) {
        // look back for the class identifier before the dot
        let k = lastWordStart - 2;
        while (k >= 0 && isIdentChar(src[k])) k--;
        const prefix = src.slice(k + 1, lastWordStart - 1);
        if (prefix && /^[A-Z]/.test(prefix) && /^[A-Za-z]/.test(lastWord)) {
          isCall = true;
          name = `${prefix}.${lastWord}`;
        }
      }
      parens.push({ open: i, name: isCall ? name : null, start: isCall ? i - (lastWord?.length ?? 0) : i });
      lastWord = "";
      i++;
      continue;
    }

    if (c === ")") {
      const top = parens.pop();
      if (top?.name) {
        spans.push({ name: top.name, open: top.open, end: i });
      }
      lastWord = "";
      i++;
      continue;
    }

    if (c === "," || c === ";" || c === "{") lastWord = "";
    i++;
  }

  return spans;
}

/** Extract named-argument string values from a call's raw argument text */
function extractDartProps(raw: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  let depth = 0;
  let i = 0;
  let firstPositional: string | undefined;

  const readString = (start: number): { value: string; end: number } | null => {
    const triple = src3(raw, start);
    const q = raw[start];
    const quote = q.repeat(triple ? 3 : 1);
    let j = start + quote.length;
    let out = "";
    while (j < raw.length) {
      if (raw.startsWith(quote, j)) return { value: out, end: j + quote.length };
      if (raw[j] === "\\") {
        out += raw[j + 1] ?? "";
        j += 2;
      } else {
        out += raw[j];
        j++;
      }
    }
    return null;
  };
  const src3 = (s: string, at: number) =>
    (s[at] === "'" || s[at] === '"') && s.startsWith(s[at].repeat(3), at);

  let pendingName: string | null = null;

  while (i < raw.length) {
    const c = raw[i];
    if (c === "(" || c === "[" || c === "{") {
      depth++;
      // keep pendingName: List("title: Text('x')") value strings may sit one level deeper
      i++;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      depth--;
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      const s = readString(i);
      if (!s) break;
      if (pendingName && props[pendingName] === undefined) {
        props[pendingName] = s.value;
      } else if (depth === 0 && firstPositional === undefined) {
        firstPositional = s.value;
      }
      i = s.end;
      pendingName = null;
      continue;
    }
    // identifier: either a named argument (word followed by ':') or a value expression
    if (isIdentStart(c)) {
      let j = i;
      while (j < raw.length && isIdentChar(raw[j])) j++;
      const word = raw.slice(i, j);
      let k = j;
      while (k < raw.length && raw[k] === " ") k++;
      if (depth === 0 && raw[k] === ":") {
        pendingName = word;
        i = k + 1;
        continue;
      }
      // value expression: an identifier/member chain (e.g. l10n.title, task.name)
      const expectingValue = pendingName !== null || (depth === 0 && firstPositional === undefined);
      if (expectingValue) {
        let end = j;
        let chain = word;
        while (raw[end] === ".") {
          let m = end + 1;
          while (m < raw.length && isIdentChar(raw[m])) m++;
          chain += raw.slice(end, m);
          end = m;
        }
        let k2 = end;
        while (k2 < raw.length && raw[k2] === " ") k2++;
        const term = raw[k2];
        const terminated = term === "," || term === ")" || term === "]" || term === "}" || k2 >= raw.length;
        if (DART_KEYWORDS.has(chain)) {
          // const/final/etc: keep waiting for the real value
          i = j;
          continue;
        }
        if (terminated && term !== "(" && term !== ":") {
          if (pendingName) {
            if (props[pendingName] === undefined) props[pendingName] = chain;
            pendingName = null;
          } else if (depth === 0 && firstPositional === undefined) {
            firstPositional = chain;
          }
          i = end;
          continue;
        }
      }
      // part of a larger expression (function call etc.): skip the word
      i = j;
      continue;
    }
    // numeric literal value (e.g. value: 50)
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < raw.length && /[0-9.]/.test(raw[j])) j++;
      if (pendingName) {
        if (props[pendingName] === undefined) props[pendingName] = raw.slice(i, j);
        pendingName = null;
      }
      i = j;
      continue;
    }
    if (depth === 0 && c === ",") {
      // positional widget value like Text('x') already handled by nesting;
      pendingName = null;
      i++;
      continue;
    }
    i++;
  }

  if (firstPositional !== undefined && props.children === undefined) {
    props.children = firstPositional;
  }
  // child: Text('x') is Flutter's label pattern — expose it as children too
  if (props.children === undefined && typeof props.child === "string") {
    props.children = props.child;
  }
  // Icons.x -> icon prop
  const iconMatch = raw.match(/Icons\.(\w+)/);
  if (iconMatch && props.icon === undefined) props.icon = iconMatch[1];
  if (props.axis === undefined) {
    const axisMatch = raw.match(/Axis\.horizontal/);
    if (axisMatch) props.axis = "Axis.horizontal";
  }
  return props;
}

/** Widget names whose label lives in a nested Text('...') child */
const LABEL_FROM_TEXT_CHILD = new Set([
  "ElevatedButton", "FilledButton", "OutlinedButton", "TextButton",
  "IconButton", "FloatingActionButton", "ListTile", "ListTileButton",
]);

function propagateLabels(node: JSXNode) {
  if (
    !node.props.children &&
    LABEL_FROM_TEXT_CHILD.has(node.componentName)
  ) {
    for (const child of node.children) {
      if (child.componentName === "Text" && typeof child.props.children === "string") {
        node.props.children = child.props.children;
        break;
      }
    }
  }
  for (const child of node.children) propagateLabels(child);
}

/** Parse Flutter Dart source into a JSXNode tree of widget calls */
export function parseDart(source: string): ParseResult {
  // scanDartCalls yields spans in close order; rebuild start order for nesting
  const spans = [...scanDartCalls(source)].sort((a, b) => a.open - b.open);
  const roots: JSXNode[] = [];
  const stack: { node: JSXNode; end: number }[] = [];

  for (const span of spans) {
    const raw = source.slice(span.open + 1, span.end);
    const node: JSXNode = {
      componentName: span.name,
      props: extractDartProps(raw),
      children: [],
      source: { start: span.open, end: span.end + 1 },
    };
    while (stack.length > 0 && stack[stack.length - 1].end < span.end) stack.pop();
    if (stack.length > 0) stack[stack.length - 1].node.children.push(node);
    else roots.push(node);
    stack.push({ node, end: span.end });
  }

  for (const root of roots) propagateLabels(root);

  return { imports: [], components: roots, text: source };
}
