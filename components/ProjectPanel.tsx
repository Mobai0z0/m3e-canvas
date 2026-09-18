"use client";

import { useState, useCallback } from "react";
import {
  isTauri,
  pickDirectory,
  readFileTree,
  readFileAsString,
  type FileTree,
  type FileEntry,
} from "@/lib/tauri";
import { importProject, type ImportResult } from "@/lib/import/importer";
import type { Lang } from "@/lib/i18n";
import type { Palette } from "@/lib/tokens";

type Props = {
  lang: Lang;
  palette: Palette;
  onImport?: (result: ImportResult) => void;
};

const UI = {
  ja: {
    title: "プロジェクト",
    import: "インポート",
    importing: "インポート中...",
    noProject: "プロジェクトが選択されていません",
    selectDir: "フォルダを選択",
    files: "ファイル",
    framework: "フレームワーク",
    uiLib: "UIライブラリ",
    router: "ルーター",
    screens: "画面数",
    refresh: "更新",
    notDesktop: "この機能はデスクトップアプリでのみ使用できます",
    noScreens: "画面が検出されませんでした",
    noFlutterUi: "純粋な Dart プロジェクト（CLI/バックエンド）で、Flutter UI ページが見つかりません",
    customMap: "カスタムコンポーネントマッピング",
    customMapHint: "コンポーネント名=種類 (1行1つ)",
    reimport: "再インポート",
  },
  en: {
    title: "Project",
    import: "Import",
    importing: "Importing...",
    noProject: "No project selected",
    selectDir: "Select Folder",
    files: "Files",
    framework: "Framework",
    uiLib: "UI Library",
    router: "Router",
    screens: "Screens",
    refresh: "Refresh",
    notDesktop: "This feature requires the desktop app",
    noScreens: "No screens detected",
    noFlutterUi: "Pure Dart project (CLI/backend) — no Flutter UI pages found",
    customMap: "Custom Component Mapping",
    customMapHint: "ComponentName=kind (one per line)",
    reimport: "Re-import",
  },
  zh: {
    title: "项目",
    import: "导入",
    importing: "导入中...",
    noProject: "未选择项目",
    selectDir: "选择文件夹",
    files: "文件",
    framework: "框架",
    uiLib: "UI 库",
    router: "路由",
    screens: "屏幕数",
    refresh: "刷新",
    notDesktop: "此功能仅在桌面应用中可用",
    noScreens: "未检测到页面",
    noFlutterUi: "这是纯 Dart 工程（CLI/后端），没有 Flutter UI 页面",
    customMap: "自定义组件映射",
    customMapHint: "组件名=类型（每行一个）",
    reimport: "重新导入",
  },
  ko: {
    title: "프로젝트",
    import: "가져오기",
    importing: "가져오는 중...",
    noProject: "선택된 프로젝트 없음",
    selectDir: "폴더 선택",
    files: "파일",
    framework: "프레임워크",
    uiLib: "UI 라이브러리",
    router: "라우터",
    screens: "화면",
    refresh: "새로고침",
    notDesktop: "이 기능은 데스크톱 앱에서만 사용할 수 있습니다",
    noScreens: "화면이 감지되지 않음",
    noFlutterUi: "순수 Dart 프로젝트(CLI/백엔드)로 Flutter UI 페이지가 없습니다",
    customMap: "사용자 정의 컴포넌트 매핑",
    customMapHint: "컴포넌트명=종류 (한 줄에 하나)",
    reimport: "다시 가져오기",
  },
};

export function ProjectPanel({ lang, palette: p, onImport }: Props) {
  const t = UI[lang] ?? UI.en;
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTree | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [customMapText, setCustomMapText] = useState("");

  const desktop = isTauri();

  const handleSelectDir = useCallback(async () => {
    setError(null);
    const dir = await pickDirectory();
    if (!dir) return;
    setRootPath(dir);
    try {
      const tree = await readFileTree(dir);
      setFileTree(tree);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const handleFileClick = useCallback(async (entry: FileEntry) => {
    if (entry.is_dir) {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(entry.path)) next.delete(entry.path);
        else next.add(entry.path);
        return next;
      });
      return;
    }
    if (!rootPath) return;
    const fullPath = `${rootPath}/${entry.path}`;
    setSelectedFile(fullPath);
    try {
      const content = await readFileAsString(fullPath);
      setFileContent(content);
    } catch (e) {
      setFileContent(`Error: ${e}`);
    }
  }, [rootPath]);

  const handleImport = useCallback(async () => {
    if (!rootPath) return;
    setImporting(true);
    setError(null);
    try {
      // Parse custom mappings: "ComponentName=kind" per line
      const customMappings: Record<string, { kind: string; labelProp?: string }> = {};
      for (const line of customMapText.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx <= 0) continue;
        const name = trimmed.slice(0, eqIdx).trim();
        const rest = trimmed.slice(eqIdx + 1).trim();
        // Support "Name=kind" or "Name=kind:labelProp"
        const colonIdx = rest.indexOf(":");
        const kind = colonIdx > 0 ? rest.slice(0, colonIdx).trim() : rest;
        const labelProp = colonIdx > 0 ? rest.slice(colonIdx + 1).trim() : undefined;
        if (name && kind) customMappings[name] = { kind, labelProp };
      }
      const result = await importProject(
        rootPath,
        Object.keys(customMappings).length > 0 ? customMappings : undefined,
      );
      setImportResult(result);
      onImport?.(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  }, [rootPath, onImport, customMapText]);

  if (!desktop) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: p.onSurfaceVariant }}>
        <span className="material-symbols-rounded" style={{ fontSize: 48, display: "block", marginBottom: 12, opacity: 0.5 }}>
          desktop_access_disabled
        </span>
        <p style={{ fontSize: 13 }}>{t.notDesktop}</p>
      </div>
    );
  }

  const btnStyle: React.CSSProperties = {
    padding: "6px 14px",
    border: "none",
    borderRadius: 20,
    background: p.primary,
    color: p.onPrimary,
    fontSize: 13,
    fontWeight: 500,
    cursor: importing ? "wait" : "pointer",
    opacity: importing ? 0.7 : 1,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${p.outlineVariant}`,
        display: "flex",
        gap: 8,
        alignItems: "center",
        background: p.surfaceContainer,
      }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20, color: p.primary }}>deployed_code</span>
        <span style={{ fontWeight: 500, flex: 1, color: p.onSurface }}>{t.title}</span>
        {rootPath && (
          <button onClick={handleImport} disabled={importing} style={btnStyle}>
            {importing ? t.importing : t.import}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: "8px 14px", background: p.errorContainer, color: p.onErrorContainer, fontSize: 13 }}>
          {error}
        </div>
      )}

      {!rootPath ? (
        <div style={{ padding: 24, textAlign: "center" }}>
          <button
            onClick={handleSelectDir}
            style={{
              padding: "12px 24px",
              border: `1px solid ${p.outline}`,
              borderRadius: 24,
              background: p.surfaceContainerHigh,
              color: p.onSurface,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>folder_open</span>
            {t.selectDir}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* File tree */}
          <div style={{ width: "45%", overflow: "auto", borderRight: `1px solid ${p.outlineVariant}` }}>
            <div style={{
              padding: "6px 10px",
              fontSize: 11,
              color: p.onSurfaceVariant,
              borderBottom: `1px solid ${p.outlineVariant}`,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {rootPath}
            </div>
            {fileTree?.entries.map((entry) => (
              <FileTreeNode
                key={entry.path}
                entry={entry}
                depth={0}
                expanded={expandedDirs}
                onToggle={handleFileClick}
                p={p}
                selectedPath={selectedFile}
              />
            ))}
          </div>

          {/* Code viewer */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {selectedFile ? (
              <pre style={{
                padding: 12,
                fontSize: 12,
                fontFamily: "'Roboto Mono', monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: p.onSurface,
                background: p.surface,
                margin: 0,
                minHeight: "100%",
              }}>
                {fileContent}
              </pre>
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: p.onSurfaceVariant, fontSize: 13 }}>
                {t.files}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import result summary */}
      {importResult && (
        <div style={{
          padding: "10px 14px",
          borderTop: `1px solid ${p.outlineVariant}`,
          fontSize: 12,
          background: p.surfaceContainer,
          color: p.onSurface,
        }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span><strong>{t.framework}:</strong> {importResult.projectInfo.framework}</span>
            <span><strong>{t.uiLib}:</strong> {importResult.projectInfo.uiLib}</span>
            <span><strong>{t.screens}:</strong> {importResult.screens.length}</span>
            <span><strong>UI:</strong> {importResult.screens.reduce((n, s) => n + (s.doc.groups?.length ?? 0), 0)} 组 / {importResult.screens.reduce((n, s) => n + (s.doc.groups ?? []).reduce((m, g) => m + g.items.length, 0), 0)} 组件</span>
            {(importResult.parseErrors ?? 0) > 0 && (
              <span style={{ color: p.error }}><strong>{importResult.parseErrors}</strong> 个文件解析失败</span>
            )}
          </div>
          {importResult.screens.length === 0 && (
            <div style={{ marginTop: 4, color: p.error }}>{t.noScreens}</div>
          )}
          {importResult.screens.length === 0 && importResult.projectInfo.framework === "flutter" && (
            <div style={{ marginTop: 2, fontSize: 11, color: p.onSurfaceVariant }}>{t.noFlutterUi}</div>
          )}
        </div>
      )}

      {/* Custom component mapping */}
      {rootPath && (
        <div style={{
          padding: "8px 14px",
          borderTop: `1px solid ${p.outlineVariant}`,
          fontSize: 12,
          background: p.surface,
        }}>
          <div style={{ marginBottom: 4, fontWeight: 500, color: p.onSurface }}>{t.customMap}</div>
          <textarea
            value={customMapText}
            onChange={(e) => setCustomMapText(e.target.value)}
            placeholder={t.customMapHint}
            style={{
              width: "100%",
              minHeight: 48,
              padding: "6px 8px",
              border: `1px solid ${p.outlineVariant}`,
              borderRadius: 8,
              background: p.surfaceContainerLow,
              color: p.onSurface,
              fontSize: 12,
              fontFamily: "'Roboto Mono', monospace",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <button
              onClick={handleImport}
              disabled={importing}
              style={btnStyle}
            >
              {importing ? t.importing : t.reimport}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FileTreeNode({
  entry,
  depth,
  expanded,
  onToggle,
  p,
  selectedPath,
}: {
  entry: FileEntry;
  depth: number;
  expanded: Set<string>;
  onToggle: (entry: FileEntry) => void;
  p: Palette;
  selectedPath: string | null;
}) {
  const isExpanded = expanded.has(entry.path);
  const isSelected = selectedPath?.endsWith(entry.path);
  return (
    <div>
      <div
        onClick={() => onToggle(entry)}
        style={{
          padding: "4px 8px",
          paddingLeft: `${depth * 16 + 8}px`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          userSelect: "none",
          background: isSelected ? p.secondaryContainer : "transparent",
          color: isSelected ? p.onSecondaryContainer : p.onSurface,
        }}
      >
        <span
          className="material-symbols-rounded"
          style={{ fontSize: 16, opacity: entry.is_dir ? 1 : 0 }}
        >
          {entry.is_dir ? (isExpanded ? "expand_more" : "chevron_right") : ""}
        </span>
        <span
          className="material-symbols-rounded"
          style={{ fontSize: 16, color: entry.is_dir ? p.primary : p.onSurfaceVariant }}
        >
          {entry.is_dir ? "folder" : "description"}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</span>
      </div>
    </div>
  );
}
