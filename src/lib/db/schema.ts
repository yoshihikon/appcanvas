import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * プロジェクト単位の SQLite (project.db) のスキーマ。
 * 将来クラウドPostgreSQLへ移行する際は dialect を差し替えて
 * マイグレーションを生成する（docs/SPECIFICATION.md 4.3）。
 */

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** 対象ユーザーのペルソナ・利用シーン */
  persona: text("persona").notNull().default(""),
  /** 機能概要 */
  overview: text("overview").notNull().default(""),
  /** 生成時に適用するスキルID配列（JSON文字列） */
  skills: text("skills").notNull().default("[]"),
  /** デザインシステムのガイドライン（自由記述） */
  designSystem: text("design_system").notNull().default(""),
  /** 既定の対象フォームファクタ */
  defaultDevice: text("default_device").notNull().default("desktop"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type ScreenStatus = "proposed" | "generating" | "generated" | "error";

export const screens = sqliteTable("screens", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").$type<ScreenStatus>().notNull().default("proposed"),
  sortOrder: integer("sort_order").notNull().default(0),
  /** キャンバス上の行グルーピング（例: 認証 / メイン機能） */
  groupName: text("group_name").notNull().default(""),
  /** フォームファクタ。サムネ比率と生成ビューポートを決める */
  device: text("device").$type<"desktop" | "mobile">().notNull().default("desktop"),
  /** どの生成ランで作られたか（任意） */
  generationRunId: text("generation_run_id"),
  /** workspace 内の page.tsx 相対パス */
  codePath: text("code_path"),
  /** 静的HTMLスナップショットの相対パス */
  htmlPath: text("html_path"),
  /** サムネイルの相対パス */
  thumbnailPath: text("thumbnail_path"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** 画面内コンポーネント（本開発で使う情報）。data-cid 属性と対応する */
export const screenComponents = sqliteTable("screen_components", {
  id: text("id").primaryKey(),
  screenId: text("screen_id")
    .notNull()
    .references(() => screens.id, { onDelete: "cascade" }),
  /** 画面内で一意なID（data-cid と一致） */
  componentId: text("component_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** 企画書などの投入インプット */
export const projectInputs = sqliteTable("project_inputs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  kind: text("kind").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

/** 画面ごとのAIセッション（screenId が NULL ならプロジェクト全体向け） */
export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  screenId: text("screen_id").references(() => screens.id, {
    onDelete: "cascade",
  }),
  /** Claude Code 側のセッションID（resume 用） */
  agentSessionId: text("agent_session_id"),
  createdAt: text("created_at").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").$type<"user" | "assistant" | "tool">().notNull(),
  /** 表示用コンテンツ（ツール使用などはJSON文字列） */
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export type GenerationStatus =
  | "proposing"
  | "reviewing"
  | "generating"
  | "done"
  | "error"
  | "canceled";

/** AI画面生成ランのオーケストレーション記録（docs/AI-GENERATION.md §5） */
export const generationRuns = sqliteTable("generation_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  /** Claude Code のセッションID（resume用） */
  agentSessionId: text("agent_session_id"),
  status: text("status").$type<GenerationStatus>().notNull().default("proposing"),
  /** 入力指示 */
  input: text("input").notNull().default(""),
  defaultDevice: text("default_device").notNull().default("desktop"),
  /** 構成案（レビュー対象。JSON文字列） */
  proposal: text("proposal"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** 生成ランのやりとり表示用メッセージ */
export const generationMessages = sqliteTable("generation_messages", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => generationRuns.id, { onDelete: "cascade" }),
  role: text("role").$type<"user" | "assistant" | "tool" | "system">().notNull(),
  /** 表示用ペイロード（JSON文字列） */
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Project = typeof projects.$inferSelect;
export type Screen = typeof screens.$inferSelect;
export type ScreenComponent = typeof screenComponents.$inferSelect;
export type ProjectInput = typeof projectInputs.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type GenerationRun = typeof generationRuns.$inferSelect;
export type GenerationMessage = typeof generationMessages.$inferSelect;
