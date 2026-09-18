import type { Kind } from "../tokens";

export type ComponentMapping = {
  kind: Kind;
  propMap: Record<string, string>;
  defaultVariant?: string;
};

/**
 * Maps JSX component names to M3E Canvas kinds.
 * Covers MUI, Ant Design, Chakra UI, shadcn/ui, and generic HTML elements.
 */
export const COMPONENT_MAP: Record<string, ComponentMapping> = {
  // MUI (entries shared with Flutter Material where component names overlap)
  Button: { kind: "button", propMap: { children: "label", variant: "variant" }, defaultVariant: "filled" },
  IconButton: { kind: "iconButton", propMap: { "aria-label": "label", icon: "label", tooltip: "label" } },
  Fab: { kind: "fab", propMap: { children: "label" } },
  Card: { kind: "card", propMap: { child: "label" } },
  CardContent: { kind: "box", propMap: {} },
  ListItem: { kind: "listItem", propMap: { primary: "label", secondary: "supporting" } },
  ListItemButton: { kind: "listItem", propMap: {} },
  ListItemText: { kind: "listItem", propMap: { primary: "label", secondary: "supporting" } },
  TextField: { kind: "textField", propMap: { label: "label", labelText: "label", hintText: "label", helperText: "supporting" } },
  Slider: { kind: "slider", propMap: { value: "value", label: "label" } },
  AppBar: { kind: "topAppBar", propMap: { title: "label" } },
  Toolbar: { kind: "topAppBar", propMap: {} },
  BottomNavigation: { kind: "bottomNav", propMap: { value: "selected" } },
  Tabs: { kind: "tabs", propMap: { value: "selected" } },
  Chip: { kind: "chip", propMap: { label: "label" } },
  Avatar: { kind: "image", propMap: { src: "src" } },
  CircularProgress: { kind: "circularProgress", propMap: { value: "value" } },
  LinearProgress: { kind: "linearProgress", propMap: { value: "value" } },
  Dialog: { kind: "dialog", propMap: { child: "label" } },
  Snackbar: { kind: "snackbar", propMap: { message: "label", content: "label" } },
  Divider: { kind: "divider", propMap: {} },
  Tooltip: { kind: "box", propMap: { title: "label", message: "label" } },
  Menu: { kind: "box", propMap: {} },
  Box: { kind: "box", propMap: {} },
  Stack: { kind: "box", propMap: {} },
  Container: { kind: "box", propMap: {} },
  Paper: { kind: "box", propMap: {} },
  Typography: { kind: "text", propMap: { children: "label" } },

  // Ant Design
  "a-button": { kind: "button", propMap: { children: "label" } },
  "a-icon": { kind: "iconButton", propMap: {} },
  "a-card": { kind: "card", propMap: {} },
  "a-input": { kind: "textField", propMap: { placeholder: "label" } },
  "a-switch": { kind: "switch", propMap: {} },
  "a-checkbox": { kind: "checkbox", propMap: {} },
  "a-radio": { kind: "radio", propMap: {} },
  "a-slider": { kind: "slider", propMap: {} },
  "a-tabs": { kind: "tabs", propMap: {} },
  "a-tag": { kind: "chip", propMap: { children: "label" } },
  "a-avatar": { kind: "image", propMap: {} },
  "a-divider": { kind: "divider", propMap: {} },
  "a-modal": { kind: "dialog", propMap: {} },
  "a-message": { kind: "snackbar", propMap: {} },

  // Chakra UI
  ChakraButton: { kind: "button", propMap: { children: "label" } },
  ChakraInput: { kind: "textField", propMap: { placeholder: "label" } },
  ChakraSwitch: { kind: "switch", propMap: {} },
  ChakraCheckbox: { kind: "checkbox", propMap: {} },
  ChakraSlider: { kind: "slider", propMap: {} },
  ChakraTabs: { kind: "tabs", propMap: {} },
  ChakraTag: { kind: "chip", propMap: {} },
  ChakraDivider: { kind: "divider", propMap: {} },
  ChakraModal: { kind: "dialog", propMap: {} },

  // shadcn/ui
  "ui-button": { kind: "button", propMap: { children: "label" } },
  "ui-input": { kind: "textField", propMap: { placeholder: "label" } },
  "ui-switch": { kind: "switch", propMap: {} },
  "ui-checkbox": { kind: "checkbox", propMap: {} },
  "ui-radio-group": { kind: "radio", propMap: {} },
  "ui-slider": { kind: "slider", propMap: {} },
  "ui-tabs": { kind: "tabs", propMap: {} },
  "ui-dialog": { kind: "dialog", propMap: {} },
  "ui-card": { kind: "card", propMap: {} },
  "ui-badge": { kind: "box", propMap: { children: "label" } },
  "ui-separator": { kind: "divider", propMap: {} },

  // Flutter (Material)
  Text: { kind: "text", propMap: { children: "label" } },
  RichText: { kind: "text", propMap: { children: "label" } },
  SelectableText: { kind: "text", propMap: { children: "label" } },
  ElevatedButton: { kind: "button", propMap: { children: "label" }, defaultVariant: "filled" },
  FilledButton: { kind: "button", propMap: { children: "label" }, defaultVariant: "filled" },
  "FilledButton.tonal": { kind: "button", propMap: { children: "label" }, defaultVariant: "tonal" },
  OutlinedButton: { kind: "button", propMap: { children: "label" }, defaultVariant: "outlined" },
  TextButton: { kind: "button", propMap: { children: "label" }, defaultVariant: "text" },
  ButtonBar: { kind: "box", propMap: {} },
  FloatingActionButton: { kind: "fab", propMap: { children: "label", tooltip: "label" } },
  ExtendedFloatingActionButton: { kind: "fab", propMap: { label: "label" } },
  ListTile: { kind: "listItem", propMap: { title: "label", subtitle: "supporting" } },
  SwitchListTile: { kind: "switch", propMap: { title: "label", subtitle: "supporting" } },
  CheckboxListTile: { kind: "checkbox", propMap: { title: "label", subtitle: "supporting" } },
  RadioListTile: { kind: "radio", propMap: { title: "label", subtitle: "supporting" } },
  TextFormField: { kind: "textField", propMap: { labelText: "label", hintText: "label", helperText: "supporting", label: "label" } },
  InputChip: { kind: "chip", propMap: { label: "label" } },
  FilterChip: { kind: "chip", propMap: { label: "label" } },
  ActionChip: { kind: "chip", propMap: { label: "label" } },
  SliverAppBar: { kind: "topAppBar", propMap: { title: "label" } },
  BottomNavigationBar: { kind: "bottomNav", propMap: {} },
  NavigationBar: { kind: "bottomNav", propMap: {} },
  TabBar: { kind: "tabs", propMap: {} },
  AlertDialog: { kind: "dialog", propMap: { title: "label" } },
  SimpleDialog: { kind: "dialog", propMap: { title: "label" } },
  SnackBar: { kind: "snackbar", propMap: { content: "label" } },
  Image: { kind: "image", propMap: { children: "src" } },
  NetworkImage: { kind: "image", propMap: { children: "src" } },
  AssetImage: { kind: "image", propMap: { children: "src" } },
  FileImage: { kind: "image", propMap: { children: "src" } },
  CircleAvatar: { kind: "image", propMap: { children: "src" } },
  CircularProgressIndicator: { kind: "circularProgress", propMap: { value: "value" } },
  LinearProgressIndicator: { kind: "linearProgress", propMap: { value: "value" } },
  Badge: { kind: "box", propMap: { label: "label" } },
  Drawer: { kind: "box", propMap: {} },
  DrawerHeader: { kind: "box", propMap: {} },
  UserAccountsDrawerHeader: { kind: "box", propMap: {} },

  // Generic HTML
  button: { kind: "button", propMap: { children: "label" } },
  input: { kind: "textField", propMap: { placeholder: "label" } },
  img: { kind: "image", propMap: { src: "src", alt: "label" } },
  hr: { kind: "divider", propMap: {} },
  h1: { kind: "text", propMap: { children: "label" } },
  h2: { kind: "text", propMap: { children: "label" } },
  h3: { kind: "text", propMap: { children: "label" } },
  p: { kind: "text", propMap: { children: "label" } },
  span: { kind: "text", propMap: { children: "label" } },
  nav: { kind: "box", propMap: {} },
  header: { kind: "topAppBar", propMap: {} },
  footer: { kind: "box", propMap: {} },
  form: { kind: "box", propMap: {} },
  label: { kind: "text", propMap: { children: "label" } },
};

/** Layout containers that indicate stacking direction */
export const LAYOUT_CONTAINERS = new Set([
  "Stack", "VStack", "HStack", "Flex", "Grid", "Box",
  "div", "section", "main", "article", "aside",
  "Container", "Paper", "CardContent",
  // Flutter
  "Row", "Column", "Wrap", "Center", "Padding", "SizedBox",
  "ListView", "GridView", "SingleChildScrollView", "ConstrainedBox",
  "Expanded", "Flexible", "IntrinsicHeight", "IntrinsicWidth",
]);

/** Props that indicate horizontal layout */
export const HORIZONTAL_PROPS = new Set([
  "row", "flex-row", "horizontal", "x",
]);

/** Props that indicate vertical layout */
export const VERTICAL_PROPS = new Set([
  "column", "flex-col", "vertical", "y",
]);

/**
 * Merge user-defined custom mappings into the built-in COMPONENT_MAP.
 * Custom entries override built-in ones with the same name.
 */
export function mergeCustomMappings(
  custom: Record<string, { kind: string; labelProp?: string }>,
): Record<string, ComponentMapping> {
  const result: Record<string, ComponentMapping> = { ...COMPONENT_MAP };
  for (const [name, spec] of Object.entries(custom)) {
    result[name] = {
      kind: spec.kind as Kind,
      propMap: spec.labelProp ? { [spec.labelProp]: "label" } : {},
      defaultVariant: "filled",
    };
  }
  return result;
}
