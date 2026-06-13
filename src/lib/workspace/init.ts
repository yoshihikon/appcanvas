import fs from "node:fs";
import path from "node:path";
import { getWorkspaceDir } from "@/lib/storage/paths";
import type { Project } from "@/lib/db/schema";

/**
 * Claude Code が作業するワークスペースの骨格を作る。
 * CLAUDE.md にはプロジェクトの前提情報を書き出し、AIのコンテキストとして
 * 常時参照させる。プロジェクト設定の変更時にも再生成する。
 */
export function initWorkspace(project: Project): void {
  const ws = getWorkspaceDir(project.id);
  fs.mkdirSync(path.join(ws, "app", "screens"), { recursive: true });
  fs.mkdirSync(path.join(ws, "components"), { recursive: true });
  fs.mkdirSync(path.join(ws, ".appcanvas"), { recursive: true });
  writeClaudeMd(project);
}

export function writeClaudeMd(project: Project): void {
  const ws = getWorkspaceDir(project.id);
  fs.mkdirSync(ws, { recursive: true });
  const content = `# ${project.name} — 画面デザインワークスペース

このディレクトリは AppCanvas が管理する画面デザイン用ワークスペースです。
あなた（Claude Code）はここで個々の画面の Next.js コードを作成・修正します。

## プロジェクトの前提情報

### 対象ユーザーのペルソナ・利用シーン

${project.persona || "（未設定）"}

### 機能概要

${project.overview || "（未設定）"}

## 作業ルール

- 画面コードは \`app/screens/<screenId>/page.tsx\` に置く（1画面=1ファイルを基本とする）
- スタイリングは Tailwind CSS を使う
- 画面内の主要な要素（フォーム・ボタン・テーブル・ナビゲーション等）には
  必ず \`data-cid="<コンポーネントID>"\` 属性を付与する。IDは画面内で一意の
  英数字ケバブケース（例: \`login-form\`, \`submit-button\`）とする
- 複数画面で共有するコンポーネントは \`components/\` に置く
- \`.appcanvas/\` 配下は AppCanvas が生成する派生物（サムネイル等）なので編集しない
`;
  fs.writeFileSync(path.join(ws, "CLAUDE.md"), content);
}
