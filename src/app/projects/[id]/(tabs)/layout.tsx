import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repositories/projects";
import { ProjectSettingsButton } from "@/components/project-settings-button";
import { ProjectTabs } from "@/components/project-tabs";

export const dynamic = "force-dynamic";

/**
 * プロジェクトの3タブ（キャンバス/プレビュー/開発コード）共通のヘッダ。
 * 画面詳細は (tabs) グループ外なのでこのレイアウトを受けない。
 */
export default async function ProjectTabsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <nav className="font-mono text-xs tracking-wider text-ink-faint">
            <Link href="/" className="hover:text-ink">
              プロジェクト一覧
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-soft">{project.name}</span>
          </nav>
          <h1 className="mt-1 truncate text-2xl font-bold">{project.name}</h1>
        </div>
        <ProjectSettingsButton project={project} />
      </div>

      <ProjectTabs id={id} />

      {children}
    </div>
  );
}
