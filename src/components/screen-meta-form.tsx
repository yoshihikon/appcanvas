"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Screen } from "@/lib/db/schema";
import { DEVICE_OPTIONS } from "@/lib/device";

export function ScreenMetaForm({
  projectId,
  screen,
}: {
  projectId: string;
  screen: Screen;
}) {
  const router = useRouter();
  const [name, setName] = useState(screen.name);
  const [description, setDescription] = useState(screen.description);
  const [groupName, setGroupName] = useState(screen.groupName);
  const [device, setDevice] = useState(screen.device);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/screens/${screen.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, groupName, device }),
        },
      );
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`画面「${screen.name}」を削除します。よろしいですか？`)) {
      return;
    }
    const res = await fetch(
      `/api/projects/${projectId}/screens/${screen.id}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      router.push(`/projects/${projectId}`);
      router.refresh();
    }
  }

  const inputClass =
    "w-full rounded border border-line px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent";
  const labelClass =
    "mb-1 block font-mono text-[10px] tracking-wider text-ink-soft";

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <label className="block">
        <span className={labelClass}>画面名</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>グループ</span>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="例: 認証"
          className={inputClass}
        />
      </label>
      <div>
        <span className={labelClass}>フォームファクタ</span>
        <div className="flex gap-2">
          {DEVICE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm ${
                device === opt.value
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:border-ink-faint"
              }`}
            >
              <input
                type="radio"
                name="device"
                value={opt.value}
                checked={device === opt.value}
                onChange={() => setDevice(opt.value)}
                className="accent-accent"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      <label className="block">
        <span className={labelClass}>説明・検討メモ</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="この画面の役割、検討中の論点など"
          className={inputClass}
        />
      </label>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded bg-ink px-3 py-1.5 text-sm font-medium text-surface hover:bg-ink/85 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            {saving ? "保存中…" : "保存"}
          </button>
          {saved && (
            <span className="font-mono text-xs text-ok">保存しました</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded px-2 py-1.5 text-xs text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-accent"
        >
          画面を削除
        </button>
      </div>
    </form>
  );
}
