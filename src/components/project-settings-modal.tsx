"use client";

import type { Project } from "@/lib/db/schema";
import { Modal } from "@/components/modal";
import { ProjectSettingsForm } from "@/components/project-settings-form";

/** プロジェクト設定のポップアップ本体。編集フォームとインプット欄を含む。 */
export function ProjectSettingsModal({
  project,
  open,
  onClose,
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="PROJECT SETTINGS"
      title="プロジェクト設定"
    >
      <p className="text-sm text-ink-soft">
        ここに書いた前提情報は、画面を生成・修正するAI（Claude
        Code）のコンテキストとして常に参照されます。
      </p>

      <ProjectSettingsForm project={project} />

      <section className="rounded-lg border border-line bg-paper/50 p-4">
        <h3 className="font-mono text-xs tracking-[0.2em] text-ink-faint">
          INPUTS
        </h3>
        <p className="mt-2 text-sm text-ink-soft">
          企画書などのインプット投入と、AIによる画面一覧の提案はまだ実装されていません（M3で対応予定）
        </p>
      </section>
    </Modal>
  );
}
