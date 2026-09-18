import type { FileTree } from "../tauri";

export type Framework = "next" | "react" | "vue" | "svelte" | "solid" | "angular" | "flutter" | "unknown";

export type UiLib = "mui" | "antd" | "chakra" | "mantine" | "shadcn" | "tailwind" | "css" | "unknown";

export type ProjectInfo = {
  framework: Framework;
  uiLib: UiLib;
  router: "next-app" | "next-pages" | "react-router" | "vue-router" | "unknown";
  typescript: boolean;
  pkgName: string;
  pkgVersion: string;
  dependencies: Record<string, string>;
};

type PkgJson = {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const hasDep = (deps: Record<string, string>, ...names: string[]) => names.some((n) => n in deps);

export function detectFramework(deps: Record<string, string>, devDeps: Record<string, string>): Framework {
  const all = { ...deps, ...devDeps };
  if (hasDep(all, "next")) return "next";
  if (hasDep(all, "vue", "nuxt")) return "vue";
  if (hasDep(all, "svelte", "@sveltejs/kit")) return "svelte";
  if (hasDep(all, "solid-js", "solid-start")) return "solid";
  if (hasDep(all, "@angular/core")) return "angular";
  if (hasDep(all, "react", "react-dom")) return "react";
  return "unknown";
}

export function detectUiLib(deps: Record<string, string>, devDeps: Record<string, string>): UiLib {
  const all = { ...deps, ...devDeps };
  if (hasDep(all, "@mui/material", "@mui/core")) return "mui";
  if (hasDep(all, "antd")) return "antd";
  if (hasDep(all, "@chakra-ui/react")) return "chakra";
  if (hasDep(all, "@mantine/core")) return "mantine";
  if (hasDep(all, "@radix-ui/react-dialog", "class-variance-authority", "tailwindcss")) return "shadcn";
  if (hasDep(all, "tailwindcss")) return "tailwind";
  if (hasDep(all, "styled-components", "emotion", "@emotion/react")) return "css";
  return "unknown";
}

export function detectRouter(framework: Framework): ProjectInfo["router"] {
  if (framework === "next") return "next-app";
  return "unknown";
}

/** Detect a Flutter project from its pubspec.yaml contents */
export function detectFlutterProject(pubspecText: string): Pick<ProjectInfo, "framework" | "typescript" | "pkgName" | "pkgVersion" | "dependencies"> {
  const name = pubspecText.match(/^name:\s*(\S+)/m)?.[1] ?? "unknown";
  const version = pubspecText.match(/^version:\s*(\S+)/m)?.[1] ?? "0.0.0";
  const dependencies: Record<string, string> = {};
  let inDeps = false;
  for (const line of pubspecText.split(/\r?\n/)) {
    if (/^(dependencies|dev_dependencies):/.test(line)) {
      inDeps = true;
      continue;
    }
    if (/^\S/.test(line)) {
      inDeps = false;
      continue;
    }
    const dep = /^\s+([\w-]+)\s*:/.exec(line);
    if (inDeps && dep) dependencies[dep[1]] = "any";
  }
  return { framework: "flutter", typescript: false, pkgName: name, pkgVersion: version, dependencies };
}

export function detectProject(
  pkgJson: PkgJson,
): ProjectInfo {
  const deps = pkgJson.dependencies ?? {};
  const devDeps = pkgJson.devDependencies ?? {};
  const framework = detectFramework(deps, devDeps);
  return {
    framework,
    uiLib: detectUiLib(deps, devDeps),
    router: detectRouter(framework),
    typescript: hasDep(deps, "typescript") || hasDep(devDeps, "typescript"),
    pkgName: pkgJson.name ?? "unknown",
    pkgVersion: pkgJson.version ?? "0.0.0",
    dependencies: { ...deps, ...devDeps },
  };
}

/** Scan file tree for route/page files based on framework */
export function detectScreens(fileTree: FileTree, framework: Framework): string[] {
  const screens: string[] = [];
  const isNoise = (p: string) =>
    /(\.g\.dart|\.freezed\.dart|_test\.dart|\.test\.|\.stories\.|\.spec\.)/.test(p);
  for (const entry of fileTree.entries) {
    if (entry.is_dir) continue;
    const p = entry.path.replace(/\\/g, "/");
    if (isNoise(p)) continue;
    if (framework === "next") {
      // Next.js app directory: app/.../page.tsx or src/app/.../page.tsx
      if (p.match(/(^|\/)(app|src\/app)\/.*page\.(tsx|ts|jsx|js)$/)) {
        screens.push(entry.path);
      }
      // Next.js pages directory
      if (p.match(/(^|\/)(pages|src\/pages)\/.*(tsx|ts|jsx|js)$/)) {
        screens.push(entry.path);
      }
    } else if (framework === "react") {
      // React Router pages
      if (p.match(/(^|\/)(pages|src\/pages|src\/screens|src\/views|src\/routes)\/.*(tsx|ts|jsx|js)$/)) {
        screens.push(entry.path);
      }
      // CRA src/App.tsx
      if (p.match(/(^|\/)src\/App\.(tsx|ts|jsx|js)$/)) {
        screens.push(entry.path);
      }
    } else if (framework === "vue" || framework === "svelte" || framework === "solid" || framework === "angular") {
      // Vue/Svelte pages
      if (p.match(/(^|\/)(pages|src\/pages|src\/views)\/.*\.(vue|svelte|tsx|ts|jsx|js)$/)) {
        screens.push(entry.path);
      }
    } else if (framework === "flutter") {
      // Flutter: lib/**/*_page.dart, *_screen.dart, *_view.dart,
      // files directly under lib/screens|pages|views/, and main.dart
      if (p.startsWith("lib/") && p.endsWith(".dart")) {
        if (p.match(/(_page|_screen|_view)\.dart$/)) {
          screens.push(entry.path);
        } else if (p.match(/^lib\/(screens|pages|views)\//)) {
          screens.push(entry.path);
        } else if (p === "lib/main.dart") {
          screens.push(entry.path);
        }
      }
    } else {
      // Unknown framework: look for common page patterns
      if (p.match(/(^|\/)(app|src\/app)\/.*page\.(tsx|ts|jsx|js)$/)) {
        screens.push(entry.path);
      }
      if (p.match(/(^|\/)(pages|src\/pages|src\/screens|src\/views)\/.*\.(tsx|ts|jsx|js|vue|svelte)$/)) {
        screens.push(entry.path);
      }
      if (p.match(/(^|\/)src\/App\.(tsx|ts|jsx|js)$/)) {
        screens.push(entry.path);
      }
    }
  }
  return screens;
}
