import fs from "node:fs";
import path from "node:path";
import { getWorkspaceDir } from "@/lib/storage/paths";

export type TreeNode = {
  name: string;
  /** ワークスペースからの相対パス（POSIX区切り） */
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
};

// 開発コードとして表示しない（AppCanvas管理物・依存・コンテキスト）
const EXCLUDED = new Set([".appcanvas", "node_modules", ".next", "CLAUDE.md", ".git"]);
const MAX_DEPTH = 12;
const MAX_FILE_BYTES = 1_000_000;

/** ワークスペースの開発コードをツリーで返す（除外物を除く） */
export function listWorkspaceTree(projectId: string): TreeNode[] {
  const root = getWorkspaceDir(projectId);
  if (!fs.existsSync(root)) return [];
  return walk(root, "", 0);
}

function walk(absDir: string, relDir: string, depth: number): TreeNode[] {
  if (depth > MAX_DEPTH) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes: TreeNode[] = [];
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const children = walk(path.join(absDir, entry.name), rel, depth + 1);
      // 空ディレクトリ（初期化時に作られる app/ 等）は開発コードとして表示しない
      if (children.length === 0) continue;
      nodes.push({ name: entry.name, path: rel, type: "dir", children });
    } else if (entry.isFile()) {
      nodes.push({ name: entry.name, path: rel, type: "file" });
    }
  }
  // ディレクトリを先、各々名前順
  return nodes.toSorted((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export type ReadResult =
  | { ok: true; path: string; content: string }
  | { ok: false; error: string };

/**
 * ワークスペース内のファイルを安全に読む。
 * パストラバーサル対策：解決後のパスがワークスペース配下であること、
 * 除外ディレクトリ配下でないことを検証する。
 */
export function readWorkspaceFile(projectId: string, relPath: string): ReadResult {
  const root = getWorkspaceDir(projectId);
  const abs = path.resolve(root, relPath);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.startsWith(rootWithSep)) {
    return { ok: false, error: "範囲外のパスです" };
  }
  const rel = path.relative(root, abs);
  const top = rel.split(path.sep)[0];
  if (EXCLUDED.has(top)) {
    return { ok: false, error: "参照できないパスです" };
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(abs);
  } catch {
    return { ok: false, error: "ファイルがありません" };
  }
  if (!stat.isFile()) return { ok: false, error: "ファイルではありません" };
  if (stat.size > MAX_FILE_BYTES) {
    return { ok: false, error: "ファイルが大きすぎます" };
  }
  return {
    ok: true,
    path: rel.split(path.sep).join("/"),
    content: fs.readFileSync(abs, "utf-8"),
  };
}

/** 開発コードが存在するか（ツリーが空でないか） */
export function hasDevCode(projectId: string): boolean {
  return listWorkspaceTree(projectId).length > 0;
}
