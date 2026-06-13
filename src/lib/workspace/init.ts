import fs from "node:fs";
import path from "node:path";
import { getWorkspaceDir } from "@/lib/storage/paths";
import type { Project } from "@/lib/db/schema";
import { parseSkills, skillLabel } from "@/lib/agent/skills";
import { deviceLabel } from "@/lib/device";

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

  const skills = parseSkills(project.skills);
  const skillsBlock =
    skills.length > 0
      ? skills.map((id) => `- ${skillLabel(id)}（${id}）`).join("\n")
      : "（未設定）";

  const content = `# ${project.name} — 画面デザインワークスペース

このディレクトリは AppCanvas が管理する画面デザイン用ワークスペースです。
あなた（Claude Code）はここで個々の画面の Next.js コードを作成・修正します。

## プロジェクトの前提情報

### 対象ユーザーのペルソナ・利用シーン

${project.persona || "（未設定）"}

### 機能概要

${project.overview || "（未設定）"}

## 生成方針

### 既定の対象フォームファクタ

${deviceLabel(project.defaultDevice)}

### 適用するスキル

以下のスキルがあれば読み込み、その指針に従って画面を設計してください。

${skillsBlock}

### デザインシステム

${project.designSystem || "（未設定）"}

## 作業の2段階

1. **画面検討（プレビュー）**: まず各画面のデザインを、外部依存のない自己完結HTMLとして
   \`.appcanvas/<screenId>/preview.html\` に作る。この段階では開発コード（page.tsx等）は作らない。
2. **開発コード生成**: 別途「開発コードを生成」が実行されたときに、各画面のプレビューHTMLを根拠に
   Next.js（App Router）の開発コードを作成・更新する。

## 作業ルール

- スタイリングは Tailwind CSS を使う
- 画面内の主要な要素（フォーム・ボタン・テーブル・ナビゲーション等）には
  必ず \`data-cid="<コンポーネントID>"\` 属性を付与する。IDは画面内で一意の
  英数字ケバブケース（例: \`login-form\`, \`submit-button\`）とする
- 開発コードは App Router 構成（\`app/<route>/page.tsx\`）で作る。複数画面で共有する
  コンポーネントは \`components/\` に置いて再利用する
- 既存の開発コードがある場合は読み込み、構成・命名・共有コンポーネントを踏まえて差分追加する
  （全面的に作り直さない）
- \`.appcanvas/\` 配下は AppCanvas が生成する派生物（プレビュー・サムネイル等）なので編集しない
`;
  fs.writeFileSync(path.join(ws, "CLAUDE.md"), content);
}
