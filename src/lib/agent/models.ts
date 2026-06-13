/**
 * AIに送信する際に選択できるモデル。
 * Claude Code のモデルエイリアスをそのまま使う。
 * 「自動で高額なものにならないように」既定はバランス型の sonnet とし、
 * 高コストな opus はユーザーが明示的に選んだときだけ使われるようにする。
 */
export type ModelChoice = "haiku" | "sonnet" | "opus";

export const MODEL_OPTIONS: {
  value: ModelChoice;
  label: string;
  cost: "低" | "中" | "高";
  note: string;
}[] = [
  {
    value: "haiku",
    label: "Haiku",
    cost: "低",
    note: "高速・低コスト。シンプルな画面や素早い反復向け",
  },
  {
    value: "sonnet",
    label: "Sonnet",
    cost: "中",
    note: "コストと品質のバランス。通常はこれを推奨",
  },
  {
    value: "opus",
    label: "Opus",
    cost: "高",
    note: "高品質だが高コスト。複雑な画面が必要なときに選択",
  },
];

/** 既定モデル。高額化を避けるためバランス型にする */
export const DEFAULT_MODEL: ModelChoice = "sonnet";

export function isModelChoice(value: unknown): value is ModelChoice {
  return value === "haiku" || value === "sonnet" || value === "opus";
}
