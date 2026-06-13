"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function NewProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [overview, setOverview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  function close() {
    if (submitting) return;
    setOpen(false);
    setName("");
    setOverview("");
    setError(null);
  }

  // 開いたら名前欄にフォーカス、Escで閉じる
  useEffect(() => {
    if (!open) return;
    nameInputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // close は submitting に依存するが、ハンドラ内で都度参照されるため除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          overview: overview.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "作成に失敗しました");
        return;
      }
      router.push(`/projects/${data.project.id}`);
    } catch {
      setError("作成に失敗しました。もう一度お試しください");
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "mb-1 block font-mono text-[10px] tracking-wider text-ink-soft";
  const inputClass =
    "w-full rounded border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        新規プロジェクト
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* 背景。クリックで閉じる */}
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute inset-0 cursor-default bg-ink/40"
          />

          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-md space-y-4 rounded-lg border border-line bg-surface p-6 shadow-xl"
          >
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
                NEW PROJECT
              </p>
              <h2 id={titleId} className="mt-1 text-lg font-bold">
                新規プロジェクトを作成
              </h2>
            </div>

            <label className="block">
              <span className={labelClass}>
                プロジェクト名 <span className="text-danger">*</span>
              </span>
              <input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 請求管理アプリ"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>プロジェクトの概要（任意）</span>
              <textarea
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                rows={4}
                placeholder="どんなアプリを作るか、主な機能の概要など"
                className={inputClass}
              />
            </label>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="rounded px-3 py-2 text-sm text-ink-soft hover:bg-paper disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {submitting ? "作成中…" : "作成"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
