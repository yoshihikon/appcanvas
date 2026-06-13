"use client";

import { MODEL_OPTIONS, type ModelChoice } from "@/lib/agent/models";

/**
 * AIに送信するモデルの選択（制御コンポーネント）。
 * 保存は親の「完了」ボタンで行う。Claude Code 未連携時は無効化する。
 */
export function ModelSelector({
  value,
  onChange,
  disabled,
}: {
  value: ModelChoice;
  onChange: (model: ModelChoice) => void;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">AIに送信するモデル</legend>
      <ul className="space-y-2">
        {MODEL_OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <li key={opt.value}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                  selected
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:border-ink-faint"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="model"
                  value={opt.value}
                  checked={selected}
                  onChange={() => onChange(opt.value)}
                  className="mt-1 accent-accent"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="rounded-sm bg-paper px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-ink-soft">
                      コスト {opt.cost}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {opt.note}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
