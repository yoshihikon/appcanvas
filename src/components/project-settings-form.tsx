"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Project } from "@/lib/db/schema";

export function ProjectSettingsForm({ project }: { project: Project }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [persona, setPersona] = useState(project.persona);
  const [overview, setOverview] = useState(project.overview);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, persona, overview }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("保存に失敗しました。もう一度お試しください");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `プロジェクト「${project.name}」を削除します。\n画面・チャット履歴・ワークスペースもすべて削除されます。よろしいですか？`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  const inputClass =
    "w-full rounded border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent";
  const labelClass =
    "mb-1 block font-mono text-[10px] tracking-wider text-ink-soft";

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-lg border border-line bg-surface p-4"
      >
        <label className="block">
          <span className={labelClass}>プロジェクト名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>対象ユーザーのペルソナ・利用シーン</span>
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={5}
            placeholder={
              "例: 中小企業の経理担当者。月初の請求業務に追われており、PCは得意ではない。\n主に事務所のデスクトップPCで利用する。"
            }
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>機能概要</span>
          <textarea
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            rows={7}
            placeholder={
              "例: 請求書の作成・送付・入金管理を行うWebアプリ。\n- 請求書のテンプレート管理\n- 取引先マスタ\n- 入金消込"
            }
            className={inputClass}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink/85 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {saving ? "保存中…" : "保存"}
          </button>
          {saved && (
            <span className="font-mono text-xs text-ok">
              保存しました（CLAUDE.md にも反映済み）
            </span>
          )}
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </form>

      <section className="rounded-lg border border-danger/30 bg-surface p-4">
        <h2 className="font-mono text-xs tracking-[0.2em] text-danger">
          DANGER ZONE
        </h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-soft">
            プロジェクトを完全に削除します。この操作は取り消せません。
          </p>
          <button
            type="button"
            onClick={handleDelete}
            className="shrink-0 rounded border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-accent"
          >
            プロジェクトを削除
          </button>
        </div>
      </section>
    </div>
  );
}
