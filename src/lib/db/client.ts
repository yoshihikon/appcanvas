import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { getProjectDbPath } from "@/lib/storage/paths";
import * as schema from "./schema";

export type ProjectDb = BetterSQLite3Database<typeof schema>;

/**
 * プロジェクトDBの初期化DDL。
 * プロジェクトごとに独立したSQLiteを生成するため、drizzle-kitの
 * マイグレーションではなく初回オープン時のブートストラップで管理する。
 * スキーマ変更時は schema.ts と合わせてここも更新すること。
 */
const BOOTSTRAP_DDL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  persona TEXT NOT NULL DEFAULT '',
  overview TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '[]',
  design_system TEXT NOT NULL DEFAULT '',
  default_device TEXT NOT NULL DEFAULT 'desktop',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS screens (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'proposed',
  sort_order INTEGER NOT NULL DEFAULT 0,
  group_name TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT 'desktop',
  generation_run_id TEXT,
  code_path TEXT,
  html_path TEXT,
  thumbnail_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS screen_components (
  id TEXT PRIMARY KEY,
  screen_id TEXT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_inputs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  screen_id TEXT REFERENCES screens(id) ON DELETE CASCADE,
  agent_session_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS generation_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'screens',
  agent_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'proposing',
  input TEXT NOT NULL DEFAULT '',
  default_device TEXT NOT NULL DEFAULT 'desktop',
  proposal TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS generation_messages (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES generation_runs(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_screens_project ON screens(project_id);
CREATE INDEX IF NOT EXISTS idx_components_screen ON screen_components(screen_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_genmsg_run ON generation_messages(run_id);
CREATE INDEX IF NOT EXISTS idx_genruns_project ON generation_runs(project_id);
`;

// next dev のホットリロードで接続が増殖しないよう globalThis にキャッシュする
const globalCache = globalThis as unknown as {
  __appcanvasDbCache?: Map<string, { raw: Database.Database; db: ProjectDb }>;
  __appcanvasMigrated?: Set<string>;
};

function getCache() {
  globalCache.__appcanvasDbCache ??= new Map();
  return globalCache.__appcanvasDbCache;
}

function getMigratedSet() {
  globalCache.__appcanvasMigrated ??= new Set();
  return globalCache.__appcanvasMigrated;
}

/**
 * 後から追加したカラム一覧（冪等な ADD COLUMN）。
 * ここに行を足せば、dev のホットリロード後も自動で再マイグレーションされる
 * （下の MIGRATION_SIG が変わるため）。
 */
const COLUMN_ADDITIONS: { table: string; column: string; ddl: string }[] = [
  { table: "projects", column: "skills", ddl: "TEXT NOT NULL DEFAULT '[]'" },
  { table: "projects", column: "design_system", ddl: "TEXT NOT NULL DEFAULT ''" },
  { table: "projects", column: "default_device", ddl: "TEXT NOT NULL DEFAULT 'desktop'" },
  { table: "screens", column: "device", ddl: "TEXT NOT NULL DEFAULT 'desktop'" },
  { table: "screens", column: "generation_run_id", ddl: "TEXT" },
  { table: "generation_runs", column: "kind", ddl: "TEXT NOT NULL DEFAULT 'screens'" },
];

// 列構成のシグネチャ。列を足すと変わるので、移行済み判定が自動で無効化される。
const MIGRATION_SIG = COLUMN_ADDITIONS.map((a) => `${a.table}.${a.column}`).join(",");

/**
 * プロジェクトごとに（列構成が変わらない限り）1度だけマイグレーションを実行する。
 * 旧ビルドが globalThis にキャッシュした接続や移行記録でも、列を追加したビルドが
 * 最初に触れた時点で ADD COLUMN が走るようにする（dev のホットリロード対策）。
 */
function ensureMigrated(raw: Database.Database, projectId: string): void {
  const migrated = getMigratedSet();
  const key = `${projectId}|${MIGRATION_SIG}`;
  if (migrated.has(key)) return;
  migrateColumns(raw);
  migrated.add(key);
}

/**
 * 既存の project.db に後から追加したカラムを補う。
 * CREATE TABLE IF NOT EXISTS は既存テーブルを変更しないため、
 * 列単位で存在チェックして無ければ ADD COLUMN する（冪等）。
 */
function migrateColumns(raw: Database.Database): void {
  for (const { table, column, ddl } of COLUMN_ADDITIONS) {
    const cols = raw
      .prepare(`PRAGMA table_info(${table})`)
      .all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      raw.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  }
}

export function openProjectDb(projectId: string): ProjectDb {
  const cache = getCache();
  const cached = cache.get(projectId);
  if (cached) {
    // 旧ビルドがキャッシュした接続でもカラム追加を保証する
    ensureMigrated(cached.raw, projectId);
    return cached.db;
  }

  const dbPath = getProjectDbPath(projectId);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const raw = new Database(dbPath);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");
  raw.exec(BOOTSTRAP_DDL);
  ensureMigrated(raw, projectId);

  const db = drizzle(raw, { schema });
  cache.set(projectId, { raw, db });
  return db;
}

export function closeProjectDb(projectId: string): void {
  const cache = getCache();
  const cached = cache.get(projectId);
  if (!cached) return;
  cached.raw.close();
  cache.delete(projectId);
}
