"use client";

import { useState } from "react";
import type { Project } from "@/lib/db/schema";
import { ProjectSettingsModal } from "@/components/project-settings-modal";

/** キャンバス上の「プロジェクト設定」ボタン。押すと設定ポップアップを開く。 */
export function ProjectSettingsButton({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded border border-line bg-surface px-3 py-2 text-sm text-ink-soft hover:border-ink-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        プロジェクト設定
      </button>
      <ProjectSettingsModal
        project={project}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
