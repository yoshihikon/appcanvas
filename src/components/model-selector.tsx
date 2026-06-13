"use client";

import { useState } from "react";
import { MODEL_OPTIONS, type ModelChoice } from "@/lib/agent/models";

/**
 * AIに送信するモデルの選択。
 * Claude Code 未連携時は無効化する（連携後にのみ選べる）。
 */
export function ModelSelector({
  initialModel,
  disabled,
}: {
  initialModel: ModelChoice;
  disabled: boolean;
}) {
  const [model, setModel] = useState<ModelChoice>(initialModel);
  const [saving, setSaving] = useState<ModelChoice | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(value: ModelChoice) {
    if (disabled || value === model || saving) return;
    const previous = model;
    setModel(value);
    setSaving(value);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: value }),
      });
      if (!res.ok) {
        setModel(previous);
        setError("保存に失敗しました");
        return;
      }
      setSaved(true);
    } catch {
      setModel(previous);
      setError("保存に失敗しました");
    } finally {
      setSaving(null);
    }
  }

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="sr-only">AIに送信するモデル</legend>
      <ul className="space-y-2">
        {MODEL_OPTIONS.map((opt) => {
          const selected = opt.value === model;
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
                  onChange={() => select(opt.value)}
                  className="mt-1 accent-accent"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="rounded-sm bg-paper px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-ink-soft">
                      コスト {opt.cost}
                    </span>
                    {saving === opt.value && (
                      <span className="font-mono text-[10px] text-ink-faint">
                        保存中…
                      </span>
                    )}
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
      {saved && !error && (
        <p className="font-mono text-xs text-ok">保存しました</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </fieldset>
  );
}
