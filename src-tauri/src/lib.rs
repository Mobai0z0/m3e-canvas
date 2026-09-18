use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileTree {
    pub root: String,
    pub entries: Vec<FileEntry>,
}

/// Directories we never descend into when scanning projects.
const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "out",
    "build",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".turbo",
    ".cache",
    "coverage",
    ".venv",
    "venv",
    "__pycache__",
];

/// True when this entry is a non-root directory we should prune (and skip its subtree).
fn should_prune(entry: &walkdir::DirEntry) -> bool {
    if entry.depth() == 0 || !entry.file_type().is_dir() {
        return false;
    }
    let name = entry.file_name().to_string_lossy();
    IGNORED_DIRS.iter().any(|d| name == *d)
}

/// Normalize a path to use forward slashes so the frontend can match
/// paths consistently across Windows and Unix.
fn normalize_rel(rel: &std::path::Path) -> String {
    rel.to_string_lossy().replace('\\', "/")
}

fn collect_entry(entry: &walkdir::DirEntry, root_path: &std::path::Path) -> FileEntry {
    let relative = entry.path().strip_prefix(root_path).unwrap_or(entry.path());
    FileEntry {
        path: normalize_rel(relative),
        name: entry
            .path()
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        is_dir: entry.path().is_dir(),
        size: entry.metadata().map(|m| m.len()).unwrap_or(0),
    }
}

fn sort_entries(entries: &mut Vec<FileEntry>) {
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
}

#[command]
fn scan_dir(root: String) -> Result<FileTree, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.exists() {
        return Err(format!("Directory does not exist: {}", root));
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    for entry in WalkDir::new(&root_path)
        .min_depth(1)
        .max_depth(1)
        .into_iter()
        .filter_entry(|e| !should_prune(e))
        .filter_map(|e| e.ok())
    {
        entries.push(collect_entry(&entry, &root_path));
    }

    sort_entries(&mut entries);

    Ok(FileTree { root, entries })
}

#[command]
fn scan_dir_recursive(root: String, max_depth: usize) -> Result<FileTree, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.exists() {
        return Err(format!("Directory does not exist: {}", root));
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    for entry in WalkDir::new(&root_path)
        .min_depth(1)
        .max_depth(max_depth)
        .into_iter()
        .filter_entry(|e| !should_prune(e))
        .filter_map(|e| e.ok())
    {
        entries.push(collect_entry(&entry, &root_path));
    }

    sort_entries(&mut entries);

    Ok(FileTree { root, entries })
}

#[command]
fn load_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_dir,
            scan_dir_recursive,
            load_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
