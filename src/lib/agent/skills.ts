/**
 * 画面生成時に Claude Code へ適用できるスキル。
 * プロジェクト設定で選択し、CLAUDE.md / 生成プロンプトで参照させる。
 * docs/AI-GENERATION.md §4.1 を参照。
 */
export const AVAILABLE_SKILLS: { id: string; label: string; note: string }[] = [
  {
    id: "frontend-design",
    label: "フロントデザイン",
    note: "テンプレ的にならない意図のあるビジュアル設計",
  },
  {
    id: "react-best-practices",
    label: "React/Next.js ベストプラクティス",
    note: "パフォーマンスに配慮した実装パターン",
  },
  {
    id: "web-design-guidelines",
    label: "UI/UX・アクセシビリティ",
    note: "Webインターフェースガイドライン準拠",
  },
  {
    id: "composition-patterns",
    label: "コンポーネント設計",
    note: "再利用しやすいコンポーネント構成",
  },
];

const SKILL_IDS = new Set(AVAILABLE_SKILLS.map((s) => s.id));

/** 新規プロジェクトの既定で適用するスキル */
export const DEFAULT_SKILLS: string[] = [
  "frontend-design",
  "react-best-practices",
];

/** 任意の入力を既知のスキルIDだけに正規化する */
export function sanitizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && SKILL_IDS.has(item)) seen.add(item);
  }
  return [...seen];
}

/** DBに保存されたJSON文字列をスキルID配列にパースする（壊れていれば空） */
export function parseSkills(value: string): string[] {
  try {
    return sanitizeSkills(JSON.parse(value));
  } catch {
    return [];
  }
}

export function skillLabel(id: string): string {
  return AVAILABLE_SKILLS.find((s) => s.id === id)?.label ?? id;
}
