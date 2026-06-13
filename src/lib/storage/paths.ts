import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * データ保存先のルート。
 * - 開発時: 環境変数 APPCANVAS_DATA_DIR、未指定なら ~/.appcanvas
 * - 配布時: Electron main が app.getPath("userData") を APPCANVAS_DATA_DIR に注入する
 */
export function getDataDir(): string {
  const dir =
    process.env.APPCANVAS_DATA_DIR ?? path.join(os.homedir(), ".appcanvas");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getProjectsDir(): string {
  const dir = path.join(getDataDir(), "projects");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getProjectDir(projectId: string): string {
  return path.join(getProjectsDir(), projectId);
}

export function getProjectDbPath(projectId: string): string {
  return path.join(getProjectDir(projectId), "project.db");
}

export function getInputsDir(projectId: string): string {
  return path.join(getProjectDir(projectId), "inputs");
}

/** Claude Code が画面コードを編集するNext.jsワークスペース */
export function getWorkspaceDir(projectId: string): string {
  return path.join(getProjectDir(projectId), "workspace");
}

/** 画面ごとの派生物（サムネ・静的HTML）の保存ディレクトリ */
export function getScreenArtifactDir(projectId: string, screenId: string): string {
  return path.join(getWorkspaceDir(projectId), ".appcanvas", screenId);
}

export function getThumbnailFile(projectId: string, screenId: string): string {
  return path.join(getScreenArtifactDir(projectId, screenId), "thumb.png");
}

export function getSnapshotFile(projectId: string, screenId: string): string {
  return path.join(getScreenArtifactDir(projectId, screenId), "snapshot.html");
}

export function getRegistryPath(): string {
  return path.join(getDataDir(), "registry.json");
}

export function getSettingsPath(): string {
  return path.join(getDataDir(), "settings.json");
}
