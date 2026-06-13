"use client";

import { useRouter } from "next/navigation";
import type { Project } from "@/lib/db/schema";
import { ProjectSettingsModal } from "@/components/project-settings-modal";

/**
 * /projects/[id]/settings へ直接アクセスされたとき用。
 * 設定ポップアップを開いた状態で表示し、閉じたらキャンバスへ戻る。
 */
export function ProjectSettingsRouteView({ project }: { project: Project }) {
  const router = useRouter();
  return (
    <ProjectSettingsModal
      project={project}
      open
      onClose={() => {
        router.push(`/projects/${project.id}`);
        router.refresh();
      }}
    />
  );
}
