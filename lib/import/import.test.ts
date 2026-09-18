import { describe, expect, it } from "vitest";
import { parseDart, parseJsx, parseMarkup } from "./parser";
import { detectFlutterProject, detectScreens, type Framework } from "./detect";
import type { FileTree } from "../tauri";

const DART_SAMPLE = `
// Text('comment fake')
import 'package:flutter/material.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home')),
      body: Column(
        children: [
          Text('Hello'),
          ElevatedButton(
            onPressed: () {},
            child: Text('Submit'),
          ),
          Row(children: [Icon(Icons.home), Icon(Icons.settings)]),
        ],
      ),
    );
  }
}
`;

describe("parseDart", () => {
  it("finds the root Scaffold widget", () => {
    const { components } = parseDart(DART_SAMPLE);
    // roots may also include the widget class's own constructor call
    const scaffold = components.find((c) => c.componentName === "Scaffold");
    expect(scaffold).toBeDefined();
    expect(scaffold!.children.length).toBeGreaterThan(0);
  });

  it("extracts AppBar title from a nested Text", () => {
    const { components } = parseDart(DART_SAMPLE);
    const scaffold = components.find((c) => c.componentName === "Scaffold");
    const appBar = scaffold!.children.find((c) => c.componentName === "AppBar");
    expect(appBar).toBeDefined();
    expect(appBar!.props.title).toBe("Home");
  });

  it("extracts a plain Text label", () => {
    const { components } = parseDart(DART_SAMPLE);
    const scaffold = components.find((c) => c.componentName === "Scaffold");
    const column = scaffold!.children.find((c) => c.componentName === "Column");
    const text = column!.children.find((c) => c.componentName === "Text");
    expect(text!.props.children).toBe("Hello");
  });

  it("propagates a nested Text label to buttons", () => {
    const { components } = parseDart(DART_SAMPLE);
    const scaffold = components.find((c) => c.componentName === "Scaffold");
    const column = scaffold!.children.find((c) => c.componentName === "Column");
    const button = column!.children.find((c) => c.componentName === "ElevatedButton");
    expect(button!.props.children).toBe("Submit");
  });

  it("builds Row children and icon names", () => {
    const { components } = parseDart(DART_SAMPLE);
    const scaffold = components.find((c) => c.componentName === "Scaffold");
    const column = scaffold!.children.find((c) => c.componentName === "Column");
    const row = column!.children.find((c) => c.componentName === "Row");
    expect(row!.children.map((c) => c.componentName)).toEqual(["Icon", "Icon"]);
    expect(row!.children[0].props.icon).toBe("home");
    expect(row!.children[1].props.icon).toBe("settings");
  });

  it("ignores comments and string interpolation", () => {
    const { components } = parseDart(DART_SAMPLE);
    // the commented-out Text('comment fake') must not appear anywhere
    const all = JSON.stringify(components);
    expect(all).not.toContain("comment fake");
  });
});

describe("detectFlutterProject", () => {
  it("parses name, version and dependencies from pubspec.yaml", () => {
    const pubspec = `
name: my_app
version: 1.2.3+4

dependencies:
  flutter:
    sdk: flutter
  provider: ^6.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
`;
    const info = detectFlutterProject(pubspec);
    expect(info.framework).toBe("flutter");
    expect(info.pkgName).toBe("my_app");
    expect(info.pkgVersion).toBe("1.2.3+4");
    expect(info.dependencies["flutter"]).toBe("any");
    expect(info.dependencies["provider"]).toBe("any");
    expect(info.dependencies["flutter_test"]).toBe("any");
  });
});

describe("detectScreens for flutter", () => {
  const tree = (paths: string[]): FileTree => ({
    root: "/proj",
    entries: paths.map((path) => ({
      path,
      name: path.split("/").pop()!,
      is_dir: false,
      size: 10,
    })),
  });

  it("finds page/screen/view files and main.dart under lib/", () => {
    const screens = detectScreens(
      tree(["lib/main.dart", "lib/home_page.dart", "lib/screens/profile_screen.dart", "lib/data/user_view.dart", "lib/widgets/fancy_button.dart"]),
      "flutter" as Framework,
    );
    expect(screens).toEqual(["lib/main.dart", "lib/home_page.dart", "lib/screens/profile_screen.dart", "lib/data/user_view.dart"]);
  });

  it("excludes non-page dart files", () => {
    const screens = detectScreens(tree(["lib/models/user.dart", "lib/utils.dart"]), "flutter" as Framework);
    expect(screens).toEqual([]);
  });
});

describe("parseJsx routing", () => {
  it("routes .dart files to the Dart parser", async () => {
    const { components } = await parseJsx(DART_SAMPLE, "lib/home_page.dart");
    expect(components.some((c) => c.componentName === "Scaffold")).toBe(true);
  });

  it("routes .vue files to the markup parser", async () => {
    const { components } = await parseJsx(
      `<template><div><button>Save</button></div></template>`,
      "src/views/Home.vue",
    );
    expect(components[0].componentName).toBe("div");
    expect(components[0].children[0].componentName).toBe("button");
  });
});

describe("parseMarkup (vue)", () => {
  it("builds a tree from template HTML with attributes", () => {
    const { components } = parseMarkup(
      `<template><el-button type="primary">提交</el-button><span>hi</span></template>`,
    );
    const button = components[0];
    expect(button.componentName).toBe("el-button");
    expect(button.props.type).toBe("primary");
    expect(button.children[0].text).toBe("提交");
  });
});
