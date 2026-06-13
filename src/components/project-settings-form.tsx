"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Project } from "@/lib/db/schema";
import { AVAILABLE_SKILLS, sanitizeSkills } from "@/lib/agent/skills";
import { DEVICE_OPTIONS } from "@/lib/device";

function parseSkills(value: string): string[] {
  try {
    return sanitizeSkills(JSON.parse(value));
  } catch {
    return [];
  }
}

export function ProjectSettingsForm({ project }: { project: Project }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [persona, setPersona] = useState(project.persona);
  const [overview, setOverview] = useState(project.overview);
  const [skills, setSkills] = useState<string[]>(parseSkills(project.skills));
  const [designSystem, setDesignSystem] = useState(project.designSystem);
  const [defaultDevice, setDefaultDevice] = useState(project.defaultDevice);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSkill(id: string) {
    setSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

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
        body: JSON.stringify({
          name,
          persona,
          overview,
          skills,
          designSystem,
          defaultDevice,
        }),
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

        <div className="border-t border-line pt-4">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
            GENERATION
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            AIで画面を生成・修正するときの方針です（CLAUDE.md に反映されます）。
          </p>
        </div>

        <div>
          <span className={labelClass}>既定の対象フォームファクタ</span>
          <div className="flex gap-2">
            {DEVICE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm ${
                  defaultDevice === opt.value
                    ? "border-accent bg-accent-soft"
                    : "border-line hover:border-ink-faint"
                }`}
              >
                <input
                  type="radio"
                  name="defaultDevice"
                  value={opt.value}
                  checked={defaultDevice === opt.value}
                  onChange={() => setDefaultDevice(opt.value)}
                  className="accent-accent"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>適用するスキル</span>
          <ul className="space-y-1.5">
            {AVAILABLE_SKILLS.map((skill) => (
              <li key={skill.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded border border-line p-2 hover:border-ink-faint">
                  <input
                    type="checkbox"
                    checked={skills.includes(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                    className="mt-0.5 accent-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {skill.label}
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {skill.note}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <label className="block">
          <span className={labelClass}>デザインシステム（ガイドライン）</span>
          <textarea
            value={designSystem}
            onChange={(e) => setDesignSystem(e.target.value)}
            rows={5}
            placeholder={
              "例: 配色は青系アクセント、角丸は最小。\n見出しは太字、本文14px。余白は8pxグリッド。"
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
