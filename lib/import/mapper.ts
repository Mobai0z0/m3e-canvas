import type { Item, Kind, Group, Frame, Doc } from "../tokens";
import type { JSXNode } from "./parser";
import { COMPONENT_MAP, LAYOUT_CONTAINERS, HORIZONTAL_PROPS, VERTICAL_PROPS } from "./componentMap";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

function mapNodeToItem(node: JSXNode): { item: Omit<Item, "id"> | null; children: JSXNode[] } {
  const mapping = COMPONENT_MAP[node.componentName];
  if (!mapping) {
    return { item: null, children: node.children };
  }

  const item: Omit<Item, "id"> = {
    kind: mapping.kind as Kind,
    label: "",
    icon: null,
    variant: (mapping.defaultVariant ?? "filled") as Item["variant"],
  };

  for (const [jsxProp, field] of Object.entries(mapping.propMap)) {
    const value = node.props[jsxProp];
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      if (field === "label") item.label = value;
      else if (field === "supporting") item.supporting = value;
      else if (field === "src") item.src = value;
      else if (field === "value") {
        const num = Number(value);
        if (!isNaN(num)) (item as any).value = num;
      }
      else if (field === "selected") {
        const num = Number(value);
        if (!isNaN(num)) (item as any).selected = num;
      }
    } else if (typeof value === "boolean") {
      if (field === "checked") (item as any).checked = value;
    }
  }

  // Extract text from children if label is empty
  if (!item.label && node.text) {
    item.label = node.text;
  }
  if (!item.label && node.children.length > 0) {
    const textChild = node.children.find((c) => c.componentName === "#text");
    if (textChild?.text) item.label = textChild.text;
  }

  return { item, children: node.children };
}

function inferAxis(node: JSXNode): "x" | "y" {
  if (!node.props) return "y";
  const props = node.props as Record<string, unknown>;

  // Check direction/flex props
  for (const [key, value] of Object.entries(props)) {
    if (HORIZONTAL_PROPS.has(String(value)) || HORIZONTAL_PROPS.has(key)) return "x";
    if (VERTICAL_PROPS.has(String(value)) || VERTICAL_PROPS.has(key)) return "y";
  }

  // MUI Stack: direction="row" or "row"
  if (typeof props.direction === "string" && props.direction.includes("row")) return "x";
  if (typeof props.direction === "string" && props.direction.includes("column")) return "y";

  // flexDir/flexDirection
  if (typeof props.flexDir === "string") {
    if (props.flexDir.includes("row")) return "x";
    return "y";
  }

  return "y";
}

function mapComponentTree(
  nodes: JSXNode[],
  x: number,
  y: number,
): Group[] {
  const groups: Group[] = [];
  let currentY = y;
  let currentX = x;

  for (const node of nodes) {
    if (node.componentName === "#text") continue;

    const isLayoutContainer = LAYOUT_CONTAINAINS.has(node.componentName);

    if (isLayoutContainer && node.children.length > 1) {
      const axis = inferAxis(node);
      const childItems: Omit<Item, "id">[] = [];

      for (const child of node.children) {
        if (child.componentName === "#text") continue;
        const { item } = mapNodeToItem(child);
        if (item) childItems.push(item);
      }

      if (childItems.length > 0) {
        groups.push({
          id: nextId("g"),
          x: currentX,
          y: axis === "y" ? currentY : currentY,
          axis,
          items: childItems.map((item) => ({ ...item, id: nextId("i") } as Item)),
        });

        if (axis === "y") {
          currentY += childItems.length * 72 + 8;
        } else {
          currentX += 400;
        }
      }
    } else {
      const { item, children } = mapNodeToItem(node);
      if (item) {
        groups.push({
          id: nextId("g"),
          x: currentX,
          y: currentY,
          axis: "y",
          items: [{ ...item, id: nextId("i") } as Item],
        });
        currentY += 72;
      }

      // Process nested children
      if (children.length > 0) {
        const nested = mapComponentTree(children, currentX, currentY);
        groups.push(...nested);
        if (nested.length > 0) {
          currentY += nested.length * 72 + 16;
        }
      }
    }
  }

  return groups;
}

const LAYOUT_CONTAINAINS = LAYOUT_CONTAINERS;

export function jsxCToDoc(
  componentName: string,
  nodes: JSXNode[],
  screenName: string,
): Partial<Doc> {
  const groups = mapComponentTree(nodes, 16, 100);

  const frame: Frame = {
    id: nextId("f"),
    name: screenName,
    x: 0,
    y: 0,
  };

  return {
    title: componentName,
    frames: [frame],
    groups,
  };
}
