import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type FileEntry = {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
};

export type FileTree = {
  root: string;
  entries: FileEntry[];
};

export type ProjectContext = {
  rootPath: string;
  framework: string | null;
  fileTree: FileTree | null;
};

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pickDirectory(): Promise<string | null> {
  if (isTauri()) {
    const selected = await open({ directory: true, multiple: false });
    return typeof selected === "string" ? selected : null;
  }
  return null;
}

export async function readFileTree(root: string): Promise<FileTree> {
  if (isTauri()) {
    return invoke<FileTree>("scan_dir", { root });
  }
  throw new Error("File tree reading requires the desktop app.");
}

export async function readFileTreeRecursive(
  root: string,
  maxDepth: number = 3,
): Promise<FileTree> {
  if (isTauri()) {
    return invoke<FileTree>("scan_dir_recursive", { root, maxDepth });
  }
  throw new Error("File tree reading requires the desktop app.");
}

export async function readFileAsString(path: string): Promise<string> {
  if (isTauri()) {
    return invoke<string>("load_text_file", { path });
  }
  throw new Error("File reading requires the desktop app.");
}
