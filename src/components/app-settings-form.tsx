"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ModelChoice } from "@/lib/agent/models";
import { ModelSelector } from "@/components/model-selector";

/**
 * アプリ設定の編集本体。モデル選択を staged で持ち、
 * 下部の「完了」で保存して一覧へ戻る／「キャンセル」で破棄して戻る。
 * 読み取り専用セクション（ストレージ等）は children で受け取り、
 * 完了/キャンセルボタンの上に表示する。
 */
export function AppSettingsForm({
  initialModel,
  cliFound,
  children,
}: {
  initialModel: ModelChoice;
  cliFound: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [model, setModel] = useState<ModelChoice>(initialModel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (model !== initialModel) {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model }),
        });
        if (!res.ok) {
          setError("保存に失敗しました");
          return;
        }
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-mono text-xs tracking-[0.2em] text-ink-faint">
          AI MODEL
        </h2>
        <p className="mt-2 mb-3 text-sm text-ink-soft">
          画面の生成・修正でAIに送信するモデルを選びます。コストを抑えたい場合は
          Haiku や Sonnet を選んでください（高コストな Opus
          が自動で使われることはありません）。
        </p>
        {!cliFound && (
          <p className="mb-3 rounded bg-paper p-3 text-sm text-ink-soft">
            モデルの選択は Claude Code
            との連携後に有効になります。先に上の手順で連携してください。
          </p>
        )}
        <ModelSelector value={model} onChange={setModel} disabled={!cliFound} />
      </section>

      {children}

      <div className="flex items-center justify-end gap-2">
        {error && <span className="mr-auto text-xs text-danger">{error}</span>}
        <button
          type="button"
          onClick={() => router.push("/")}
          disabled={saving}
          className="rounded px-4 py-2 text-sm text-ink-soft hover:bg-surface disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={saving}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {saving ? "保存中…" : "完了"}
        </button>
      </div>
    </>
  );
}
